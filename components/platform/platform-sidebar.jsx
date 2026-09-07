"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { SidebarNavFooter, SidebarNavGroup } from "@/components/layout/sidebar-nav";
import { platformNav } from "@/lib/nav-config";

export function PlatformSidebar() {
  return (
    <Sidebar collapsible="offcanvas">
      <SidebarContent>
        <SidebarNavGroup label="Platform" items={platformNav.main} />
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter>
        <SidebarNavFooter items={platformNav.footer} />
      </SidebarFooter>
    </Sidebar>
  );
}
