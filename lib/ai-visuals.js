/**
 * The AI feature's visual language (owner request 2026-11-19).
 *
 * AI features are the ONE place that carries the full Spectra / VIBGYOR
 * spectrum — every other surface keeps the closed palette (§10.1). The spectrum
 * is used by the AiReveal trigger, the "analyzing" animation and the AI card
 * accents (the matching CSS lives in `app/globals.css`, class `ai-*`). All the
 * motion is neutralised by the global `prefers-reduced-motion` rule.
 *
 * The hex values are the seven Colour themes' swatches from `THEMES` in
 * `lib/brand.js` — kept in step with them, since the animated gradients in CSS
 * repeat the same seven.
 */
export const AI_SPECTRUM = [
  "#7C3AED", // violet
  "#4F46E5", // indigo
  "#2563EB", // blue
  "#059669", // green
  "#D97706", // amber
  "#EA580C", // orange
  "#DC2626", // red
];

/** The staged lines the analyzing animation cycles through, per audience. They
 *  describe what the model is actually doing — reading the data, then writing. */
export const LEARNER_STAGES = [
  "Reading your learning history",
  "Mapping your skills and progress",
  "Finding what matters most next",
  "Writing your personalised guidance",
];

export const ADMIN_STAGES = [
  "Reading your organisation's learning data",
  "Finding patterns across courses and teams",
  "Weighing risks, wins and what needs attention",
  "Writing your briefing",
];
