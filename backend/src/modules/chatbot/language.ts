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
];

/** Best-effort detection of the language a message is written in. */
export function detectLanguage(text: string): ChatLanguage {
  if (/[\u0600-\u06FF]/.test(text)) return 'ur';
  const words = text.toLowerCase().match(/[a-z]+/g) ?? [];
  const hits = words.filter((w) => ROMAN_URDU_MARKERS.includes(w)).length;
  // Short English messages can contain "se" or "main"; require a couple of hits
  // and a meaningful share of the message.
  return hits >= 2 && hits / Math.max(words.length, 1) >= 0.2 ? 'roman-ur' : 'en';
}

export function isChatLanguage(value: unknown): value is ChatLanguage {
  return value === 'en' || value === 'ur' || value === 'roman-ur';
}
