"use client";

import { PortalShell } from "@/components/layout/portal-shell";
import { PlatformSidebar } from "@/components/platform/platform-sidebar";

export function PlatformShell({ user, children }) {
  return (
    <PortalShell user={user} sidebar={<PlatformSidebar />}>
      {children}
    </PortalShell>
  );
}
