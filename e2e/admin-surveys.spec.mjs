/**
 * Survey / Feedback (CONTEXT.md §9 Feedback): the admin creates a feedback
 * form with a rating and an open question; a course that asks it gets an
 * answer from a learner, and the admin reads that answer, named, under
 * Responses, with the form's counts updated.
 */
import { test, expect, fx, db } from './support.mjs';
import { api, choose, pageAs, setupCourse, uniq } from './helpers-1.mjs';
import { learnerIn } from './helpers-3.mjs';

test('admin creates a feedback form and reads a learner\'s answers to it', async ({ browser }) => {
  const A = fx().A;
  const form = uniq('Pulse form');
  const admin = await pageAs(browser, A.admin);
  await admin.goto('/admin/dashboard');
  await admin.getByRole('link', { name: 'Survey / Feedback' }).click();
  await expect(admin).toHaveURL(/\/admin\/surveys$/);
  await admin.mouse.move(900, 600);

  // ── Build the form in the editor ──
  await admin.getByRole('button', { name: 'New form' }).click();
  const dlg = admin.getByRole('dialog');
  await expect(dlg.getByRole('heading', { name: 'New feedback form' })).toBeVisible();
  await expect(dlg.getByText('Give the form a name')).toBeVisible();
  await dlg.getByRole('textbox').first().fill(form);
  await dlg.getByPlaceholder('Question 1').fill('How useful was this course?');
  await dlg.getByRole('button', { name: 'Add question' }).click();
  await dlg.getByPlaceholder('Question 2').fill('What would you change?');
  await choose(admin, dlg.getByRole('combobox').nth(1), 'Open text');
  await expect(dlg.getByText(/^Questions \(2\//)).toBeVisible();
  await dlg.getByRole('button', { name: 'Create form' }).click();
  await expect(dlg).toBeHidden();

  const card = admin.locator('div', { has: admin.getByRole('heading', { name: form, exact: true }) })
    .filter({ has: admin.getByRole('button', { name: 'Edit questions' }) }).last();
  await expect(card).toContainText('Only on courses that pick it');
  await expect(card).toHaveText(/Questions\s*2/);

  // Ground truth: the form and its two questions, in order.
  const [tpl] = await db('SELECT id, is_system FROM feedback_templates WHERE organization_id = $1 AND name = $2', [A.id, form]);
  expect(tpl.is_system).toBe(0);
  const qs = await db('SELECT id, question_type, prompt FROM feedback_template_questions WHERE template_id = $1 ORDER BY sort_order, id', [tpl.id]);
  expect(qs.map((q) => [q.question_type, q.prompt])).toEqual([
    ['rating', 'How useful was this course?'],
    ['text', 'What would you change?'],
  ]);

  // SETUP (not the subject): a course asking this form; a learner answers it.
  const learner = await learnerIn('A', 'Feedback', 'Fb');
  const course = await setupCourse('A', { name: uniq('Feedback course'), assignTo: [learner.id], extra: { feedback_template_id: tpl.id } });
  const me = await api(learner);
  await me.post(`/api/learner/courses/${course.publicId}/feedback`, { answers: { [qs[0].id]: 4, [qs[1].id]: 'More worked examples' } });
  await me.ctx.dispose();

  // ── The admin reads it ──
  await admin.reload();
  await expect(card).toHaveText(/Courses\s*1/);
  await expect(card).toHaveText(/Answers\s*1/);
  await admin.getByRole('button', { name: 'Responses', exact: true }).click();
  const answer = admin.locator('div', { has: admin.getByText(`${course.name} · ${form}`) })
    .filter({ hasText: 'What would you change?' }).last();
  await expect(answer).toContainText(learner.name);
  await expect(answer).toContainText('Feedback');
  await expect(answer).toContainText('How useful was this course?');
  await expect(answer).toContainText('4/5');
  await expect(answer).toContainText('More worked examples');
});
