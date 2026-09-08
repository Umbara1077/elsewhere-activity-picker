import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
const config = { apiKey: import.meta.env.VITE_FIREBASE_API_KEY, authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN, projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID, appId: import.meta.env.VITE_FIREBASE_APP_ID };
export const firebaseReady = Boolean(config.apiKey && config.projectId && config.appId && config.authDomain);
const app = firebaseReady ? initializeApp(config) : null;
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
export async function googleSignIn() { if (!auth) throw new Error('Google sign-in will be available once this app is connected to Firebase. You can explore and save places on this device in the meantime.'); return signInWithPopup(auth, new GoogleAuthProvider()); }
export async function logOut() { if (auth) await signOut(auth); }
