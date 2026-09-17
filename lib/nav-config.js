import {
  LayoutDashboard,
  Star,
  BookOpen,
  Play,
  BarChart3,
  PenTool,
  Award,
  ExternalLink,
  CreditCard,
  Receipt,
  RefreshCcw,
  RotateCcw,
  Bookmark,
  Trophy,
  TrendingUp,
  MessageCircle,
  MessageSquare,
  Bell,
  Ticket,
  Package,
  HeadphonesIcon,
  User,
  LogOut,
  Users,
  Users2,
  Settings,
  Navigation,
  ShieldCheck,
  Sparkles,
  Inbox,
  FileBarChart,
  Building2,
  GraduationCap,
  Megaphone,
  Layers3,
  LucideGitGraph,
  Library,
  LineChart,
  Map,
  CalendarCheck,
  CalendarDays,
  Clock,
  Hourglass,
  Wallet,
  UserCheck,
  UserPlus,
  KeyRound,
} from "lucide-react";

/* ── Learner Navigation ── */

// export const learnerNav = {
//   main: [
//     { title: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
//     { title: "Course Catalog", icon: Star, href: "/courses" },
//     { title: "My Courses", icon: BookOpen, href: "/my-courses" },
//   ],
//   learning: [
//     { title: "Content & Lessons", icon: Play, href: "/content" },
//     { title: "My Progress", icon: BarChart3, href: "/progress" },
//     { title: "Quizzes & Mock Tests", icon: PenTool, href: "/quizzes" },
//     { title: "Certificates", icon: Award, href: "/certificates" },
//     { title: "External Portals", icon: ExternalLink, href: "/portals" },
//   ],
//   payments: [
//     { title: "My Enrollments", icon: CreditCard, href: "/enrollments" },
//     { title: "Invoices & Receipts", icon: Receipt, href: "/invoices" },
//     { title: "Modifications", icon: RefreshCcw, href: "/modifications" },
//     { title: "Refund Requests", icon: RotateCcw, href: "/refunds" },
//   ],
//   engage: [
//     { title: "Bookmarks", icon: Bookmark, href: "/bookmarks" },
//     { title: "Rewards & Points", icon: Trophy, href: "/rewards" },
//     { title: "PDU / CPD / SCU", icon: TrendingUp, href: "/pdu" },
//     { title: "Feedback", icon: MessageCircle, href: "/feedback" },
//     { title: "Messages", icon: MessageSquare, href: "/messages" },
//     { title: "Notifications", icon: Bell, href: "/notifications" },
//   ],
//   support: [
//     { title: "Exam Vouchers", icon: Ticket, href: "/vouchers" },
//     { title: "Add-ons", icon: Package, href: "/addons" },
//     { title: "Support Tickets", icon: HeadphonesIcon, href: "/support" },
//   ],
//   footer: [
//     { title: "Profile & Settings", icon: User, href: "/profile" },
//     { title: "Logout", icon: LogOut, href: "/logout" },
//   ],
// };


export const learnerNav = {
  main: [
    { title: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  ],
  myLearnings: [
    { title: "My Courses",        icon: BookOpen,     href: "/my-courses"        },
    { title: "Training Calendar", icon: CalendarDays, href: "/training-calendar" },
  ],
  progress: [
    { title: "My Progress",    icon: BarChart3, href: "/progress"        },
    { title: "Learning Hours", icon: Clock,     href: "/learning-hours"  },
  ],
  achievements: [
    { title: "My Achievements", icon: Trophy,         href: "/achievements"  },
    { title: "Leaderboard",     icon: TrendingUp,     href: "/leaderboard"   },
    { title: "Certificates",    icon: Award,          href: "/certifications"},
  ],
  /**
   * The manager's extra module (`specs/rbac.md` decision 2). Gated on the
   * permission, so a plain learner no longer sees it — it used to be shown to
   * everybody, rendering a hardcoded team.
   */
  team: [
    {
      title: "Team Learning",
      icon: Users,
      href: "/team-learning",
      permission: "view_team_learning",
    },
  ],
  footer: [
    { title: "Change Password", icon: KeyRound, href: "/change-password" },
    { title: "Logout",          icon: LogOut,   href: "/logout"          },
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
 */
export const adminNav = {
  main: [
    { title: "Dashboard", icon: LayoutDashboard, href: "/admin/dashboard", permission: "view_dashboard" },
    // Analytics and Reports sit at the TOP, beside Dashboard, rather than down
    // in the Analytics group. The three are one story — what is true now, how
    // it got here, and the evidence — and an admin moves between them
    // constantly. The group below keeps the single-subject views.
    { title: "Analytics", icon: LineChart, href: "/admin/analytics", permission: "view_reports" },
    { title: "Reports",   icon: BarChart3, href: "/admin/reports",   permission: "view_reports" },
  ],
  userManagement: [
    { title: "Manage Users",       icon: Users,       href: "/admin/users", permission: "view_employees" },
    { title: "Roles & Permissions",icon: ShieldCheck, href: "/admin/roles", permission: "manage_roles"   },
  ],
  // What an admin BUILDS: the content itself, and the paths through it.
  courseManagement: [
    { title: "Course Library",    icon: Library, href: "/admin/courses",  permission: "manage_courses" },
    { title: "Learning Paths",    icon: Map,     href: "/admin/journeys", permission: "manage_courses" },
  ],
  // What an admin DELIVERS to people: when it runs, who gets it, who turned up.
  //
  // This replaced a one-item "Assignments" group. A heading over a single link
  // is a heading that carries no information — it says the same thing the link
  // below it already said — and it left the calendar and the session register
  // filed under Course Management, beside the course editor, which is not what
  // either of them is. Scheduling a session, assigning it and marking who
  // attended are one job, so they are now one group.
  trainingDelivery: [
    { title: "Training Calendar",    icon: CalendarDays,  href: "/admin/calendar",        permission: "manage_sessions"  },
    { title: "Assign Learning",      icon: UserCheck,     href: "/admin/assign-learning", permission: "assign_learning"  },
    { title: "Sessions & Attendance",icon: CalendarCheck, href: "/admin/sessions",        permission: "manage_sessions"  },
  ],
  // Edstellar's own offering, not the org's content — which is why it is its
  // own group rather than an item under Course Management. `request_services`
  // gates it because this is the one module whose output leaves the tenant:
  // it puts the organization's name, a contact and a budget in front of
  // Edstellar's sales team.
  edstellar: [
    { title: "Edstellar Services", icon: Sparkles, href: "/admin/services", permission: "request_services" },
  ],
  // What a learner EARNS. Named Recognition rather than Analytics, which is
  // what this group used to be called — and there is an Analytics link at the
  // top of the sidebar, so one word was labelling two different things.
  //
  // Departments and Learning Hours were dropped from the list, not deleted:
  // both routes still exist and still answer. The dashboard's Department
  // progress panel links to /admin/departments, so that page keeps an entry
  // point; /admin/learning-hours now has none, and is reachable only by URL.
  recognition: [
    { title: "Certificates", icon: Award,  href: "/admin/certificates", permission: "view_certificates" },
    { title: "Leaderboard",  icon: Trophy, href: "/admin/leaderboard",  permission: "view_reports"      },
  ],
  footer: [
    // No permission: signing out is not a capability an org can withhold.
    { title: "Logout", icon: LogOut, href: "/logout" },
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
    { title: "My Sessions", icon: CalendarCheck, href: "/trainer/sessions", permission: "view_own_sessions" },
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
  ],
  footer: [
    { title: "Logout", icon: LogOut, href: "/logout" },
  ],
};
