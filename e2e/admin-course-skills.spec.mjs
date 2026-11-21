/**
 * Course skill tags (CONTEXT.md §5 Skill): on the Course page's Skills tab the
 * admin creates a skill, sets its level and saves; a learner who completes the
 * course gains that skill at that level, and their AI Insights page counts it.
 */
import { test, expect, fx, db } from './support.mjs';
import { dbUntil, pageAs, setupCourse, uniq } from './helpers-1.mjs';
import { completeCourse, learnerIn, tag } from './helpers-3.mjs';

// The Course page hands CourseSkillsTab the course's public UUID (the route param);
// GET/PUT /api/admin/skills/course/:courseId resolve either form.
test('the Course page Skills tab loads and saves skills by the course UUID', async ({ browser }) => {
  const A = fx().A;
  const learner = await learnerIn('A', 'Engineering', 'Sk');
  const course = await setupCourse('A', { name: uniq('Skilled course'), assignTo: [learner.id] });
  const skill = `Negotiation ${tag()}`;

  // ── Admin: Course page -> Skills tab ──
  const admin = await pageAs(browser, A.admin);
  await admin.goto(`/admin/courses/${course.publicId}`);
  await expect(admin.getByRole('heading', { name: course.name })).toBeVisible();
  await admin.getByRole('button', { name: 'Skills', exact: true }).click();
  await expect(admin.getByText('No skills tagged yet.')).toBeVisible();
  await expect(admin.getByText('Could not load skills.')).toHaveCount(0);

  await admin.getByPlaceholder('Skill name').fill(skill);
  await admin.getByPlaceholder('Domain (optional)').fill('Commercial');
  await admin.getByRole('button', { name: 'Create & add' }).click();
  const row = admin.locator('div', { has: admin.getByRole('button', { name: `Remove ${skill}` }) }).filter({ hasText: skill }).last();
  await expect(row).toBeVisible();
  await row.locator('select').selectOption('advanced');
  await admin.getByRole('button', { name: 'Save skills' }).click();
  await expect(admin.getByText('Saved.')).toBeVisible();

  // Ground truth: the course imparts the skill at the chosen level.
  const tagged = await db(
    'SELECT s.name, s.domain, cs.level FROM course_skills cs JOIN skills s ON s.id = cs.skill_id WHERE cs.course_id = $1',
    [course.id],
  );
  expect(tagged).toEqual([{ name: skill, domain: 'Commercial', level: 'advanced' }]);

  // A fresh visit shows the saved set.
  await admin.reload();
  await admin.getByRole('button', { name: 'Skills', exact: true }).click();
  await expect(admin.getByRole('button', { name: `Remove ${skill}` })).toBeVisible();

  // ── The learner completes the course (SETUP) and gains the skill ──
  await completeCourse(learner, course);
  await dbUntil(
    'SELECT us.level FROM user_skills us JOIN skills s ON s.id = us.skill_id WHERE us.user_id = $1 AND s.name = $2',
    [learner.id, skill], (r) => r.length === 1 && r[0].level === 'advanced', 'learner gains the skill',
  );

  const page = await pageAs(browser, learner);
  await page.goto('/ai-insights');
  await expect(page.getByText('Your learning, visualised')).toBeVisible();
  const tile = page.locator('div.rounded-lg', { has: page.getByText('Skills gained', { exact: true }) }).last();
  await expect(tile).toHaveText(/Skills gained\s*1$/);
  await expect(page.getByText('Competency levels')).toBeVisible();
  await expect(page.getByText('No competencies recorded yet.')).toHaveCount(0);
});
