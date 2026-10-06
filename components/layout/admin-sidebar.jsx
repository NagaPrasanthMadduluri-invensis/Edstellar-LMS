"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { SidebarNavSections, SidebarSignOut } from "@/components/layout/sidebar-nav";
import { adminNav } from "@/lib/nav-config";

/**
 * Built to match the reference HTML's admin sidebar: the same order, the same
 * headings, collapsible sections closed by default, and one-page modules as
 * heading-links. The shape lives in `adminNav.sections`; read its docblock
 * before adding a row.
 */
export function AdminSidebar() {
  const [signOut] = adminNav.footer;
  return (
    <Sidebar collapsible="offcanvas">
      <SidebarContent>
        <SidebarNavSections sections={adminNav.sections} />
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter className="p-3">
        <SidebarSignOut label={signOut.title} icon={signOut.icon} />
      </SidebarFooter>
    </Sidebar>
  );
}
