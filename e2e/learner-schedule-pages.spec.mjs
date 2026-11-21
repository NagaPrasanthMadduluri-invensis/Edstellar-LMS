/**
 * The learner's remaining learning pages and the trainer's calendar
 * (CONTEXT.md §5 Assessment, §6 Session):
 *   - My Assessments: a Live assessment on an assigned course is Locked until
 *     the course's lessons are done, then offers Start into the assessment;
 *   - Interactive courses (SCORM): a learner with nothing assigned sees the empty state;
 *   - the Course catalog page renders;
 *   - Training calendar: a session the learner is rostered on this month is on
 *     the calendar and in the list, with its trainer;
 *   - the trainer's Training calendar shows the same session and opens it.
 */
import { test, expect, fx, db } from './support.mjs';
import { api, newLearner, pageAs, setupCourse, uniq } from './helpers-1.mjs';
import { localToday } from './helpers-4.mjs';

test('My Assessments shows a Live assessment Locked, then Start once the course lessons are done', async ({ browser }) => {
  const A = fx().A;
  const learner = await newLearner('A', 'Asm');
  const course = await setupCourse('A', { name: uniq('Quiz course'), assignTo: [learner.id] });
  const admin = await api(A.admin);
  const title = uniq('Final check');
  const { assessment } = await admin.post(`/api/admin/courses/${course.id}/assessments`, { title, passing_score: 60 });
  await admin.post(`/api/admin/assessments/${assessment.id}/questions`, {
    question_text: 'Capital of France?', question_type: 'mcq',
    options: [{ option_text: 'Paris', is_correct: true }, { option_text: 'Lyon' }],
  });
  await admin.post(`/api/admin/assessments/${assessment.id}/attach`);
  const [{ public_id: pub }] = await db('SELECT public_id FROM assessments WHERE id = $1', [assessment.id]);

  const page = await pageAs(browser, learner);
  await page.goto('/assessments');
  await expect(page.getByRole('heading', { name: /My\s*assessments/ })).toBeVisible();
  const card = page.locator('[data-slot="card"]').filter({ hasText: title });
  await expect(card).toContainText(course.name);
  await expect(card).toContainText('1 questions');
  await expect(card.getByRole('button', { name: 'Locked' })).toBeDisabled();

  // SETUP (not the subject): the learner finishes the lessons.
  const me = await api(learner);
  await me.post(`/api/learner/lessons/${course.lessonIds[0]}/complete`);

  await page.reload();
  const open = page.locator('[data-slot="card"]').filter({ hasText: title });
  await expect(open.getByRole('button', { name: 'Start' })).toBeVisible();
  await open.getByRole('button', { name: 'Start' }).click();
  await expect(page).toHaveURL(new RegExp(`/my-courses/[^/]+/assessments/(${pub}|${assessment.id})$`));
  await expect(page.getByText('Capital of France?')).toBeVisible();
  await page.context().close();
});

test('a learner with nothing assigned sees the empty SCORM page, and the course catalog page renders', async ({ browser }) => {
  const learner = await newLearner('A', 'Scm');
  const page = await pageAs(browser, learner);
  await page.goto('/scorm');
  await expect(page.getByRole('heading', { name: /Interactive\s*courses/ })).toBeVisible();
  await expect(page.getByText('No SCORM courses assigned')).toBeVisible();

  await page.goto('/courses');
  await expect(page.getByRole('heading', { name: /Course\s*catalog/ })).toBeVisible();
  await expect(page.getByPlaceholder('Search courses...').first()).toBeVisible();
  await page.context().close();
});

test('a rostered session appears on the learner and trainer training calendars', async ({ browser }) => {
  const A = fx().A;
  const learner = await newLearner('A', 'Cal');
  const admin = await api(A.admin);
  const title = uniq('Calendar workshop');
  const { session } = await admin.post('/api/admin/sessions', {
    title, session_type: 'ILT', capacity: 10, trainer: 'derived', trainer_user_id: A.trainer.id,
    venue_url: 'Room 7', date: localToday(), start_time: '09:00', end_time: '10:00', enroll_mode: 'assigned',
  });
  await admin.post(`/api/admin/sessions/${session.id}/roster`, { user_id: learner.id });
  const [row] = await db('SELECT public_id FROM sessions WHERE id = $1', [session.id]);

  // ── Learner ──
  const page = await pageAs(browser, learner);
  await page.goto('/training-calendar');
  await expect(page.getByRole('heading', { name: /Training\s*calendar/ })).toBeVisible();
  await expect(page.getByText(/1 session in /)).toBeVisible();
  await page.getByText(title, { exact: true }).first().click();
  const dlg = page.getByRole('dialog');
  await expect(dlg.getByText(title)).toBeVisible();
  await expect(dlg.getByText(`Trainer: ${A.trainer.firstName} Tester`)).toBeVisible();
  await expect(dlg.getByText('Room 7')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dlg).toBeHidden();
  await page.getByRole('button', { name: 'List', exact: true }).click();
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
  await page.context().close();

  // ── Trainer (the fixture trainer is only read, never changed) ──
  const trainer = await pageAs(browser, A.trainer);
  await trainer.goto('/trainer/calendar');
  await expect(trainer.getByRole('heading', { name: /Training\s*calendar/ })).toBeVisible();
  await trainer.getByTitle(new RegExp(`^${title} `)).click();
  const tdlg = trainer.getByRole('dialog');
  await expect(tdlg.getByText(title)).toBeVisible();
  await tdlg.getByRole('link', { name: /Open session/ }).click();
  await expect(trainer).toHaveURL(new RegExp(`/trainer/sessions/${row.public_id}$`));
  await expect(trainer.getByText(learner.name).first()).toBeVisible();
  await trainer.context().close();
});
