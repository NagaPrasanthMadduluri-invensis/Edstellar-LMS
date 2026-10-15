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
import { platformNav } from "@/lib/nav-config";

export function PlatformSidebar() {
  return (
    <Sidebar collapsible="icon" hoverExpand>
      <SidebarHeader className="p-2">
        <SidebarBrand />
      </SidebarHeader>
      <SidebarSeparator />
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
