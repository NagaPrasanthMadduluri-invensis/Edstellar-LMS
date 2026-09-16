import { CheckCircle2, Clock, PenLine, TrendingUp, Trophy, User } from "lucide-react";

import Box from "@/components/ui/box";
import Text from "@/components/ui/text";

/**
 * The "key insights" narrative panel, above the charts on both Dashboard and
 * Analytics.
 *
 * Every sentence is written by the API from a figure already on the page, so
 * this component renders text and never derives a number of its own — if it
 * did the arithmetic here, the panel and the chart beneath it would be two
 * calculations that could drift.
 *
 * Server Component: no state, no effects, no interactivity.
 */

const ICONS = {
  check: CheckCircle2,
  clock: Clock,
  trophy: Trophy,
  trend: TrendingUp,
  edit: PenLine,
  user: User,
};

export function InsightPanel({ insights, title = "Key insights", subtitle }) {
  if (!insights || insights.length === 0) return null;

  return (
    <Box className="border border-line bg-surface">
      {/* The accent rule down the left edge is the reference's one flourish:
          it marks the panel as commentary rather than another data card. */}
      <Box className="border-l-2 border-accent-blue">
        <Box className="flex flex-wrap items-start justify-between gap-3 px-4 pt-3.5 pb-2">
          <Box>
            <Text as="h3" className="text-[13px] font-bold text-ink">
              {title}
            </Text>
            {subtitle && (
              <Text as="p" className="mt-0.5 text-[11px] text-text-3">
                {subtitle}
              </Text>
            )}
          </Box>
        </Box>

        <Box className="grid gap-2 px-4 pb-4 sm:grid-cols-2 xl:grid-cols-3">
          {insights.map((insight, i) => {
            const Icon = ICONS[insight.icon] ?? CheckCircle2;
            return (
              <Box
                key={i}
                className="flex items-start gap-2.5 border border-line bg-surface-2 px-3 py-2.5"
              >
                <Icon className="mt-0.5 size-4 shrink-0 text-accent-blue" />
                <Text as="p" className="text-[12.5px] leading-relaxed text-ink">
                  {insight.text}
                </Text>
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}
