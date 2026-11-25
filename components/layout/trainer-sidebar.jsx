"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { SidebarNavFooter, SidebarNavGroup } from "@/components/layout/sidebar-nav";
import { SidebarBrand } from "@/components/layout/sidebar-brand";
import { adminNav, trainerNav } from "@/lib/nav-config";
import { adminToolsFor } from "@/lib/permissions";
import { useAuth } from "@/hooks/use-auth";

export function TrainerSidebar() {
  const { user } = useAuth();
  // Admin modules this trainer's role was given as extras (`lib/permissions.js`).
  const adminTools = adminToolsFor(user, adminNav.sections);
  return (
    <Sidebar collapsible="icon" hoverExpand>
      <SidebarHeader className="p-2">
        <SidebarBrand />
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <SidebarNavGroup items={trainerNav.main} />
        {adminTools.length > 0 && <SidebarNavGroup label="Admin" items={adminTools} />}
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter>
        <SidebarNavFooter items={trainerNav.footer} />
      </SidebarFooter>
    </Sidebar>
  );
}
