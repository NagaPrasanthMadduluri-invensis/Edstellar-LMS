/**
 * Job level and office location — the browser's mirror of
 * `server/src/common/workforce.ts`.
 *
 * These exist so a form can offer exactly the options the API will accept.
 * The server is what actually enforces them (`@IsIn` on every DTO that carries
 * one); this is courtesy, the same split as `content-limits.js` beside
 * `content-limits.ts`.
 *
 * Both are CLOSED lists, and that is the point: each is a filter and a
 * comparison dimension in the Reports builder, and a dimension is only useful
 * if its values repeat across people. `job_role` beside them is deliberately
 * free text — it is a job title, not a reporting axis — and the live database
 * shows why the distinction matters: 18 distinct job roles across 20 learners,
 * so filtering by one returns one person.
 *
 * Adding a value means adding it in BOTH files. If they drift, the dropdown
 * offers something the API rejects with a 422 naming the valid set, which is a
 * loud failure rather than a silent one.
 */

/** Seniority bands, most senior first. The order is the order charts sort in. */
export const JOB_LEVELS = [
  "Executive",
  "Manager",
  "Senior",
  "Mid",
  "Junior",
  "Intern",
];

/** Office locations, plus Remote. */
export const LOCATIONS = [
  "Ahmedabad",
  "Bangalore",
  "Chennai",
  "Delhi NCR",
  "Hyderabad",
  "Kochi",
  "Mumbai",
  "Pune",
  "Remote",
];
