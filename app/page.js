import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUserFromCookieServer, getTokenFromCookieServer } from "@/services/api/auth/auth-api";

export default async function Home() {
  const cookieStore = await cookies();
  const token = getTokenFromCookieServer(cookieStore);
  const user = getUserFromCookieServer(cookieStore);

  if (!token || !user) {
    redirect("/login");
  }

  if (user.role?.slug === "lms_admin") {
    redirect("/admin/dashboard");
  }

  redirect("/dashboard");
}
