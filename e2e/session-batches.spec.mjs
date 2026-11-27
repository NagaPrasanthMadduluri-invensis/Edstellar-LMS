/**
 * Session dates and day batches across the portals (CONTEXT.md §6 Session,
 * Session date, Batch; BACKEND_STRUCTURE §10.67):
 *
 * a self-enrol session on two dates with a Morning and an Afternoon time slot
 * (so four batches of one seat). A learner chooses one batch on EACH date in
 * the catalogue; the next learner wanting a full batch queues for it. The
 * admin moves the second date later in the Edit Session calendar, sees
 * "Postponed" in the preview and on the card, and marks attendance per date.
 * The learner and trainer see the new date labelled Postponed.
 */
import { test, expect, fx, db } from './support.mjs';
import { api, dbUntil, newLearner, pageAs, uniq } from './helpers-1.mjs';
import { isoDaysAhead } from './helpers-3.mjs';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** The app's formatDayDate: "Thu 5 Nov 2026". */
const dayLabel = ({ iso }) => {
  const [y, m, d] = iso.split('-').map(Number);
  const wd = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${wd} ${d} ${MONTHS[m - 1]} ${y}`;
};

test('dates and day batches: a batch per date from the picker, a postponed date everywhere, attendance per date', async ({ browser }) => {
  const A = fx().A;
  const first = await newLearner('A', 'Da');
  const second = await newLearner('A', 'Db');
  const title = uniq('Two-day workshop');
  const d1 = isoDaysAhead(40);
  const d2 = isoDaysAhead(47);
  const d3 = isoDaysAhead(54);

  // SETUP (not the subject): created through the API with two time slots on two dates.
  const admin = await api(A.admin);
  const created = await admin.post('/api/admin/sessions', {
    title, session_type: 'ILT', capacity: 10, trainer: 'derived', trainer_user_id: A.trainer.id,
    venue_url: 'Room 9', date: d1.iso, start_time: '09:00', end_time: '12:00', enroll_mode: 'self',
    dates: [d1.iso, d2.iso],
    slots: [
      { label: 'Morning', start_time: '09:00', end_time: '12:00', capacity: 1 },
      { label: 'Afternoon', start_time: '14:00', end_time: '17:00', capacity: 1 },
    ],
  });
  const sessionId = (created.session ?? created).id;
  const dates = await db('SELECT id, date FROM session_dates WHERE session_id = $1 ORDER BY date', [sessionId]);
  expect(dates.map((d) => d.date)).toEqual([d1.iso, d2.iso]);

  // ── First learner chooses Morning on both dates ──
  const p1 = await pageAs(browser, first);
  await p1.goto('/catalogue');
  await p1.getByPlaceholder('Search courses, tags…').fill(title);
  await expect(p1.getByText('Choose a batch for each date')).toBeVisible();
  const g1 = p1.getByTestId(`batch-choice-${dates[0].id}`);
  const g2 = p1.getByTestId(`batch-choice-${dates[1].id}`);
  await expect(g1).toContainText(dayLabel(d1));
  await expect(g1.getByRole('radio', { name: /Batch 1 · Morning/ })).toContainText('0 / 1 · 1 seat left');
  await expect(p1.getByText('Choose a batch for every date to book.')).toBeVisible();
  await g1.getByRole('radio', { name: /Batch 1 · Morning/ }).click();
  await g2.getByRole('radio', { name: /Batch 1 · Morning/ }).click();
  await p1.getByRole('button', { name: 'Book my place' }).click();
  await expect(p1.getByText(`Your place on "${title}" is booked`)).toBeVisible();
  const placed = await db('SELECT session_date_id FROM session_batch_members WHERE session_id = $1 AND user_id = $2 ORDER BY session_date_id', [sessionId, first.id]);
  expect(placed).toHaveLength(2);

  // ── Second learner wants the full first Morning: the booking queues for it ──
  const p2 = await pageAs(browser, second);
  await p2.goto('/catalogue');
  await p2.getByPlaceholder('Search courses, tags…').fill(title);
  await expect(p2.getByTestId(`batch-choice-${dates[0].id}`).getByRole('radio', { name: /Batch 1 · Morning/ })).toContainText('Full');
  await p2.getByTestId(`batch-choice-${dates[0].id}`).getByRole('radio', { name: /Batch 1 · Morning/ }).click();
  await p2.getByTestId(`batch-choice-${dates[1].id}`).getByRole('radio', { name: /Batch 2 · Afternoon/ }).click();
  await p2.getByRole('button', { name: 'Join the waitlist' }).click();
  await dbUntil('SELECT 1 FROM session_waitlist WHERE session_id = $1 AND user_id = $2', [sessionId, second.id], (r) => r.length === 1, 'queued');
  await p2.context().close();

  // ── Admin moves the second date a week later in the Edit Session calendar ──
  const ap = await pageAs(browser, A.admin);
  await ap.goto('/admin/sessions');
  await ap.getByPlaceholder('Search title, trainer, type, venue…').fill(title);
  await expect(ap.getByTestId(`session-dates-${sessionId}`)).toContainText(`${d1.date.getDate()}`);
  await ap.getByRole('button', { name: 'Edit session' }).click();
  const editor = ap.getByTestId('schedule-editor');
  await expect(editor.getByTestId(`schedule-date-${d1.iso}`)).toBeVisible();
  await editor.getByLabel(`Change ${dayLabel(d2)}`).fill(d3.iso);
  await expect(ap.getByTestId('schedule-preview')).toContainText(`Postponed: ${dayLabel(d2)} moves to ${dayLabel(d3)}`);
  await ap.getByRole('button', { name: 'Save Changes' }).click();
  await expect(ap.getByRole('dialog')).toBeHidden();
  const [moved] = await dbUntil('SELECT date, previous_date, change FROM session_dates WHERE id = $1', [dates[1].id], (r) => r[0]?.date === d3.iso, 'date moved');
  expect(moved).toEqual({ date: d3.iso, previous_date: d2.iso, change: 'postponed' });
  // The batches and the learner's place moved with the date.
  expect(await db('SELECT 1 FROM session_batch_members WHERE session_date_id = $1 AND user_id = $2', [dates[1].id, first.id])).toHaveLength(1);
  await expect(ap.getByText('Postponed').first()).toBeVisible();

  // ── Attendance per date: present on the first date only rolls up to Partial ──
  await ap.getByRole('button', { name: 'Mark attendance' }).click();
  await ap.getByTestId(`attendance-date-${dates[0].id}`).click();
  await expect(ap.getByTestId(`attendance-date-${dates[1].id}`)).toContainText('Postponed');
  await ap.getByRole('button', { name: 'Present', exact: true }).first().click(); // quick mark all
  await ap.getByRole('button', { name: 'Save Draft' }).click();
  const [att] = await dbUntil('SELECT status FROM session_attendance WHERE session_id = $1 AND user_id = $2', [sessionId, first.id], (r) => !!r[0]?.status, 'rolled up');
  expect(att.status).toBe('partial');
  await expect(ap.getByText('Overall: Partial').first()).toBeVisible();
  await ap.context().close();

  // ── The learner sees the new date, labelled ──
  await p1.goto('/my-sessions');
  const mine = p1.getByTestId(`my-dates-${sessionId}`);
  await expect(mine).toContainText('The dates for this session have changed');
  await expect(mine).toContainText(dayLabel(d3));
  await expect(mine).toContainText('Postponed');
  await expect(mine).toContainText('Batch 1 · Morning');
  await p1.context().close();

  // ── So does the trainer ──
  const tp = await pageAs(browser, A.trainer);
  await tp.goto('/trainer/sessions');
  const card = tp.locator('div').filter({ has: tp.getByRole('link', { name: new RegExp(title) }) }).last();
  await expect(card).toContainText('Postponed');
  await expect(card).toContainText(dayLabel(d3).split(' ').slice(1, 3).join(' '));
  await tp.context().close();
});
