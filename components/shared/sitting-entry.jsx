"use client";

import Text from "@/components/ui/text";
import { cn } from "@/lib/utils";
import { formatTimeRange, seatsText } from "@/lib/sittings";
import { DateChangeChip } from "@/components/shared/session-dates";

/**
 * One calendar entry: a single DAY of one sitting. Shared by the admin,
 * learner and trainer calendars so a batch reads the same in all three.
 *
 * `tone` is "default", "mine" (the learner's own batch, emphasised) or "muted"
 * (another batch the learner can still see availability for).
 */
const TONE = {
  default: "border-navy/20 bg-paper-cream text-navy",
  mine: "border-accent-blue bg-accent-tint text-navy ring-1 ring-accent-blue/40",
  muted: "border-navy/10 bg-surface-2 text-ink/60 opacity-75",
};

export function SittingEntry({ entry, onSelect, tone = "default", showSeats = true }) {
  const { session, sitting, dayNo, dayCount } = entry;
  const range = formatTimeRange(sitting.start_time, sitting.end_time);
  const seats = showSeats ? seatsText(sitting) : "";
  const cancelled = sitting.status === "cancelled";
  return (
    <button
      type="button"
      onClick={() => onSelect(entry)}
      title={`${session.title} · ${range}`}
      className={cn(
        "block w-full cursor-pointer rounded border-l-2 px-1.5 py-1 text-left transition-opacity hover:opacity-80",
        TONE[tone] || TONE.default,
        cancelled && "line-through decoration-ink/30",
      )}
    >
      <Text as="span" className="block truncate text-[11px] font-semibold leading-tight text-inherit">
        {session.title}
      </Text>
      {sitting.batch_id != null && (
        <Text as="span" className="block truncate text-[10px] font-medium leading-tight text-inherit">
          {sitting.name}
        </Text>
      )}
      {tone === "mine" && (
        <Text as="span" className="block text-[10px] font-bold uppercase leading-tight tracking-wide text-accent-blue">
          Your batch
        </Text>
      )}
      {range && (
        <Text as="span" className="block truncate text-[10px] leading-tight text-inherit">
          {range}
        </Text>
      )}
      {dayCount > 1 && (
        <Text as="span" className="block text-[10px] leading-tight text-inherit">
          Day {dayNo} of {dayCount}
        </Text>
      )}
      {entry.change && <DateChangeChip change={entry.change} className="mt-0.5" />}
      {seats && (
        <Text as="span" className="block text-[10px] leading-tight text-inherit">
          {seats}
        </Text>
      )}
    </button>
  );
}
