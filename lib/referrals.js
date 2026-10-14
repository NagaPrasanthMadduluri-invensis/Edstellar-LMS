/**
 * The browser's mirror of the referral pipeline statuses in
 * `server/src/common/referrals.ts` — the labels and the chip tone each status
 * reads as. Change both.
 *
 * Five tones, one each, from the closed status vocabulary (never a sixth hue):
 * a referral is `invited` (idle), worked through `contacted`/`qualified`, and
 * ends `converted` (won) or `declined`.
 */
export const REFERRAL_STATUSES = [
  { key: "invited", label: "Invited", chip: "chip-idle" },
  { key: "contacted", label: "Contacted", chip: "chip-progress" },
  { key: "qualified", label: "Qualified", chip: "chip-warning" },
  { key: "converted", label: "Converted", chip: "chip-complete" },
  { key: "declined", label: "Declined", chip: "chip-error" },
];

export function statusOf(key) {
  return REFERRAL_STATUSES.find((s) => s.key === key) ?? REFERRAL_STATUSES[0];
}
