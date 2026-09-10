import { redirect } from "next/navigation";
import { requireSession } from "@/lib/session";
import { PlatformShell } from "@/components/platform/platform-shell";

export default async function PlatformLayout({ children }) {
  const user = await requireSession();

  if (user.role !== "admin") {
    redirect(user.role === "trainer" ? "/trainer/sessions" : "/dashboard");
  }

  if (!user.isPlatformAdmin) {
    redirect("/admin/dashboard");
  }

  return <PlatformShell user={user}>{children}</PlatformShell>;
}
