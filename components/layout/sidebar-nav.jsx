"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import Text from "@/components/ui/text";
import { useAuth } from "@/hooks/use-auth";

/**
 * The one navigation renderer for all three portals.
 *
 * It used to be a private `NavGroup` copied into learner-sidebar, admin-sidebar
 * and platform-sidebar, and the three had already drifted: learner and platform
 * matched a section prefix, admin matched the path exactly — so opening a course
 * detail page under /admin/courses/:id dropped the highlight off "Content
 * Library" while the equivalent learner page kept it. One component means that
 * cannot happen again, and the mobile fix below only had to be written once.
 *
 * No nav href in `lib/nav-config.js` is a prefix of another, so the prefix match
 * cannot light two items at once.
 */
function isActiveHref(pathname, href) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * On a phone the sidebar is a Sheet overlaying the page (`ui/sidebar.jsx`
 * renders it that way under 768px). Tapping a link navigated the page
 * underneath but left the sheet open on top of it, so every mobile navigation
 * needed a second tap on the backdrop to see where you had arrived. Closing it
 * here is what makes the nav usable on a touch device at all.
 */
function useCloseOnNavigate() {
  const { isMobile, setOpenMobile } = useSidebar();
  return () => {
    if (isMobile) setOpenMobile(false);
  };
}

/**
 * Hides items whose permission this user's role does not hold
 * (`specs/rbac.md` §5.2).
 *
 * Cosmetic only. The API refuses the request regardless — this just stops the
 * sidebar advertising a page that would 403. An item with no `permission` is
 * always shown, so every existing nav entry behaves exactly as before.
 */
function useVisibleItems(items) {
  const { user } = useAuth();
  const held = new Set(user?.permissions ?? []);
  return (items ?? []).filter(
    (item) => !item.permission || held.has(item.permission),
  );
}

export function SidebarNavGroup({ label, items }) {
  const pathname = usePathname();
  const closeOnNavigate = useCloseOnNavigate();
  const visible = useVisibleItems(items);

  // A group whose every item is hidden must not leave its heading behind.
  if (visible.length === 0) return null;

  return (
    <SidebarGroup>
      {label && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
      <SidebarGroupContent>
        <SidebarMenu>
          {visible.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                isActive={isActiveHref(pathname, item.href)}
                onClick={closeOnNavigate}
                render={<Link href={item.href} />}
              >
                <item.icon />
                <Text as="span" className="flex-1 truncate text-sidebar-foreground">
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

/** The footer set, where `/logout` is an action rather than a destination. */
export function SidebarNavFooter({ items }) {
  const pathname = usePathname();
  const closeOnNavigate = useCloseOnNavigate();
  const { logout } = useAuth();

  return (
    <SidebarMenu>
      {items?.map((item) => {
        const isLogout = item.href === "/logout";
        return (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton
              isActive={!isLogout && isActiveHref(pathname, item.href)}
              onClick={isLogout ? undefined : closeOnNavigate}
              render={
                isLogout ? (
                  <button type="button" onClick={logout} />
                ) : (
                  <Link href={item.href} />
                )
              }
            >
              <item.icon />
              <Text as="span" className="truncate text-sidebar-foreground">
                {item.title}
              </Text>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
