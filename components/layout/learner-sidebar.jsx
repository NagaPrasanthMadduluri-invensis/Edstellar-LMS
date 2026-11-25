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
import { adminNav, learnerNav } from "@/lib/nav-config";
import { adminToolsFor } from "@/lib/permissions";
import { useAuth } from "@/hooks/use-auth";

/**
 * Built to match the reference HTML's learner sidebar: the same order, the
 * same headings, collapsible sections closed by default, and one-page modules
 * as heading-links. The shape lives in `learnerNav.sections`.
 */
export function LearnerSidebar() {
  const [signOut] = learnerNav.footer;
  const { user } = useAuth();
  // Admin modules this person's role was GIVEN in the Permission Matrix
  // (`lib/permissions.js`). Empty for an ordinary learner, so the sidebar is
  // exactly what it was; a Manager given "View reports" gets Reports here.
  const adminTools = adminToolsFor(user, adminNav.sections);
  const sections = adminTools.length
    ? [...learnerNav.sections, { label: "Admin", items: adminTools }]
    : learnerNav.sections;
  return (
    <Sidebar collapsible="icon" hoverExpand>
      <SidebarHeader className="p-2">
        <SidebarBrand />
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent className="overflow-visible">
        <SidebarNavSections sections={sections} />
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter className="p-3">
        <SidebarSignOut label={signOut.title} icon={signOut.icon} />
      </SidebarFooter>
    </Sidebar>
  );
}
