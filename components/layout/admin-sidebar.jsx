"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { SidebarNavGroup, SidebarNavSections, SidebarSignOut } from "@/components/layout/sidebar-nav";
import { SidebarBrand } from "@/components/layout/sidebar-brand";
import { ArrowLeft } from "lucide-react";

import { adminNav } from "@/lib/nav-config";
import { useAuth } from "@/hooks/use-auth";

/**
 * Built to match the reference HTML's admin sidebar: the same order, the same
 * headings, collapsible sections closed by default, and one-page modules as
 * heading-links. The shape lives in `adminNav.sections`; read its docblock
 * before adding a row.
 */
export function AdminSidebar() {
  const [signOut] = adminNav.footer;
  const { user } = useAuth();
  // Somebody whose role is on another portal and was given admin permissions
  // as extras lands here from the "Admin" group of their own sidebar; this is
  // their way back. An admin-portal account never sees it.
  const home =
    user && user.role !== "admin"
      ? user.role === "trainer"
        ? { title: "Back to My Sessions", icon: ArrowLeft, href: "/trainer/sessions" }
        : { title: "Back to My Learning", icon: ArrowLeft, href: "/dashboard" }
      : null;
  return (
    <Sidebar collapsible="icon" hoverExpand>
      <SidebarHeader className="p-2">
        <SidebarBrand />
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent className="overflow-visible">
        {home && <SidebarNavGroup items={[home]} />}
        <SidebarNavSections sections={adminNav.sections} />
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter className="p-3">
        <SidebarSignOut label={signOut.title} icon={signOut.icon} />
      </SidebarFooter>
    </Sidebar>
  );
}
