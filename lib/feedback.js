/**
 * The browser's mirror of `server/src/common/feedback.ts`.
 *
 * Three dimensions, because content, trainer and delivery fail separately
 * and two of the three are not the trainer's to fix. `ownedBy` is rendered
 * on the trainer's page for exactly that reason — a low Content score is a
 * fact about the material, and a trainer should not read it as a verdict on
 * their teaching.
 *
 * Change this file and the TypeScript one together. If they drift, the API
 * refuses the submission with a 422 naming the valid range — loud, not
 * silent.
 */

export const RATING_MIN = 1;
export const RATING_MAX = 5;

/** Under this many responses a session's average is withheld, not shown. */
export const MIN_RESPONSES_FOR_AVERAGE = 3;

export const FEEDBACK_DIMENSIONS = [
  {
    key: "content",
    field: "rating_content",
    label: "Course content",
    help: "Was the material relevant, accurate and pitched at the right level?",
    ownedBy: "admin",
  },
  {
    key: "trainer",
    field: "rating_trainer",
    label: "Trainer",
    help: "Was the trainer clear, well prepared and open to questions?",
    ownedBy: "trainer",
  },
  {
    key: "delivery",
    field: "rating_delivery",
    label: "Delivery & venue",
    help: "Pacing, timings, and whether the room or joining link worked.",
    ownedBy: "shared",
  },
];

/** Who can act on a poor score, said in words on the trainer's page. */
export const OWNER_NOTE = {
  trainer: "Yours to act on",
  admin: "Content is set by your admin",
  shared: "Shared with your admin",
};

/** The word for a score, so a number never stands alone. */
export function ratingWord(value) {
  if (value === null || value === undefined) return "—";
  if (value >= 4.5) return "Excellent";
  if (value >= 3.5) return "Good";
  if (value >= 2.5) return "Mixed";
  if (value >= 1.5) return "Poor";
  return "Very poor";
}

/**
 * Tone for a score. `danger` only below the midpoint — a 3/5 is mediocre,
 * not a failure, and colouring it red would be the false alarm §10.3.1.8
 * warns about with a red zero.
 */
export function ratingTone(value) {
  if (value === null || value === undefined) return "text-text-3";
  if (value >= 4) return "text-success";
  if (value >= 3) return "text-warning";
  return "text-danger";
}
