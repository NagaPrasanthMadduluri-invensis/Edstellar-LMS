/**
 * Running a session (CONTEXT.md §18.5): an admin creates a Virtual,
 * self-enrolment session taught by trainer A; a learner books it from the
 * Course Catalogue; the trainer marks them present from their own portal; the
 * admin marks the session completed; the learner's session reads Completed in
 * My Sessions and they give session feedback; the trainer reads it without names.
 */
import { test, expect, fx, db } from './support.mjs';
import { choose, dbUntil, newLearner, pageAs, setSwitch, uniq } from './helpers-1.mjs';

const tomorrow = () => new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

test('a self-enrol virtual session runs from booking to attendance, completion and anonymous feedback', async ({ browser }) => {
  const A = fx().A;
  const learner = await newLearner('A', 'Sf');
  const title = uniq('Virtual workshop');
  const comment = `Clear and practical ${Date.now().toString(36)}`;

  // ── Admin: create the session ──
  const admin = await pageAs(browser, A.admin);
  await admin.goto('/admin/sessions');
  await admin.getByRole('button', { name: 'New Session' }).first().click();
  const dlg = admin.getByRole('dialog');
  await expect(dlg.getByRole('heading', { name: 'Create New Session' })).toBeVisible();
  await dlg.getByPlaceholder('e.g. Leadership Bootcamp — Batch 1').fill(title);
  await dlg.getByRole('button', { name: 'Virtual' }).click();
  await choose(admin, dlg.getByRole('combobox').nth(2), `${A.trainer.firstName} Tester`);
  await dlg.locator('input[type="number"]').fill('5');
  await setSwitch(dlg.getByText('Open to self-enrolment').locator('xpath=../..').getByRole('switch'), true);
  await dlg.getByPlaceholder('Room name / Address — or paste Zoom/Teams/Meet URL').fill('https://meet.example.test/workshop');
  await dlg.locator('#session-start-date').fill(tomorrow());
  await dlg.locator('input[type="time"]').nth(0).fill('10:00');
  await dlg.locator('input[type="time"]').nth(1).fill('11:30');
  await dlg.getByRole('button', { name: 'Create Session' }).click();
  await expect(dlg).toBeHidden();

  const [session] = await dbUntil('SELECT id, public_id, session_type, enroll_mode, trainer_user_id, capacity FROM sessions WHERE title = $1', [title], (r) => r.length === 1);
  expect(session).toEqual(expect.objectContaining({ session_type: 'Virtual', enroll_mode: 'self', trainer_user_id: A.trainer.id, capacity: 5 }));
  const [training] = await db('SELECT c.id, c.public_id, c.name, l.id AS lesson_id FROM courses c JOIN lessons l ON l.course_id = c.id WHERE c.session_id = $1', [session.id]);
  expect(training).toBeDefined();

  // ── Learner: book it from the Course Catalogue ──
  const page = await pageAs(browser, learner);
  await page.goto('/catalogue');
  await page.getByPlaceholder('Search courses, tags…').fill(title);
  await page.getByRole('button', { name: 'Book my place' }).click();
  await expect(page.getByText(`Your place on "${title}" is booked`)).toBeVisible();
  await expect(page.getByRole('button', { name: /Booked — see My Sessions/ })).toBeVisible();
  await dbUntil('SELECT 1 FROM session_roster WHERE session_id = $1 AND user_id = $2', [session.id, learner.id], (r) => r.length === 1, 'roster row');

  await page.goto('/my-sessions');
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Join →' })).toHaveAttribute('href', 'https://meet.example.test/workshop');

  // ── Trainer: My Sessions -> the session -> mark the learner present ──
  const trainer = await pageAs(browser, A.trainer);
  await trainer.goto('/trainer/sessions');
  await trainer.getByRole('link', { name: new RegExp(title) }).click();
  await expect(trainer).toHaveURL(new RegExp(`/trainer/sessions/${session.public_id}$`));
  const person = trainer.locator('div').filter({ hasText: learner.name }).filter({ has: trainer.getByRole('button', { name: 'Present' }) }).last();
  await person.getByRole('button', { name: 'Present' }).click();
  await trainer.getByRole('button', { name: 'Save attendance' }).click();
  await expect(trainer.getByText('Saved', { exact: true })).toBeVisible();
  const [att] = await db('SELECT status, marked_by FROM session_attendance WHERE session_id = $1 AND user_id = $2', [session.id, learner.id]);
  expect(att).toEqual({ status: 'present', marked_by: A.trainer.id });

  // ── Admin: mark the session completed ──
  await admin.goto('/admin/sessions');
  await admin.getByPlaceholder('Search title, trainer, type, venue…').fill(title);
  await admin.getByRole('button', { name: 'Mark completed' }).click();
  await admin.getByRole('alertdialog').getByRole('button', { name: 'Mark Completed' }).click();
  await expect(admin.getByRole('alertdialog')).toBeHidden();
  await dbUntil('SELECT status FROM sessions WHERE id = $1', [session.id], (r) => r[0]?.status === 'completed', 'session completed');
  const credited = await db('SELECT 1 FROM user_lesson_completions WHERE user_id = $1 AND lesson_id = $2', [learner.id, training.lesson_id]);
  expect(credited).toHaveLength(1);
  await admin.context().close();

  // ── Learner: the session training's Course page reads Completed ──
  await page.goto(`/my-courses/${training.public_id}`);
  await expect(page.getByRole('heading', { name: training.name })).toBeVisible();
  await expect(page.getByText('You have completed this course')).toBeVisible();

  // ── Learner: My Sessions files it under Completed, attended, with feedback open ──
  // (a session training lives in My Sessions, not My Courses: learner.service.ts courses()).
  await page.goto('/my-sessions');
  const card = page.locator('div')
    .filter({ has: page.getByRole('heading', { name: title }) })
    .filter({ has: page.getByRole('button', { name: 'Give feedback' }) })
    .last();
  await expect(card).toContainText('Present');
  await expect(page.getByText('Completed', { exact: true }).first()).toBeVisible();
  await card.getByRole('button', { name: 'Give feedback' }).click();
  const fb = page.getByRole('dialog');
  await expect(fb.getByRole('heading', { name: 'How was this session?' })).toBeVisible();
  await fb.getByRole('button', { name: 'Course content: 5 out of 5' }).click();
  await fb.getByRole('button', { name: 'Trainer: 4 out of 5' }).click();
  await fb.getByRole('button', { name: 'Delivery & venue: 5 out of 5' }).click();
  await fb.getByPlaceholder('Optional. What worked, and what would you change?').fill(comment);
  await fb.getByRole('button', { name: 'Send feedback' }).click();
  await expect(fb).toBeHidden();
  await expect(page.getByText('Feedback submitted')).toBeVisible();
  const [row] = await db('SELECT user_id, comment FROM session_feedback WHERE session_id = $1', [session.id]);
  expect(row).toEqual({ user_id: learner.id, comment });
  await page.context().close();

  // ── Trainer: Feedback shows the comment and never the name ──
  await trainer.goto('/trainer/feedback');
  await expect(trainer.getByText(comment)).toBeVisible();
  await expect(trainer.getByText('Responses are anonymous.')).toBeVisible();
  await expect(trainer.getByText(learner.firstName)).toHaveCount(0);
  await expect(trainer.getByText(learner.email)).toHaveCount(0);
  await trainer.context().close();
});
