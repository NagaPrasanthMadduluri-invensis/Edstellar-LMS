/**
 * Training Calendar (CONTEXT.md §6 Session, Admin portal): a session scheduled
 * in a later month sits on its own date once the admin pages forward to that
 * month, and opening it shows its date, time, venue and trainer.
 */
import { test, expect, fx } from './support.mjs';
import { api, pageAs, uniq } from './helpers-1.mjs';
import { isoDaysAhead } from './helpers-3.mjs';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

test('a scheduled session appears on its date in the admin Training Calendar', async ({ browser }) => {
  const A = fx().A;
  const title = uniq('Calendar clinic');
  const { iso, date } = isoDaysAhead(40);
  // SETUP (not the subject): an ILT session forty days out.
  const admin = await api(A.admin);
  await admin.post('/api/admin/sessions', {
    title, session_type: 'ILT', capacity: 12, trainer: 'derived', trainer_user_id: A.trainer.id,
    venue_url: 'Room 12', date: iso, start_time: '14:00', end_time: '15:30', enroll_mode: 'assigned',
  });

  const page = await pageAs(browser, A.admin);
  await page.goto('/admin/dashboard');
  await page.getByRole('link', { name: 'Training Delivery' }).hover();
  await page.getByRole('link', { name: 'Training Calendar' }).click();
  await page.mouse.move(900, 600);
  await expect(page).toHaveURL(/\/admin\/calendar$/);
  const now = new Date();
  await expect(page.getByRole('heading', { name: `${MONTHS[now.getMonth()]} ${now.getFullYear()}` })).toBeVisible();

  // Page forward to the session's month.
  const steps = (date.getFullYear() - now.getFullYear()) * 12 + date.getMonth() - now.getMonth();
  for (let i = 0; i < steps; i++) await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByRole('heading', { name: `${MONTHS[date.getMonth()]} ${date.getFullYear()}` })).toBeVisible();

  const chip = page.getByText(title, { exact: true });
  await expect(chip).toBeVisible();
  // The cell it sits in is the session's date.
  await expect(chip.locator('xpath=../../..')).toHaveText(new RegExp(`^${date.getDate()}(?!\\d)`));

  await chip.click();
  const dlg = page.getByRole('dialog');
  await expect(dlg.getByRole('heading', { name: title })).toBeVisible();
  await expect(dlg).toContainText(`${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`);
  await expect(dlg).toContainText('2:00 PM');
  await expect(dlg).toContainText('3:30 PM');
  await expect(dlg).toContainText('Room 12');
  await expect(dlg).toContainText('0 / 12 enrolled');
  await expect(dlg).toContainText('Upcoming');

  // Today brings the current month back.
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Today' }).click();
  await expect(page.getByRole('heading', { name: `${MONTHS[now.getMonth()]} ${now.getFullYear()}` })).toBeVisible();
});
