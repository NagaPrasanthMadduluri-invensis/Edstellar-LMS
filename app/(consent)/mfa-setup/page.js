import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { MfaSetupContent } from "@/components/shared/mfa-setup-content";

/**
 * The mandatory two-step sign-in setup for admins (2026-11-18).
 *
 * Uses `getSessionUser()`, not `requireSession()`, for the same reason the
 * consent page does: the latter redirects HERE, so using it would loop. No
 * session goes to /login; someone with nothing to set up goes home.
 */
export default async function MfaSetupPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!user.mfaSetupRequired) redirect("/");
  return <MfaSetupContent />;
}
