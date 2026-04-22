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
  Settings,
  Navigation,
  ShieldCheck,
  FileBarChart,
  Building2,
  GraduationCap,
  Megaphone,
  Layers3,
  LucideGitGraph,
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
    // { title: "Course Catalog", icon: Star, href: "/courses" },
    { title: "My Courses", icon: BookOpen, href: "/my-courses" },
  ],
  learning: [
    { title: "My Progress", icon: BarChart3, href: "/progress" },
    { title: "Assessments", icon: PenTool, href: "/assessments" }, 
  ],
  footer: [
    { title: "Profile & Settings", icon: User, href: "/profile" },
    { title: "Logout", icon: LogOut, href: "/logout" },
  ],
};



/* ── Admin Navigation ── */

export const adminNav = {
  main: [
    { title: "Dashboard", icon: LayoutDashboard, href: "/admin/dashboard" },
    { title: "User Management", icon: Users, href: "/admin/users" },
    { title: "Departments", icon: Layers3, href: "/admin/departments" },
    { title: "Reports", icon: LucideGitGraph, href: "/admin/reports" },
  ],
  content: [
    { title: "Courses", icon: BookOpen, href: "/admin/courses" },
    { title: "Assign Learning", icon: Navigation, href: "/admin/assign-learning" },
  ],
  footer: [
    { title: "Settings", icon: Settings, href: "/admin/settings" },
    { title: "Logout", icon: LogOut, href: "/logout" },
  ],
};
