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
