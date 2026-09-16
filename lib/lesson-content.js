/**
 * Lesson content types and question types — the browser's mirror of
 * `server/src/common/lesson-content.ts` and
 * `server/src/common/assessment-questions.ts`, which are what enforce them.
 *
 * Each entry carries its own rule, which is why these are lists and not a
 * switch in the form: the form asks the catalogue what to render and what to
 * require, so adding a type is one entry here and one there.
 *
 * Drift between the two sides shows up as a 422 naming the valid set — loud,
 * not silent.
 */

export const LESSON_CONTENT_TYPES = [
  { key: "video", label: "Video", upload: true, durationRequired: false,
    accept: "video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov", hint: "MP4, WebM or MOV" },
  { key: "pdf", label: "PDF", upload: true, durationRequired: true,
    accept: "application/pdf,.pdf", hint: "PDF only" },
  { key: "word", label: "Word document", upload: true, durationRequired: true,
    accept: ".doc,.docx", hint: "DOC or DOCX" },
  { key: "ppt", label: "PowerPoint", upload: true, durationRequired: true,
    accept: ".ppt,.pptx", hint: "PPT or PPTX" },
  { key: "image", label: "Image", upload: true, durationRequired: true,
    accept: "image/jpeg,image/png,image/gif,image/webp", hint: "JPG, PNG, GIF or WebP" },
  { key: "link", label: "External link", upload: false, durationRequired: true,
    accept: "", hint: "Opens in a new tab for the learner" },
  { key: "scorm", label: "SCORM package", upload: true, durationRequired: true,
    accept: "application/zip,.zip", hint: "SCORM 1.2 or 2004, as a .zip" },
];

export function contentTypeOf(key) {
  return LESSON_CONTENT_TYPES.find((t) => t.key === key);
}

/**
 * Unknown and legacy types answer true — the safe direction. A completed
 * lesson is paid its declared duration, so a null there is worth zero hours.
 */
export function durationRequiredFor(key) {
  const type = contentTypeOf(key);
  if (type) return type.durationRequired;
  return key !== "video" && key !== "session";
}

/** What the outline and lists show for a lesson of each type. */
export const CONTENT_TYPE_ICON = {
  video: "video",
  pdf: "file",
  word: "file",
  ppt: "file",
  image: "image",
  link: "link",
  scorm: "package",
  session: "users",
  quiz: "clipboard",
  document: "file",
};

export const QUESTION_TYPES = [
  { key: "mcq", label: "Multiple choice", optionBacked: true, multipleCorrect: false,
    hint: "One correct answer from several options." },
  { key: "truefalse", label: "True / False", optionBacked: true, multipleCorrect: false,
    fixedOptions: ["True", "False"], hint: "Two options, fixed. Mark which one is correct." },
  { key: "multiselect", label: "Multiple select", optionBacked: true, multipleCorrect: true,
    hint: "Several options, more than one correct. All must be chosen." },
  { key: "fillblank", label: "Fill in the blank", optionBacked: false, multipleCorrect: false,
    hint: "The learner types the answer. Matched case-insensitively." },
  { key: "matching", label: "Matching", optionBacked: false, multipleCorrect: false,
    hint: "Pairs of items the learner links together." },
];

export function questionTypeOf(key) {
  return QUESTION_TYPES.find((t) => t.key === key);
}

/** Unknown types answer true — an options-backed question is validated, an
 *  answer-backed one with no answer would be silently ungradeable. */
export function isOptionBacked(key) {
  return questionTypeOf(key)?.optionBacked ?? true;
}

/** Where an assessment sits in a course. */
export const ASSESSMENT_LINK_TYPES = [
  { key: "course", label: "Final assessment", hint: "Sits at the end of the whole course." },
  { key: "module", label: "Module", hint: "Sits at the end of one module." },
  { key: "lesson", label: "Lesson", hint: "Sits with one lesson." },
  { key: "none", label: "Not placed", hint: "Authored but not delivered yet." },
];
