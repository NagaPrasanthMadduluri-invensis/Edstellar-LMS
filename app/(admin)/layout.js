import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { AdminShell } from "@/components/layout/admin-shell";

export default async function AdminLayout({ children }) {
  const user = await getSessionUser();

  if (!user) {
    // `session=expired` lets middleware.js render the form instead of
    // bouncing back here — see the comment there.
    redirect("/login?session=expired");
  }

  if (user.role !== "admin") {
    redirect(user.role === "trainer" ? "/trainer/sessions" : "/dashboard");
  }

  if (user.isPlatformAdmin) {
    redirect("/platform/dashboard");
  }

  return <AdminShell user={user}>{children}</AdminShell>;
}
