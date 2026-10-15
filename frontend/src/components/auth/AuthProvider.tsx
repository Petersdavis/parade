"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { User } from "firebase/auth";

import {
  reloadUser as reloadFirebaseUser,
  fetchUserProfile,
  subscribeToAuthState,
  subscribeToIdTokenChanges,
} from "@/lib/auth";
import type { UserProfile } from "@/lib/auth";

/** How often to re-check verification while a signed-in user is unverified. */
const VERIFICATION_POLL_INTERVAL_MS = 5_000;

interface AuthContextValue {
  /** The signed-in user, or null when signed out. */
  user: User | null;
  /** True until the initial auth state has resolved. */
  loading: boolean;
  /** True when the signed-in user's email address has been verified. */
  emailVerified: boolean;
  /** The signed-in user's canonical profile, if loaded. */
  profile: UserProfile | null;
  /** True while the canonical profile is being fetched. */
  profileLoading: boolean;
  /**
   * Reload the current user from Firebase and refresh the context.
   *
   * `emailVerified` is only refreshed on the local `User` after a reload, so
   * this is called on demand (e.g. the verify-email page's check button) and
   * automatically while the user is unverified. Returns the refreshed user, or
   * null when signed out.
   */
  reloadUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  emailVerified: false,
  profile: null,
  profileLoading: false,
  reloadUser: async () => null,
});

/**
 * Provides the current Firebase auth state to the client tree.
 *
 * The Firebase SDK resolves the persisted session asynchronously, so `loading`
 * starts true and flips once `onAuthStateChanged` fires for the first time.
 *
 * Verification is detected automatically: we subscribe to ID-token changes
 * (which fire when the token refreshes after verification) and, while the user
 * is signed in but unverified, poll `user.reload()` and re-check on tab focus.
 * This lets route guards and the verify-email page redirect without the user
 * having to press a button.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Keep a ref to the latest user so the polling effect can read it without
  // re-subscribing on every change.
  const userRef = useRef<User | null>(null);
  userRef.current = user;

  useEffect(() => {
    const unsubscribe = subscribeToAuthState((nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // React to ID-token refreshes, which is how Firebase surfaces a newly
  // verified email on the client `User` object.
  useEffect(() => {
    const unsubscribe = subscribeToIdTokenChanges((nextUser) => {
      setUser(nextUser);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }

    let cancelled = false;
    setProfileLoading(true);
    const currentUser = user;

    async function loadProfile() {
      try {
        const loaded = await fetchUserProfile(currentUser);
        if (!cancelled) {
          setProfile(loaded);
        }
      } catch (error) {
        console.error("Failed to load user profile", error);
        if (!cancelled) {
          setProfile(null);
        }
      } finally {
        if (!cancelled) {
          setProfileLoading(false);
        }
      }
    }

    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const reloadUser = useCallback(async (): Promise<User | null> => {
    const current = userRef.current;
    if (!current) {
      return null;
    }
    const refreshed = await reloadFirebaseUser(current);
    setUser(refreshed);
    return refreshed;
  }, []);

  const emailVerified = user?.emailVerified ?? false;

  // While signed in but unverified, poll for verification and re-check when the
  // tab regains focus (the user often verifies in a different tab).
  useEffect(() => {
    if (!user || emailVerified) {
      return;
    }

    let cancelled = false;

    const check = async () => {
      try {
        const refreshed = await reloadFirebaseUser(user);
        if (!cancelled && refreshed.emailVerified) {
          setUser(refreshed);
        }
      } catch (error) {
        console.error("Failed to refresh verification state", error);
      }
    };

    const timer = window.setInterval(check, VERIFICATION_POLL_INTERVAL_MS);
    const onFocus = () => void check();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [user, emailVerified]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, emailVerified, profile, profileLoading, reloadUser }),
    [user, loading, emailVerified, profile, profileLoading, reloadUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Access the current auth state. Must be used under an `AuthProvider`. */
export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
