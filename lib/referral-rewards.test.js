import { describe, it, expect } from 'vitest';
import { referralTier, REFERRAL_TIERS } from '@/lib/referral-rewards';

// Mirrors server/src/common/referral-rewards.spec.ts — the two must agree, so
// the same cases are asserted on both sides of the "change both" invariant.
describe('referralTier (client mirror)', () => {
  it('earns nothing below the first tier', () => {
    expect(referralTier(0)).toMatchObject({ discountPct: 0, nextTierAt: 2, nextDiscountPct: 15, toNext: 2 });
    expect(referralTier(1)).toMatchObject({ discountPct: 0, toNext: 1 });
  });

  it('earns 15% at 2 conversions, 25% at 3', () => {
    expect(referralTier(2)).toMatchObject({ discountPct: 15, nextTierAt: 3, toNext: 1 });
    expect(referralTier(3)).toMatchObject({ discountPct: 25, nextTierAt: null, toNext: 0 });
  });

  it('coerces, clamps and floors the count', () => {
    expect(referralTier(-5).convertedCount).toBe(0);
    expect(referralTier('2').discountPct).toBe(15);
    expect(referralTier(undefined).convertedCount).toBe(0);
  });

  it('keeps tiers ordered highest-first', () => {
    expect(REFERRAL_TIERS[0].min).toBeGreaterThan(REFERRAL_TIERS[1].min);
  });
});
