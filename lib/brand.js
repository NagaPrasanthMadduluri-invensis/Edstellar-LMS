/**
 * The product's name, and who makes it.
 *
 * ONE definition, because it was written out four times — the top bar, the
 * login card, the page title and the certificate — and a rename that misses
 * one leaves the old name on the document a learner keeps forever.
 *
 * `PRODUCT_NAME` is the platform; `PRODUCT_BY` is the company behind it, shown
 * smaller underneath. They are separate strings rather than one "Spectra LMS
 * by Edstellar", because the two are set at different sizes and weights
 * wherever both appear, and a single string cannot be styled in two parts.
 */
export const PRODUCT_NAME = "Spectra LMS";
export const PRODUCT_BY = "By Edstellar";
/** For `<title>` and anywhere a single flat string is all that fits. */
export const PRODUCT_FULL = `${PRODUCT_NAME} by Edstellar`;

/**
 * The Spectra palette, for the places CSS classes can't reach — Recharts
 * props, canvas fills and inline SVG.
 *
 * Keep these values in sync with the tokens in app/globals.css; that file is
 * the source of truth and this is its JavaScript mirror.
 *
 * Unlike the previous (navy/lime) system, Spectra DOES carry hue in status:
 * green for complete, accent blue for in progress, grey for idle, red for
 * failure, ochre for late/partial. Those five are the vocabulary — do not add
 * a sixth.
 *
 * The legacy keys (`lime`, `limeSoft`, `paper*`) are kept so existing callers
 * keep working; they now resolve to Spectra values — `lime` is the accent
 * blue and `limeSoft` its soft on-navy tint.
 */

export const BRAND = {
  /* Navy chrome. LIFTED from the original #0F1923 scale, which read as black
     rather than navy — see the note in globals.css. These MUST match the
     `--spectra-navy-*` tokens: a chart series drawn from here sits beside
     chrome painted from there, and the two disagreeing is visible on one
     screen. `ink` below is deliberately still #0F1923 — that is text on a
     light surface, a different role that merely shared the hex. */
  navy: "#1E2D40",
  navySoft: "#25344D",
  navyDeep: "#192636",
  navyBorder: "#2D446D",

  /* The one interactive accent */
  accent: "#3B6FD4",
  accentSoft: "#BDD0F0",
  accentTint: "#F0F5FC",

  /* Status hues */
  success: "#1A5E3A",
  warning: "#8A6200",
  rust: "#B04A00",
  danger: "#C94040",

  /* Light surfaces — the canvas is the darkest, panels sit lighter on it */
  canvas: "#EDECE9",
  surface: "#FFFFFF",
  surface2: "#F8F8F6",
  surface3: "#EFEEEB",
  line: "#D8D8D4",
  lineStrong: "#C8C8C4",

  /* Text ramp */
  ink: "#0F1923",
  text2: "#555555",
  text3: "#888888",

  /* ── Legacy aliases, same names, Spectra values ── */
  lime: "#3B6FD4",
  limeSoft: "#BDD0F0",
  paper: "#EDECE9",
  paperWarm: "#F8F8F6",
  paperCream: "#EFEEEB",
  white: "#FFFFFF",
  /** Errors and destructive states only. */
  error: "#C94040",
};

/** Hairlines and axis rules. Spectra rules are a flat grey, not ink at opacity. */
export const HAIRLINE = "#D8D8D4";
export const INK_MUTED = "#555555";

/**
 * Chart series, in the Spectra order: accent → navy → green → ochre → rust.
 * Index into this rather than picking a colour per series by hand.
 */
export const CHART_SERIES = [
  BRAND.accent,
  BRAND.navy,
  BRAND.success,
  BRAND.warning,
  BRAND.rust,
];

/**
 * A WARM categorical ramp — no blue, no navy.
 *
 * `CHART_SERIES` above leads with accent-blue and navy, which is right for
 * a chart sitting alone on a light page. The admin Analytics page is eight
 * charts stacked in one scroll, and in blue-and-navy they read as one
 * undifferentiated block: every series on every chart the same two colours,
 * so nothing distinguishes a mode from a department from a month.
 *
 * Built from the three palette hues that are not blue — `success`, `rust`
 * and `warning` — each at full strength and at the 80%-over-white weight
 * §10.1.1 already derives for filled areas. Six slots, and they alternate
 * deep and mid so adjacent series never sit at the same weight.
 *
 * `danger` is deliberately NOT in it. §10.1 reserves red for genuine
 * failure, and a categorical slot that happens to land on red would say a
 * department was in trouble for no reason other than its position.
 */
export const WARM_SERIES = [
  BRAND.success, // #1A5E3A deep green
  BRAND.rust,    // #B04A00 rust
  "#A18133",     // ochre at 80% over white
  "#487E61",     // green at 80% over white
  BRAND.warning, // #8A6200 deep ochre
  "#C06E33",     // rust at 80% over white
];

/** Warm series colour by position, wrapping for long lists. */
export function warmSeriesColor(index) {
  return WARM_SERIES[index % WARM_SERIES.length];
}

/** The area fill under a warm line — the same hue at 10%. */
export const WARM_FILL = {
  green: "rgba(26, 94, 58, 0.10)",
  rust: "rgba(176, 74, 0, 0.10)",
  ochre: "rgba(138, 98, 0, 0.10)",
};

/** Series colour by position, wrapping for long lists. */
export function seriesColor(index) {
  return CHART_SERIES[index % CHART_SERIES.length];
}

/**
 * Surface rotation for hash-assigned thumbnails (courses, certificates).
 * Spectra's own course thumbnail is a pale blue tile with an accent glyph;
 * the rotation stays inside that family plus the navy.
 */
export const SURFACES = [
  { bg: BRAND.accentTint, accent: BRAND.accent },
  { bg: BRAND.surface3, accent: BRAND.navy },
  { bg: BRAND.navy, accent: BRAND.accentSoft },
  { bg: BRAND.surface2, accent: BRAND.accent },
];

export function surfaceFor(name) {
  let h = 0;
  for (const c of String(name || "A")) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return SURFACES[h % SURFACES.length];
}

/**
 * Progress-bar fill. Spectra has a success hue, so a finished bar reads
 * green; anything short of it reads in the accent. Only genuine failure
 * takes the danger red.
 */
export function progressFill(percent, { failed = false } = {}) {
  if (failed) return BRAND.danger;
  return percent >= 100 ? BRAND.success : BRAND.accent;
}

/**
 * Status → chip class. Pairs with the .chip-* classes in globals.css so the
 * same states look identical everywhere.
 */
export function statusChip(status) {
  const key = String(status || "").toLowerCase().replace(/[\s_]/g, "-");
  if (["completed", "complete", "passed", "present", "on-track", "verified"].includes(key)) {
    return "chip chip-complete";
  }
  if (["in-progress", "in progress", "close", "late", "partial", "active"].includes(key)) {
    return "chip chip-progress";
  }
  if (["failed", "absent", "revoked", "behind", "overdue"].includes(key)) {
    return "chip chip-error";
  }
  return "chip chip-idle";
}

/**
 * Sequential ramp for ordered data (score bands, completion tiers).
 * Runs light → dark so "more" reads as visually heavier.
 */
export const SEQUENTIAL = [
  BRAND.accentSoft,
  "#6A92D4",
  BRAND.accent,
  "#1E3A6E",
  BRAND.navy,
];

/** Categorical status ramp: complete · in-progress · idle · failed. */
export const STATUS_RAMP = [
  BRAND.success,
  BRAND.accent,
  BRAND.text3,
  BRAND.danger,
];

/**
 * WHAT a piece of learning IS — the mirror of the `--type-*` tokens in
 * `app/globals.css`, which is the source of truth. Four kinds, four
 * colours, read by every screen that splits learning by kind so a legend,
 * a stacked bar, a column header and a tab all say "sessions" in the same
 * green.
 *
 * These are ALIASES of hues the palette already carries, not new ones —
 * §10.1 closes the palette and nothing about this axis earns an exception.
 * What is new is the mapping from kind to hue, which had no name before
 * and so was re-decided per screen.
 *
 * `chart` is the same hue at 80% over white. A stacked bar in full-strength
 * ink reads as four solid blocks fighting each other; the flat value stays
 * correct for text, a rule or a legend swatch. Derived, not eyeballed:
 * 0.8 x hue + 0.2 x white, so they stay in family if a hue moves.
 *
 * `webinar` is defined and deliberately unused today: `sessions.session_type`
 * accepts ILT and Virtual only, so a webinar series would be a column that
 * is zero by construction — the empty-column failure BACKEND_STRUCTURE
 * §10.12 records. It is here so the day the enum gains Webinar, the colour
 * is already decided rather than picked in a hurry.
 */
export const LEARNING_TYPES = {
  course:  { key: "course",  label: "Courses",        flat: BRAND.accent,  chart: "#628CDD" },
  path:    { key: "path",    label: "Learning Paths", flat: BRAND.warning, chart: "#A18133" },
  session: { key: "session", label: "Sessions",       flat: BRAND.success, chart: "#487E61" },
  webinar: { key: "webinar", label: "Webinars",       flat: BRAND.rust,    chart: "#C06E33" },
};

/**
 * How close a figure is to its goal, as a colour.
 *
 * The four bands are decided SERVER-SIDE (`goalStatus` in
 * `learner.service.ts`) and arrive as a label; this maps the label to the
 * palette and nothing here re-derives a threshold. A copy of the bands in
 * the browser would be free to drift from the one the API scored the number
 * with — the rule §10.3.1.18 states for the feedback category map.
 *
 * Green once the goal is in reach, ochre while it is plausible, red when it
 * is not. That is the whole colour rule on the hours pages, and it uses the
 * existing status hues (§10.1) rather than inventing a scale.
 */
export const GOAL_TONES = {
  "Goal Reached!": { key: "reached",  fg: "text-success",     bg: "bg-success",     chip: "chip-complete" },
  "Almost There":  { key: "close",    fg: "text-success",     bg: "bg-success",     chip: "chip-complete" },
  "On Track":      { key: "ontrack",  fg: "text-warning",     bg: "bg-warning",     chip: "chip-warning"  },
  Behind:          { key: "behind",   fg: "text-danger",      bg: "bg-danger",      chip: "chip-error"    },
};

/**
 * HOW A METRIC IS DOING, as a colour. One definition for the whole admin
 * side — the dashboard, analytics and reports all read this rather than
 * each deciding what "low" means.
 *
 * Two directions, because the product has both kinds of number:
 *
 *   higher is better  — completion, pass rate, attendance, a score
 *   lower is better   — overdue, at risk, unmarked, anything counting a
 *                       problem (pass `lowerIsBetter`)
 *
 * The thresholds are 75 / 50 for rates, and for counts-of-problems zero is
 * good and `warnAbove` is where ochre becomes red. They are arguments, not
 * constants, because "5 overdue" is a different kind of bad in a team of
 * ten than in a team of two thousand — but the BANDS are fixed here so the
 * three pages cannot disagree about what green means.
 *
 * NEUTRAL IS A REAL ANSWER, and the most common one. A count of learners,
 * total hours, certificates issued — these have no good direction, and
 * painting them would spend the reader's attention on something that is
 * not asking for it. Pass no thresholds and the tile stays accent.
 */
const TONES = {
  good:    { key: "good",    tile: "tile-success", text: "text-success",     bar: "bg-success" },
  warn:    { key: "warn",    tile: "tile-warning", text: "text-warning",     bar: "bg-warning" },
  bad:     { key: "bad",     tile: "tile-danger",  text: "text-danger",      bar: "bg-danger" },
  neutral: { key: "neutral", tile: "tile-accent",  text: "text-accent-blue", bar: "bg-accent-blue" },
};

export function metricTone(value, opts = {}) {
  const { good = 75, warn = 50, lowerIsBetter = false, warnAbove = 0 } = opts;
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return TONES.neutral;
  }
  const n = Number(value);

  if (lowerIsBetter) {
    // Zero problems is genuinely good and worth saying so. A red zero is a
    // false alarm — TASTE §10.3.1.8 — so the bands start at "none".
    if (n <= 0) return TONES.good;
    return n > warnAbove ? TONES.bad : TONES.warn;
  }
  if (n >= good) return TONES.good;
  if (n >= warn) return TONES.warn;
  return TONES.bad;
}

/** The neutral tone, for a figure with no good direction. */
export const NEUTRAL_TONE = TONES.neutral;

/**
 * A percentage parsed out of a formatted KPI string, or null.
 *
 * The reports builder sends `{ label, value }` with the value already
 * formatted, and only a PERCENTAGE has an unambiguous good direction —
 * "112 enrolments" is neither good nor bad without a target nobody has set.
 * So reports tone the percentages and leave the counts alone, rather than
 * guessing from a label.
 */
export function percentValue(formatted) {
  const m = /^\s*(-?[\d.]+)\s*%\s*$/.exec(String(formatted ?? ""));
  return m ? Number(m[1]) : null;
}

/** Falls back to Behind, so an unknown label is visibly a problem. */
export function goalTone(label) {
  return GOAL_TONES[label] ?? GOAL_TONES.Behind;
}

/** The three kinds this product can actually produce hours for, in order. */
export const LEARNING_TYPE_ORDER = ["course", "path", "session"];

/** Colour for a learning type, `flat` for text and rules, `chart` for fills. */
export function learningTypeColor(key, weight = "flat") {
  return (LEARNING_TYPES[key] ?? LEARNING_TYPES.course)[weight];
}
