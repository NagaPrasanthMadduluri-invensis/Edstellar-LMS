/**
 * Course skill tags (CONTEXT.md §5 Skill): on the Course page's Skills tab the
 * admin creates a skill, sets its level and saves; a learner who completes the
 * course gains that skill at that level, and their AI Insights page counts it.
 */
import { test, expect, fx, db } from './support.mjs';
import { api, dbUntil, pageAs, setupCourse, uniq } from './helpers-1.mjs';
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

// Skills shown where they mean something (2026-11-24): a course tagged AFTER the
// learner finished it still gives them the skill; they see it on the course
// page, My Progress and Home; the admin sees it on the Skills page, with the
// people count on hover and the holder's name on click.
test('a skill tagged after completion reaches the learner everywhere, and the admin Skills page counts it', async ({ browser }) => {
  const A = fx().A;
  const learner = await learnerIn('A', 'Engineering', 'Sg');
  const course = await setupCourse('A', { name: uniq('Late-tagged course'), assignTo: [learner.id] });
  await completeCourse(learner, course);

  // Setup (not the subject): the admin tags the finished course through the API.
  const adminApi = await api(A.admin);
  const skillName = `Secure coding ${tag()}`;
  const created = await adminApi.post('/api/admin/skills', { name: skillName, domain: 'Technical' });
  const saved = await adminApi.put(`/api/admin/skills/course/${course.id}`, { skills: [{ skillId: created.skill.id, level: 'intermediate' }] });
  expect(saved.awarded).toBe(1);

  // ── Learner: the course page, My Progress and Home ──
  const page = await pageAs(browser, learner);
  await page.goto(`/my-courses/${course.publicId}`);
  await expect(page.getByText('Skills you gained')).toBeVisible();
  await expect(page.getByText(skillName)).toBeVisible();

  await page.goto('/progress');
  const card = page.locator('[data-slot="card"]', { has: page.getByRole('heading', { name: 'My skills' }) });
  await expect(card.getByText(skillName)).toBeVisible();
  await expect(card.getByText(`From ${course.name}`)).toBeVisible();
  await expect(card.getByText('Intermediate')).toBeVisible();

  await page.goto('/dashboard');
  const tile = page.locator('a[href="/progress"]', { hasText: 'Skills earned' });
  await expect(tile).toContainText('1');
  await expect(tile).toContainText(`Latest: ${skillName}`);

  // ── Admin: the Skills page ──
  const admin = await pageAs(browser, A.admin);
  await admin.goto('/admin/dashboard');
  await admin.getByRole('link', { name: 'Skills', exact: true }).click();
  await expect(admin).toHaveURL(/\/admin\/skills$/);
  await expect(admin.getByRole('heading', { name: 'People per skill' })).toBeVisible();
  await expect(admin.getByRole('heading', { name: 'Skills growth' })).toBeVisible();
  await expect(admin.getByRole('heading', { name: 'Skills earned by area' })).toBeVisible();

  // Hover the skill's row: the tooltip states how many people hold it.
  await admin.mouse.move(900, 20); // off the sidebar, which expands on hover
  const tick = admin.locator('svg text', { hasText: skillName }).first();
  await tick.scrollIntoViewIfNeeded();
  const box = await tick.boundingBox();
  const at = { x: box.x + box.width + 40, y: box.y + box.height / 2 };
  await admin.mouse.move(at.x, at.y, { steps: 5 });
  await expect(admin.getByText('1 person holds this skill')).toBeVisible();
  // Click it: the holder's name appears beside the chart.
  await admin.mouse.click(at.x, at.y);
  await expect(admin.getByText(learner.firstName, { exact: false }).first()).toBeVisible();
});
