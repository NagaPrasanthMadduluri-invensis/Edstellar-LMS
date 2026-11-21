/**
 * Privacy (CONTEXT.md §13; BACKEND_STRUCTURE §10.38, §10.45): a brand-new
 * learner signs in for the first time and owes the privacy acknowledgement on
 * /consent; then on My Data downloads their export and files a deletion
 * request; the admin resolves it on Data requests; the learner sees the status.
 */
import fs from 'node:fs';
import { test, expect, fx, db } from './support.mjs';
import { as, apiFrom, newPerson } from './helpers-2.mjs';

test('first sign-in acknowledgement, export, deletion request resolved by admin', async ({ page, browser }) => {
  const f = fx();
  const admin = await as(browser, f.A.admin);
  const adminApi = apiFrom(admin);
  const person = await newPerson(adminApi, { slug: 'org-a-e2e', roleId: f.A.roles.learner, first: `Priv${Date.now() % 100000}` });

  // First sign-in: held at the privacy notice.
  await page.goto('/login');
  await page.locator('#email').fill(person.email);
  await page.locator('#password').fill(person.password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/consent/);
  expect((await db('SELECT consented_at FROM users WHERE id = $1', [person.id]))[0].consented_at).toBeNull();
  // Going elsewhere first is not possible: the notice is owed.
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/consent/);
  await page.getByRole('button', { name: 'I have read this notice, continue' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  const [u] = await db('SELECT consented_at, consent_version FROM users WHERE id = $1', [person.id]);
  expect(u.consented_at).not.toBeNull();
  expect(u.consent_version).toBeTruthy();
  const events = await db("SELECT event FROM consent_events WHERE user_id = $1 AND event = 'acknowledged'", [person.id]);
  expect(events.length).toBe(1);

  // My Data: the record of the acknowledgement, then the export.
  await page.getByRole('link', { name: 'My Data' }).click();
  await expect(page).toHaveURL(/\/my-data$/);
  await expect(page.getByText('Acknowledged the privacy notice').first()).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download my data' }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/\.json$/);
  const exported = JSON.parse(fs.readFileSync(await download.path(), 'utf8'));
  const text = JSON.stringify(exported);
  expect(text).toContain(person.email);
  expect(text).not.toMatch(/"password"/);

  // File a deletion request.
  const detail = `Please delete my learning record ${person.firstName}`;
  await page.getByRole('button', { name: 'New request' }).click();
  const dlg = page.getByRole('dialog', { name: 'New data request' });
  await dlg.getByRole('combobox').click();
  await page.getByRole('option', { name: 'Deletion' }).click();
  await dlg.getByPlaceholder(/What would you like deleted/).fill(detail);
  await dlg.getByRole('button', { name: 'Submit request' }).click();
  await expect(dlg).toBeHidden();
  const mine = page.locator('[data-slot="card"]', { hasText: detail });
  await expect(mine.getByText('Deletion request')).toBeVisible();
  await expect(mine.getByText('Open', { exact: true })).toBeVisible();
  const [req] = await db("SELECT id, status, type FROM data_requests WHERE user_id = $1", [person.id]);
  expect(req).toMatchObject({ status: 'open', type: 'deletion' });

  // Admin A resolves it.
  await admin.goto('/admin/data-requests');
  const row = admin.locator('[data-slot="card"]', { hasText: person.email });
  await expect(row.getByText(detail)).toBeVisible();
  await row.getByRole('button', { name: 'Respond' }).click();
  const rDlg = admin.getByRole('dialog');
  await rDlg.getByRole('combobox').click();
  await admin.getByRole('option', { name: 'Resolved' }).click();
  const note = 'Your learning record has been removed.';
  await rDlg.getByPlaceholder(/What was done/).fill(note);
  await rDlg.getByRole('button', { name: 'Save response' }).click();
  await expect(rDlg).toBeHidden();
  await expect(row.getByText('Resolved', { exact: true })).toBeVisible();
  expect((await db('SELECT status, handled_by FROM data_requests WHERE id = $1', [req.id]))[0]).toMatchObject({ status: 'resolved', handled_by: f.A.admin.id });

  // The learner sees the outcome and the note.
  await page.reload();
  await expect(mine.getByText('Resolved', { exact: true })).toBeVisible();
  await expect(mine.getByText(note)).toBeVisible();
});
