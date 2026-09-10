"use client";

import { createContext, useCallback, useEffect, useMemo, useState } from "react";
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

      /**
       * A FULL document navigation, not `router.replace()`.
       *
       * The App Router keeps a client-side Router Cache of RSC payloads. If
       * this browser touched a protected route before signing in — which is
       * the normal way to arrive at the login page — the cached payload for
       * that route is a REDIRECT BACK TO /login, produced while there was no
       * session. `router.replace(destination)` can serve that stale payload,
       * so a successful login bounces straight back to the login page even
       * though the cookie is now valid and `/api/auth/me` answers 200.
       *
       * `router.refresh()` was meant to cover it, but it races: `replace()`
       * has already begun navigating from the cache by the time the refresh
       * invalidates it. That is the "logged in, waited a few seconds, ended up
       * back on /login" shape, and it is indistinguishable in the browser from
       * a genuine session failure.
       *
       * A hard navigation has no cache to replay and re-runs every Server
       * Component layout against the new cookie. It costs one page load, once,
       * at the only moment in the app where that is unarguably fine.
       */
      window.location.assign(destination);

      return { user: normalizedUser };
    },
    [],
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

      // Same hard navigation as login. (Self-service registration is retired
      // — the API answers 422 — but leaving the stale pattern here is how it
      // gets copied back into something live.)
      window.location.assign("/dashboard");

      return { user: normalizedUser };
    },
    [],
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
    // Hard navigation, for the same reason as login (see above) but in the
    // other direction: the Router Cache still holds SIGNED-IN payloads for
    // every route this session visited, so a soft replace can render the app
    // shell to someone who has just signed out.
    window.location.assign("/login");
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const data = await getCurrentUser();
      const normalizedUser = normalizeUser(data.user);
      setUser(normalizedUser);
      return normalizedUser;
    } catch {
      setUser(null);
      window.location.assign("/login");
      return null;
    }
  }, []);

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
