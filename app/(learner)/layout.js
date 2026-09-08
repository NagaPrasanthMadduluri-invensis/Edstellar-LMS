import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { LearnerShell } from "@/components/layout/learner-shell";

export default async function LearnerLayout({ children }) {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role === "admin") {
    redirect(user.isPlatformAdmin ? "/platform/dashboard" : "/admin/dashboard");
  }

  // A trainer is not an admin, so the check above lets him through — he has to
  // be sent to his own portal explicitly (`specs/rbac.md` §3.6.1).
  if (user.role === "trainer") {
    redirect("/trainer/sessions");
  }

  return <LearnerShell user={user}>{children}</LearnerShell>;
}
