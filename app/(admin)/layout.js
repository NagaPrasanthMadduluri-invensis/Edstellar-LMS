import { redirect } from "next/navigation";
import { requireSession } from "@/lib/session";
import { hasAdminAccess } from "@/lib/permissions";
import { AdminShell } from "@/components/layout/admin-shell";
import { EngagementTracker } from "@/components/shared/engagement-tracker";

export default async function AdminLayout({ children }) {
  const user = await requireSession();

  // An admin-portal account, OR a Learner/Manager/Trainer whose role was given
  // at least one admin permission in the Permission Matrix (BACKEND_STRUCTURE
  // §10.65). Which admin PAGES they may open is decided per page by
  // `AdminPageGate`; the API enforces each request regardless.
  if (!hasAdminAccess(user)) {
    redirect(user.role === "trainer" ? "/trainer/sessions" : "/dashboard");
  }

  if (user.isPlatformAdmin) {
    redirect("/platform/dashboard");
  }

  return (
    <AdminShell user={user}>
      <EngagementTracker />
      {children}
    </AdminShell>
  );
}
