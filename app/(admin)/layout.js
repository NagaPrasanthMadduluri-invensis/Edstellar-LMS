import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { AdminShell } from "@/components/layout/admin-shell";

export default async function AdminLayout({ children }) {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "admin") {
    redirect("/dashboard");
  }

  return <AdminShell user={user}>{children}</AdminShell>;
}
