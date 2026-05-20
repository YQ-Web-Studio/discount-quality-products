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
        setUser(validatedUser);
        setSessionStatus("authenticated");
        return;
      }

      setUser(null);
      setSessionStatus("unauthenticated");
    } catch (validationError) {
      setError(getFriendlyErrorMessage(validationError));
      setUser(null);
      setSessionStatus("unauthenticated");
    }
  }, []);

  useEffect(() => {
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
