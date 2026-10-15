"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { SidebarNavSections, SidebarSignOut } from "@/components/layout/sidebar-nav";
import { SidebarBrand } from "@/components/layout/sidebar-brand";
import { learnerNav } from "@/lib/nav-config";

/**
 * Built to match the reference HTML's learner sidebar: the same order, the
 * same headings, collapsible sections closed by default, and one-page modules
 * as heading-links. The shape lives in `learnerNav.sections`.
 */
export function LearnerSidebar() {
  const [signOut] = learnerNav.footer;
  return (
    <Sidebar collapsible="icon" hoverExpand>
      <SidebarHeader className="p-2">
        <SidebarBrand />
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent className="overflow-visible">
        <SidebarNavSections sections={learnerNav.sections} />
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter className="p-3">
        <SidebarSignOut label={signOut.title} icon={signOut.icon} />
      </SidebarFooter>
    </Sidebar>
  );
}
