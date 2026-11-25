/**
 * Permission helpers for the UI: which sidebar items, pages and buttons a
 * person is offered (CONTEXT.md §3, BACKEND_STRUCTURE §10.65).
 *
 * All of this is a NAVIGATION aid. The API refuses the request regardless,
 * against the `permissions[]` claim in the signed token; these helpers read
 * the same claim (as resolved by `/api/auth/me`) so the screen never offers
 * a button whose request would answer 403.
 *
 * Extra permissions cross portals: a Learner, Manager or Trainer role given
 * an admin permission in the Permission Matrix keeps their own portal and
 * ALSO gets that admin module. That is why the admin layout admits anyone
 * holding at least one admin permission, and why `adminToolsFor` exists.
 */

/**
 * Every permission an admin route checks (mirror of `PERMISSION_PORTALS` in
 * `server/src/common/permissions.ts`, the entries that include "admin").
 * Holding any one of these is what opens the admin screens to somebody whose
 * role is on another portal.
 */
export const ADMIN_PORTAL_PERMISSIONS = [
  "view_dashboard",
  "view_employees",
  "edit_employees",
  "upload_content",
  "build_assessments",
  "assign_learning",
  "manage_users",
  "view_reports",
  "manage_courses",
  "manage_assessments",
  "view_certificates",
  "manage_certificates",
  "manage_sessions",
  "manage_journeys",
  "manage_roles",
  "mark_attendance",
  "complete_session",
  "manage_session_roster",
  "request_services",
  "manage_organization",
  "moderate_community",
  "manage_referrals",
];

/** The permissions a user holds, as a Set. */
export function heldPermissions(user) {
  return new Set(Array.isArray(user?.permissions) ? user.permissions : []);
}

/** True when the user holds `permission`. */
export function can(user, permission) {
  return heldPermissions(user).has(permission);
}

/** True when the user holds at least one of `permissions`. */
export function canAny(user, permissions) {
  const held = heldPermissions(user);
  return (permissions ?? []).some((p) => held.has(p));
}

/**
 * Whether a nav item (or a page rule) is open to the user.
 *
 * `permission` is the item's own page permission; `anyPermission` lists the
 * other permissions whose holders also need that page (a roster-only role
 * still has to open Live Sessions to change a roster). Either is enough. An
 * item with neither is always shown.
 */
export function itemAllowed(user, item) {
  if (!item) return false;
  const needs = [
    ...(item.permission ? [item.permission] : []),
    ...(item.anyPermission ?? []),
  ];
  return needs.length === 0 || canAny(user, needs);
}

/**
 * True when the user may enter the admin portal at all: they are on it, or
 * their role was given at least one admin permission as an extra.
 */
export function hasAdminAccess(user) {
  if (!user) return false;
  if (user.role === "admin") return true;
  return canAny(user, ADMIN_PORTAL_PERMISSIONS);
}

/** Admin pages that are reachable but not in the sidebar, and what they need. */
export const HIDDEN_ADMIN_PAGES = [
  { href: "/admin/departments", permission: "view_reports" },
  { href: "/admin/learning-hours", permission: "view_reports" },
  { href: "/admin/scorm", permission: "upload_content", anyPermission: ["manage_courses", "assign_learning"] },
  // Every portal can change its own password.
  { href: "/admin/change-password" },
];

function matches(pathname, href) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Every admin nav item, flattened, in sidebar order. */
export function flattenSections(sections) {
  return (sections ?? []).flatMap((section) =>
    section.link ? [section.link] : section.items ?? [],
  );
}

/**
 * The rule for an admin page: the nav item whose href is the longest prefix
 * of `pathname`, or a hidden page. `null` means no rule is known, and the page
 * is left to the API.
 */
export function adminPageRule(pathname, sections) {
  const candidates = [...flattenSections(sections), ...HIDDEN_ADMIN_PAGES]
    .filter((item) => item.href && matches(pathname, item.href))
    .sort((a, b) => b.href.length - a.href.length);
  return candidates[0] ?? null;
}

/**
 * The admin modules a user from another portal was given, flattened for a
 * single "Admin" group in their own sidebar. Empty for an admin-portal user
 * (they are already in the admin portal) and for anybody holding no extra.
 */
export function adminToolsFor(user, sections) {
  if (!user || user.role === "admin") return [];
  return flattenSections(sections).filter(
    (item) => (item.permission || item.anyPermission) && itemAllowed(user, item),
  );
}
