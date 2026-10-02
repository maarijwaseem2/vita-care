/**
 * Vita Care triage evaluation.
 *
 *   npm run eval                      → safety guard only (no API key, ~1 second)
 *   npm run eval -- --api http://localhost:4000/api
 *                                     → full pipeline through the running API
 *                                       (guard + model + safety second opinion)
 *
 * Reports under-triage (emergency missed — the dangerous error) and
 * over-triage (routine flagged as emergency) separately, as recommended by
 * recent triage-evaluation studies, plus department accuracy in API mode.
 * Writes a Markdown report to evaluation/results/.
 */
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { CASES, EvalCase } from './cases';
import { detectRedFlags } from '../src/modules/chatbot/safety';
import { refineSpecialty } from '../src/modules/chatbot/offline-triage';
import { Specialty } from '../src/common/enums';

type Result = { c: EvalCase; gotEmergency: boolean; specialty?: string | null; mode?: string; error?: string };

const apiIdx = process.argv.indexOf('--api');
const API = apiIdx > -1 ? process.argv[apiIdx + 1] : null;
const limIdx = process.argv.indexOf('--limit');
const LIMIT = limIdx > -1 ? Number(process.argv[limIdx + 1]) : Infinity;

const FOLLOW_UP: Record<EvalCase['lang'], string> = {
  en: 'That is everything I can tell you. Please give me your assessment now.',
  ru: 'Bas yehi takleef hai, ab bata dein kis doctor ko dikhaun.',
  ur: 'بس یہی تکلیف ہے، اب بتائیں کس ڈاکٹر کو دکھاؤں۔',
};

// The AI needs a login; the evaluation signs in as an admin (no daily limit).
let TOKEN = '';
async function signIn() {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: process.env.EVAL_EMAIL ?? 'admin@vitacare.test',
      password: process.env.EVAL_PASSWORD ?? 'Password123',
    }),
  });
  if (!res.ok) throw new Error(`Login failed (${res.status}). Set EVAL_EMAIL / EVAL_PASSWORD.`);
  TOKEN = ((await res.json()) as any).accessToken;
}

async function viaApi(c: EvalCase): Promise<Result> {
  const post = async (messages: { role: string; content: string }[], sessionToken?: string) => {
    const res = await fetch(`${API}/chatbot/consult`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify({ messages, sessionToken }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json() as Promise<any>;
  };
  try {
    const first = await post([{ role: 'user', content: c.text }]);
    if (first.urgency === 'emergency' || first.stage === 'assessment') {
      return { c, gotEmergency: first.urgency === 'emergency', specialty: first.recommendedSpecialty, mode: first.mode };
    }
    const second = await post(
      [
        { role: 'user', content: c.text },
        { role: 'assistant', content: first.reply },
        { role: 'user', content: FOLLOW_UP[c.lang] },
      ],
      first.sessionToken,
    );
    return { c, gotEmergency: second.urgency === 'emergency', specialty: second.recommendedSpecialty, mode: second.mode };
  } catch (e) {
    return { c, gotEmergency: false, error: (e as Error).message };
  }
}

function pct(n: number, d: number) {
  return d ? `${((100 * n) / d).toFixed(1)}%` : 'n/a';
}

async function main() {
  if (API) await signIn();
  const results: Result[] = [];
  for (const c of CASES.slice(0, LIMIT)) {
    results.push(
      API
        ? await viaApi(c)
        : {
            c,
            gotEmergency: detectRedFlags(c.text).some((f) => f.urgency === 'emergency'),
            // Rules-only department: what the server would give if the model answered "General Physician".
            specialty: refineSpecialty(Specialty.GENERAL, c.text) ?? Specialty.GENERAL,
          },
    );
    if (API) await new Promise((r) => setTimeout(r, 150)); // stay under the rate limit
  }

  const emerg = results.filter((r) => r.c.expected === 'emergency');
  const routine = results.filter((r) => r.c.expected === 'routine');
  const traps = routine.filter((r) => r.c.trap);
  const missed = emerg.filter((r) => !r.gotEmergency);
  const falseAlarms = routine.filter((r) => r.gotEmergency);
  const withSpec = routine.filter((r) => r.c.specialty && r.specialty);
  const specOk = withSpec.filter((r) => r.specialty === r.c.specialty);
  const errors = results.filter((r) => r.error);

  const byLang = (['en', 'ru', 'ur'] as const).map((l) => {
    const e = emerg.filter((r) => r.c.lang === l);
    return `| ${l} | ${e.length} | ${e.filter((r) => !r.gotEmergency).length} | ${pct(e.filter((r) => r.gotEmergency).length, e.length)} |`;
  });

  const modes = [...new Set(results.map((r) => r.mode).filter(Boolean))].join(', ') || 'guard only';
  const lines = [
    `# Vita Care triage evaluation — ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`,
    '',
    `Mode: **${API ? `full pipeline via ${API} (${modes})` : 'safety guard only (rules, no model)'}** · Cases: ${results.length}`,
    '',
    '| Metric | Result |',
    '| --- | --- |',
    `| Emergency recall (sensitivity) | ${pct(emerg.length - missed.length, emerg.length)} (${emerg.length - missed.length}/${emerg.length}) |`,
    `| **Under-triage** (emergency missed) | **${missed.length}** (${pct(missed.length, emerg.length)}) |`,
    `| Over-triage (routine flagged emergency) | ${falseAlarms.length} (${pct(falseAlarms.length, routine.length)}) |`,
    `| Trap cases handled (denied / past red flags) | ${traps.length - traps.filter((r) => r.gotEmergency).length}/${traps.length} |`,
    `| Department match${API ? ' (when recommended)' : ' (rules only, model said General Physician)'} | ${pct(specOk.length, withSpec.length)} (${specOk.length}/${withSpec.length}) |`,
    API && errors.length ? `| Request errors | ${errors.length} |` : '',
    '',
    '## Emergency recall by language',
    '',
    '| Language | Emergency cases | Missed | Recall |',
    '| --- | --- | --- | --- |',
    ...byLang,
    '',
    '## Missed emergencies',
    '',
    ...(missed.length ? missed.map((r) => `- \`${r.c.id}\` (${r.c.lang}) ${r.c.text}`) : ['None.']),
    '',
    '## False alarms',
    '',
    ...(falseAlarms.length ? falseAlarms.map((r) => `- \`${r.c.id}\` (${r.c.lang})${r.c.trap ? ' [trap]' : ''} ${r.c.text}`) : ['None.']),
    '',
    '## Department mismatches',
    '',
    ...withSpec.filter((r) => r.specialty !== r.c.specialty).map((r) => `- \`${r.c.id}\` expected ${r.c.specialty}, got ${r.specialty}: ${r.c.text}`),
    '',
    '> Development set written by the team. Labels must be reviewed by practising doctors before any clinical claim.',
  ].filter((l) => l !== '');

  const report = lines.join('\n');
  console.log(report);
  const dir = join(__dirname, 'results');
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${API ? 'pipeline' : 'guard'}-${new Date().toISOString().slice(0, 10)}.md`);
  writeFileSync(file, report + '\n');
  console.log(`\nSaved ${file}`);
  process.exitCode = API ? 0 : missed.length ? 1 : 0;
}

main();
