import { Specialty } from '../../common/enums';
import type { ChatLanguage } from './language';
import type { AiConsultReply, Urgency } from './chatbot.helpers';

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

const KEYWORDS: Array<[Specialty, RegExp]> = [
  [Specialty.HEART_CARE, /chest|palpitation|heart|blood pressure|\bbp\b|dil\b|dhadkan|seen[ae]|سینے|دل|دھڑکن/],
  [Specialty.NEUROLOGY, /headache|migraine|dizz|numb|tingl|memory|faint|(sar|sir) ?(me|mein)? ?dard|chakkar|سر درد|سر میں درد|چکر/],
  [Specialty.PEDIATRICS, /\bbaby\b|infant|toddler|my (son|daughter|child|kid)|bach(a|i|ay|e|ey)\b|بچ/],
  [Specialty.GYNECOLOGY, /period|menstru|pregnan|vaginal|pcos|mahwari|hamal|حمل|ماہواری/],
  [Specialty.DERMATOLOGY, /rash|itch|skin|acne|eczema|pimple|kharish|daane|daney|jild|خارش|جلد|دانے/],
  [Specialty.PSYCHIATRY, /anxi|depress|stress|panic|insomnia|can'?t sleep|ghabrahat|udaas|udas|neend|نیند|گھبراہٹ|اداس/],
  [Specialty.ENT, /\bear\b|nose|throat|sinus|tonsil|hearing|kaan|naak|gala|کان|ناک|گلا/],
  [Specialty.OSTEOPOROSIS, /joint|knee|back pain|bone|fracture|arthrit|ghutn|kamar|jor|haddi|گھٹن|کمر|جوڑ|ہڈی/],
];

export function guessSpecialty(text: string): Specialty {
  const t = text.toLowerCase();
  let best: Specialty = Specialty.GENERAL;
  let bestScore = 0;
  for (const [specialty, re] of KEYWORDS) {
    const score = (t.match(new RegExp(re.source, 'g')) ?? []).length;
    if (score > bestScore) {
      best = specialty;
      bestScore = score;
    }
  }
  return best;
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
