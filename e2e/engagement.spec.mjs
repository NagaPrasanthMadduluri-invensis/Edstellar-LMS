/**
 * Engagement time (CONTEXT.md §7 Engagement time): while a learner is active
 * the app credits active seconds and pings them to the server; the learner's
 * dashboard and the admin dashboard then draw engagement against learning
 * hours. The browser clock is fast-forwarded so the one-minute flushes happen
 * without waiting in real time.
 */
import { test, expect, fx, db } from './support.mjs';
import { api, newLearner, setupCourse } from './helpers-1.mjs';
import { as } from './helpers-2.mjs';

const CHART = 'Engagement hours vs Learning hours';
const EMPTY = 'No activity recorded yet for this period.';

const chartOn = (page) => page.locator('[data-slot="card"]').filter({ has: page.getByRole('heading', { name: CHART }) });

/** Keep the learner active for `minutes` of fast-forwarded browser time. */
async function beActive(page, minutes) {
  for (let i = 0; i < minutes; i++) {
    await page.mouse.move(200 + (i % 10) * 40, 300 + (i % 5) * 20);
    await page.clock.runFor(61_000);
  }
}

async function engagedSeconds(userId) {
  return (await db(
    'SELECT active_seconds FROM engagement_daily WHERE user_id = $1 AND day = CURRENT_DATE', [userId]))[0]?.active_seconds ?? 0;
}

test('active time on the learner dashboard is recorded and charted for the learner and the admin', async ({ browser }) => {
  const f = fx();
  const learner = await newLearner('A', 'Eng');
  // Setup (not the subject): one 10-minute lesson completed this week.
  const course = await setupCourse('A', { assignTo: [learner.id] });
  await (await api(learner)).post(`/api/learner/lessons/${course.lessonIds[0]}/complete`);

  const page = await as(browser, learner);
  await expect(page).toHaveURL(/\/dashboard$/);
  // Fake timers from here on; reload so the tracker starts under them.
  await page.clock.install();
  await page.reload();
  const chart = chartOn(page);
  await chart.scrollIntoViewIfNeeded();
  await expect(chart.getByText(/of your engaged time went to learning/)).toBeVisible();
  await expect(chart.getByText('0.2h', { exact: true }).first()).toBeVisible();

  // Thirty active minutes, flushed once a minute.
  await beActive(page, 30);
  await expect.poll(() => engagedSeconds(learner.id)).toBeGreaterThanOrEqual(29 * 60);
  const [row] = await db('SELECT organization_id FROM engagement_daily WHERE user_id = $1', [learner.id]);
  expect(row.organization_id).toBe(f.A.id);

  // Switching period refetches: engagement now reads 0.5h against 0.2h learning.
  await chart.getByRole('button', { name: 'Monthly' }).click();
  await chart.getByRole('button', { name: 'Weekly' }).click();
  await expect(chart.getByText('0.5h', { exact: true })).toBeVisible();
  await expect(chart.getByText('0.2h', { exact: true })).toBeVisible();
  await expect(chart.getByText(/^40%$/)).toBeVisible();
  await expect(chart.locator('.recharts-wrapper')).toBeVisible();

  // The admin sees the organisation's chart on their dashboard.
  const admin = await as(browser, f.A.admin);
  await expect(admin).toHaveURL(/\/admin\/dashboard$/);
  const orgChart = chartOn(admin);
  await orgChart.scrollIntoViewIfNeeded();
  await expect(orgChart.getByText(/of your organisation's engaged time went to learning/)).toBeVisible();
  await expect(orgChart.locator('.recharts-wrapper')).toBeVisible();
  await expect(orgChart.getByText(EMPTY)).toHaveCount(0);
});

// CONTEXT.md §7 Engagement time: "the Learner sees their own". The learner
// trend's axis is the union of learning and engaged periods, so active time
// shows before any learning hours exist.
test('a learner with active time but no learning hours sees their engagement on their dashboard', async ({ browser }) => {
  const learner = await newLearner('A', 'Idle');
  const page = await as(browser, learner);
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.clock.install();
  await page.reload();
  const chart = chartOn(page);
  await chart.scrollIntoViewIfNeeded();
  await beActive(page, 30);
  await expect.poll(() => engagedSeconds(learner.id)).toBeGreaterThanOrEqual(29 * 60);
  await chart.getByRole('button', { name: 'Monthly' }).click();
  await chart.getByRole('button', { name: 'Weekly' }).click();
  await expect(chart.getByText('0.5h', { exact: true })).toBeVisible();
  await expect(chart.getByText(EMPTY)).toHaveCount(0);
});
