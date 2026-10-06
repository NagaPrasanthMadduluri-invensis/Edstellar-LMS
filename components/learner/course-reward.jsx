"use client";

import { Award, CheckCircle2, Sparkles, Zap } from "lucide-react";

import Box from "@/components/ui/box";
import Text from "@/components/ui/text";
import { cn } from "@/lib/utils";

/**
 * What a course pays, said BEFORE it is finished.
 *
 * Points were only ever credited silently — the leaderboard moved and nothing
 * had told the learner it would. These read the `reward` block the API returns
 * beside every assignment, so the promise here is the same arithmetic the
 * board pays out (`server/src/modules/leaderboard/points.ts`).
 *
 * ON NAVY THE ACCENT IS `accent-soft`, NOT `accent-blue` (TASTE §10.1).
 * This panel used `text-lime`, a legacy alias the Spectra migration remapped
 * to `accent-blue` — a colour meant for LIGHT surfaces. On this navy strip it
 * measures 3.73:1, and the points figure it colours is the one thing the
 * panel exists to show. `accent-soft` is 11.36:1 against the same navy.
 *
 * Neither green nor ochre is an option here despite reading as "positive":
 * `success` is 2.29:1 on navy and fails outright, and `warning`/`rust` are
 * 3.23:1 — worse than the blue being replaced. The palette's light tints are
 * what work on dark chrome, which is the whole reason `accent-soft` exists.
 *
 * Always a navy surface, in every state. The strip is an incentive, not a
 * status chip — the card already carries status in its badge and bar — so it
 * keeps one treatment and changes only its wording. That is also what makes
 * `accent-soft` the right emphasis colour throughout — it exists for exactly
 * this, the accent read on a dark field.
 */

/**
 * "Course 100 · early +75 · 1 assessment 50–200" — where the number comes from.
 *
 * Each figure is a field the API priced with the leaderboard's own rules
 * (`courseReward` in points.ts), so nothing here is a rate typed into the
 * browser. An assessment is a RANGE because it pays one tier by best score:
 * the pass rate is guaranteed, a top or perfect score pays more.
 */
function breakdown(reward) {
  const parts = [`Course ${reward.completionPoints}`];
  if (reward.earlyPoints > 0) parts.push(`early +${reward.earlyPoints}`);
  const n = reward.assessmentCount;
  if (n > 0) {
    parts.push(
      `${n} assessment${n === 1 ? "" : "s"} ${reward.perAssessmentMin}–${reward.perAssessmentMax}`,
    );
  }
  return parts.join(" · ");
}

/**
 * What a FINISHED course actually paid. Once complete the early bonus is
 * either earned or gone (the API sends 0 for a lapsed one), so whatever is
 * left of the total after completion and the bonus is what the assessments
 * paid at their real tiers — a range would be vaguer than the facts.
 */
function earnedBreakdown(reward) {
  const parts = [`Course ${reward.completionPoints}`];
  if (reward.earlyPoints > 0) parts.push(`early +${reward.earlyPoints}`);
  const assessments = reward.earnedPoints - reward.completionPoints - reward.earlyPoints;
  if (assessments > 0) parts.push(`assessments +${assessments}`);
  return parts.join(" · ");
}

/**
 * The headline, which is the whole point of the component: an unopened course
 * says what it is worth, a started one says what is still on the table, and a
 * finished one says what it paid.
 */
function headline(reward, { isComplete, isSession }) {
  if (isComplete) {
    return {
      icon: CheckCircle2,
      label: "Earned",
      value: `${reward.earnedPoints} pts`,
      sub: `Added to your leaderboard total · ${earnedBreakdown(reward)}`,
    };
  }
  if (reward.earnedPoints > 0) {
    return {
      icon: Sparkles,
      label: "Still to earn",
      value: `${reward.remainingPoints} pts`,
      sub: `${reward.earnedPoints} of ${reward.totalPoints} earned so far`,
    };
  }
  // "up to" only when a top score can genuinely pay more than the base.
  const upTo = reward.maxPoints > reward.totalPoints ? ` · up to ${reward.maxPoints}` : "";
  return {
    icon: Sparkles,
    label: "On completion",
    value: `${reward.totalPoints} pts`,
    sub: isSession
      // The learner cannot complete a session themselves — the trainer marks
      // it — so the card must not imply the points are theirs to take.
      ? "Credited when your trainer marks you present"
      : `${breakdown(reward)}${upTo}`,
  };
}

/**
 * How far the course-count badge is. One course away is a real prompt to finish
 * THIS one; further away it is a direction of travel, and saying "completing
 * this earns it" would be a lie.
 */
function badgeNudge(badge) {
  return badge.coursesToGo <= 1
    ? `Completing this earns the ${badge.title} badge`
    : `${badge.coursesToGo} more courses to the ${badge.title} badge`;
}

/**
 * Compact strip for a course card.
 *
 * `reward` is the block from /api/learner/courses; anything falsy or worth
 * nothing renders nothing rather than an empty promise of "0 pts".
 */
export function CourseRewardStrip({ reward, isComplete = false, isSession = false, className }) {
  if (!reward || reward.totalPoints <= 0) return null;

  const { icon: Icon, label, value, sub } = headline(reward, { isComplete, isSession });
  const nudge = reward.onTimeBadge
    ? { icon: Zap, text: `Finish by ${reward.onTimeBadge.by} for the ${reward.onTimeBadge.title} badge` }
    : reward.unlocksBadge
      ? { icon: Award, text: badgeNudge(reward.unlocksBadge) }
      : null;

  return (
    <Box className={cn("surface-dark rounded-lg px-3 py-2.5 space-y-1", className)}>
      <Box className="flex items-baseline justify-between gap-2">
        <Box className="flex items-center gap-1.5 min-w-0">
          <Icon className="h-3.5 w-3.5 shrink-0 text-accent-soft self-center" />
          <Text as="span" className="font-mono text-[10px] uppercase tracking-[0.14em] text-paper/60 truncate">
            {label}
          </Text>
        </Box>
        <Text as="span" className="font-display text-base font-bold tabular-nums text-accent-soft shrink-0">
          {value}
        </Text>
      </Box>

      <Text as="p" className="text-[11px] leading-tight text-paper/60">{sub}</Text>

      {nudge && (
        <Box className="flex items-start gap-1.5 border-t border-paper/15 pt-1.5 mt-1.5">
          <nudge.icon className="h-3 w-3 shrink-0 text-accent-soft mt-[2px]" />
          <Text as="p" className="text-[11px] leading-tight text-paper/80">{nudge.text}</Text>
        </Box>
      )}
    </Box>
  );
}

/**
 * The same figures on the course detail page, where they go INSIDE the navy
 * hero rather than in a panel of their own — the hero is already a dark
 * surface, and a second navy block stacked under it would read as two heroes.
 * So this renders transparent, separated by the hero's own paper hairline, and
 * must only be placed on a dark surface — `accent-soft` is legible on navy
 * and washes out on anything lighter (TASTE §10.1).
 */
export function CourseRewardHeroLine({ reward, isComplete = false, isSession = false, className }) {
  if (!reward || reward.totalPoints <= 0) return null;

  const { label, value, sub } = headline(reward, { isComplete, isSession });

  return (
    <Box className={cn("mt-5 border-t border-paper/15 pt-4 space-y-2", className)}>
      <Box className="flex items-baseline justify-between gap-4 flex-wrap">
        <Box className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 shrink-0 text-accent-soft" />
          <Text as="span" className="font-mono text-[11px] uppercase tracking-[0.14em] text-paper/55">
            {label}
          </Text>
        </Box>
        <Text as="span" className="font-display text-xl font-bold tabular-nums text-accent-soft">
          {value}
        </Text>
      </Box>

      <Text as="p" className="text-xs text-paper/60">{sub}</Text>

      {reward.onTimeBadge && (
        <Box className="flex items-start gap-2 pt-0.5">
          <Zap className="h-3.5 w-3.5 shrink-0 text-accent-soft mt-[2px]" />
          <Text as="p" className="text-xs text-paper/80">
            Finish by {reward.onTimeBadge.by} to earn the{" "}
            <Text as="span" className="font-semibold text-paper">{reward.onTimeBadge.title}</Text> badge
          </Text>
        </Box>
      )}
      {reward.unlocksBadge && (
        <Box className="flex items-start gap-2 pt-0.5">
          <Award className="h-3.5 w-3.5 shrink-0 text-accent-soft mt-[2px]" />
          <Text as="p" className="text-xs text-paper/80">
            {reward.unlocksBadge.coursesToGo <= 1
              ? "Completing this earns the "
              : `${reward.unlocksBadge.coursesToGo} more courses to the `}
            <Text as="span" className="font-semibold text-paper">{reward.unlocksBadge.title}</Text> badge
          </Text>
        </Box>
      )}
    </Box>
  );
}
