"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { SidebarNavFooter, SidebarNavGroup } from "@/components/layout/sidebar-nav";
import { adminNav } from "@/lib/nav-config";

export function AdminSidebar() {
  return (
    <Sidebar collapsible="offcanvas">
      <SidebarContent>
        <SidebarNavGroup items={adminNav.main} />
        <SidebarNavGroup label="User Management" items={adminNav.userManagement} />
        <SidebarNavGroup label="Course Management" items={adminNav.courseManagement} />
        <SidebarNavGroup label="Assignments" items={adminNav.assignments} />
        <SidebarNavGroup label="Analytics" items={adminNav.analytics} />
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter>
        <SidebarNavFooter items={adminNav.footer} />
      </SidebarFooter>
    </Sidebar>
  );
}
