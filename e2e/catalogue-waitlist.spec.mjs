/**
 * The Course Catalogue and the Waitlist (CONTEXT.md §6 Self-enrolment, Give up
 * my place, §18.5 step 2): a one-seat open session; the first learner books
 * the place, the second joins the waitlist as number 1; the admin promotes
 * them from the waitlist; then the second learner gives up the place.
 */
import { test, expect, fx, db } from './support.mjs';
import { api, dbUntil, newLearner, pageAs, uniq } from './helpers-1.mjs';

test('a full open session queues the next learner, the admin promotes them, and they give the place up', async ({ browser }) => {
  const A = fx().A;
  const first = await newLearner('A', 'Wa');
  const second = await newLearner('A', 'Wb');
  const title = uniq('One seat clinic');

  // SETUP (not the subject): a one-seat ILT session open to self-enrolment.
  const admin = await api(A.admin);
  const created = await admin.post('/api/admin/sessions', {
    title, session_type: 'ILT', capacity: 1, trainer: 'derived', trainer_user_id: A.trainer.id,
    venue_url: 'Room 7', date: new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10),
    start_time: '09:00', end_time: '10:00', enroll_mode: 'self',
  });
  const sessionId = (created.session ?? created).id;
  const [training] = await db('SELECT id FROM courses WHERE session_id = $1', [sessionId]);

  const openCard = (page) => page.locator('div')
    .filter({ has: page.getByRole('heading', { name: title }) })
    .filter({ has: page.getByRole('button') })
    .last();

  // ── First learner books the only place ──
  const p1 = await pageAs(browser, first);
  await p1.goto('/catalogue');
  await p1.getByPlaceholder('Search courses, tags…').fill(title);
  await expect(openCard(p1)).toContainText('1 left');
  await openCard(p1).getByRole('button', { name: 'Book my place' }).click();
  await expect(p1.getByText(`Your place on "${title}" is booked`)).toBeVisible();
  await expect(openCard(p1).getByRole('button', { name: /Booked — see My Sessions/ })).toBeVisible();
  await p1.context().close();

  // ── Second learner finds it full and joins the waitlist ──
  const p2 = await pageAs(browser, second);
  await p2.goto('/catalogue');
  await p2.getByPlaceholder('Search courses, tags…').fill(title);
  await expect(openCard(p2)).toContainText('Full');
  await openCard(p2).getByRole('button', { name: 'Join the waitlist' }).click();
  await expect(p2.getByText(`You are number 1 on the waitlist for "${title}"`)).toBeVisible();
  await expect(openCard(p2)).toContainText('Number 1 on the waitlist');

  const queued = await db('SELECT user_id FROM session_waitlist WHERE session_id = $1', [sessionId]);
  expect(queued.map((r) => r.user_id)).toEqual([second.id]);
  // Waitlisted is not enrolled: no roster row and no assignment.
  expect(await db('SELECT 1 FROM session_roster WHERE session_id = $1 AND user_id = $2', [sessionId, second.id])).toHaveLength(0);
  expect(await db('SELECT 1 FROM user_course_assignments WHERE user_id = $1 AND course_id = $2', [second.id, training.id])).toHaveLength(0);

  // ── Admin promotes from the waitlist ──
  const adminPage = await pageAs(browser, A.admin);
  await adminPage.goto('/admin/sessions');
  await adminPage.getByPlaceholder('Search title, trainer, type, venue…').fill(title);
  await adminPage.getByRole('button', { name: '1 waiting' }).click();
  const wl = adminPage.getByRole('dialog');
  await expect(wl.getByRole('heading', { name: `Waitlist — ${title}` })).toBeVisible();
  await expect(wl).toContainText(second.name);
  await wl.getByRole('button', { name: 'Enrol' }).click();
  await expect(wl.getByText('Nobody is waiting.')).toBeVisible();
  await adminPage.context().close();

  await dbUntil('SELECT 1 FROM session_roster WHERE session_id = $1 AND user_id = $2', [sessionId, second.id], (r) => r.length === 1, 'promoted onto roster');
  expect(await db('SELECT 1 FROM session_waitlist WHERE session_id = $1', [sessionId])).toHaveLength(0);
  expect(await db('SELECT 1 FROM user_course_assignments WHERE user_id = $1 AND course_id = $2', [second.id, training.id])).toHaveLength(1);

  // ── Second learner now holds a place, sees it in My Sessions, then gives it up ──
  await p2.goto('/my-sessions');
  await expect(p2.getByRole('heading', { name: title })).toBeVisible();
  await p2.goto('/catalogue');
  await p2.getByPlaceholder('Search courses, tags…').fill(title);
  await expect(openCard(p2).getByRole('button', { name: /Booked — see My Sessions/ })).toBeVisible();
  await openCard(p2).getByRole('button', { name: 'Give up my place' }).click();
  await expect(p2.getByText(`You have given up your place on "${title}".`)).toBeVisible();

  await dbUntil('SELECT 1 FROM session_roster WHERE session_id = $1 AND user_id = $2', [sessionId, second.id], (r) => r.length === 0, 'place given up');
  expect(await db('SELECT 1 FROM user_course_assignments WHERE user_id = $1 AND course_id = $2', [second.id, training.id])).toHaveLength(0);
  // The first learner keeps their booking.
  expect(await db('SELECT 1 FROM session_roster WHERE session_id = $1 AND user_id = $2', [sessionId, first.id])).toHaveLength(1);
  await p2.context().close();
});
