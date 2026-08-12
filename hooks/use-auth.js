"use client";

import { useContext } from "react";
import { AuthContext } from "@/providers/auth-provider";

/**
 * Hook to access auth state and actions across the entire app.
 *
 * Returns:
 *   user          — { id, firstName, lastName, name, email, role, roleLabel, initials, isActive }
 *   token         — Bearer token string
 *   loading       — true while hydrating from cookies
 *   isAuthenticated — boolean
 *   login({ email, password })    — authenticate and redirect by role
 *   register({ firstName, lastName, email, password, passwordConfirmation }) — create account
 *   logout()      — revoke token on server, clear cookies, redirect to /login
 *   refreshUser() — re-fetch user from GET /auth/me and update state
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
