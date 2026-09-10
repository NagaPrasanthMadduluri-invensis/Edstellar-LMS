import { redirect } from "next/navigation";
import { requireSession } from "@/lib/session";
import { TrainerShell } from "@/components/layout/trainer-shell";

/**
 * The trainer portal — `specs/rbac.md` decision 6 and §3.6.1.
 *
 * A third route group beside (admin), (learner) and (platform). A trainer is
 * NOT an admin: running sessions has no home in either existing portal, and
 * putting him in the admin group would leave every un-gated admin screen one
 * missed guard away from him.
 *
 * The API is the real boundary — `TrainerSessionsController` is
 * `@Roles('trainer')` and every query additionally filters
 * `trainer_user_id = me`. This layout only decides which shell renders.
 */
export default async function TrainerLayout({ children }) {
  const user = await requireSession();

  if (user.role !== "trainer") {
    redirect(
      user.role === "admin"
        ? user.isPlatformAdmin
          ? "/platform/dashboard"
          : "/admin/dashboard"
        : "/dashboard",
    );
  }

  return <TrainerShell user={user}>{children}</TrainerShell>;
}
