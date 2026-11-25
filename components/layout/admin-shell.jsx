"use client";

import { PortalShell } from "@/components/layout/portal-shell";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { AdminPageGate } from "@/components/layout/admin-page-gate";

export function AdminShell({ user, children }) {
  return (
    <PortalShell user={user} sidebar={<AdminSidebar />}>
      <AdminPageGate>{children}</AdminPageGate>
    </PortalShell>
  );
}
