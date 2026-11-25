"use client";

import { useMemo } from "react";

import { useAuth } from "@/hooks/use-auth";
import { canAny, heldPermissions } from "@/lib/permissions";

/**
 * `const { can, canAny } = usePermissions()` for hiding buttons the caller's
 * role cannot use. Reads the same `permissions[]` claim the API enforces, so a
 * hidden button is one whose request would have answered 403.
 */
export function usePermissions() {
  const { user } = useAuth();
  return useMemo(() => {
    const held = heldPermissions(user);
    return {
      user,
      can: (permission) => held.has(permission),
      canAny: (permissions) => canAny(user, permissions),
    };
  }, [user]);
}
