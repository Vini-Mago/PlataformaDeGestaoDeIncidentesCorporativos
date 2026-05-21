import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getMe, login, logout, register, type AuthUser } from "./auth";

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  status: "loading" | "authenticated" | "unauthenticated";
  signInWithPassword: (payload: { identifier: string; password: string }) => Promise<void>;
  registerWithPassword: (payload: {
    name: string;
    email: string;
    login?: string;
    password: string;
    department?: string;
    jobTitle?: string;
  }) => Promise<void>;
  signInWithGoogle: () => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthContextValue["status"]>("loading");

  const recoverSession = useCallback(async () => {
    try {
      const me = await getMe();
      setUser(me);
      setStatus("authenticated");
    } catch {
      setUser(null);
      setStatus("unauthenticated");
    }
  }, []);

  useEffect(() => {
    void recoverSession();
  }, [recoverSession]);

  const signInWithGoogle = useCallback(() => {
    window.location.assign("/auth/google");
  }, []);

  const signInWithPassword = useCallback(async (payload: { identifier: string; password: string }) => {
    const me = await login(payload);
    setUser(me);
    setStatus("authenticated");
  }, []);

  const registerWithPassword = useCallback(async (payload: {
    name: string;
    email: string;
    login?: string;
    password: string;
    department?: string;
    jobTitle?: string;
  }) => {
    const me = await register(payload);
    setUser(me);
    setStatus("authenticated");
  }, []);

  const signOut = useCallback(async () => {
    try {
      await logout();
    } finally {
      setUser(null);
      setStatus("unauthenticated");
    }
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isAuthenticated: Boolean(user),
    status,
    signInWithPassword,
    registerWithPassword,
    signInWithGoogle,
    signOut,
  }), [registerWithPassword, signInWithGoogle, signInWithPassword, signOut, status, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
