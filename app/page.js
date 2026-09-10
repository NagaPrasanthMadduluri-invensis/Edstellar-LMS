import { redirect } from "next/navigation";
import { requireSession } from "@/lib/session";

export default async function Home() {
  const user = await requireSession();

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
