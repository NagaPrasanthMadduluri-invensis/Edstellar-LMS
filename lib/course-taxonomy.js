/**
 * Course categories — the browser's mirror of
 * `server/src/common/course-taxonomy.ts`, which is what enforces the list.
 *
 * Each category carries its own colour. That is a deliberate exception to the
 * "no new hues" rule in TASTE §10.1, and it is bounded: seven categories, seven
 * colours, all drawn from the Spectra palette plus two extensions (slate and
 * violet) that exist only here. Category is the one axis where a reader scans
 * a grid of cards and needs to tell groups apart at a glance, and fill weight
 * cannot do that for seven values.
 *
 * Adding a category means editing BOTH files. If they drift the dropdown offers
 * something the API rejects with a 422 naming the valid set — loud, not silent.
 */

export const COURSE_CATEGORIES = [
  "Soft Skills",
  "Technical",
  "Leadership",
  "Compliance",
  "Finance",
  "Operations",
  "HR",
];

export const COMPLIANCE_CATEGORY = "Compliance";

/** Whole-month renewal cadences the form offers. */
export const RENEWAL_MONTHS = [3, 6, 12, 18, 24, 36];

/** Category → the colour of its stripe, chip text and thumbnail wash. */
export const CATEGORY_COLORS = {
  Compliance: "#C94040",
  Technical: "#3B6FD4",
  Leadership: "#0F1923",
  "Soft Skills": "#1A5E3A",
  Finance: "#8A6200",
  Operations: "#5A6B82",
  HR: "#5B4AB0",
};

/** Uncategorised falls back to slate — never to a missing value. */
export function categoryColor(category) {
  return CATEGORY_COLORS[category] ?? "#5A6B82";
}

/** The same colour at 10%, for a chip's field. */
export function categoryTint(category) {
  const hex = categoryColor(category);
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, 0.10)`;
}

/**
 * Compliance is mandatory whether or not the flag is set — the same rule the
 * server applies in `isMandatory()`. The API already sends the derived
 * `mandatory` field; this exists for the create/edit form, which is reasoning
 * about a course that has not been saved yet.
 */
export function isMandatory(course) {
  if (!course) return false;
  if (course.category === COMPLIANCE_CATEGORY) return true;
  return course.is_mandatory === true || Number(course.is_mandatory ?? 0) === 1;
}
