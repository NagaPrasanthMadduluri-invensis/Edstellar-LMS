/**
 * Mandatory two-step sign-in for admins (CONTEXT.md §4 Two-step sign-in,
 * Gate order): a new admin-portal person, created by admin A, signs in for
 * the first time and is held at /mfa-setup. They choose the authenticator
 * app, enter a code from the shown key, see their recovery codes once, and
 * only then reach the admin dashboard. Their next sign-in asks for the code.
 */
import { test, expect, db } from './support.mjs';
import { firstAdminSignIn, newPersonAs, totp } from './helpers-4.mjs';

test('a new admin is held at two-step setup on first sign-in and reaches the dashboard once it is on', async ({ page, browser }) => {
  const admin = await newPersonAs('A', 'admin', 'Mfa');

  const secret = await firstAdminSignIn(page, admin, {
    // Held: the portal itself sends them back here until it is done.
    onSetupPage: async () => {
      await page.goto('/admin/dashboard');
      await expect(page).toHaveURL(/\/mfa-setup$/);
      const [none] = await db('SELECT count(*)::int AS n FROM user_mfa WHERE user_id = $1 AND enabled_at IS NOT NULL', [admin.id]);
      expect(none.n).toBe(0);
    },
  });
  expect(secret).toMatch(/^[A-Z2-7]{16,}$/);

  const [mfa] = await db('SELECT method, pending_method, enabled_at FROM user_mfa WHERE user_id = $1', [admin.id]);
  expect(mfa).toEqual(expect.objectContaining({ method: 'totp', pending_method: null }));
  expect(mfa.enabled_at).not.toBeNull();

  // The next sign-in owes the code from the same authenticator.
  const fresh = await browser.newContext();
  const next = await fresh.newPage();
  await next.goto('/login');
  await next.locator('#email').fill(admin.email);
  await next.locator('#password').fill(admin.password);
  await next.locator('button[type="submit"]').click();
  await expect(next.locator('#mfa-code')).toBeVisible();
  await next.locator('#mfa-code').fill(totp(secret));
  await next.locator('button[type="submit"]').click();
  await expect(next).toHaveURL(/\/admin\/dashboard/);
  await fresh.close();
});

test('a new admin is sent to two-step setup before the privacy notice on first sign-in', async ({ page }) => {
  // CONTEXT.md Gate order: 1. /mfa-setup, 2. /consent (lib/session.js agrees,
  // and so does the login page's auth provider, via lib/sign-in-destination.js).
  const admin = await newPersonAs('A', 'admin', 'Gate');
  await page.goto('/login');
  await page.locator('#email').fill(admin.email);
  await page.locator('#password').fill(admin.password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/mfa-setup$/);
});
