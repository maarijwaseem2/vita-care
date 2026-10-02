/**
 * A new "Continue with Google" user first picks a role and fills in details.
 * The short-lived signup token from the server is kept in this tab only.
 */
const KEY = 'vitacare_google_signup';

export interface GoogleSignup {
  token: string;
  email: string;
  name: string;
}

export const googleSignup = {
  set: (g: GoogleSignup) => sessionStorage.setItem(KEY, JSON.stringify(g)),
  get: (): GoogleSignup | null => {
    if (typeof window === 'undefined') return null;
    try {
      return JSON.parse(sessionStorage.getItem(KEY) ?? 'null');
    } catch {
      return null;
    }
  },
  clear: () => sessionStorage.removeItem(KEY),
};

/** "Sara Google Khan" → ["Sara", "Google Khan"] */
export function splitName(name: string): [string, string] {
  const [first, ...rest] = name.trim().split(/\s+/);
  return [first ?? '', rest.join(' ')];
}
