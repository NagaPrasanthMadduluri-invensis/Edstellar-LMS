/**
 * The browser's mirror of `server/src/common/referral-rewards.ts`.
 *
 * 2 converted referrals earn 15% off the referrer's own subscription, 3 earn
 * 25%. The tier is derived from the converted count, so the showcase banner
 * agrees with the figure the API sends on the list response (`reward`). The API
 * is the source of truth; this exists so the banner can describe the whole
 * ladder, not only the tier reached. Change both.
 */
export const REFERRAL_TIERS = [
  { min: 3, discountPct: 25 },
  { min: 2, discountPct: 15 },
];

export function referralTier(convertedCount) {
  const count = Math.max(0, Math.floor(Number(convertedCount) || 0));
  const earned = REFERRAL_TIERS.find((t) => count >= t.min);
  const discountPct = earned?.discountPct ?? 0;
  const next = [...REFERRAL_TIERS]
    .sort((a, b) => a.min - b.min)
    .find((t) => count < t.min);
  return {
    convertedCount: count,
    discountPct,
    nextTierAt: next?.min ?? null,
    nextDiscountPct: next?.discountPct ?? null,
    toNext: next ? next.min - count : 0,
  };
}
