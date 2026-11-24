/**
 * Batched sessions across the portals (CONTEXT.md §6 Session, Batch, Self-enrolment):
 * a self-enrol session with two batches on the same day (one seat each) and a
 * three-day batch. A learner books a batch from the catalogue picker, the seat
 * counts agree everywhere, My Sessions names the learner's own batch, the learner
 * calendar marks "Your batch", and the admin calendar shows the same-day batches as
 * separate entries and the multi-day batch on each of its days.
 */
import { test, expect, fx, db } from './support.mjs';
import { api, newLearner, pageAs, uniq } from './helpers-1.mjs';
import { isoDaysAhead } from './helpers-3.mjs';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Page the calendar from the current month to the month of `date`. */
async function gotoMonth(page, date) {
  await page.getByRole('button', { name: 'Today' }).click();
  const now = new Date();
  const steps = (date.getFullYear() - now.getFullYear()) * 12 + date.getMonth() - now.getMonth();
  for (let i = 0; i < steps; i++) await page.getByRole('button', { name: /^Next/ }).click();
  await expect(page.getByRole('heading', { name: `${MONTHS[date.getMonth()]} ${date.getFullYear()}` })).toBeVisible();
}

const batchRow = (page, name) => page.locator('div')
  .filter({ has: page.getByText(name, { exact: true }) })
  .filter({ has: page.getByRole('button', { name: /Book this batch|Join waitlist/ }) })
  .last();

test('batches: book from the picker, seats agree, calendars show each batch and each day', async ({ browser }) => {
  const A = fx().A;
  const first = await newLearner('A', 'Ba');
  const second = await newLearner('A', 'Bb');
  const title = uniq('Batched bootcamp');
  const day = isoDaysAhead(40);
  const camp = [isoDaysAhead(42), isoDaysAhead(43), isoDaysAhead(44)];

  // SETUP (not the subject): one session, two same-day batches of one seat, one three-day batch.
  const admin = await api(A.admin);
  const created = await admin.post('/api/admin/sessions', {
    title, session_type: 'ILT', capacity: 10, trainer: 'derived', trainer_user_id: A.trainer.id,
    venue_url: 'Room 9', date: day.iso, start_time: '09:00', end_time: '12:00', enroll_mode: 'self',
  });
  const sessionId = (created.session ?? created).id;
  const mk = (body) => admin.post(`/api/admin/sessions/${sessionId}/batches`, body);
  await mk({ label: 'Morning', date: day.iso, start_time: '09:00', end_time: '12:00', capacity: 1 });
  await mk({ label: 'Afternoon', date: day.iso, start_time: '14:00', end_time: '17:00', capacity: 1 });
  await mk({ label: 'Bootcamp', date: camp[0].iso, end_date: camp[2].iso, start_time: '10:00', end_time: '13:00', capacity: 5 });

  // ── First learner books the Morning batch through the picker ──
  const p1 = await pageAs(browser, first);
  await p1.goto('/catalogue');
  await p1.getByPlaceholder('Search courses, tags…').fill(title);
  await expect(p1.getByText('Choose a batch')).toBeVisible();
  const morning = batchRow(p1, 'Batch 1 · Morning');
  await expect(morning).toContainText('0 / 1 · 1 seat left');
  await expect(batchRow(p1, 'Batch 3 · Bootcamp')).toContainText('each day');
  await morning.getByRole('button', { name: 'Book this batch' }).click();
  await expect(p1.getByText(`Your place on "${title}" is booked`)).toBeVisible();
  await expect(p1.getByText('Your batch')).toBeVisible();
  await expect(p1.getByText('1 / 1 · Full').first()).toBeVisible();
  const [rosterRow] = await db('SELECT batch_id FROM session_roster WHERE session_id = $1 AND user_id = $2', [sessionId, first.id]);
  expect(rosterRow.batch_id).not.toBeNull();

  // ── Second learner: Morning is full (waitlist), Afternoon still has its seat ──
  const p2 = await pageAs(browser, second);
  await p2.goto('/catalogue');
  await p2.getByPlaceholder('Search courses, tags…').fill(title);
  await expect(batchRow(p2, 'Batch 1 · Morning')).toContainText('Full');
  await expect(batchRow(p2, 'Batch 2 · Afternoon')).toContainText('1 seat left');
  await expect(batchRow(p2, 'Batch 1 · Morning').getByRole('button', { name: 'Join waitlist' })).toBeVisible();
  await expect(batchRow(p2, 'Batch 2 · Afternoon').getByRole('button', { name: 'Book this batch' })).toBeVisible();
  await batchRow(p2, 'Batch 1 · Morning').getByRole('button', { name: 'Join waitlist' }).click();
  await expect(p2.getByText('On the waitlist (#1)')).toBeVisible();
  await p2.context().close();

  // ── My Sessions names the learner's own batch and its date ──
  await p1.goto('/my-sessions');
  const card = p1.locator('div').filter({ has: p1.getByRole('heading', { name: title }) }).last();
  await expect(card).toContainText('Batch 1 · Morning');
  await expect(card).toContainText(`${day.date.getDate()} `);
  await expect(card).toContainText('9:00 AM');

  // ── Learner calendar: own batch marked, the other batches visible but not marked ──
  await p1.goto('/training-calendar');
  await gotoMonth(p1, day.date);
  const mine = p1.getByRole('button', { name: new RegExp(`${title}.*Morning`) });
  await expect(mine).toContainText('Your batch');
  const other = p1.getByRole('button', { name: new RegExp(`${title}.*Afternoon`) });
  await expect(other).toBeVisible();
  await expect(other).not.toContainText('Your batch');
  await expect(other).toContainText('0 / 1 · 1 seat left');
  await mine.click();
  const dlg = p1.getByRole('dialog');
  await expect(dlg).toContainText('Your batch');
  await expect(dlg).toContainText('Room 9');
  await p1.context().close();

  // ── Admin calendar: same-day batches are separate entries, the camp is on each day ──
  const ap = await pageAs(browser, A.admin);
  await ap.goto('/admin/calendar');
  await gotoMonth(ap, day.date);
  const am = ap.getByRole('button', { name: new RegExp(`${title}.*Morning`) });
  const pm = ap.getByRole('button', { name: new RegExp(`${title}.*Afternoon`) });
  await expect(am).toContainText('1 / 1 · Full');
  await expect(pm).toContainText('0 / 1 · 1 seat left');
  await expect(am.locator('xpath=..').getByRole('button', { name: new RegExp('Afternoon') })).toBeVisible();
  await am.click();
  await expect(ap.getByRole('dialog')).toContainText('1 / 1 enrolled');
  await ap.keyboard.press('Escape');
  for (const [i, d] of camp.entries()) {
    await gotoMonth(ap, d.date);
    const entry = ap.getByRole('button', { name: new RegExp(`${title}.*Bootcamp.*Day ${i + 1} of 3`) });
    await expect(entry).toBeVisible();
    await expect(entry.locator('xpath=../..')).toHaveText(new RegExp(`^${d.date.getDate()}(?!\\d)`));
  }
  await ap.context().close();
});
