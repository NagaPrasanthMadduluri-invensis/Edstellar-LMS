"use client";

import { PortalShell } from "@/components/layout/portal-shell";
import { LearnerSidebar } from "@/components/layout/learner-sidebar";

export function LearnerShell({ user, children }) {
  return (
    <PortalShell user={user} sidebar={<LearnerSidebar />}>
      {children}
    </PortalShell>
  );
}
