/**
 * Firebase Authentication helpers.
 *
 * All auth is client-side: the frontend is a fully static export, so there is
 * no request-time server. The Firebase SDK manages ID-token refresh and
 * persistence (localStorage by default) on its own.
 *
 * This module is intentionally free of React so it can be unit-tested and
 * reused from any client component.
 */

import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type Auth,
  type User,
  type UserCredential,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

import { getFirebaseAuth, getFirebaseFirestore } from "./firebase";

/** Firestore collection holding one profile document per user. */
export const USERS_COLLECTION = "users";

/** Shape of the `users/{uid}` Firestore document created on first sign-up. */
export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  /** Auth providers linked to the account, e.g. ["password", "google.com"]. */
  providers: string[];
  createdAt: unknown;
  updatedAt: unknown;
}

/** OAuth providers supported by the registration/login UI. */
export type OAuthProviderId = "google";

function auth(): Auth {
  return getFirebaseAuth();
}

/**
 * Create the `users/{uid}` profile document if it does not already exist.
 *
 * Idempotent: safe to call on every sign-in. Uses `getDoc` first so we never
 * clobber fields written by later flows (profile wizard, verification, etc.).
 */
export async function ensureUserProfile(user: User): Promise<void> {
  const db = getFirebaseFirestore();
  const ref = doc(db, USERS_COLLECTION, user.uid);
  const snapshot = await getDoc(ref);

  if (snapshot.exists()) {
    // Keep lightweight, auth-owned fields fresh without touching profile data.
    await setDoc(
      ref,
      {
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        providers: user.providerData.map((p) => p.providerId),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    return;
  }

  await setDoc(ref, {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    providers: user.providerData.map((p) => p.providerId),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Best-effort profile provisioning.
 *
 * A failure here (e.g. Firestore not provisioned, rules not yet deployed) must
 * never block authentication or the post-login redirect. We log and swallow the
 * error so the auth flow stays resilient; the profile can be reconciled later.
 */
async function ensureUserProfileSafely(user: User): Promise<void> {
  try {
    await ensureUserProfile(user);
  } catch (error) {
    console.error("Failed to provision user profile document", error);
  }
}

/** Sign up with email + password, then create the profile document. */
export async function signUpWithEmail(
  email: string,
  password: string,
  displayName?: string,
): Promise<UserCredential> {
  const credential = await createUserWithEmailAndPassword(auth(), email, password);

  if (displayName) {
    await updateProfile(credential.user, { displayName });
  }

  await ensureUserProfileSafely(credential.user);
  return credential;
}

/** Sign in with email + password, ensuring a profile document exists. */
export async function signInWithEmail(email: string, password: string): Promise<UserCredential> {
  const credential = await signInWithEmailAndPassword(auth(), email, password);
  await ensureUserProfileSafely(credential.user);
  return credential;
}

/** Sign in (or sign up) with a Google popup, then ensure the profile document. */
export async function signInWithGoogle(): Promise<UserCredential> {
  const provider = new GoogleAuthProvider();
  // Always let the user choose an account rather than silently reusing one.
  provider.setCustomParameters({ prompt: "select_account" });

  const credential = await signInWithPopup(auth(), provider);
  await ensureUserProfileSafely(credential.user);
  return credential;
}

/** Sign the current user out. */
export async function signOutUser(): Promise<void> {
  await signOut(auth());
}

/** Subscribe to auth state changes. Returns the unsubscribe function. */
export function subscribeToAuthState(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth(), callback);
}

/**
 * Map a Firebase Auth error code to a clear, user-facing message.
 *
 * Firebase error messages are terse and sometimes leak implementation detail;
 * we translate the common codes into friendly copy and fall back gracefully.
 */
export function getAuthErrorMessage(error: unknown): string {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : "";

  switch (code) {
    case "auth/email-already-in-use":
      return "An account with this email already exists. Try signing in instead.";
    case "auth/invalid-email":
      return "That email address doesn't look valid.";
    case "auth/weak-password":
      return "Please choose a stronger password (at least 8 characters).";
    case "auth/missing-password":
      return "Please enter your password.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Incorrect email or password.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Sign-in was cancelled.";
    case "auth/popup-blocked":
      return "Your browser blocked the sign-in popup. Please allow popups and try again.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    case "auth/operation-not-allowed":
      return "This sign-in method isn't enabled. Please contact support.";
    default:
      return "Something went wrong. Please try again.";
  }
}
