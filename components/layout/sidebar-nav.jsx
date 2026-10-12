"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

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
  const { state, isMobile } = useSidebar();
  const visible = useVisibleItems(items);

  // A group whose every item is hidden must not leave its heading behind.
  if (visible.length === 0) return null;

  // Collapsed icon rail (trainer / platform): icons only, no heading.
  if (state === "collapsed" && !isMobile) {
    return (
      <Box as="nav" className="flex flex-col px-2 pt-2 pb-1">
        {visible.map((item) => (
          <RailIcon
            key={item.title}
            href={item.href}
            icon={item.icon}
            title={item.title}
            active={isActiveHref(pathname, item.href)}
            onNavigate={closeOnNavigate}
          />
        ))}
      </Box>
    );
  }

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
  const { state, isMobile } = useSidebar();

  // Collapsed icon rail: icons only, logout still an action rather than a link.
  if (state === "collapsed" && !isMobile) {
    return (
      <Box className="flex flex-col px-2 py-1">
        {items?.map((item) => {
          const isLogout = item.href === "/logout";
          const active = !isLogout && isActiveHref(pathname, item.href);
          return isLogout ? (
            <Box
              as="button"
              key={item.title}
              type="button"
              onClick={logout}
              title={item.title}
              aria-label={item.title}
              className={cn(railIconClass, railIdle, "cursor-pointer")}
            >
              {item.icon && <item.icon />}
            </Box>
          ) : (
            <RailIcon
              key={item.title}
              href={item.href}
              icon={item.icon}
              title={item.title}
              active={active}
              onNavigate={closeOnNavigate}
            />
          );
        })}
      </Box>
    );
  }

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
  "border-transparent text-on-navy-4 hover:bg-white/12 hover:text-white";
const itemActive =
  "border-accent-blue bg-white/16 font-semibold text-white";

const headingClass =
  "mt-3 flex w-full items-center justify-between px-2 pt-2 pb-1 text-left text-[10px] font-bold uppercase tracking-[0.09em] outline-hidden select-none focus-visible:ring-2 focus-visible:ring-sidebar-ring";

/**
 * One icon in the COLLAPSED rail. When the sidebar is a narrow icon strip (not
 * hovered), every row — section items AND one-page heading-links — renders as a
 * single centred icon with the label as its tooltip. Section headings have no
 * icon, so they are dropped from the rail and reappear when it expands on hover.
 */
const railIconClass =
  "mx-auto mb-0.5 flex size-9 items-center justify-center rounded-md transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-sidebar-ring [&_svg]:size-[18px] [&_svg]:shrink-0";
const railIdle = "text-on-navy-4 hover:bg-white/12 hover:text-white";
const railActive = "bg-white/16 text-white";

function RailIcon({ href, icon: Icon, title, active, onNavigate }) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      title={title}
      aria-label={title}
      aria-current={active ? "page" : undefined}
      className={cn(railIconClass, active ? railActive : railIdle)}
    >
      {Icon ? (
        <Icon />
      ) : (
        <Text as="span" className="text-[10px] font-bold uppercase text-inherit">
          {(title ?? "").slice(0, 2)}
        </Text>
      )}
    </Link>
  );
}

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
 * A collapsible section (shown when the pillar is expanded) rendered as a single
 * labelled row with a ▸, whose items appear in a megamenu flyout to the right on
 * hover — matching the reference HTML's `.topnav-group` + `.megamenu`.
 *
 * The flyout is a DOM CHILD (not portalled) positioned `left-full`, so hovering
 * it is still "inside" the pillar: the rail does not collapse while the flyout
 * is open (equivalent to the reference's `.menu-open`). It needs the sidebar
 * content to NOT clip overflow — see the `overflow-visible` on SidebarContent in
 * the learner/admin sidebars. A `pl` bridge keeps the hover contiguous (no gap).
 */
function FlyoutSection({ section, pathname, onNavigate }) {
  const Icon = section.items[0]?.icon;
  const active = section.items.some((it) => isActiveHref(pathname, it.href));

  return (
    <Box className="group/fly relative">
      <Box
        as="button"
        type="button"
        aria-haspopup="true"
        className={cn(itemClass, "cursor-pointer", active ? itemActive : itemIdle)}
      >
        {Icon && <Icon />}
        <Text as="span" className="flex-1 truncate text-left text-[length:inherit] text-inherit">
          {section.label}
        </Text>
        <ChevronRight className="size-3.5 shrink-0 opacity-70" />
      </Box>

      <Box className="invisible absolute left-full top-0 z-20 pl-2 opacity-0 transition-opacity duration-100 group-hover/fly:visible group-hover/fly:opacity-100">
        <Box className="min-w-[210px] rounded-xl border border-white/10 chrome-glass p-2 shadow-2xl">
          <Text
            as="p"
            className="px-2 pb-1.5 pt-1 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-on-navy-5"
          >
            {section.label}
          </Text>
          {section.items.map((it) => {
            const a = isActiveHref(pathname, it.href);
            return (
              <Link
                key={it.href}
                href={it.href}
                onClick={onNavigate}
                aria-current={a ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px] font-medium transition-colors [&_svg]:size-4 [&_svg]:shrink-0",
                  a
                    ? "bg-white/16 text-white"
                    : "text-on-navy-3 hover:bg-white/12 hover:text-white",
                )}
              >
                <it.icon />
                <Text as="span" className="truncate text-[length:inherit] text-inherit">
                  {it.title}
                </Text>
              </Link>
            );
          })}
        </Box>
      </Box>
    </Box>
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
  const { state, isMobile } = useSidebar();
  const visible = useVisibleSections(sections);
  const [open, toggle] = useOpenSections(visible, pathname);

  // Default (desktop): a closed icon rail. Standalone rows are icons; a
  // collapsible group is one icon that opens its items in a flyout on hover.
  if (state === "collapsed" && !isMobile) {
    return (
      <Box as="nav" className="flex flex-col px-2 pt-2 pb-3">
        {visible.map((section, index) => {
          if (section.link) {
            return (
              <RailIcon
                key={section.link.href}
                href={section.link.href}
                icon={section.link.icon}
                title={section.link.title}
                active={isActiveHref(pathname, section.link.href)}
                onNavigate={closeOnNavigate}
              />
            );
          }
          if (!section.label) {
            return section.items.map((item) => (
              <RailIcon
                key={item.href}
                href={item.href}
                icon={item.icon}
                title={item.title}
                active={isActiveHref(pathname, item.href)}
                onNavigate={closeOnNavigate}
              />
            ));
          }
          // Collapsible group → one icon (its first item's). Hovering the rail
          // expands it (hoverExpand), where the group's items show inline.
          const first = section.items[0];
          return first ? (
            <RailIcon
              key={section.label}
              href={first.href}
              icon={first.icon}
              title={section.label}
              active={section.items.some((it) => isActiveHref(pathname, it.href))}
              onNavigate={closeOnNavigate}
            />
          ) : null;
        })}
      </Box>
    );
  }

  return (
    <Box as="nav" className="flex flex-col px-3 pt-1.5 pb-3">
      {visible.map((section, index) => {
        if (section.link) {
          const active = isActiveHref(pathname, section.link.href);
          // A one-page heading-link, rendered as a labelled row (it has an icon
          // for the rail/flyout model) rather than a bare heading.
          const LinkIcon = section.link.icon;
          return (
            <Link
              key={section.link.href}
              href={section.link.href}
              onClick={closeOnNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(itemClass, active ? itemActive : itemIdle)}
            >
              {LinkIcon ? <LinkIcon /> : null}
              <Text as="span" className="flex-1 truncate text-[length:inherit] text-inherit">
                {section.link.title}
              </Text>
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

        // Desktop (rail expanded on hover): the group is one row whose items
        // open in a megamenu flyout to the right on hover (like the HTML).
        if (!isMobile) {
          return (
            <FlyoutSection
              key={section.label}
              section={section}
              pathname={pathname}
              onNavigate={closeOnNavigate}
            />
          );
        }

        // Mobile (sheet): keep the click-to-expand accordion.
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
  const { state, isMobile } = useSidebar();

  // Collapsed icon rail: a single centred icon button.
  if (state === "collapsed" && !isMobile) {
    return (
      <Box
        as="button"
        type="button"
        onClick={logout}
        title={label}
        aria-label={label}
        className={cn(railIconClass, railIdle, "cursor-pointer")}
      >
        {Icon && <Icon />}
      </Box>
    );
  }

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
