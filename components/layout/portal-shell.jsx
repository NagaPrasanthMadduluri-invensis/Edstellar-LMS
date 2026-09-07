"use client";

import { SidebarProvider } from "@/components/ui/sidebar";
import { TopNav } from "@/components/layout/top-nav";
import { AuthProvider } from "@/providers/auth-provider";
import Box from "@/components/ui/box";

/**
 * The frame every authenticated portal renders inside. Learner, admin and
 * platform shells were three byte-identical copies apart from which sidebar
 * they named, so a layout fix had to be made three times or it was made once
 * and the portals diverged.
 *
 * Two classes on <main> carry the responsive behaviour:
 *
 * `min-w-0` — without it this flex child adopts the width of its widest
 * descendant instead of the width of the viewport. A data table then stretches
 * the whole page and the BODY scrolls sideways, dragging the header and sidebar
 * out of view, even though `ui/table.jsx` already wraps every table in its own
 * `overflow-x-auto`. With it, the flex child stays viewport-width and each wide
 * child scrolls inside its own container, which is what was intended all along.
 * This is the fix behind most of the horizontal-scroll bugs on phones.
 *
 * `p-4 sm:p-5 lg:p-6` — a flat p-6 spent 48px of a 375px screen on gutters.
 */
export function PortalShell({ user, sidebar, children }) {
  return (
    <AuthProvider initialUser={user}>
      <SidebarProvider>
        <Box className="flex h-full flex-col">
          <TopNav />
          <Box className="flex flex-1 overflow-hidden">
            {sidebar}
            <Box
              as="main"
              className="min-w-0 flex-1 overflow-auto bg-muted/30 p-4 sm:p-5 lg:p-6"
            >
              {children}
            </Box>
          </Box>
        </Box>
      </SidebarProvider>
    </AuthProvider>
  );
}
