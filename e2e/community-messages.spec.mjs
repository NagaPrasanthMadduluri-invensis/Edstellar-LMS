/**
 * Learning Community and direct messages (CONTEXT.md §10; BACKEND_STRUCTURE
 * §10.35, §10.40, §10.5 "Say hi"): a learner asks a question with a hashtag,
 * a colleague contributes and likes it, the author hears of the reply in the
 * bell; kudos to a colleague; a "Say hi" message arrives with an unread badge.
 */
import { test, expect, fx, db } from './support.mjs';
import { as, apiFrom, expectInBell, uniq } from './helpers-2.mjs';

test('question with a hashtag, a contribution and a like, the author is told', async ({ browser }) => {
  const f = fx();
  const title = `How do I start ${uniq('Q')}?`;
  const tag = uniq('E2eTag');

  // The author asks.
  const author = await as(browser, f.A.learner);
  await author.getByRole('link', { name: 'Learning Community' }).click();
  await expect(author).toHaveURL(/\/community$/);
  await author.getByRole('button', { name: 'Share something' }).click();
  const dlg = author.getByRole('dialog');
  await dlg.getByRole('button', { name: /Ask a question/ }).click();
  await dlg.getByLabel('Title').fill(title);
  await dlg.getByLabel('Details').fill('Looking for pointers from the team.');
  const tagInput = dlg.getByPlaceholder('e.g. Renewables, AdvancedAI');
  await tagInput.fill(tag);
  await tagInput.press('Enter');
  await expect(dlg.getByRole('button', { name: `Remove ${tag}` })).toBeVisible();
  await dlg.getByRole('button', { name: 'Post' }).click();
  await expect(dlg).toBeHidden();
  const mine = author.locator('article, [data-slot="card"]', { hasText: title }).first();
  await expect(mine).toBeVisible();
  await expect(mine.getByText(tag)).toBeVisible();
  const [post] = await db("SELECT id, type FROM community_posts WHERE title = $1", [title]);
  expect(post.type).toBe('question');
  const tags = await db(
    'SELECT h.tag FROM community_post_hashtags ph JOIN community_hashtags h ON h.id = ph.hashtag_id WHERE ph.post_id = $1',
    [post.id],
  );
  expect(tags.map((t) => t.tag)).toEqual([tag.toLowerCase()]);

  // A colleague likes it and contributes.
  const peer = await as(browser, f.A.learner2);
  await peer.goto('/community');
  const card = peer.locator('[data-slot="card"]', { hasText: title }).first();
  await expect(card).toBeVisible();
  await card.getByRole('button', { name: 'Like this post' }).click();
  await expect(card.getByRole('button', { name: 'Remove your like' })).toBeVisible();
  await expect(card.getByText('1 Like', { exact: true })).toBeVisible();
  await card.getByRole('button', { name: /Contributions/ }).click();
  const answer = 'Start with the onboarding path, it covers the basics.';
  await card.getByPlaceholder('Share what you know…').fill(answer);
  await card.getByRole('button', { name: 'Contribute' }).click();
  await expect(card.getByText(answer)).toBeVisible();
  await expect(card.getByRole('button', { name: /^1 Contributions/ })).toBeVisible();

  // The author is told in the bell, and sees the contribution on the post.
  await author.reload();
  await expectInBell(author, 'New contribution to your question');
  const authorCard = author.locator('[data-slot="card"]', { hasText: title }).first();
  await authorCard.getByRole('button', { name: /Contributions/ }).click();
  await expect(authorCard.getByText(answer)).toBeVisible();
});

test('kudos to a colleague reaches the feed and their bell', async ({ browser }) => {
  const f = fx();
  const message = `Thanks for the help ${uniq('K')}`;
  const giver = await as(browser, f.A.learner);
  await giver.goto('/community');
  await giver.getByRole('button', { name: 'Give kudos' }).click();
  const dlg = giver.getByRole('dialog', { name: 'Give kudos' });
  await dlg.getByPlaceholder('Search by name').fill('Learnertwo');
  await dlg.getByRole('button', { name: /Learnertwo Tester/ }).click();
  await dlg.getByLabel('Message').fill(message);
  await dlg.getByRole('button', { name: 'Give kudos' }).click();
  await expect(dlg).toBeHidden();
  const card = giver.locator('[data-slot="card"]', { hasText: message }).first();
  await expect(card.getByText('gave kudos to')).toBeVisible();
  const [row] = await db("SELECT recipient_user_id FROM community_posts WHERE type = 'kudos' AND body = $1", [message]);
  expect(row.recipient_user_id).toBe(f.A.learner2.id);

  const recipient = await as(browser, f.A.learner2);
  await expectInBell(recipient, 'You received kudos');
});

test('"Say hi" from Home starts a message that arrives unread', async ({ browser }) => {
  const f = fx();
  // The admin's moderation view lists the community's posts.
  const admin = await as(browser, f.A.admin);
  await admin.goto('/admin/community');
  await expect(admin.getByText(/How do I start/).first()).toBeVisible();

  // Setup (not the subject): a course both learners share, so Home shows
  // each as "Learning with you".
  const adminApi = apiFrom(admin);
  const res = await adminApi.post('/api/admin/courses', { name: `Shared ${uniq('C')}`, is_active: true });
  expect(res.status()).toBeLessThan(300);
  const body = await res.json();
  const courseId = body.course?.id ?? body.id;
  const assign = await adminApi.post(`/api/admin/courses/${courseId}/assignments/bulk`, { user_ids: [f.A.learner.id, f.A.learner2.id] });
  expect(assign.status()).toBeLessThan(300);

  const sender = await as(browser, f.A.learner2);
  await expect(sender).toHaveURL(/\/dashboard$/);
  const peer = sender.locator('div.w-20', { hasText: 'Learner T.' }).first();
  await expect(peer).toBeVisible();
  await peer.getByRole('link', { name: 'Say hi' }).click();
  await expect(sender).toHaveURL(new RegExp(`/messages\\?with=${f.A.learner.id}$`));
  const text = `Hello from Learnertwo ${uniq('M')}`;
  await sender.getByPlaceholder('Message Learner…').fill(text);
  await sender.getByRole('button', { name: 'Send' }).click();
  await expect(sender.getByText(text, { exact: true })).toBeVisible();
  const [dm] = await db('SELECT recipient_id, read_at FROM direct_messages WHERE body = $1', [text]);
  expect(dm.recipient_id).toBe(f.A.learner.id);
  expect(dm.read_at).toBeNull();

  // The recipient sees an unread badge on Messages, then the message itself.
  const recipient = await as(browser, f.A.learner);
  const navLink = recipient.getByRole('link', { name: /^Messages \(\d+ unread\)$/ }).first();
  await expect(navLink).toBeVisible();
  await expectInBell(recipient, /New message from Learnertwo/);
  await navLink.click();
  await expect(recipient).toHaveURL(/\/messages/);
  await recipient.mouse.move(900, 500); // off the sidebar, which expands on hover
  const convo = recipient.getByRole('button', { name: /Learnertwo T\./ }).first();
  await expect(convo).toContainText(text);
  await convo.click();
  await expect(recipient.getByText(text, { exact: true })).toBeVisible();
  await expect.poll(async () => (await db('SELECT read_at FROM direct_messages WHERE body = $1', [text]))[0].read_at).not.toBeNull();
});
