import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { PlatformShell } from "@/components/platform/platform-shell";

export default async function PlatformLayout({ children }) {
  const user = await getSessionUser();

  if (!user) {
    // `session=expired` lets middleware.js render the form instead of
    // bouncing back here — see the comment there.
    redirect("/login?session=expired");
  }

  if (user.role !== "admin") {
    redirect(user.role === "trainer" ? "/trainer/sessions" : "/dashboard");
  }

  if (!user.isPlatformAdmin) {
    redirect("/admin/dashboard");
  }

  return <PlatformShell user={user}>{children}</PlatformShell>;
}
