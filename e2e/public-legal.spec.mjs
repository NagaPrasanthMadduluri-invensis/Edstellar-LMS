/**
 * The public privacy notice (CONTEXT.md §13): it renders for someone who is
 * not signed in, without bouncing them to the sign-in page.
 */
import { test, expect } from './support.mjs';

test('the privacy policy renders signed out', async ({ page }) => {
  await page.goto('/privacy');
  await expect(page).toHaveURL(/\/privacy$/);
  await expect(page.getByRole('heading', { name: 'Privacy Policy', level: 1 })).toBeVisible();
  await expect(page.getByText(/^Version /)).toBeVisible();
  await expect(page.getByText('4. Information we collect')).toBeVisible();
  await expect(page.getByText('12. Your rights')).toBeVisible();
  await expect(page.locator('#password')).toHaveCount(0);
});
