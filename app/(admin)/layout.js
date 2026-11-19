import { redirect } from "next/navigation";
import { requireSession } from "@/lib/session";
import { AdminShell } from "@/components/layout/admin-shell";
import { EngagementTracker } from "@/components/shared/engagement-tracker";

export default async function AdminLayout({ children }) {
  const user = await requireSession();

  if (user.role !== "admin") {
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
