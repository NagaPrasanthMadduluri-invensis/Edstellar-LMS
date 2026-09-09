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
 * Always a navy surface, in every state. The strip is an incentive, not a
 * status chip — the card already carries status in its badge and bar — so it
 * keeps one treatment and changes only its wording. That is also what lets it
 * use lime, which TASTE §10.1 allows on dark surfaces and nowhere else.
 */

/** "12 lessons x 10 · 1 assessment x 50" — where the number comes from. */
function breakdown(reward) {
  const parts = [];
  const lessons = reward.lessonPoints / reward.perLesson;
  const assessments = reward.assessmentPoints / reward.perAssessment;
  if (lessons > 0) {
    parts.push(`${lessons} lesson${lessons === 1 ? "" : "s"} × ${reward.perLesson}`);
  }
  if (assessments > 0) {
    parts.push(`${assessments} assessment${assessments === 1 ? "" : "s"} × ${reward.perAssessment}`);
  }
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
      sub: `Added to your leaderboard total · ${breakdown(reward)}`,
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
  return {
    icon: Sparkles,
    label: "On completion",
    value: `${reward.totalPoints} pts`,
    sub: isSession
      // The learner cannot complete a session themselves — the trainer marks
      // it — so the card must not imply the points are theirs to take.
      ? "Credited when your trainer marks you present"
      : breakdown(reward),
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
          <Icon className="h-3.5 w-3.5 shrink-0 text-lime self-center" />
          <Text as="span" className="font-mono text-[10px] uppercase tracking-[0.14em] text-paper/60 truncate">
            {label}
          </Text>
        </Box>
        <Text as="span" className="font-display text-base font-bold tabular-nums text-lime shrink-0">
          {value}
        </Text>
      </Box>

      <Text as="p" className="text-[11px] leading-tight text-paper/60">{sub}</Text>

      {nudge && (
        <Box className="flex items-start gap-1.5 border-t border-paper/15 pt-1.5 mt-1.5">
          <nudge.icon className="h-3 w-3 shrink-0 text-lime mt-[2px]" />
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
 * must only be placed on a dark surface (that is where lime is allowed at all,
 * TASTE §10.1).
 */
export function CourseRewardHeroLine({ reward, isComplete = false, isSession = false, className }) {
  if (!reward || reward.totalPoints <= 0) return null;

  const { label, value, sub } = headline(reward, { isComplete, isSession });

  return (
    <Box className={cn("mt-5 border-t border-paper/15 pt-4 space-y-2", className)}>
      <Box className="flex items-baseline justify-between gap-4 flex-wrap">
        <Box className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 shrink-0 text-lime" />
          <Text as="span" className="font-mono text-[11px] uppercase tracking-[0.14em] text-paper/55">
            {label}
          </Text>
        </Box>
        <Text as="span" className="font-display text-xl font-bold tabular-nums text-lime">
          {value}
        </Text>
      </Box>

      <Text as="p" className="text-xs text-paper/60">{sub}</Text>

      {reward.onTimeBadge && (
        <Box className="flex items-start gap-2 pt-0.5">
          <Zap className="h-3.5 w-3.5 shrink-0 text-lime mt-[2px]" />
          <Text as="p" className="text-xs text-paper/80">
            Finish by {reward.onTimeBadge.by} to earn the{" "}
            <Text as="span" className="font-semibold text-paper">{reward.onTimeBadge.title}</Text> badge
          </Text>
        </Box>
      )}
      {reward.unlocksBadge && (
        <Box className="flex items-start gap-2 pt-0.5">
          <Award className="h-3.5 w-3.5 shrink-0 text-lime mt-[2px]" />
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
