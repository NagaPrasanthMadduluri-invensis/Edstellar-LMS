/**
 * Assessment (CONTEXT.md §18.2 step 3, §18.3 step 5, §8 points): an admin adds
 * a final assessment with one multiple-choice question on the Course page and
 * turns it Live; the learner fails once, then passes; the best passing score
 * is shown and the points reach Achievements and the Leaderboard.
 */
import { test, expect, fx, db } from './support.mjs';
import { api, dbUntil, newLearner, pageAs, setSwitch, setupCourse, uniq } from './helpers-1.mjs';

test('admin builds a live assessment; the learner fails, then passes, and earns the points', async ({ browser }) => {
  const A = fx().A;
  const learner = await newLearner('A', 'As');
  // SETUP (not the subject): a published one-lesson course assigned to the learner.
  const course = await setupCourse('A', { name: uniq('Assessed course'), assignTo: [learner.id] });
  const title = uniq('Final check');
  const question = 'What is the capital of France?';

  // ── Admin: Course page -> Assessments tab ──
  const admin = await pageAs(browser, A.admin);
  await admin.goto(`/admin/courses/${course.publicId}`);
  await expect(admin.getByRole('heading', { name: course.name })).toBeVisible();
  await admin.getByRole('button', { name: 'Assessments', exact: true }).click();
  await admin.getByRole('button', { name: 'Add assessment' }).click();
  const dlg = admin.getByRole('dialog');
  await dlg.getByPlaceholder('e.g. Module 1 knowledge check').fill(title);
  await expect(dlg.getByText('Final assessment')).toBeVisible();
  await dlg.getByRole('button', { name: 'Add assessment' }).click();
  await expect(dlg).toBeHidden();

  // It starts hidden; add the question.
  const row = admin.getByRole('button', { name: new RegExp(title) });
  await expect(row).toContainText('Hidden');
  await row.click();
  await admin.getByRole('button', { name: 'Add question' }).click();
  const q = admin.getByRole('dialog');
  await q.getByPlaceholder('What do you want to ask?').fill(question);
  await q.getByPlaceholder('Option 1').fill('Paris');
  await q.getByPlaceholder('Option 2').fill('Lyon');
  await q.getByRole('button', { name: 'Add question' }).click();
  await expect(q).toBeHidden();
  await expect(admin.getByText(question)).toBeVisible();

  // Turn it Live from its Edit dialog.
  await admin.getByRole('button', { name: 'Edit assessment' }).click();
  const edit = admin.getByRole('dialog');
  await setSwitch(edit.getByText('Deliver it to learners.').locator('xpath=../..').getByRole('switch'), true);
  await edit.getByRole('button', { name: 'Save changes' }).click();
  await expect(edit).toBeHidden();
  await expect(row).not.toContainText('Hidden');

  const [assessment] = await db('SELECT id, is_active, link_type, passing_score FROM assessments WHERE title = $1', [title]);
  expect(assessment).toEqual(expect.objectContaining({ link_type: 'course', passing_score: 60 }));
  expect(Number(assessment.is_active)).toBe(1);
  const opts = await db(
    'SELECT o.option_text, o.is_correct FROM assessment_options o JOIN assessment_questions q ON q.id = o.question_id WHERE q.assessment_id = $1 ORDER BY o.option_text',
    [assessment.id],
  );
  expect(opts.map((o) => [o.option_text, Boolean(o.is_correct)])).toEqual([['Lyon', false], ['Paris', true]]);
  await admin.context().close();

  // ── Learner: finish the lesson so the assessment unlocks ──
  const page = await pageAs(browser, learner);
  await page.goto(`/my-courses/${course.publicId}`);
  await expect(page.getByText('Complete all lessons to unlock')).toBeVisible();
  await page.getByRole('link', { name: /Lesson 1/ }).first().click();
  await page.getByRole('button', { name: 'Save & finish course' }).first().click();
  await expect(page).toHaveURL(new RegExp(`/my-courses/${course.publicId}$`));

  // ── First attempt: wrong answer ──
  await page.getByRole('link', { name: 'Start' }).click();
  await expect(page).toHaveURL(/\/assessments\//);
  await expect(page.getByText(question)).toBeVisible();
  await page.getByRole('radio', { name: 'Lyon' }).click();
  await page.getByRole('button', { name: 'Submit Assessment' }).click();
  await expect(page.getByText('Keep Trying!')).toBeVisible();
  await expect(page.getByText('You need 60% to pass.')).toBeVisible();

  // ── Retake: right answer ──
  await page.getByRole('button', { name: 'Retake Assessment' }).first().click();
  await page.getByRole('radio', { name: 'Paris' }).click();
  await page.getByRole('button', { name: 'Submit Assessment' }).click();
  await expect(page.getByText('Congratulations!')).toBeVisible();

  const attempts = await db('SELECT percentage, is_passed FROM user_assessment_attempts WHERE user_id = $1 AND assessment_id = $2 ORDER BY id', [learner.id, assessment.id]);
  expect(attempts.map((a) => [Number(a.percentage), Boolean(a.is_passed)])).toEqual([[0, false], [100, true]]);

  // Course page shows the best passing score and the course complete.
  await page.getByRole('button', { name: 'Back to Course' }).first().click();
  await expect(page.getByText('Best: 100%')).toBeVisible();
  await expect(page.getByText('2 attempts')).toBeVisible();
  await expect(page.getByText('You have completed this course')).toBeVisible();

  // ── Points: course completed 100 + perfect score 200 + finished early 75 ──
  await page.goto('/achievements');
  const total = page.getByText('Total Points').locator('xpath=..');
  await expect(total).toContainText('375');
  await expect(page.getByText('+200').first()).toBeVisible();

  await page.goto('/leaderboard');
  const me = page.locator('div').filter({ has: page.getByText('You', { exact: true }) }).filter({ hasText: '375' }).last();
  await expect(me).toBeVisible();

  await dbUntil('SELECT 1 FROM certificates WHERE user_id = $1 AND course_id = $2', [learner.id, course.id], (r) => r.length === 1, 'certificate after passing');
  await page.context().close();
});

test('the learner answers fill-in-the-blank, matching and multi-select questions and passes', async ({ browser }) => {
  const A = fx().A;
  const learner = await newLearner('A', 'Ty');
  // SETUP (not the subject): a live assessment with one question of each answer-based type.
  const course = await setupCourse('A', { name: uniq('Typed answers'), assignTo: [learner.id] });
  const admin = await api(A.admin);
  const { assessment } = await admin.post(`/api/admin/courses/${course.id}/assessments`, { title: uniq('Typed check') });
  const add = (q) => admin.post(`/api/admin/assessments/${assessment.id}/questions`, q);
  await add({ question_text: 'The capital of Italy is ___', question_type: 'fillblank', correct_answer: 'Rome' });
  await add({ question_text: 'Match each country to its capital', question_type: 'matching', correct_answer: 'France = Paris\nSpain = Madrid' });
  await add({ question_text: 'Which are prime?', question_type: 'multiselect', options: [{ option_text: '2', is_correct: true }, { option_text: '3', is_correct: true }, { option_text: '4' }] });
  await admin.post(`/api/admin/assessments/${assessment.id}/attach`);
  const me = await api(learner);
  await me.post(`/api/learner/lessons/${course.lessonIds[0]}/complete`);
  const [row] = await db('SELECT public_id FROM assessments WHERE id = $1', [assessment.id]);

  const page = await pageAs(browser, learner);
  await page.goto(`/my-courses/${course.publicId}/assessments/${row.public_id}`);
  await expect(page.getByText('The capital of Italy is ___')).toBeVisible();

  // The key is not in the page: the matching question offers both capitals unpaired.
  await page.getByPlaceholder('Type your answer').fill('  rome ');
  await page.getByLabel('France').selectOption('Paris');
  await page.getByLabel('Spain').selectOption('Madrid');
  await page.getByRole('checkbox', { name: '2' }).click();
  await page.getByRole('checkbox', { name: '3' }).click();
  await expect(page.getByText('3 of 3 questions answered')).toBeVisible();
  await page.getByRole('button', { name: 'Submit Assessment' }).click();

  await expect(page.getByText('Congratulations!')).toBeVisible();
  await expect(page.getByText('Expected answer:')).toBeVisible();
  const [attempt] = await db('SELECT score, total_questions, percentage, is_passed FROM user_assessment_attempts WHERE user_id = $1 AND assessment_id = $2', [learner.id, assessment.id]);
  expect(attempt).toEqual({ score: 3, total_questions: 3, percentage: 100, is_passed: 1 });
  await page.context().close();
});
