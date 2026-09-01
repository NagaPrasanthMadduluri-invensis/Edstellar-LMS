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
import { platformNav } from "@/lib/nav-config";
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
                isActive={pathname === item.href || pathname.startsWith(`${item.href}/`)}
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

export function PlatformSidebar() {
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
        <NavGroup label="Platform" items={platformNav.main} pathname={pathname} />
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter>
        <SidebarMenu>
          {platformNav.footer.map((item) => (
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
