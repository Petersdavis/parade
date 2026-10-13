"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { User } from "firebase/auth";

import { subscribeToAuthState } from "@/lib/auth";

interface AuthContextValue {
  /** The signed-in user, or null when signed out. */
  user: User | null;
  /** True until the initial auth state has resolved. */
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({ user: null, loading: true });

/**
 * Provides the current Firebase auth state to the client tree.
 *
 * The Firebase SDK resolves the persisted session asynchronously, so `loading`
 * starts true and flips once `onAuthStateChanged` fires for the first time.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToAuthState((nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value = useMemo<AuthContextValue>(() => ({ user, loading }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Access the current auth state. Must be used under an `AuthProvider`. */
export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
