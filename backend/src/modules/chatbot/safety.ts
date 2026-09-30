import type { ChatLanguage } from './language';

/**
 * Deterministic red-flag guard.
 *
 * Language models are good at triage on average but occasionally miss an
 * emergency (under-triage), which is the one error a health product cannot
 * afford. This layer runs on every patient message BEFORE and INDEPENDENTLY of
 * the model. It can only ever RAISE urgency, never lower it.
 *
 * Patterns cover English, Roman Urdu and Urdu script, because that is how
 * patients in Pakistan actually type. The list is intentionally conservative:
 * a false alarm costs a phone call, a miss can cost a life.
 */

export type Urgency = 'routine' | 'soon' | 'emergency';

export interface RedFlag {
  id: string;
  label: string;
  urgency: Exclude<Urgency, 'routine'>;
}

/**
 * A red-flag phrase found in the text, with how it was used:
 *  - active:     the patient has it now → counts
 *  - negated:    "no chest pain", "seene mein dard nahi" → ignored
 *  - historical: "5 saal pehle falij hua tha" → ignored for urgency, kept as history
 */
export interface RedFlagMatch extends RedFlag {
  status: 'active' | 'negated' | 'historical' | 'informational';
  evidence: string;
}

interface Rule extends RedFlag {
  patterns: RegExp[];
  /** Optional: every one of these must ALSO match (for combined signs). */
  alsoRequires?: RegExp[];
}

const RULES: Rule[] = [
  {
    id: 'chest_pain',
    label: 'Chest pain or pressure',
    urgency: 'emergency',
    patterns: [
      /chest (pain|pressure|tightness|discomfort)/,
      /pain in (my |the )?chest/,
      /heart attack/,
      /(s[ei]{1,2}n[ae]{1,2}y?|sine|chhati|chati) (me|mein|main|mai|mn|may|ka|ki|ke) ((bohat|bahut|bohot|boht|shadeed|tez|sakht|zor ka|zyada) )?(dard|dabao|dabaao|jalan|bhari ?pan)/,
      /(dil|heart) (me|mein|main|ka|ki) (dard|pain)|heart pain/,
      /سینے میں (درد|دباؤ)/,
      /دل (میں|کا) (درد|دورہ)/,
    ],
  },
  {
    id: 'breathing',
    label: 'Difficulty breathing',
    urgency: 'emergency',
    patterns: [
      /(can'?t|cannot|unable to|difficulty|hard to|trouble|struggling to) breath/,
      /short(ness)? of breath/,
      /gasping/,
      /saa?ns (nahi|nahin|nai|na) (aa|a) (raha|rahi|rhi|rha)/,
      /saa?ns (lene|lenay|lainay) (me|mein|main|mai) (mushkil|taklif|takleef|dikkat)/,
      /سانس (نہیں آ|لینے میں)/,
    ],
  },
  {
    id: 'stroke',
    label: 'Possible stroke signs (face, arm, speech)',
    urgency: 'emergency',
    patterns: [
      /face (is )?(droop|drooping|numb)/,
      /slurred speech|speech (is )?slurred/,
      /one side (of (my|his|her|the) (body|face) )?(is )?(weak|numb|paraly)/,
      /sudden (weakness|numbness|confusion)/,
      /\bstroke\b/,
      /\b(falij|faalij|faalaj|laqwa|laqwah)\b/,
      /zuba?n (lark|lar|larr)/,
      /فالج|لقوہ|زبان لڑکھڑا/,
    ],
  },
  {
    id: 'unconscious',
    label: 'Fainting or unresponsive',
    urgency: 'emergency',
    patterns: [
      /unconscious|passed out|not responding|unresponsive|fainted/,
      /\bbe ?hosh\b/,
      /بے ہوش|بیہوش/,
    ],
  },
  {
    id: 'bleeding',
    label: 'Severe or uncontrolled bleeding',
    urgency: 'emergency',
    patterns: [
      /(heavy|severe|a lot of|uncontrolled|nonstop|non-stop) bleeding/,
      /bleeding (heavily|a lot|won'?t stop|will not stop|not stopping)/,
      /(vomit(ing|ed)?|throw(ing)? up|cough(ing|ed)? up) blood/,
      /khoon (nahi|nahin|na) (ruk|rook|rk)/,
      /khoon ki (ulti|qay|qai)/,
      /خون (نہیں رک|کی الٹی|کی قے)/,
    ],
  },
  {
    id: 'seizure',
    label: 'Seizure or convulsions',
    urgency: 'emergency',
    patterns: [/seizure|convuls/, /\bmirgi\b/, /jhatk(e|ay|ey) (aa|a|lag)/, /مرگی|جھٹکے/],
  },
  {
    id: 'self_harm',
    label: 'Thoughts of suicide or self-harm',
    urgency: 'emergency',
    patterns: [
      /suicid|kill myself|end my life|want to die|don'?t want to live|hurt myself|self[- ]?harm/,
      /khud ?kushi|khud ?kashi/,
      /(marna|mar jana) chaht(a|i)/,
      /(jeena|jina) nahi chaht(a|i)/,
      /خودکشی|مرنا چاہت|جینا نہیں چاہت/,
    ],
  },
  {
    id: 'anaphylaxis',
    label: 'Swelling of throat, lips or tongue',
    urgency: 'emergency',
    patterns: [
      /(throat|tongue|lips?|face) (is |are |got )?(swell|swollen)/,
      /swollen (throat|tongue|lips?)/,
      /gala band/,
      /گلا بند/,
    ],
  },
  {
    id: 'poisoning',
    label: 'Poisoning or overdose',
    urgency: 'emergency',
    patterns: [
      /overdose|poison|swallowed (bleach|acid|chemical|pesticide)/,
      /\b(zeher|zehar|zahar)\b/,
      /keeray? maar/,
      /(goli|goliy[ao]n|tablets?|pills?|dawai|dawa)\b[^.,]{0,30}(kha l(i|iy[ae])|khaa l(i|iy[ae])|pura patta|poora patta|bohat saari|ek saath)/,
      /(pura|poora) patta kha/,
      /زہر/,
    ],
  },
  {
    id: 'pregnancy_bleeding',
    label: 'Bleeding during pregnancy',
    urgency: 'emergency',
    patterns: [/pregnan|\bhamal\b|umeed se|حمل|امید سے/],
    alsoRequires: [/bleed|khoon|خون/],
  },
  {
    id: 'meningitis_signs',
    label: 'Fever with stiff neck',
    urgency: 'emergency',
    patterns: [/stiff neck|neck (is )?stiff|gardan (akar|akad|akr)|گردن اکڑ/],
    alsoRequires: [/fever|bukhar|bukhaar|بخار/],
  },
  {
    id: 'thunderclap_headache',
    label: 'Sudden, worst-ever headache',
    urgency: 'emergency',
    patterns: [
      /worst headache|thunderclap|sudden (severe|worst|explosive) headache|headache like (a|being) (hit|thunder)/,
      /zindagi ka sab ?se (bura|tez|shadeed) (sar|sir) ?dard/,
      /achanak (bohat|bahut|shadeed|tez) (sar|sir) ?dard/,
    ],
  },
  {
    id: 'young_infant_fever',
    label: 'Fever in a baby under 3 months',
    urgency: 'emergency',
    patterns: [/newborn|\b(1|2|one|two|do|aik|ek) (month|months|mahine|mahina|maheene)\b|\b\d (week|weeks|hafte|haftay)\b/],
    alsoRequires: [/fever|bukhar|bukhaar|بخار|temperature/, /baby|infant|newborn|bach(a|i|ay|e)\b|بچ|old|ka|ki/],
  },
  {
    id: 'child_danger_signs',
    label: 'Sick child who cannot drink or feed',
    urgency: 'emergency',
    patterns: [
      /(not|unable to|can'?t|refus\w*) (drink|feed|breastfeed|eat anything)|vomits everything|very lethargic|hard to wake/,
      /doodh (nahi|nahin|na) (pee|pi|le) (raha|rahi|rhi|rha)|kuch (nahi|nahin) (pee|pi|kha) (raha|rahi)|har cheez (ulti|qay) kar/,
    ],
    alsoRequires: [/baby|infant|child|toddler|son|daughter|bach(a|i|ay|e)\b|بچ|beta|beti/],
  },
  {
    id: 'heatstroke',
    label: 'Possible heatstroke',
    urgency: 'emergency',
    patterns: [
      /heat ?stroke|sun ?stroke|loo lag (gayi|gai)/,
      /(heat|garmi|dhoop|loo)[^.!?]{0,60}(confus|be ?hosh|faint|very hot|hot (and )?dry skin|jism bohat garam)/,
      /(confus|be ?hosh|faint|collaps)[^.!?]{0,60}\b(heat|garmi|dhoop|loo)\b/,
    ],
  },
  {
    id: 'head_injury',
    label: 'Head injury',
    urgency: 'soon',
    patterns: [/head injury|hit (my|his|her) head|(sir|sar) (par|pe|pr) (chot|chot lagi)|سر پر چوٹ/],
  },
  {
    id: 'high_fever_infant',
    label: 'Fever in a baby',
    urgency: 'soon',
    patterns: [/baby|infant|newborn|\bbach(a|i|ay|e)\b|بچ/],
    alsoRequires: [/fever|bukhar|bukhaar|بخار/],
  },
];

const ORDER: Record<Urgency, number> = { routine: 0, soon: 1, emergency: 2 };

/** Lower-case latin text, fold quotes and whitespace. */
export function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/** Collapse letters typed 3+ times and doubled consonants ("chesst" → "chest"). */
function squeeze(text: string): string {
  return text.replace(/([a-z])\1{2,}/g, '$1').replace(/([b-df-hj-np-tv-z])\1/g, '$1');
}

// A negation just BEFORE the phrase: "no chest pain", "without difficulty breathing".
const NEG_BEFORE = /(\bno\b|\bnot\b|\bnever\b|\bwithout\b|\bdeny|\bdenies\b|\bna\b|\bnahi\b|\bnahin\b|\bkoi\b\s*$|نہیں|کوئی نہیں)[^.,;!?]{0,20}$/;
// A negation just AFTER the phrase: "chest pain nahi hai", "سینے میں درد نہیں".
// Excludes "nahi ja raha / nahi ruk raha" (= it won't go away), which is NOT a denial.
const NEG_AFTER = /^\s*(to\s+)?(nahi|nahin|nai|na|نہیں)(?![a-z])(?!\s*(ja|jaa|ruk|rook|rk|ho\s*raha|ho\s*rahi|jata|jati|utar|kam|thahar|رک|جا))/;
const NEG_AFTER_EN = /^\s*(is\s+|are\s+)?(not|none|no more|gone|absent)\b/;
// Explicitly in the past: "5 saal pehle", "years ago", "history of", "pichle saal".
// Asking about a topic, not reporting a symptom: "how to prevent stroke?".
// A general question ABOUT a condition, not a report of having it:
// "what are the signs of a heart attack?", "stroke ki alamaat kya hain?".
const INFORMATIONAL = /\b(how (to|can i|do i) (prevent|avoid)|prevention of|read about|reading about|information about|tell me about|learn about)\b|^(what|how|when|why|which|kya|kaise|kab|kyun)\b[^!]*\b(signs?|symptoms?|causes?|alamaat|alamat|nishaniy?an|wajah|pehchan)\b|\b(signs?|symptoms?|alamaat|alamat|nishaniy?an) (of|ki|kya)\b[^!]*(\?|kya hain|kya hoti)|علامات کیا/;
const HISTORICAL = /(\d+|kai|kuch|few|several|many|do|teen|char)\s*(saal|sal|years?|mahine|months?|baras|برس|سال)\s*(pehle|pehlay|ago|qabl|پہلے)|\bin the past\b|\bhistory of\b|\bpichle saal\b|\blast year\b|\bpast history\b/;

/** Split into clauses so "seene mein dard nahi, pait mein dard hai" is two statements. */
function clauses(text: string): string[] {
  return text.split(/[.!?\n۔؟,،;]+|\bbut\b|\blekin\b|\bmagar\b/).map((c) => c.trim()).filter(Boolean);
}

/**
 * Scan patient text and return every red-flag phrase with its status.
 * Conservative by design: when unsure, a match stays "active".
 */
export function analyseRedFlags(text: string): RedFlagMatch[] {
  const results = new Map<string, RedFlagMatch>();
  const all = normalise(text);
  const allSqueezed = squeeze(all);
  const rank = { active: 3, historical: 2, negated: 1, informational: 1 } as const;

  for (const clauseRaw of clauses(all)) {
    for (const clause of new Set([clauseRaw, squeeze(clauseRaw)])) {
      for (const rule of RULES) {
        // Combined signs (e.g. pregnancy + bleeding) may be split across the message.
        if (rule.alsoRequires && !rule.alsoRequires.every((p) => p.test(all) || p.test(allSqueezed))) continue;
        for (const p of rule.patterns) {
          const m = new RegExp(p.source, p.flags.replace('g', '')).exec(clause);
          if (!m) continue;
          const before = clause.slice(0, m.index);
          const after = clause.slice(m.index + m[0].length);
          const negated =
            (NEG_BEFORE.test(before) && !/\b(no|na|nahi)\s+(ja|ruk)/.test(before)) ||
            NEG_AFTER.test(after) ||
            NEG_AFTER_EN.test(after);
          const status: RedFlagMatch['status'] = INFORMATIONAL.test(clause)
            ? 'informational'
            : negated
            ? 'negated'
            : HISTORICAL.test(clause)
              ? 'historical'
              : 'active';
          const prev = results.get(rule.id);
          if (!prev || rank[status] > rank[prev.status]) {
            results.set(rule.id, {
              id: rule.id,
              label: rule.label,
              urgency: rule.urgency,
              status,
              evidence: m[0],
            });
          }
          break;
        }
      }
    }
  }
  return [...results.values()];
}

/** Red flags the patient has NOW (negated and historical mentions excluded). */
export function detectRedFlags(text: string): RedFlag[] {
  return analyseRedFlags(text)
    .filter((f) => f.status === 'active')
    .map(({ id, label, urgency }) => ({ id, label, urgency }));
}

/** The higher of two urgencies. The guard uses this so it can only escalate. */
export function maxUrgency(a: Urgency, b: Urgency): Urgency {
  return ORDER[a] >= ORDER[b] ? a : b;
}

export function urgencyFromFlags(flags: RedFlag[]): Urgency {
  return flags.reduce<Urgency>((acc, f) => maxUrgency(acc, f.urgency), 'routine');
}

/** Pakistan emergency contacts shown whenever urgency is "emergency". */
export interface EmergencyInfo {
  headline: string;
  contacts: { name: string; number: string }[];
}

export function emergencyInfo(flags: RedFlag[], lang: ChatLanguage): EmergencyInfo {
  const contacts = [
    { name: 'Rescue 1122', number: '1122' },
    { name: 'Edhi Ambulance', number: '115' },
  ];
  if (flags.some((f) => f.id === 'self_harm')) {
    contacts.unshift({ name: 'Umang mental health helpline (24/7)', number: '03117786264' });
  }
  const headline =
    lang === 'ur'
      ? 'یہ علامات ہنگامی ہو سکتی ہیں۔ فوراً 1122 پر کال کریں یا قریبی ایمرجنسی جائیں۔'
      : lang === 'roman-ur'
        ? 'Yeh alamaat emergency ho sakti hain. Foran 1122 par call karein ya qareebi emergency jayein.'
        : 'These symptoms can be an emergency. Call 1122 now or go to the nearest emergency department.';
  return { headline, contacts };
}
