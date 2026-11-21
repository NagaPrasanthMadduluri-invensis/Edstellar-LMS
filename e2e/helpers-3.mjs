/**
 * Helpers for journey worker 3 (the admin insight pages, surveys, SCORM and
 * course skills). Kept beside support.mjs, never inside it; builds on the
 * exported helpers of helpers-1.mjs and helpers-2.mjs without changing them.
 */
import { fx, db } from './support.mjs';
import { api, PASSWORD } from './helpers-1.mjs';
import { hashPassword } from './helpers-2.mjs';

export const tag = () => Math.random().toString(36).slice(2, 8);

/**
 * A throwaway learner in `department`, created through the real admin API and
 * given a known password, so a journey never changes a fixture person.
 */
export async function learnerIn(orgKey, department, first = 'Ln') {
  const org = fx()[orgKey];
  const admin = await api(org.admin);
  const t = tag();
  const firstName = `${first}${t}`;
  const email = `w3-${t}-${Date.now().toString(36)}@${org.slug}.e2e.test`;
  await admin.post('/api/admin/users', {
    first_name: firstName, last_name: 'Journey', email, role_id: org.roles.learner, department,
  });
  const [u] = await db('UPDATE users SET password = $2 WHERE email = $1 RETURNING id', [email, hashPassword(PASSWORD)]);
  return { id: u.id, email, password: PASSWORD, firstName, lastName: 'Journey', name: `${firstName} Journey`, department };
}

/** SETUP ONLY: the learner marks every lesson of `course` complete through the learner API. */
export async function completeCourse(learner, course) {
  const me = await api(learner);
  for (const id of course.lessonIds) {
    const [l] = await db('SELECT public_id FROM lessons WHERE id = $1', [id]);
    await me.post(`/api/learner/lessons/${l.public_id}/complete`, {});
  }
  await me.ctx.dispose();
}

/** The local calendar date `days` from today as YYYY-MM-DD. */
export function isoDaysAhead(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const p = (n) => String(n).padStart(2, '0');
  return { iso: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`, date: d };
}
