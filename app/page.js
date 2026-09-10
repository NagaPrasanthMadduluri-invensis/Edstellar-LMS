import { redirect } from "next/navigation";
import { getSessionUser, loginPath } from "@/lib/session";

export default async function Home() {
  const user = await getSessionUser();

  if (!user) {
    redirect(await loginPath());
  }

  if (user.isPlatformAdmin) {
    redirect("/platform/dashboard");
  }

  if (user.role === "trainer") {
    redirect("/trainer/sessions");
  }

  if (user.role === "admin") {
    redirect("/admin/dashboard");
  }

  redirect("/dashboard");
}
