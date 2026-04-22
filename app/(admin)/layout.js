import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUserFromCookieServer, getTokenFromCookieServer } from "@/services/api/auth/auth-api";
import { AdminShell } from "@/components/layout/admin-shell";

export default async function AdminLayout({ children }) {
  const cookieStore = await cookies();
  const token = getTokenFromCookieServer(cookieStore);
  const user = getUserFromCookieServer(cookieStore);

  if (!token || !user) {
    redirect("/login");
  }

  if (user.role.slug !== "lms_admin") {
    redirect("/dashboard");
  }

  return <AdminShell user={user}>{children}</AdminShell>;
}
