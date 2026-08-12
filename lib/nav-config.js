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
  FileBarChart,
  Building2,
  GraduationCap,
  Megaphone,
  Layers3,
  LucideGitGraph,
  Library,
  ClipboardList,
  Map,
  CalendarCheck,
  CalendarDays,
  Clock,
  Hourglass,
  Wallet,
  Timer,
  UserCheck,
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
  team: [
    { title: "Team Learning", icon: Users, href: "/team-learning" },
  ],
  footer: [
    { title: "Change Password", icon: KeyRound, href: "/change-password" },
    { title: "Logout",          icon: LogOut,   href: "/logout"          },
  ],
};



/* ── Admin Navigation ── */

export const adminNav = {
  main: [
    { title: "Dashboard", icon: LayoutDashboard, href: "/admin/dashboard" },
  ],
  userManagement: [
    { title: "Manage Users",       icon: Users,       href: "/admin/users"       },
    { title: "Roles & Permissions",icon: ShieldCheck, href: "/admin/roles"       },
  ],
  courseManagement: [
    { title: "Content Library",     icon: Library,      href: "/admin/courses"          },
    { title: "Assessment Builder",  icon: ClipboardList,href: "/admin/assessments"      },
    { title: "Learning Journeys",   icon: Map,          href: "/admin/journeys"         },
    { title: "Sessions & Attendance",icon: CalendarCheck,href: "/admin/sessions"        },
    { title: "Training Calendar",   icon: CalendarDays, href: "/admin/calendar"         },
  ],
  assignments: [
    { title: "Assign Learning", icon: UserCheck, href: "/admin/assign-learning" },
  ],
  analytics: [
    { title: "Departments",    icon: Building2, href: "/admin/departments"    },
    { title: "Reports",        icon: BarChart3, href: "/admin/reports"        },
    { title: "Learning Hours", icon: Timer,     href: "/admin/learning-hours" },
    { title: "Leaderboard",    icon: Trophy,    href: "/admin/leaderboard"    },
    { title: "Certificates",   icon: Award,     href: "/admin/certificates"   },
  ],
  footer: [
    { title: "Logout", icon: LogOut, href: "/logout" },
  ],
};
