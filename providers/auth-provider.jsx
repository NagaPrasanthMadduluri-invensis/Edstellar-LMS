"use client";

import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  loginUser,
  registerUser,
  logoutUser,
  getCurrentUser,
  normalizeUser,
} from "@/services/api/auth/auth-api";

export const AuthContext = createContext(null);

export function AuthProvider({ children, initialUser }) {
  const [user, setUser] = useState(initialUser || null);
  const [loading, setLoading] = useState(!initialUser);
  const router = useRouter();

  /**
   * With an HttpOnly cookie there is nothing to hydrate from client storage —
   * the browser holds the credential. When the shell did not supply a user
   * (the auth pages), ask the server who we are.
   */
  useEffect(() => {
    if (initialUser) return;

    let cancelled = false;
    getCurrentUser()
      .then((data) => {
        if (!cancelled) setUser(normalizeUser(data.user));
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [initialUser]);

  /** Login → server sets the cookie → redirect by role. */
  const login = useCallback(
    async ({ email, password }) => {
      const data = await loginUser({ email, password });
      const normalizedUser = normalizeUser(data.user);
      // normalizeUser returns null for a response that carried no user, and
      // reading .role off that produced a bare TypeError that said nothing
      // about the cause. Say what was actually wrong instead.
      if (!normalizedUser) {
        throw new Error(
          "Signed in, but the server's response carried no user, so there is " +
            "no role to route on. The API may not be reachable.",
        );
      }
      setUser(normalizedUser);

      const destination =
        normalizedUser.role === "admin"
          ? "/admin/dashboard"
          : normalizedUser.role === "trainer"
            ? "/trainer/sessions"
            : "/dashboard";

      // refresh() re-runs the Server Component layouts so the shell picks up
      // the new cookie; without it the redirect can render the signed-out tree.
      router.replace(destination);
      router.refresh();

      return { user: normalizedUser };
    },
    [router],
  );

  const register = useCallback(
    async ({ firstName, lastName, email, password, department }) => {
      const data = await registerUser({
        firstName,
        lastName,
        email,
        password,
        department,
      });
      const normalizedUser = normalizeUser(data.user);
      if (!normalizedUser) {
        throw new Error(
          "Registered, but the server's response carried no user. The API may " +
            "not be reachable.",
        );
      }
      setUser(normalizedUser);

      router.replace("/dashboard");
      router.refresh();

      return { user: normalizedUser };
    },
    [router],
  );

  /** Logout now reaches the server, which clears the cookie. */
  const logout = useCallback(async () => {
    try {
      await logoutUser();
    } catch {
      // Even if the call fails, drop local state and send the user to /login;
      // middleware will bounce them back if the cookie somehow survived.
    }
    setUser(null);
    router.replace("/login");
    router.refresh();
  }, [router]);

  const refreshUser = useCallback(async () => {
    try {
      const data = await getCurrentUser();
      const normalizedUser = normalizeUser(data.user);
      setUser(normalizedUser);
      return normalizedUser;
    } catch {
      setUser(null);
      router.replace("/login");
      return null;
    }
  }, [router]);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      logout,
      refreshUser,
      isAuthenticated: Boolean(user),
      /**
       * Always null. The credential is an HttpOnly cookie that JavaScript
       * cannot read. Kept so the components still destructuring `token` keep
       * working — they send the cookie automatically. Remove once every module
       * has moved to the server.
       */
      token: null,
    }),
    [user, loading, login, register, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
