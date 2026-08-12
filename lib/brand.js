/**
 * The Edstellar palette, for the places CSS classes can't reach — Recharts
 * props, canvas fills and inline SVG.
 *
 * The palette is closed. Never add a hue here: if something needs to be
 * distinguished visually, distinguish it with the paper/navy scale, weight,
 * or typography instead of a new colour.
 *
 * Keep these values in sync with the tokens in app/globals.css.
 */

export const BRAND = {
  navy: "#0A1628",
  navySoft: "#14233D",
  navyDeep: "#050D1A",
  lime: "#C8F135",
  limeSoft: "#E4F89A",
  paper: "#FAFAF7",
  paperWarm: "#F2F0E8",
  paperCream: "#EDE9DD",
  white: "#FFFFFF",
  ink: "#0A1628",
  /** Errors and destructive states only. */
  error: "#B3261E",
};

/** Hairlines and axis rules — ink at low opacity, never a grey. */
export const HAIRLINE = "rgba(10, 22, 40, 0.12)";
export const INK_MUTED = "rgba(10, 22, 40, 0.60)";

/**
 * Chart series, in the order the brand specifies: lime-soft → lime → navy.
 * Index into this rather than picking a colour per series by hand.
 */
export const CHART_SERIES = [
  BRAND.limeSoft,
  BRAND.lime,
  BRAND.navy,
  BRAND.navySoft,
  "rgba(10, 22, 40, 0.45)",
];

/** Series colour by position, wrapping for long lists. */
export function seriesColor(index) {
  return CHART_SERIES[index % CHART_SERIES.length];
}

/**
 * Surface rotation for hash-assigned thumbnails (courses, certificates).
 *
 * The old implementation hashed a name into one of eight bright hues. The
 * brand allows variety only across the paper family and navy, so the hash now
 * picks a surface from those — same idea, inside the palette.
 */
export const SURFACES = [
  { bg: BRAND.paperCream, accent: BRAND.navy },
  { bg: BRAND.paperWarm, accent: BRAND.navy },
  { bg: BRAND.navy, accent: BRAND.lime },
  { bg: BRAND.paper, accent: BRAND.navySoft },
];

export function surfaceFor(name) {
  let h = 0;
  for (const c of String(name || "A")) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return SURFACES[h % SURFACES.length];
}

/**
 * Progress-bar fill. Completion reads as filled navy, not green — there is no
 * success hue in this system. Only genuine failure takes the error red.
 */
export function progressFill(percent, { failed = false } = {}) {
  if (failed) return BRAND.error;
  return percent >= 100 ? BRAND.navy : BRAND.navySoft;
}

/**
 * Status → chip class. Pairs with the .chip-* classes in globals.css so the
 * same four states look identical everywhere.
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
 * Runs light → dark so "more" reads as visually heavier, using only the
 * lime → navy path the brand specifies.
 */
export const SEQUENTIAL = [
  BRAND.limeSoft,
  BRAND.lime,
  "rgba(10, 22, 40, 0.45)",
  BRAND.navySoft,
  BRAND.navy,
];

/** Categorical status ramp: complete · in-progress · idle · failed. */
export const STATUS_RAMP = [
  BRAND.navy,
  BRAND.lime,
  BRAND.limeSoft,
  BRAND.error,
];
