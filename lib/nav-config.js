import {
  Award, BarChart3, Bell, BookOpen, Bookmark, Building2, Calendar, CalendarCheck, CalendarDays, ClipboardList, Clock, CloudUpload, CreditCard, ExternalLink, FileBarChart, GraduationCap, HeadphonesIcon, Hourglass, Inbox, KeyRound, Layers, Layers3, LayoutDashboard, LayoutGrid, Library, LibraryBig, LineChart, List, LogOut, LucideGitGraph, Mail, Map, Megaphone, MessageCircle, MessageSquare, Navigation, Package, PenTool, Play, Receipt, RefreshCcw, RotateCcw, Route, ScrollText, Send, Settings, ShieldCheck, Sparkles, SquareCheck, Star, Ticket, TrendingUp, Trophy, User, UserCheck, UserPlus, Users, Users2, Wallet,
} from "lucide-react";

/* ── Learner Navigation ── */

/**
 * Built to match the reference HTML's learner sidebar row for row. Same
 * ordered shape as `adminNav.sections` below — read its docblock for the
 * three kinds of row ({ items } / { label, items } / { link }).
 *
 * Left out on purpose, with every route still answering:
 * - My Achievements and Learning Hours are not in the reference nav. Both
 *   pages keep an entry point from inside the product — the dashboard links
 *   to /achievements and My Sessions links to /learning-hours.
 * - Learning Community has no page or endpoint here; a link to nothing is the
 *   screen-that-lies failure (§5.2.1).
 * - Change Password moved out of the footer: it is already in the top bar's
 *   account menu, for every portal.
 */
export const learnerNav = {
  sections: [
    {
      items: [
        { title: "Home", icon: LayoutGrid, href: "/dashboard" },
      ],
    },
    {
      label: "My Learning",
      items: [
        { title: "My Courses",        icon: Layers,     href: "/my-courses"        },
        // A path is an ORDER somebody chose (§10.11), so it is its own module
        // rather than five more cards among the courses.
        { title: "My Learning Paths", icon: TrendingUp, href: "/learning-paths"    },
        // A learner cannot move a session's progress themselves, so sessions
        // never behaved like the course rows beside them.
        { title: "My Sessions",       icon: Calendar,   href: "/my-sessions"       },
        { title: "Training Calendar", icon: Calendar,   href: "/training-calendar" },
      ],
    },
    { link: { title: "My Progress", href: "/progress" } },
    {
      label: "Recognition",
      items: [
        { title: "Leaderboard",  icon: TrendingUp, href: "/leaderboard"    },
        { title: "Certificates", icon: Award,      href: "/certifications" },
      ],
    },
    // Browsing, not "my learning": nothing in it is theirs until they press
    // the button, and then it appears in My Courses or My Sessions.
    { link: { title: "Course Catalogue", href: "/catalogue" } },
    // What somebody has been ASKED — neither coursework nor something won.
    { link: { title: "Surveys & Feedback", href: "/surveys" } },
    /**
     * The manager's extra module (`specs/rbac.md` decision 2). Gated on the
     * permission, so a plain learner never sees it — the reference likewise
     * shows MY TEAM only to somebody with reports.
     */
    { link: { title: "My Team", href: "/team-learning", permission: "view_team_learning" } },
  ],
  footer: [
    { title: "Sign Out", icon: LogOut, href: "/logout" },
  ],
};



/* ── Admin Navigation ── */

/**
 * Every item carries the permission its page actually needs
 * (`specs/rbac.md` §3.9).
 *
 * This matters now in a way it did not before. The admin portal used to be
 * all-or-nothing: `@Roles('admin')` and nothing finer, so every admin saw
 * every item and every item worked. Since the guards went onto the routes, an
 * organization can define a restricted admin-portal role — a coordinator who
 * only reads reports, an auditor who only sees certificates — and an ungated
 * sidebar would offer that person eleven links, nine of which answer 403.
 *
 * `useVisibleItems` in `sidebar-nav.jsx` does the filtering, against the
 * `permissions[]` claim in the signed token. It is a NAVIGATION aid, not the
 * boundary: the API refuses the request regardless, which is why an item is
 * hidden rather than disabled. A full admin holds the whole catalogue and so
 * sees exactly what they saw before.
 *
 * Each item names the permission of its OWN page, not the most permissive
 * thing on it. `/admin/roles` is gated on `manage_roles` rather than being
 * shown to anyone who may read roles, because the screen is a permission
 * editor — offering it to someone whose every Save answers 403 is worse than
 * not offering it.
 *
 * ── Shape: an ORDERED list, because the reference sidebar is one ──
 *
 * The reference HTML (`spectra-lms - updated with feedback`) interleaves
 * three kinds of row, and their order is the design:
 *
 *   { items }          no heading — Dashboard, Analytics, Reports
 *   { label, items }   a COLLAPSIBLE heading over its links, closed by default
 *   { link }           a heading that IS the link, with nothing under it
 *
 * A heading over a single page would be a label repeating the page, so the
 * reference makes those one-page modules a link in heading type instead —
 * Survey / Feedback and Edstellar Services here.
 *
 * Four reference entries are deliberately absent: AI Insights, Learning
 * Community, and the System group's Notifications and Audit Log. None has a
 * page or an endpoint in this product, and a link to nothing is the
 * screen-that-lies failure (§5.2.1) — add each back in the change that builds
 * its page.
 */
export const adminNav = {
  sections: [
    {
      // Analytics and Reports sit at the TOP, beside Dashboard. The three are
      // one story — what is true now, how it got here, and the evidence — and
      // an admin moves between them constantly.
      items: [
        { title: "Dashboard", icon: LayoutGrid, href: "/admin/dashboard", permission: "view_dashboard" },
        { title: "Analytics", icon: BarChart3,  href: "/admin/analytics", permission: "view_reports"   },
        { title: "Reports",   icon: List,       href: "/admin/reports",   permission: "view_reports"   },
        // The fourth of the same story: what is true now, how it got here,
        // the evidence — and WHO DID IT. Same permission as Reports, which
        // is deliberate: an activity log IS evidence, and a dedicated
        // entry would cost a grant migration that signs every organization
        // out once (BACKEND_STRUCTURE §10.24).
        { title: "Activity Log", icon: ScrollText, href: "/admin/activity", permission: "view_reports" },
      ],
    },
    {
      label: "User Management",
      items: [
        { title: "Manage Users",        icon: UserPlus,    href: "/admin/users", permission: "view_employees" },
        { title: "Roles & Permissions", icon: SquareCheck, href: "/admin/roles", permission: "manage_roles"   },
        // Under People rather than its own group: every row names somebody
        // in this organization and their address, which is why it carries
        // `view_employees` rather than a permission of its own.
        { title: "Email Delivery",      icon: Mail,        href: "/admin/email", permission: "view_employees" },
      ],
    },
    {
      // What an admin BUILDS: the content itself, and the paths through it.
      label: "Course Management",
      items: [
        { title: "Course Library", icon: CloudUpload, href: "/admin/courses",  permission: "manage_courses" },
        { title: "Learning Paths", icon: TrendingUp,  href: "/admin/journeys", permission: "manage_courses" },
      ],
    },
    {
      // What an admin DELIVERS to people: who gets it, when it runs, who
      // turned up. Scheduling a session, assigning it and marking attendance
      // are one job, so they are one group.
      label: "Training Delivery",
      items: [
        { title: "Assign Learning",   icon: Send,     href: "/admin/assign-learning", permission: "assign_learning" },
        { title: "Live Sessions",     icon: Calendar, href: "/admin/sessions",        permission: "manage_sessions" },
        { title: "Training Calendar", icon: Calendar, href: "/admin/calendar",        permission: "manage_sessions" },
      ],
    },
    {
      // What a learner EARNS. Departments and Learning Hours were dropped from
      // the nav, not deleted: both routes still answer. The dashboard's
      // Department progress panel links to /admin/departments.
      label: "Recognition",
      items: [
        { title: "Certificates", icon: Award, href: "/admin/certificates", permission: "view_certificates" },
        { title: "Leaderboard",  icon: Award, href: "/admin/leaderboard",  permission: "view_reports"      },
      ],
    },
    // Which feedback form a course asks for is a column on `courses`, so the
    // page carries the same permission as the course editor.
    { link: { title: "Survey / Feedback", href: "/admin/surveys", permission: "manage_courses" } },
    // Edstellar's own offering, not the org's content. `request_services`
    // gates it because this is the one module whose output leaves the tenant.
    { link: { title: "Edstellar Services", href: "/admin/services", permission: "request_services" } },
  ],
  footer: [
    // No permission: signing out is not a capability an org can withhold.
    { title: "Sign Out", icon: LogOut, href: "/logout" },
  ],
};

/* ── Trainer Navigation ── */

/**
 * The trainer portal — `specs/rbac.md` §3.6.1.
 *
 * Deliberately short. A trainer runs sessions; he is not an admin (decision 6)
 * and he is not a learner, so there is no course catalogue here, no reports, no
 * users, and no other trainer's sessions. Everything he needs hangs off one
 * session: its details, its participants, and their attendance.
 */
export const trainerNav = {
  main: [
    { title: "My Sessions",      icon: CalendarCheck,  href: "/trainer/sessions", permission: "view_own_sessions" },
    // The calendar is a second VIEW over the same read, not a second query —
    // so it carries the same permission. A trainer who can list their
    // sessions can see them on a grid; there is nothing extra to withhold.
    { title: "Training Calendar", icon: CalendarDays,  href: "/trainer/calendar", permission: "view_own_sessions" },
    { title: "Feedback",          icon: MessageSquare, href: "/trainer/feedback", permission: "view_own_sessions" },
  ],
  footer: [
    // Restored: change-password now lives at POST /api/auth/change-password,
    // reachable by any authenticated role, so this no longer 403s.
    { title: "Change Password", icon: KeyRound, href: "/trainer/change-password" },
    { title: "Logout",          icon: LogOut,   href: "/logout"                  },
  ],
};

/* ── Platform (super-admin) Navigation ── */

export const platformNav = {
  main: [
    { title: "Platform Overview", icon: LayoutDashboard, href: "/platform/dashboard" },
    { title: "Tenant Directory",  icon: Building2,       href: "/platform/tenants"   },
    { title: "Service Requests",  icon: Inbox,           href: "/platform/services"  },
    { title: "Seat Requests",     icon: UserPlus,        href: "/platform/seats"     },
    { title: "Access Control",    icon: ShieldCheck,     href: "/platform/access"    },
    // Cross-tenant, and it includes what each tenant's OWN admins did —
    // which is the half a tenant cannot audit for itself.
    { title: "Activity Log",      icon: ScrollText,      href: "/platform/activity"  },
  ],
  footer: [
    { title: "Logout", icon: LogOut, href: "/logout" },
  ],
};
