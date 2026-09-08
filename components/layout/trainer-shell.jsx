"use client";

import { PortalShell } from "@/components/layout/portal-shell";
import { TrainerSidebar } from "@/components/layout/trainer-sidebar";

export function TrainerShell({ user, children }) {
  return (
    <PortalShell user={user} sidebar={<TrainerSidebar />}>
      {children}
    </PortalShell>
  );
}
