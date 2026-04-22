"use client";

import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  loginUser,
  registerUser,
  logoutUser,
  getCurrentUser,
  setAuthCookies,
  getTokenFromCookie,
  getUserFromCookie,
  clearAuthCookies,
} from "@/services/api/auth/auth-api";

export const AuthContext = createContext(null);

export function AuthProvider({ children, initialUser }) {
  const [user, setUser] = useState(initialUser || null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(!initialUser);
  const router = useRouter();

  // Hydrate token + user from cookies on mount
  useEffect(() => {
    const storedToken = getTokenFromCookie();
    if (storedToken) {
      setToken(storedToken);
    }

    if (!initialUser) {
      const storedUser = getUserFromCookie();
      if (storedUser) {
        setUser(storedUser);
      }
      setLoading(false);
    }
  }, [initialUser]);

  /**
   * Login with email/password → store token + user → redirect by role
   */
  const login = useCallback(
    async ({ email, password }) => {
      const data = await loginUser({ email, password });
      const normalizedUser = setAuthCookies(data);
      setToken(data.token);
      setUser(normalizedUser);

      if (normalizedUser.role?.slug === "lms_admin") {
        router.push("/admin/dashboard");
      } else {
        router.push("/dashboard");
      }

      return { token: data.token, user: normalizedUser };
    },
    [router]
  );

  /**
   * Register new account → store token + user → redirect to dashboard
   */
  const register = useCallback(
    async ({ firstName, lastName, email, password, department }) => {
      const data = await registerUser({
        firstName,
        lastName,
        email,
        password,
        department,
      });
      const normalizedUser = setAuthCookies(data);
      setToken(data.token);
      setUser(normalizedUser);

      router.push("/dashboard");
      return { token: data.token, user: normalizedUser };
    },
    [router]
  );

  /**
   * Logout → revoke token on server → clear cookies → redirect to login
   */
  const logout = useCallback(async () => {
    const currentToken = getTokenFromCookie();
    if (currentToken) {
      await logoutUser(currentToken);
    }
    clearAuthCookies();
    setToken(null);
    setUser(null);
    router.push("/login");
  }, [router]);

  /**
   * Refresh user data from the server (GET /auth/me)
   */
  const refreshUser = useCallback(async () => {
    const currentToken = getTokenFromCookie();
    if (!currentToken) return null;

    try {
      const data = await getCurrentUser(currentToken);
      const normalizedUser = setAuthCookies({ token: currentToken, user: data.user });
      setUser(normalizedUser);
      return normalizedUser;
    } catch {
      // Token expired or invalid — force logout
      clearAuthCookies();
      setToken(null);
      setUser(null);
      router.push("/login");
      return null;
    }
  }, [router]);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      login,
      register,
      logout,
      refreshUser,
      isAuthenticated: !!user && !!token,
    }),
    [user, token, loading, login, register, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
