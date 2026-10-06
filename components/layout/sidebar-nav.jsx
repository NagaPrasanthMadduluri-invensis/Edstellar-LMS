"use client";

import { useEffect, useState } from "react";
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
import Box from "@/components/ui/box";
import Text from "@/components/ui/text";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

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

/* ── Sectioned navigation: the reference sidebar's three kinds of row ──
 *
 * Used by the admin sidebar, whose config (`adminNav.sections` in
 * `lib/nav-config.js`) is an ORDERED list of:
 *
 *   { items }          rendered straight into the nav, no heading
 *   { label, items }   a heading that collapses its links, closed by default
 *   { link }           a heading that IS a link, with nothing under it
 *
 * The styling is the reference HTML's, row for row: 10px uppercase headings
 * in the dimmest on-navy grey with a ▼ that turns when closed, 12.5px links
 * with a 2px accent rule on the left of the active one.
 */

const itemClass =
  "mb-0.5 flex w-full items-center gap-2.5 border-l-2 px-2.5 py-[9px] text-left text-[12.5px] font-medium transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-sidebar-ring [&_svg]:size-4 [&_svg]:shrink-0";
const itemIdle =
  "border-transparent text-on-navy-4 hover:bg-navy-deep hover:text-on-navy-3";
const itemActive =
  "border-accent-blue bg-sidebar-accent font-semibold text-accent-soft";

const headingClass =
  "mt-3 flex w-full items-center justify-between px-2 pt-2 pb-1 text-left text-[10px] font-bold uppercase tracking-[0.09em] outline-hidden select-none focus-visible:ring-2 focus-visible:ring-sidebar-ring";

function NavItem({ item, active, onNavigate }) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(itemClass, active ? itemActive : itemIdle)}
    >
      <item.icon />
      <Text as="span" className="flex-1 truncate text-[length:inherit] text-inherit">
        {item.title}
      </Text>
    </Link>
  );
}

/**
 * Drops items this user's role cannot reach, then drops any section left
 * with nothing in it — a heading over no links, or a heading-link to a page
 * that would 403. The reference does the same two passes.
 */
function useVisibleSections(sections) {
  const { user } = useAuth();
  const held = new Set(user?.permissions ?? []);
  const allowed = (item) => !item.permission || held.has(item.permission);

  return (sections ?? [])
    .map((section) =>
      section.link
        ? section
        : { ...section, items: (section.items ?? []).filter(allowed) },
    )
    .filter((section) =>
      section.link ? allowed(section.link) : section.items.length > 0,
    );
}

/** The label of the collapsible section holding the current page, if any. */
function activeSectionLabel(sections, pathname) {
  const hit = sections.find(
    (section) =>
      section.label &&
      section.items?.some((item) => isActiveHref(pathname, item.href)),
  );
  return hit?.label ?? null;
}

/**
 * Which sections are open. Every one starts CLOSED, as in the reference —
 * except the one holding the page you are on. The reference never had to
 * think about that, because it always opened on Dashboard; a real URL can
 * land straight on /admin/courses, and a sidebar whose highlighted row is
 * folded away has stopped saying where you are.
 *
 * The same rule runs on every navigation, so a link from inside a page (the
 * dashboard's panels link into sections) opens that section. It only ever
 * OPENS: whatever the admin closed or opened by hand stays as they left it,
 * and since the sidebar lives in the layout that survives page changes.
 */
function useOpenSections(sections, pathname) {
  const current = activeSectionLabel(sections, pathname);
  const [open, setOpen] = useState(() => (current ? { [current]: true } : {}));

  useEffect(() => {
    if (current) setOpen((prev) => (prev[current] ? prev : { ...prev, [current]: true }));
  }, [current]);

  const toggle = (label) => setOpen((prev) => ({ ...prev, [label]: !prev[label] }));
  return [open, toggle];
}

export function SidebarNavSections({ sections }) {
  const pathname = usePathname();
  const closeOnNavigate = useCloseOnNavigate();
  const visible = useVisibleSections(sections);
  const [open, toggle] = useOpenSections(visible, pathname);

  return (
    <Box as="nav" className="flex flex-col px-3 pt-1.5 pb-3">
      {visible.map((section, index) => {
        if (section.link) {
          const active = isActiveHref(pathname, section.link.href);
          return (
            <Link
              key={section.link.href}
              href={section.link.href}
              onClick={closeOnNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                headingClass,
                active ? "text-accent-soft" : "text-on-navy-5 hover:text-on-navy-3",
              )}
            >
              {section.link.title}
            </Link>
          );
        }

        const items = section.items.map((item) => (
          <NavItem
            key={item.href}
            item={item}
            active={isActiveHref(pathname, item.href)}
            onNavigate={closeOnNavigate}
          />
        ));

        if (!section.label) {
          return <Box key={`top-${index}`}>{items}</Box>;
        }

        const isOpen = !!open[section.label];
        const groupId = `nav-section-${index}`;
        return (
          <Box key={section.label}>
            <Box
              as="button"
              type="button"
              aria-expanded={isOpen}
              aria-controls={groupId}
              onClick={() => toggle(section.label)}
              className={cn(headingClass, "cursor-pointer text-on-navy-5 hover:text-on-navy-3")}
            >
              <Text as="span" className="text-[length:inherit] text-inherit">{section.label}</Text>
              <Text
                as="span"
                aria-hidden="true"
                className={cn(
                  "text-[9px] text-inherit opacity-70 transition-transform duration-150",
                  !isOpen && "-rotate-90",
                )}
              >
                ▼
              </Text>
            </Box>
            <Box id={groupId} hidden={!isOpen}>
              {items}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

/** The reference's footer: one outlined Sign Out button, full width. */
export function SidebarSignOut({ label = "Sign Out", icon: Icon }) {
  const { logout } = useAuth();
  return (
    <Box
      as="button"
      type="button"
      onClick={logout}
      className="flex w-full cursor-pointer items-center justify-center gap-1.5 border border-white/15 p-[9px] text-[13px] text-on-navy-3 transition-colors outline-hidden hover:border-accent-blue hover:text-accent-soft focus-visible:ring-2 focus-visible:ring-sidebar-ring"
    >
      {Icon && <Icon className="size-3.5" />}
      <Text as="span" className="text-[length:inherit] text-inherit">{label}</Text>
    </Box>
  );
}
