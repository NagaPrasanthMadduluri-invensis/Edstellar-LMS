"use client";

import { SidebarProvider } from "@/components/ui/sidebar";
import { TopNav } from "@/components/layout/top-nav";
import { LearnerSidebar } from "@/components/layout/learner-sidebar";
import { AuthProvider } from "@/providers/auth-provider";
import Box from "@/components/ui/box";

export function LearnerShell({ user, children }) {
  return (
    <AuthProvider initialUser={user}>
      <SidebarProvider>
        <Box className="flex h-full flex-col">
          <TopNav portalLabel="Edstellar LMS" />
          <Box className="flex flex-1 overflow-hidden">
            <LearnerSidebar />
            <Box as="main" className="flex-1 overflow-auto p-6 bg-muted/30">
              {children}
            </Box>
          </Box>
        </Box>
      </SidebarProvider>
    </AuthProvider>
  );
}
