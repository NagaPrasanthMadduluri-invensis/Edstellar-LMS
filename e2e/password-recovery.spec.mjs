/**
 * Forgotten password (CONTEXT.md §4): a learner asks for a reset link on
 * /forgot-password, the neutral confirmation shows, the link from the email
 * (read from the outbox row) opens /reset-password, the new password is set,
 * the new password signs in and the old one no longer does. A spent link is
 * refused with its own sentence.
 */
import { test, expect, db } from './support.mjs';
import { dbUntil, newLearner } from './helpers-1.mjs';
import { passwordWorks } from './helpers-4.mjs';

const NEW_PASSWORD = 'R3set-Journey!9';

test('a learner resets a forgotten password from the emailed link and signs in with the new one', async ({ page }) => {
  const learner = await newLearner('A', 'Fp');

  // Signed out, from the sign-in page's own link.
  await page.goto('/login');
  await page.getByRole('link', { name: 'Forgot password?' }).click();
  await expect(page).toHaveURL(/\/forgot-password$/);
  await expect(page.getByText('Reset your password')).toBeVisible();
  await page.getByLabel('Email').fill(learner.email);
  await page.getByRole('button', { name: 'Send me a reset link' }).click();
  await expect(page.getByText('Check your email')).toBeVisible();
  await expect(page.getByText(/If that email address has an account, a reset link is on its way/)).toBeVisible();

  // The email carries the one-time link; the database keeps only a hash.
  const [mail] = await dbUntil(
    "SELECT link FROM email_outbox WHERE user_id = $1 AND type = 'password_reset' ORDER BY id DESC LIMIT 1",
    [learner.id], (r) => r.length === 1, 'reset email queued',
  );
  expect(mail.link).toMatch(/^\/reset-password\?token=/);
  const token = decodeURIComponent(mail.link.split('token=')[1]);
  const stored = await db("SELECT token_hash FROM password_reset_tokens WHERE user_id = $1 AND purpose = 'reset'", [learner.id]);
  expect(stored).toHaveLength(1);
  expect(stored[0].token_hash).not.toBe(token);

  await page.goto(mail.link);
  await expect(page.getByText('Choose your password')).toBeVisible();
  await page.getByLabel('New password', { exact: true }).fill(NEW_PASSWORD);
  await page.getByLabel('Confirm new password').fill(NEW_PASSWORD);
  await page.getByRole('button', { name: 'Set my new password' }).click();
  await expect(page.getByText('Your password has been changed')).toBeVisible();

  // Ground truth: the new password works, the old one does not.
  expect(await passwordWorks(learner.email, NEW_PASSWORD)).toBe(true);
  expect(await passwordWorks(learner.email, learner.password)).toBe(false);
  const [spent] = await db("SELECT used_at FROM password_reset_tokens WHERE user_id = $1 AND purpose = 'reset'", [learner.id]);
  expect(spent.used_at).not.toBeNull();

  // Sign in through the page with the new password.
  await page.getByRole('link', { name: 'Go to sign in' }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.locator('#email').fill(learner.email);
  await page.locator('#password').fill(NEW_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((u) => !/\/login/.test(u.pathname));
  if (/\/consent/.test(page.url())) {
    await page.getByRole('button', { name: 'I have read this notice, continue' }).click();
  }
  await expect(page).toHaveURL(/\/dashboard/);

  // The same link a second time is refused, and says why.
  const anon = await page.context().browser().newContext();
  const again = await anon.newPage();
  await again.goto(mail.link);
  await expect(again.getByText('This link has already been used')).toBeVisible();
  await expect(again.getByRole('link', { name: 'Send me a new link' })).toBeVisible();
  await anon.close();
});

test('an unknown address gets the same neutral answer and no email is queued', async ({ page }) => {
  const email = `nobody-${Date.now().toString(36)}@org-a-e2e.e2e.test`;
  await page.goto('/forgot-password');
  await page.getByLabel('Email').fill(email);
  await page.getByRole('button', { name: 'Send me a reset link' }).click();
  await expect(page.getByText(/If that email address has an account, a reset link is on its way/)).toBeVisible();
  const rows = await db('SELECT 1 FROM email_outbox WHERE to_email = $1', [email]);
  expect(rows).toHaveLength(0);
});
