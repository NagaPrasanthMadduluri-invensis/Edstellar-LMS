"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, Building2, KeyRound, LogOut, User } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { useAuth } from "@/hooks/use-auth";
import { MyProfileDialog } from "@/components/shared/my-profile-dialog";
// In `shared/`, not `admin/`: this shell is rendered by all four portals, and
// TASTE §1.2 forbids portal-specific imports reaching across. Only a tenant
// admin ever OPENS it — that is `showOrgSettings` below, not the file's home.
import { OrganizationSettingsDialog } from "@/components/shared/organization-settings-dialog";

/**
 * One product name in both portals.
 *
 * The label used to be a prop, which let the two shells drift apart — admin
 * read "Edstellar Admin" and learner "Invensis LMS" — with a "powered by"
 * line under each. It is a constant now, so the two cannot disagree again.
 *
 * Responsive notes: the left group carries `min-w-0` and the title `truncate`,
 * so a narrow screen shortens the product name rather than pushing the avatar
 * and the sidebar trigger off the right edge. The trigger itself is the only
 * way to reach navigation under 768px, so it must never be the element that
 * overflows.
 */
export function TopNav() {
  const { user, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [orgOpen, setOrgOpen] = useState(false);

  /**
   * Organization settings is a TENANT admin's screen. A platform admin has
   * the whole Tenant Directory instead and no org of their own worth editing,
   * and a learner or trainer has no business in it — the API answers 403 for
   * all three, so the item is not offered rather than offered and refused
   * (TASTE §10.3.1.2).
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
      className="sticky top-0 z-50 flex h-14 w-full shrink-0 items-center justify-between gap-2 bg-sidebar px-3 sm:px-4"
    >
      <Box className="flex min-w-0 items-center gap-2 sm:gap-3">
        <SidebarTrigger className="shrink-0 bg-transparent hover:bg-transparent" />
        <Separator orientation="vertical" className="hidden h-6 text-white sm:block" />
        <Text
          as="h2"
          className="truncate text-base font-semibold leading-none tracking-tight text-background select-none sm:text-lg"
        >
          Edstellar LMS
        </Text>
      </Box>

      <Box className="flex shrink-0 items-center gap-1 sm:gap-2">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-white" />
          <Text
            as="span"
            className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground"
          >
            3
          </Text>
        </Button>

        <DropdownMenu>
          {/* `render`, not `asChild`. Our menu primitive is Base UI, which
              composes through a `render` prop — every other trigger in
              `components/ui` already does this. `asChild` is the Radix API:
              Base UI passed it straight to the DOM (hence "React does not
              recognize the asChild prop") and still rendered its OWN button
              around this one. A <button> inside a <button> is invalid HTML, so
              the browser hoisted it out, the client tree no longer matched the
              server's, and EVERY authenticated page threw a hydration error
              and re-rendered its whole tree on the client — this component is
              in all four portal shells. */}
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                className="flex items-center gap-2 rounded-full bg-background p-1 pr-1 transition-colors hover:bg-muted sm:pr-3"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.avatar || ""} alt={user?.name || "User"} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {user?.initials || "U"}
                  </AvatarFallback>
                </Avatar>
                <Text
                  as="span"
                  className="hidden max-w-[10rem] truncate text-sm font-medium sm:inline-block"
                >
                  {user?.name || "User"}
                </Text>
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-48">
            {/* Every item here does something. "Profile" and "Settings"
                previously had no handler and no href at all — two controls
                that looked live, closed the menu and changed nothing, which
                is the screen-that-lies failure the standards doc keeps
                returning to. */}
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
