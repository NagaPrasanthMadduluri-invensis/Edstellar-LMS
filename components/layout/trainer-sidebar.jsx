"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { SidebarNavFooter, SidebarNavGroup } from "@/components/layout/sidebar-nav";
import { trainerNav } from "@/lib/nav-config";

export function TrainerSidebar() {
  return (
    <Sidebar collapsible="offcanvas">
      <SidebarContent>
        <SidebarNavGroup items={trainerNav.main} />
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter>
        <SidebarNavFooter items={trainerNav.footer} />
      </SidebarFooter>
    </Sidebar>
  );
}
