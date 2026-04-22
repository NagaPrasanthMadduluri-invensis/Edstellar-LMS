import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUserFromCookieServer, getTokenFromCookieServer } from "@/services/api/auth/auth-api";
import { LearnerShell } from "@/components/layout/learner-shell";

export default async function LearnerLayout({ children }) {
  const cookieStore = await cookies();
  const token = getTokenFromCookieServer(cookieStore);
  const user = getUserFromCookieServer(cookieStore);

  if (!token || !user) {
    redirect("/login");
  }

  if (user.role?.slug === "lms_admin") {
    redirect("/admin/dashboard");
  }

  return <LearnerShell user={user}>{children}</LearnerShell>;
}
