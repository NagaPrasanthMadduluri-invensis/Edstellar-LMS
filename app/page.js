import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";

export default async function Home() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
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
