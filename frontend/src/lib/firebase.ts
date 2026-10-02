/**
 * Google sign-in through Firebase Authentication (free up to 50,000 users a month).
 * Firebase is only used to prove "this is a Google account"; Vita Care then
 * issues its own session. Configure with the NEXT_PUBLIC_FIREBASE_* variables.
 */
import type { FirebaseApp } from 'firebase/app';

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const googleSignInEnabled = !!(config.apiKey && config.authDomain && config.projectId && config.appId);

let app: FirebaseApp | null = null;

/** Opens the Google popup and returns a Firebase ID token (or throws a friendly error). */
export async function getGoogleIdToken(): Promise<string> {
  if (!googleSignInEnabled) throw new Error('Google sign-in is not set up yet.');
  const { initializeApp, getApps } = await import('firebase/app');
  const { getAuth, GoogleAuthProvider, signInWithPopup, signOut } = await import('firebase/auth');
  app = app ?? getApps()[0] ?? initializeApp(config as Required<typeof config>);
  const auth = getAuth(app);
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    const cred = await signInWithPopup(auth, provider);
    const token = await cred.user.getIdToken();
    await signOut(auth); // Vita Care keeps its own session; Firebase is only used to sign in.
    return token;
  } catch (err) {
    const code = (err as { code?: string }).code ?? '';
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') throw new Error('Google sign-in was cancelled.');
    if (code === 'auth/popup-blocked') throw new Error('Your browser blocked the Google window. Allow pop-ups and try again.');
    if (code === 'auth/unauthorized-domain') throw new Error('This website address is not allowed in Firebase yet (Authentication → Settings → Authorized domains).');
    throw new Error('Google sign-in failed. Please try again.');
  }
}
