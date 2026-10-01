import { Specialty } from '../../common/enums';
import type { ChatLanguage } from './language';
import type { AiConsultReply, Urgency } from './chatbot.helpers';
import { offlineMedicinePicks } from './medicines';
import { clauses, isNegatedMention, TIME_AGO } from './safety';

/**
 * Rule-based fallback interviewer.
 *
 * Used when no AI key is configured or the AI provider is unreachable (for
 * example on bad venue Wi-Fi). It asks the same core questions a triage nurse
 * would (duration, severity, associated symptoms), then routes to a
 * department by keyword. It never names conditions: that needs the model.
 * Responses are clearly labelled "offline" in the API and the UI.
 */

type Msg = { role: 'user' | 'assistant'; content: string };

// [department, keywords, weight]. Psychiatry weighs more so "anxious, heart races" is not read as heart disease.
const KEYWORDS: Array<[Specialty, RegExp, number?]> = [
  [Specialty.GENERAL, /acidity|heartburn|tezabiyat|indigestion|bad ?hazmi|\bgas\b|bloat|aphara/, 2],
  [Specialty.HEART_CARE, /chest|palpitation|heart|blood pressure|\bbp\b|dil\b|dhadkan|seen[ae]|سینے|دل|دھڑکن|cholesterol/],
  [Specialty.NEUROLOGY, /headache|migraine|dizz|numb|tingl|memory|faint|(sar|sir) ?(me|mein)? ?dard|chakkar|سر درد|سر میں درد|چکر/],
  [Specialty.PEDIATRICS, /\bbaby\b|infant|toddler|my (son|daughter|child|kid)|bach(a|i|ay|e|ey)\b|بچ|\b([1-9]|1[01]) ?(year|yr|saal)s?[ -]?old\b|\b\d+ ?(mahine|months?)\b.{0,10}\b(ka|ki|old)\b|\bbeta\b|\bbeti\b|\bson\b|\bdaughter\b/],
  [Specialty.GYNECOLOGY, /period|menstru|pregnan|vaginal|pcos|mahwari|hamal|حمل|ماہواری|discharge|leucorr|safed pani|likoria/],
  [Specialty.DERMATOLOGY, /rash|itch|skin|acne|eczema|pimple|kharish|daane|daney|jild|خارش|جلد|دانے|hair|baal (gir|jhar)|sunburn|dhoop se|nails?\b/],
  [Specialty.PSYCHIATRY, /anxi|depress|stress|panic|insomnia|can'?t sleep|ghabrahat|udaas|udas|neend|نیند|گھبراہٹ|اداس|low mood|no interest|sad\b|hopeless|worried all|ghabra/, 2],
  [Specialty.ENT, /\bear\b|nose|throat|sinus|tonsil|hearing|kaan|naak|gala|کان|ناک|گلا/],
  [Specialty.PHYSIOTHERAPY, /rehab|physio|exercise|frozen shoulder|sciatica|slip ?disc|sports injury|ligament|sprain|moch|موچ|paraly|falij|فالج|walk again|chalne (me|mein) (mushkil|dikkat)|stiff|akdan|posture|knee replacement|(stroke|accident|operation|surgery|fracture|chot) (ke|kay) ba+d|after (a |an |the |my |his |her )?(stroke|surgery|operation|accident|fracture|injury)/],
  [Specialty.OSTEOPOROSIS, /joint|knee|bone|fracture|arthrit|osteopor|ghutn|jor\b|haddi|گھٹن|جوڑ|ہڈی/],
];

const BACK_PAIN = /back ?pain|backache|kamar|کمر|neck pain|gardan (me|mein|main)? ?dard/;
// Pain that has lasted weeks/months or keeps coming back (NICE NG59: exercise / physiotherapy).
const CHRONIC = /(\d+|kai|several|many|do|teen|char|chhe|one|two|three|four|five|six|few)\s*(hafte|haftay|hafton|weeks?|mahine|mahiney|mahino|months?|saal|years?)|chronic|bar ?bar|baar ?baar|recurr|purana|lamb[ae] (arse|waqt)/;

/** Keyword hits per specialty (used to refine a vague model answer). */
export function specialtyScores(text: string): Map<Specialty, number> {
  const t = text.toLowerCase();
  const scores = new Map<Specialty, number>();
  // Count keyword hits clause by clause, skipping words the patient denies ("chest pain nahi hai").
  for (const clause of clauses(t)) {
    if (TIME_AGO.test(clause)) continue; // "5 saal pehle falij hua tha" is history, not today's problem
    for (const [specialty, re, weight = 1] of KEYWORDS) {
      const g = new RegExp(re.source, 'g');
      let m: RegExpExecArray | null;
      while ((m = g.exec(clause)) !== null) {
        if (!m[0]) {
          g.lastIndex++;
          continue;
        }
        if (isNegatedMention(clause, m.index, m[0].length)) continue;
        scores.set(specialty, (scores.get(specialty) ?? 0) + weight);
      }
    }
  }
  // Back / neck pain: new pain → General Physician (simple pain relief, keep active);
  // weeks/months or recurring → Physiotherapy.
  const backClauses = clauses(t).filter((c) => {
    const m = BACK_PAIN.exec(c);
    return m && !isNegatedMention(c, m.index, m[0].length);
  });
  if (backClauses.length) {
    const target = CHRONIC.test(t) ? Specialty.PHYSIOTHERAPY : Specialty.GENERAL;
    scores.set(target, (scores.get(target) ?? 0) + (target === Specialty.PHYSIOTHERAPY ? 2 : 1));
  }
  return scores;
}

/**
 * Keep the model's department unless it is vague (General Physician / none) or
 * has no support in the patient's words while another department clearly does.
 * Example: "sore throat and fever" → ENT, "kamar mein dard" → Physiotherapy.
 */
export function refineSpecialty(model: Specialty | null, text: string): Specialty | null {
  const scores = specialtyScores(text);
  let best: Specialty | null = null;
  let bestScore = 0;
  for (const [s, n] of scores) {
    if (n > bestScore) {
      best = s;
      bestScore = n;
    }
  }
  if (!best) return model;
  // A vague answer for a child goes to the paediatrician.
  if ((model === null || model === Specialty.GENERAL) && scores.has(Specialty.PEDIATRICS)) return Specialty.PEDIATRICS;
  if (model === null || model === Specialty.GENERAL) return best;
  // An imaging question is for the radiologist; keep it.
  if (model === Specialty.RADIOLOGY) return model;
  if (!scores.has(model)) return best;
  return model;
}

export function guessSpecialty(text: string): Specialty {
  return refineSpecialty(Specialty.GENERAL, text) ?? Specialty.GENERAL;
}

const T = {
  duration: {
    en: ['Thanks for telling me. How long have you had this?', ['Since today', '2–3 days', 'About a week', 'More than 2 weeks']],
    'roman-ur': ['Batane ka shukriya. Yeh takleef kab se hai?', ['Aaj se', '2–3 din', 'Taqreeban 1 hafta', '2 hafte se zyada']],
    ur: ['بتانے کا شکریہ۔ یہ تکلیف کب سے ہے؟', ['آج سے', '2–3 دن', 'تقریباً ایک ہفتہ', 'دو ہفتے سے زیادہ']],
  },
  severity: {
    en: ['How bad is it right now?', ['Mild', 'Moderate', 'Severe']],
    'roman-ur': ['Abhi takleef kitni shadeed hai?', ['Halki', 'Darmiyani', 'Bohat zyada']],
    ur: ['ابھی تکلیف کتنی شدید ہے؟', ['ہلکی', 'درمیانی', 'بہت زیادہ']],
  },
  associated: {
    en: ['Do you also have any of these?', ['Fever', 'Vomiting', 'Weakness', 'None of these']],
    'roman-ur': ['Kya inmein se koi aur alamat bhi hai?', ['Bukhar', 'Ulti', 'Kamzori', 'Inmein se koi nahi']],
    ur: ['کیا ان میں سے کوئی اور علامت بھی ہے؟', ['بخار', 'الٹی', 'کمزوری', 'ان میں سے کوئی نہیں']],
  },
} as const;

const ASSESS: Record<ChatLanguage, (s: string, u: Urgency) => string> = {
  en: (s, u) =>
    `Based on what you've shared, the right department is ${s}. ` +
    (u === 'soon'
      ? 'Because of how long or how strongly this has affected you, please see a doctor within the next day or two.'
      : 'This does not sound urgent, but a check-up will help.') +
    ' I have prepared a summary you can share with the doctor when you book.',
  'roman-ur': (s, u) =>
    `Aap ki batai hui alamaat ke mutabiq aap ko ${s} ke doctor ko dikhana chahiye. ` +
    (u === 'soon'
      ? 'Takleef ki muddat ya shiddat ki wajah se ek do din mein doctor se zaroor milein.'
      : 'Yeh foran khatre wali baat nahi lagti, lekin check-up behtar rahega.') +
    ' Maine doctor ke liye ek summary tayyar kar di hai jo booking ke sath share ho sakti hai.',
  ur: (s, u) =>
    `آپ کی بتائی ہوئی علامات کے مطابق آپ کو ${s} کے ڈاکٹر کو دکھانا چاہیے۔ ` +
    (u === 'soon'
      ? 'تکلیف کی مدت یا شدت کی وجہ سے ایک دو دن میں ڈاکٹر سے ضرور ملیں۔'
      : 'یہ فوری خطرے کی بات نہیں لگتی، لیکن چیک اپ بہتر رہے گا۔') +
    ' میں نے ڈاکٹر کے لیے ایک خلاصہ تیار کر دیا ہے جو بکنگ کے ساتھ شیئر ہو سکتا ہے۔',
};

const SELF_CARE: Record<ChatLanguage, string[]> = {
  en: ['Rest and drink plenty of water.', 'Note when symptoms get better or worse to tell your doctor.', 'Seek urgent care if symptoms suddenly get worse.'],
  'roman-ur': ['Aaraam karein aur pani zyada piyein.', 'Alamaat kab kam ya zyada hoti hain, note karein aur doctor ko batayein.', 'Agar takleef achanak barh jaye to foran emergency jayein.'],
  ur: ['آرام کریں اور پانی زیادہ پئیں۔', 'علامات کب کم یا زیادہ ہوتی ہیں، نوٹ کریں اور ڈاکٹر کو بتائیں۔', 'اگر تکلیف اچانک بڑھ جائے تو فوراً ایمرجنسی جائیں۔'],
};

const LONG = /2 weeks|more than|longer|hafte se zyada|2 hafte|دو ہفتے|week|hafta|ہفتہ/i;
const SEVERE = /severe|bohat|bohot|zyada|shadeed|بہت|شدید/i;

export function offlineConsult(messages: Msg[], lang: ChatLanguage): AiConsultReply {
  const userTurns = messages.filter((m) => m.role === 'user').map((m) => m.content);
  const turn = userTurns.length;
  const allText = userTurns.join(' \n ');

  const ask = (key: keyof typeof T): AiConsultReply => {
    const [reply, options] = T[key][lang];
    return {
      reply,
      clinicalReasoning: '',
      urgency: 'routine',
      recommendedSpecialty: null,
      stage: 'interviewing',
      quickReplies: [...options],
      possibleConditions: [],
      selfCare: [],
      medicinePicks: [],
      redFlagsToWatch: [],
      summary: null,
    };
  };

  if (turn <= 1) return ask('duration');
  if (turn === 2) return ask('severity');
  if (turn === 3) return ask('associated');

  const specialty = guessSpecialty(userTurns[0] + ' ' + allText);
  const duration = userTurns[1] ?? '';
  const severity = userTurns[2] ?? '';
  const urgency: Urgency = SEVERE.test(severity) || LONG.test(duration) ? 'soon' : 'routine';

  return {
    reply: ASSESS[lang](specialty, urgency),
    clinicalReasoning: 'Offline rule-based routing by keywords; no model reasoning available.',
    urgency,
    recommendedSpecialty: specialty,
    stage: 'assessment',
    quickReplies: [],
    possibleConditions: [],
    selfCare: SELF_CARE[lang],
    medicinePicks: offlineMedicinePicks(allText),
    redFlagsToWatch: [],
    summary: {
      chiefComplaint: userTurns[0].slice(0, 300),
      duration: duration.slice(0, 120),
      severity: severity.slice(0, 120),
      associatedSymptoms: userTurns[3] ? [userTurns[3].slice(0, 120)] : [],
      relevantHistory: '',
      questionsForDoctor: [],
    },
  };
}
