import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { ConsentContent } from "@/components/shared/consent-content";

/**
 * The privacy-consent gate. Reached by an authenticated user of any portal.
 *
 * Deliberately uses `getSessionUser()` and not `requireSession()`: the latter
 * redirects an un-consented user HERE, so using it would loop. Someone with no
 * session goes to /login; someone who has already consented has nothing to do
 * here and is sent home.
 */
export default async function ConsentPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!user.consentRequired) redirect("/");

  return <ConsentContent />;
}
