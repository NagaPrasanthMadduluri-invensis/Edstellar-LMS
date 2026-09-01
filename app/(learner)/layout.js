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

  return <LearnerShell user={user}>{children}</LearnerShell>;
}
