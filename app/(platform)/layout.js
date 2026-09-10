import { redirect } from "next/navigation";
import { getSessionUser, loginPath } from "@/lib/session";
import { PlatformShell } from "@/components/platform/platform-shell";

export default async function PlatformLayout({ children }) {
  const user = await getSessionUser();

  if (!user) {
    redirect(await loginPath());
  }

  if (user.role !== "admin") {
    redirect(user.role === "trainer" ? "/trainer/sessions" : "/dashboard");
  }

  if (!user.isPlatformAdmin) {
    redirect("/admin/dashboard");
  }

  return <PlatformShell user={user}>{children}</PlatformShell>;
}
