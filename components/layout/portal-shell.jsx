"use client";

import { SidebarProvider } from "@/components/ui/sidebar";
import { TopNav } from "@/components/layout/top-nav";
import { SupportSessionBanner } from "@/components/layout/support-session-banner";
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
      {/* Default-closed icon rail on desktop; a collapsible group opens its
          items in a flyout popup on hover (see `layout/sidebar-nav.jsx`,
          FlyoutSection). On mobile it is an off-canvas sheet from the top bar. */}
      <SidebarProvider defaultOpen={false}>
        {/* The sidebar is now a FULL-HEIGHT rail on the left (its header carries
            the logo + name + theme strip); the top bar lives at the top of the
            content column to its right, transparent over the themed body mesh. */}
        <Box className="flex h-full">
          {sidebar}
          <Box className="flex min-w-0 flex-1 flex-col overflow-hidden">
            {/* Outside the scroll container, so a support session is visible on
                every page without each one remembering to say so. Renders
                nothing in an ordinary session. */}
            <SupportSessionBanner session={user?.impersonation} />
            <TopNav />
            <Box
              as="main"
              className="min-w-0 flex-1 overflow-auto p-4 sm:p-5 lg:p-6"
            >
              {children}
            </Box>
          </Box>
        </Box>
      </SidebarProvider>
    </AuthProvider>
  );
}
