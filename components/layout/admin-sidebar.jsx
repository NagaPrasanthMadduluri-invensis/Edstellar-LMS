"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import Text from "@/components/ui/text";
import { adminNav } from "@/lib/nav-config";
import { useAuth } from "@/hooks/use-auth";

function NavGroup({ label, items, pathname }) {
  return (
    <SidebarGroup>
      {label && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
      <SidebarGroupContent>
        <SidebarMenu>
          {items?.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                isActive={pathname === item.href}
                render={<Link href={item.href} />}
              >
                <item.icon />
                <Text as="span" className="flex-1 text-sidebar-foreground">
                  {item.title}
                </Text>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();

  const handleFooterClick = (href) => {
    if (href === "/logout") {
      logout();
    }
  };

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarContent>
        <NavGroup items={adminNav.main} pathname={pathname} />
        <NavGroup label="User Management"   items={adminNav.userManagement}   pathname={pathname} />
        <NavGroup label="Course Management" items={adminNav.courseManagement} pathname={pathname} />
        <NavGroup label="Assignments"       items={adminNav.assignments}      pathname={pathname} />
        <NavGroup label="Analytics"         items={adminNav.analytics}        pathname={pathname} />
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter>
        <SidebarMenu>
          {adminNav.footer.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                isActive={pathname === item.href}
                render={
                  item.href === "/logout" ? (
                    <button type="button" onClick={() => handleFooterClick(item.href)} />
                  ) : (
                    <Link href={item.href} />
                  )
                }
              >
                <item.icon />
                <Text as="span" className="text-sidebar-foreground">
                  {item.title}
                </Text>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
