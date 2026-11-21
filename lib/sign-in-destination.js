/**
 * Where a freshly signed-in person goes (CONTEXT.md §4 Gate order).
 *
 * 1. Two-step setup they still owe (`/mfa-setup`), then
 * 2. the current privacy notice (`/consent`), then
 * 3. their portal's home.
 *
 * `lib/session.js` applies the same order on every portal layout; this is the
 * login page's copy, and the two must not disagree, or a new admin meets the
 * notice first and the setup second.
 *
 * @param {{ mfaSetupRequired?: boolean, consentRequired?: boolean, role?: string }} user
 *        a user as `normalizeUser` shapes it
 */
export function signInDestination(user) {
  if (user?.mfaSetupRequired) return "/mfa-setup";
  if (user?.consentRequired) return "/consent";
  if (user?.role === "admin") return "/admin/dashboard";
  if (user?.role === "trainer") return "/trainer/sessions";
  return "/dashboard";
}
