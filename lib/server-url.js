/**
 * The API origin, normalised — the ONE definition every caller uses.
 *
 * WHY THIS FILE EXISTS. `NEXT_PUBLIC_SERVER_URL` was read straight from
 * `process.env` in two separate places (`lib/api-client.js` and
 * `lib/session.js`), and both build a request as `${SERVER_URL}${endpoint}`
 * where every endpoint already starts with `/`. So a value with a trailing
 * slash — `https://lms-api.edstellar.com/`, which is exactly what you get by
 * copying an origin out of a browser address bar — produces:
 *
 *     https://lms-api.edstellar.com//api/auth/me
 *
 * and that is a 404, not a redirect. Verified against the live API: the single
 * slash answers `401 {"message":"Unauthorized"}` and the double answers
 * `404 {"message":"Cannot GET //api/auth/me"}` with `x-powered-by: Express`.
 * Nest's router does not collapse `//`, so the request never reaches a
 * controller — and Cloudflare happily caches the 404 on the way back.
 *
 * The symptom is brutally misleading. Login fails, and every authenticated
 * page redirects to `/login?session=expired`, because `lib/session.js` reads a
 * non-OK response as "no user". A single character in an environment variable
 * looks exactly like every session in the system being invalid.
 *
 * `next.config.mjs` already stripped the slash, but only for the SCORM rewrite
 * it happened to need it for — which fixed the one caller that was not
 * broken. Normalising has to happen where the value is USED.
 *
 * DELIBERATELY DOES NOT THROW. `next.config.mjs` validates the variable and
 * fails the build when it is missing, which is the right moment to catch it.
 * This module is bundled into the browser, and a module-level throw there is a
 * white screen rather than a helpful error. If the value is somehow absent at
 * runtime, callers degrade the way they already did and `lib/session.js` logs
 * the reason.
 */
export const SERVER_URL = (process.env.NEXT_PUBLIC_SERVER_URL || "").replace(
  /\/+$/,
  "",
);
