"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { UserAvatar } from "@/components/shared/user-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Building2, KeyRound, LogOut, User } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { useAuth } from "@/hooks/use-auth";
import { NotificationBell } from "@/components/layout/notification-bell";
import { ThemeSwitcher } from "@/components/layout/theme-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { MyProfileDialog } from "@/components/shared/my-profile-dialog";
// In `shared/`, not `admin/`: this shell is rendered by all four portals, and
// TASTE §1.2 forbids portal-specific imports reaching across. Only a tenant
// admin ever OPENS it — that is `showOrgSettings` below, not the file's home.
import { OrganizationSettingsDialog } from "@/components/shared/organization-settings-dialog";

/**
 * The top bar — transparent, sitting in the content column to the RIGHT of the
 * full-height sidebar (the brand/logo lives in the sidebar header now, see
 * `sidebar-brand.jsx`). It has no background of its own, so the themed body
 * mesh shows straight through; its content is therefore DARK (the page behind
 * is a light scene), unlike the dark chrome of the sidebar.
 *
 * Left: the live date (and, below lg, the sidebar trigger — the only way to
 * reach the off-canvas nav on a phone). Right: the THEME on/off toggle, the
 * bell, and the account menu (which still carries the fuller colour + scene
 * picker; the sidebar strip is the quick hue switch).
 */
export function TopNav() {
  const { user, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [orgOpen, setOrgOpen] = useState(false);
  const [today, setToday] = useState("");

  // Computed after mount: the server and the browser can sit in different time
  // zones, and a date rendered on both would mismatch on hydration.
  useEffect(() => {
    setToday(
      new Date().toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    );
  }, []);

  /**
   * Organization settings is a TENANT admin's screen. A platform admin has the
   * whole Tenant Directory instead; a learner or trainer has no business in it —
   * the API answers 403 for all three, so the item is not offered rather than
   * offered and refused (TASTE §10.3.1.2).
   */
  const showOrgSettings = user?.role === "admin" && !user?.isPlatformAdmin;

  /** No shared change-password route; each portal has its own. */
  const changePassword =
    user?.role === "trainer"
      ? "/trainer/change-password"
      : user?.role === "admin"
        ? (user?.isPlatformAdmin ? "/platform/change-password" : "/admin/change-password")
        : "/change-password";

  return (
    <Box
      as="header"
      className="relative z-20 flex h-14 w-full shrink-0 items-center justify-between gap-2 px-3 text-foreground sm:px-5"
    >
      <Box className="flex min-w-0 items-center gap-2 sm:gap-3">
        {/* Mobile only — on desktop the sidebar is a hover-expand rail. */}
        <SidebarTrigger className="shrink-0 bg-transparent hover:bg-transparent lg:hidden" />
        <Text
          as="p"
          className="truncate font-mono text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs"
        >
          {today}
        </Text>
      </Box>

      <Box className="flex shrink-0 items-center gap-1 sm:gap-3">
        <ThemeToggle />
        <NotificationBell />

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                aria-label={user?.name || "Account"}
                title={user?.name || "Account"}
                className="flex items-center rounded-full bg-background p-1 transition-colors hover:bg-muted"
              >
                <UserAvatar src={user?.avatar} name={user?.name} className="h-8 w-8" />
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuGroup>
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setProfileOpen(true)}>
                <User className="mr-2 h-4 w-4" />
                My profile
              </DropdownMenuItem>
              {showOrgSettings && (
                <DropdownMenuItem onClick={() => setOrgOpen(true)}>
                  <Building2 className="mr-2 h-4 w-4" />
                  Organization settings
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                render={
                  <Link href={changePassword}>
                    <KeyRound className="mr-2 h-4 w-4" />
                    Change password
                  </Link>
                }
              />
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            {/* The fuller VIBGYOR + Scenes picker. Plain buttons, so choosing a
                theme does not close the menu — the point is to try a few live.
                The sidebar strip is the quick colour switch beside it. */}
            <Box className="px-2 py-1.5">
              <Text as="p" className="mb-1.5 text-[11px] font-medium text-muted-foreground">
                Theme
              </Text>
              <ThemeSwitcher />
            </Box>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Box>

      <MyProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
      {showOrgSettings && (
        <OrganizationSettingsDialog open={orgOpen} onOpenChange={setOrgOpen} />
      )}
    </Box>
  );
}
