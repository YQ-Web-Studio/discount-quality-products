"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import {
  fetchAccountSession,
  loginAccount,
  logoutAccount,
  registerAccount,
} from "@/lib/auth-api";
import type { AuthUser } from "@/lib/auth-types";
import { useBasket } from "@/lib/useBasket";

type SessionStatus = "checking" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  user: AuthUser | null;
  sessionStatus: SessionStatus;
  isLoading: boolean;
  error: string | null;
  login: (identifier: string, password: string) => Promise<AuthUser>;
  register: (name: string, email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function getFriendlyErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Something went wrong while we tried to manage your account.";
}

const ANON_SESSION_KEY = "dqp_session_anon";

function safeReadAnonMarker(): boolean {
  try {
    return typeof window !== "undefined" && window.sessionStorage.getItem(ANON_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

function safeSetAnonMarker(): void {
  try {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(ANON_SESSION_KEY, "1");
    }
  } catch {
    // Best-effort only: restricted browser storage must never block auth flows
  }
}

function safeClearAnonMarker(): void {
  try {
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(ANON_SESSION_KEY);
    }
  } catch {
    // Best-effort only: restricted browser storage must never block auth flows
  }
}

function hasLoggedInHintCookie(): boolean {
  try {
    return (
      typeof document !== "undefined" &&
      document.cookie.split("; ").some((c) => c.startsWith("dqp_logged_in=1"))
    );
  } catch {
    return false;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>("checking");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLoading = sessionStatus === "checking" || isAuthenticating;

  const refreshSession = useCallback(async () => {
    setSessionStatus("checking");
    setError(null);

    try {
      const validatedUser = await fetchAccountSession();
      if (validatedUser) {
        safeClearAnonMarker();
        setUser(validatedUser);
        setSessionStatus("authenticated");
        return;
      }

      safeSetAnonMarker();
      setUser(null);
      setSessionStatus("unauthenticated");
    } catch (validationError) {
      setError(getFriendlyErrorMessage(validationError));
      setUser(null);
      setSessionStatus("unauthenticated");
    }
  }, []);

  useEffect(() => {
    if (!hasLoggedInHintCookie() && safeReadAnonMarker()) {
      let cancelled = false;
      queueMicrotask(() => {
        if (!cancelled) {
          setUser(null);
          setSessionStatus("unauthenticated");
        }
      });
      return () => {
        cancelled = true;
      };
    }

    void refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    if (sessionStatus === "authenticated" && user) {
      useBasket.getState().setActiveUser(String(user.id));
    } else if (sessionStatus === "unauthenticated") {
      useBasket.getState().setActiveUser(null);
    }
  }, [sessionStatus, user]);

  const login = useCallback(async (identifier: string, password: string) => {
    setIsAuthenticating(true);
    setError(null);

    try {
      const accountUser = await loginAccount(identifier, password);
      safeClearAnonMarker();
      setUser(accountUser);
      setSessionStatus("authenticated");
      return accountUser;
    } catch (loginError) {
      setError(getFriendlyErrorMessage(loginError));
      throw loginError instanceof Error
        ? loginError
        : new Error(getFriendlyErrorMessage(loginError));
    } finally {
      setIsAuthenticating(false);
    }
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    setIsAuthenticating(true);
    setError(null);

    try {
      const accountUser = await registerAccount(name, email, password);
      safeClearAnonMarker();
      setUser(accountUser);
      setSessionStatus("authenticated");
      return accountUser;
    } catch (registerError) {
      setError(getFriendlyErrorMessage(registerError));
      throw registerError instanceof Error
        ? registerError
        : new Error(getFriendlyErrorMessage(registerError));
    } finally {
      setIsAuthenticating(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await logoutAccount().catch(() => undefined);
    safeSetAnonMarker();
    setUser(null);
    setSessionStatus("unauthenticated");
    setError(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      sessionStatus,
      isLoading,
      error,
      login,
      register,
      logout,
      refreshSession,
    }),
    [user, sessionStatus, isLoading, error, login, register, logout, refreshSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }

  return context;
}
