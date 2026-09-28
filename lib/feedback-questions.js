/**
 * Mirror of `server/src/common/feedback-questions.ts`.
 *
 * The browser needs the five types to render a control per question and to
 * list what an admin may add; the API needs them to validate what comes back.
 * Neither can read the other's file (the two packages are independent), so the
 * catalogue is written twice and edited together — the same arrangement
 * `lesson-content.js` and `course-taxonomy.js` already have.
 *
 * `icon` is a lucide component NAME (§10.3.1.6); the page maps it, so this
 * file stays plain data.
 */

export const FEEDBACK_QUESTION_TYPES = {
  rating: {
    label: "Rating (1–5)",
    help: "Five stars. The only type that averages, so prefer it for anything you will want to compare.",
    optionBacked: false,
    icon: "Star",
  },
  likert: {
    label: "Agree scale",
    help: "Strongly disagree → Strongly agree. Use for a statement, not a question.",
    optionBacked: false,
    icon: "AlignLeft",
  },
  choice: {
    label: "Multiple choice",
    help: "One answer from a list you write.",
    optionBacked: true,
    icon: "CircleDot",
  },
  yesno: {
    label: "Yes / No",
    help: "A single closed question.",
    optionBacked: false,
    icon: "ToggleLeft",
  },
  text: {
    label: "Open text",
    help: "A free answer. Never required — a mandatory essay is how a form gets abandoned.",
    optionBacked: false,
    icon: "Type",
  },
};

export const FEEDBACK_QUESTION_TYPE_IDS = Object.keys(FEEDBACK_QUESTION_TYPES);

export function questionTypeLabel(type) {
  return FEEDBACK_QUESTION_TYPES[type]?.label ?? "Question";
}

/** The five rungs, stored as the answer verbatim. */
export const LIKERT_SCALE = [
  "Strongly disagree",
  "Disagree",
  "Neutral",
  "Agree",
  "Strongly agree",
];

export const FEEDBACK_RATING_MAX = 5;
export const MAX_TEMPLATE_QUESTIONS = 15;

/**
 * The category → template mapping is deliberately NOT mirrored here.
 *
 * It is the resolution rule that decides which form a learner is shown, and a
 * copy in the browser would be free to drift from the one the API applies.
 * `GET /api/admin/surveys/options` returns `category_templates` already
 * resolved, and the course form renders that.
 */

export const SYSTEM_TEMPLATE_KEYS = ["standard", "technical", "compliance"];

/** The three seeded keys cannot be deleted — the resolver looks them up. */
export function isSystemTemplateKey(key) {
  return SYSTEM_TEMPLATE_KEYS.includes(key);
}
