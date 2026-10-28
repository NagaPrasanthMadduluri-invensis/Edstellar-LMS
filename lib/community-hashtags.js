import {
  COMMUNITY_HASHTAG_MAX,
  COMMUNITY_HASHTAGS_PER_POST_MAX,
} from "@/lib/content-limits";

/**
 * Hashtag normalisation — the browser's mirror of
 * `server/src/common/community-hashtags.ts`. Change both.
 *
 * `#Renewables`, `renewables` and ` Renewables ` all collapse to the stored tag
 * `renewables`; `label` keeps the first-seen casing for the chip.
 */
export function normalizeHashtag(raw) {
  if (typeof raw !== "string") return null;
  const cleaned = raw
    .trim()
    .replace(/^#+/, "")
    .replace(/[^\p{L}\p{N}_]/gu, "")
    .slice(0, COMMUNITY_HASHTAG_MAX);
  if (!cleaned) return null;
  return { tag: cleaned.toLowerCase(), label: cleaned };
}

export function extractInlineHashtags(text) {
  if (typeof text !== "string") return [];
  return text.match(/#[\p{L}\p{N}_]+/gu) ?? [];
}

/** Normalise + de-duplicate a list of raw tokens, first casing wins, capped. */
export function collectHashtags(raws) {
  const seen = new Map();
  for (const raw of raws ?? []) {
    const n = normalizeHashtag(raw);
    if (!n) continue;
    if (!seen.has(n.tag)) seen.set(n.tag, n.label);
    if (seen.size >= COMMUNITY_HASHTAGS_PER_POST_MAX) break;
  }
  return [...seen].map(([tag, label]) => ({ tag, label }));
}
