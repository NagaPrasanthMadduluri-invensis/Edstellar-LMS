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
 * **The TONE comes down with the sentence, for the same reason.** "Hours
 * grew 40%" and "hours fell 40%" are the same shape and opposite news, and
 * only the place that wrote the sentence knows which. A card with no tone
 * stays neutral, which is the commonest answer — a panel where every card
 * is coloured has no emphasis at all, and the whole point is that the one
 * needing attention stands out from the four that do not.
 *
 * Server Component: no state, no effects, no interactivity.
 */

/** Tone → the icon's colour and the card's left edge. */
const TONES = {
  good:    { icon: "text-success",     edge: "border-l-success",     bg: "bg-surface-2" },
  warn:    { icon: "text-warning",     edge: "border-l-warning",     bg: "bg-surface-2" },
  /* A `danger` tint rather than the plain surface: this is the one card
     that should be visible from across the room, and an icon alone is too
     small to do it. */
  bad:     { icon: "text-danger",      edge: "border-l-danger",      bg: "bg-danger/[0.06]" },
  neutral: { icon: "text-accent-blue", edge: "border-l-transparent", bg: "bg-surface-2" },
};

const ICONS = {
  check: CheckCircle2,
  clock: Clock,
  trophy: Trophy,
  trend: TrendingUp,
  edit: PenLine,
  user: User,
};

/**
 * `action` fills the slot the header's `justify-between` already reserved.
 * It is a link, not a control with state, so this stays a Server Component.
 */
export function InsightPanel({ insights, title = "Key insights", subtitle, action }) {
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
          {action}
        </Box>

        <Box className="grid gap-2 px-4 pb-4 sm:grid-cols-2 xl:grid-cols-3">
          {insights.map((insight, i) => {
            const Icon = ICONS[insight.icon] ?? CheckCircle2;
            const t = TONES[insight.tone] ?? TONES.neutral;
            return (
              <Box
                key={i}
                className={`flex items-start gap-2.5 border border-l-2 border-line px-3 py-2.5 ${t.edge} ${t.bg}`}
              >
                <Icon className={`mt-0.5 size-4 shrink-0 ${t.icon}`} />
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
