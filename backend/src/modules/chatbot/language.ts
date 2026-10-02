/** The three ways Pakistani patients actually type. */
export type ChatLanguage = 'en' | 'ur' | 'roman-ur';

export const LANGUAGE_NAMES: Record<ChatLanguage, string> = {
  en: 'English',
  ur: 'Urdu (Urdu script)',
  'roman-ur': 'Roman Urdu (Urdu written in English letters)',
};

const ROMAN_URDU_MARKERS = [
  'mujhe', 'mujhay', 'mera', 'meri', 'mere', 'hai', 'hain', 'hy', 'ho', 'raha', 'rahi',
  'nahi', 'nahin', 'kya', 'kyun', 'kaise', 'bohat', 'bohot', 'bahut', 'dard', 'bukhar',
  'khansi', 'zukam', 'sar', 'sir', 'pait', 'chakkar', 'se', 'mein', 'main', 'aur', 'tha',
  'thi', 'din', 'kal', 'aaj', 'ghar', 'dawai', 'dawa', 'hua', 'hui', 'lag', 'kar', 'ki', 'ka',
  // SMS-style spellings people actually type: "mjhe sir m bht drd hrha he"
  'mjhe', 'mje', 'mujhy', 'mjy', 'bht', 'bhot', 'bohut', 'drd', 'dard', 'hrha', 'hrhi', 'rha', 'rhi', 'ho rha',
  'he', 'h', 'hy', 'hn', 'kia', 'ky', 'ni', 'nhi', 'nai', 'sr', 'm', 'mn', 'mai', 'me', 'k', 'ke', 'ko', 'b', 'bhi',
  'kuch', 'koi', 'abhi', 'kab', 'kese', 'kaisy', 'pet', 'gala', 'kamar', 'bukhaar', 'thakan', 'kamzori', 'ulti',
];

const STRONG_MARKERS = new Set([
  'mujhe', 'mujhay', 'mjhe', 'mje', 'mujhy', 'mjy', 'hai', 'hain', 'raha', 'rahi', 'hrha', 'hrhi', 'rha', 'rhi',
  'nahi', 'nahin', 'nhi', 'kya', 'kia', 'bohat', 'bohot', 'bahut', 'bht', 'bhot', 'bohut', 'dard', 'drd',
  'bukhar', 'bukhaar', 'khansi', 'zukam', 'pait', 'chakkar', 'mein', 'aur', 'hua', 'hui', 'kamar', 'gala', 'ulti',
  'kuch', 'abhi', 'kese', 'kaise', 'thakan', 'kamzori',
]);

/** Best-effort detection of the language a message is written in. */
export function detectLanguage(text: string): ChatLanguage {
  if (/[\u0600-\u06FF]/.test(text)) return 'ur';
  const words = text.toLowerCase().match(/[a-z]+/g) ?? [];
  const hits = words.filter((w) => ROMAN_URDU_MARKERS.includes(w)).length;
  // Short English messages can contain "se" or "main"; require a couple of hits
  // and a meaningful share of the message.
  // Words that are only Urdu (not also common English words like "he", "me", "m", "b").
  const strong = words.filter((w) => STRONG_MARKERS.has(w)).length;
  return hits >= 2 && strong >= 1 && hits / Math.max(words.length, 1) >= 0.3 ? 'roman-ur' : 'en';
}

export function isChatLanguage(value: unknown): value is ChatLanguage {
  return value === 'en' || value === 'ur' || value === 'roman-ur';
}

/** Does this text look like it is written in the given language? */
export function inLanguage(text: string, lang: ChatLanguage): boolean {
  const urduScript = /[\u0600-\u06FF]/.test(text);
  if (lang === 'ur') return urduScript;
  if (urduScript) return false;
  const detected = detectLanguage(text);
  return lang === 'roman-ur' ? detected === 'roman-ur' : detected === 'en';
}
