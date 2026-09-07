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
import { Bell, User, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { useAuth } from "@/hooks/use-auth";

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
          <DropdownMenuTrigger asChild>
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
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuGroup>
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Box>
    </Box>
  );
}
