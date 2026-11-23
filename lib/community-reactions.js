/**
 * Quick reactions on a Learning community Post. Mirrors
 * `server/src/common/community-reactions.ts`: change both. The server refuses
 * any kind outside this list.
 *
 * `icon` is a lucide component NAME (screens rule 10.3.1.6), mapped to a
 * component by the one file that renders it. `tone` is a palette text class.
 */
export const COMMUNITY_REACTIONS = [
  { kind: "like", label: "Like", icon: "Heart", tone: "text-error" },
  { kind: "helpful", label: "Helpful", icon: "HandHelping", tone: "text-success" },
  { kind: "insightful", label: "Insightful", icon: "Lightbulb", tone: "text-warning" },
  { kind: "thanks", label: "Thanks", icon: "HandHeart", tone: "text-rust" },
  { kind: "great_explanation", label: "Great explanation", icon: "GraduationCap", tone: "text-accent-blue" },
  { kind: "agree", label: "Agree", icon: "ThumbsUp", tone: "text-navy" },
];

const BY_KIND = Object.fromEntries(COMMUNITY_REACTIONS.map((r) => [r.kind, r]));

export function reactionMeta(kind) {
  return BY_KIND[kind] ?? null;
}

/**
 * The kinds actually used on a post, most-used first (catalogue order breaks a
 * tie), for the summary beside the buttons. Zero-count kinds are dropped.
 */
export function topReactions(counts, limit = 3) {
  const order = COMMUNITY_REACTIONS.map((r) => r.kind);
  return Object.entries(counts ?? {})
    .filter(([kind, n]) => BY_KIND[kind] && Number(n) > 0)
    .sort((a, b) => b[1] - a[1] || order.indexOf(a[0]) - order.indexOf(b[0]))
    .slice(0, limit)
    .map(([kind, count]) => ({ ...BY_KIND[kind], count }));
}

/**
 * Optimistic update of a post's reaction state when the caller moves from
 * `from` (a kind or null) to `to` (a kind or null). One reaction per person:
 * changing kind moves their one count, it never adds a second.
 */
export function applyReaction(state, to) {
  const from = state.myReaction ?? null;
  if (from === to) return state;
  const reactions = { ...(state.reactions ?? {}) };
  if (from) reactions[from] = Math.max(0, (reactions[from] ?? 0) - 1);
  if (to) reactions[to] = (reactions[to] ?? 0) + 1;
  const delta = (to ? 1 : 0) - (from ? 1 : 0);
  return {
    myReaction: to,
    likeCount: Math.max(0, (state.likeCount ?? 0) + delta),
    reactions,
  };
}

/**
 * Group a flat reply list into top-level replies with their responses. A
 * response whose parent is gone (removed) is shown at the top level rather
 * than lost.
 */
export function threadReplies(replies) {
  const list = replies ?? [];
  const ids = new Set(list.map((r) => r.id));
  const children = new Map();
  const top = [];
  for (const r of list) {
    if (r.parentReplyId && ids.has(r.parentReplyId)) {
      if (!children.has(r.parentReplyId)) children.set(r.parentReplyId, []);
      children.get(r.parentReplyId).push(r);
    } else {
      top.push(r);
    }
  }
  return top.map((r) => ({ ...r, responses: children.get(r.id) ?? [] }));
}
