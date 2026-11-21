#!/usr/bin/env node
/**
 * Which pages (every client/app page.js) no browser journey visited in the last
 * run. Reads <runtime>/visited.jsonl written by support.mjs. Pages listed in
 * journey-presence.allow.json (with a reason) are exempt. --strict exits 1 on
 * any unvisited page (CI); otherwise it only warns.
 *   node e2e/journey-presence.mjs [--strict]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const APP = path.join(HERE, '..', 'app');
const SERVER_DIR = process.env.E2E_SERVER_DIR || path.join(HERE, '..', '..', 'server');
const RUNTIME = path.join(SERVER_DIR, 'test', process.env.E2E_WEB_RUNTIME || 'runtime-web');
const strict = process.argv.includes('--strict');

const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const pages = walk(APP)
  .filter((f) => f.endsWith(`${path.sep}page.js`))
  .map((f) => '/' + path.relative(APP, path.dirname(f)).split(path.sep).filter((s) => !/^\(.*\)$/.test(s)).join('/'))
  .map((p) => (p === '/' ? '/' : p.replace(/\/$/, '')))
  .filter((p) => !p.includes('[...'));
const toRe = (p) => new RegExp('^' + p.replace(/\[[^\]]+\]/g, '[^/]+') + '/?$');
let visited = [];
try { visited = fs.readFileSync(path.join(RUNTIME, 'visited.jsonl'), 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l).p); } catch {}
const allowFile = path.join(HERE, 'journey-presence.allow.json');
const allow = fs.existsSync(allowFile) ? JSON.parse(fs.readFileSync(allowFile, 'utf8')) : {};
const missing = pages.filter((p) => !allow[p] && !visited.some((v) => toRe(p).test(v)));
console.log(`Journey presence: ${pages.length - missing.length}/${pages.length} pages visited by a journey.`);
if (missing.length) {
  console.log('Not visited by any journey:\n' + missing.map((p) => '  - ' + p).join('\n'));
  if (strict) { console.log('FAIL: every page needs a journey (TESTING.md).'); process.exit(1); }
  console.log('WARN (local runs only warn; CI fails on this).');
}
