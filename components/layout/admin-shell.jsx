"use client";

import { PortalShell } from "@/components/layout/portal-shell";
import { AdminSidebar } from "@/components/layout/admin-sidebar";

export function AdminShell({ user, children }) {
  return (
    <PortalShell user={user} sidebar={<AdminSidebar />}>
      {children}
    </PortalShell>
  );
}
