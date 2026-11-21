/**
 * People administration (CONTEXT.md §2, §3; BACKEND_STRUCTURE §10.17, §10.21,
 * §10.49): admin A adds a person on Manage Users (no password field, a welcome
 * email queued), changes their role, deactivates and reactivates them, and the
 * Seat Licence panel moves with every step. Roles & Permissions lists roles.
 */
import { test, expect, fx, signIn, db } from './support.mjs';
import { choose, uniq } from './helpers-2.mjs';

const SEAT_RE = /Seat Licence — (\d+) of (\d+) seats used/;

async function seatsUsed(page) {
  const panel = page.getByText(SEAT_RE);
  await expect(panel).toBeVisible();
  return Number(SEAT_RE.exec(await panel.innerText())[1]);
}

async function activeLearners(orgId) {
  const [r] = await db(
    `SELECT COUNT(*)::int AS n FROM users u JOIN roles r ON r.id = u.role_id
      WHERE u.organization_id = $1 AND u.is_active = 1 AND r.portal = 'learner'`,
    [orgId],
  );
  return r.n;
}

test('admin adds, re-roles, deactivates and reactivates a person; seats follow', async ({ page }) => {
  const f = fx();
  await signIn(page, f.A.admin);
  await page.goto('/admin/users');
  await expect(page.getByRole('button', { name: '+ Add User' })).toBeVisible();

  const before = await seatsUsed(page);
  expect(before).toBe(await activeLearners(f.A.id));

  // Add a learner. The dialog asks for no password: they set their own.
  const first = uniq('Pa');
  const email = `${first.toLowerCase()}@org-a-e2e.e2e.test`;
  await page.getByRole('button', { name: '+ Add User' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText(/emailed a link to set their own password/i)).toBeVisible();
  await expect(dialog.locator('input[type="password"]')).toHaveCount(0);
  await expect(dialog.getByLabel(/password/i)).toHaveCount(0);
  await page.locator('#nu-first').fill(first);
  await page.locator('#nu-last').fill('Person');
  await page.locator('#nu-email').fill(email);
  await dialog.getByRole('button', { name: 'Add Learner' }).click();
  await expect(dialog).toBeHidden();

  await page.getByPlaceholder('Search by name or email…').fill(email);
  const row = page.locator('tr', { hasText: email });
  await expect(row).toBeVisible();
  await expect(row.getByText('Learner', { exact: true })).toBeVisible();
  await expect.poll(() => seatsUsed(page)).toBe(before + 1);

  // Ground truth: a welcome email is queued for them, and nobody typed a password.
  const [user] = await db('SELECT id FROM users WHERE email = $1', [email]);
  const outbox = await db("SELECT status FROM email_outbox WHERE to_email = $1 AND type = 'welcome'", [email]);
  expect(outbox.length).toBe(1);
  expect(outbox[0].status).toBe('pending');

  // The admin's email page shows that welcome as queued.
  await page.goto('/admin/email');
  await expect(page.getByText(email).first()).toBeVisible();

  // Change role: learner -> trainer frees the seat.
  await page.goto('/admin/users');
  await page.getByPlaceholder('Search by name or email…').fill(email);
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: /Change role/ }).click();
  const roleDialog = page.getByRole('dialog', { name: 'Change role' });
  await choose(page, roleDialog.getByRole('combobox'), /^Trainer/);
  await expect(roleDialog.getByText(/frees a licensed seat/)).toBeVisible();
  await roleDialog.getByRole('button', { name: 'Change role' }).click();
  await expect(roleDialog).toBeHidden();
  await expect(row.getByText('Trainer', { exact: true })).toBeVisible();
  await expect.poll(() => seatsUsed(page)).toBe(before);
  const [asTrainer] = await db('SELECT role FROM users WHERE id = $1', [user.id]);
  expect(asTrainer.role).toBe('trainer');

  // And back to learner, which takes a seat again.
  await row.getByRole('button', { name: /Change role/ }).click();
  await choose(page, roleDialog.getByRole('combobox'), /^Learner/);
  await expect(roleDialog.getByText(/uses a licensed seat/)).toBeVisible();
  await roleDialog.getByRole('button', { name: 'Change role' }).click();
  await expect(roleDialog).toBeHidden();
  await expect(row.getByText('Learner', { exact: true })).toBeVisible();
  await expect.poll(() => seatsUsed(page)).toBe(before + 1);

  // Deactivate: the seat is freed and the account cannot sign in.
  await row.getByRole('button', { name: 'Deactivate', exact: true }).click();
  const confirm = page.getByRole('alertdialog');
  await expect(confirm.getByText(/will no longer be able to log in/)).toBeVisible();
  await confirm.getByRole('button', { name: 'Deactivate' }).click();
  await expect(row.getByRole('button', { name: 'Activate', exact: true })).toBeVisible();
  await expect.poll(() => seatsUsed(page)).toBe(before);
  expect((await db('SELECT is_active FROM users WHERE id = $1', [user.id]))[0].is_active).toBe(0);

  // Reactivate.
  await row.getByRole('button', { name: 'Activate', exact: true }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Activate' }).click();
  await expect(row.getByRole('button', { name: 'Deactivate', exact: true })).toBeVisible();
  await expect.poll(() => seatsUsed(page)).toBe(before + 1);
  expect(await activeLearners(f.A.id)).toBe(before + 1);

  // Roles & Permissions lists the organization's roles.
  await page.goto('/admin/roles');
  for (const label of ['Admin', 'Manager', 'Learner', 'Trainer']) {
    await expect(page.getByRole('heading', { name: label, exact: true })).toBeVisible();
  }
});
