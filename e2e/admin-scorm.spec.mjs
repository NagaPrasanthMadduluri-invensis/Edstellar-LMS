/**
 * SCORM packages (CONTEXT.md §5 SCORM package): the library page lists what
 * the organization holds and offers the upload; with no R2 object storage on
 * this server, choosing a .zip and pressing Upload says storage is not
 * configured, and nothing is stored.
 */
import fs from 'node:fs';
import path from 'node:path';
import { test, expect, fx, db } from './support.mjs';
import { pageAs, uniq } from './helpers-1.mjs';
import { RUNTIME_DIR } from '../playwright.config.mjs';

test('admin opens SCORM packages and an upload explains that storage is not configured', async ({ browser }) => {
  const A = fx().A;
  const title = uniq('Safety module');
  const dir = path.join(RUNTIME_DIR, 'e2e-files');
  fs.mkdirSync(dir, { recursive: true });
  const zip = path.join(dir, 'package.zip');
  // An empty zip archive (end-of-central-directory record only).
  fs.writeFileSync(zip, Buffer.from('504b0506' + '00'.repeat(18), 'hex'));
  const [{ before }] = await db('SELECT count(*)::int AS before FROM scorm_packages WHERE organization_id = $1', [A.id]);

  const admin = await pageAs(browser, A.admin);
  await admin.goto('/admin/scorm');
  await expect(admin.getByRole('heading', { name: /SCORM/ }).first()).toBeVisible();
  if (before === 0) await expect(admin.getByText('Upload a .zip SCORM package to get started.')).toBeVisible();

  await admin.getByRole('button', { name: 'Upload SCORM Package' }).click();
  const dlg = admin.getByRole('dialog');
  await expect(dlg.getByRole('heading', { name: 'Upload SCORM Package' })).toBeVisible();
  await expect(dlg.getByRole('button', { name: 'Upload & Process' })).toBeDisabled();

  const chooser = admin.waitForEvent('filechooser');
  await dlg.getByText(/click to (browse|choose|select)|drop/i).first().click();
  await (await chooser).setFiles(zip);
  await expect(dlg.getByText('package.zip')).toBeVisible();
  await dlg.getByLabel(/Package Title/).fill(title);
  await dlg.getByRole('button', { name: 'Upload & Process' }).click();

  await expect(dlg.getByText(/not configured/)).toBeVisible();
  await expect(dlg).toBeVisible();
  const [{ after }] = await db('SELECT count(*)::int AS after FROM scorm_packages WHERE organization_id = $1', [A.id]);
  expect(after).toBe(before);
  expect(await db('SELECT 1 FROM scorm_packages WHERE title = $1', [title])).toHaveLength(0);

  await dlg.getByRole('button', { name: 'Cancel' }).click();
  await expect(dlg).toBeHidden();
});
