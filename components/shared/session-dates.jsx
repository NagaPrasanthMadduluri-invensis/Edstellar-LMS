"use client";

import Text from "@/components/ui/text";
import { cn } from "@/lib/utils";
import { dateChangeLabel, formatDayDate, formatSessionDates, scheduleOf } from "@/lib/sittings";

/**
 * A session's dates, the same way in all three portals (0076, BACKEND_STRUCTURE
 * 10.67). Each date in order, with a Postponed or Preponed chip and the day it
 * moved from when an admin moved it.
 */

/** Postponed (ochre) or Preponed (accent); nothing for a date never moved. */
export function DateChangeChip({ change, className }) {
  const label = dateChangeLabel(change);
  if (!label) return null;
  return (
    <Text as="span" className={cn("chip text-[10px]", change === "postponed" ? "chip-warning" : "chip-progress", className)}>
      {label}
    </Text>
  );
}

/** "5th, 6th November and 2nd December 2026", from the API's words when sent. */
export function sessionDatesText(session) {
  return session?.dates_text || formatSessionDates(scheduleOf(session).map((d) => d.date));
}

/**
 * Every date, chronologically. `compact` renders one wrapped line of chips;
 * the default is a list with "moved from" under each changed date.
 */
export function SessionDateList({ session, compact = false, className }) {
  const dates = scheduleOf(session);
  if (dates.length === 0) return null;
  if (compact) {
    return (
      <div className={cn("flex flex-wrap items-center gap-1.5", className)} data-testid="session-dates">
        {dates.map((d) => (
          <Text as="span" key={d.id ?? d.date} className="inline-flex items-center gap-1 text-xs text-ink">
            {formatDayDate(d.date)}
            <DateChangeChip change={d.change} />
          </Text>
        ))}
      </div>
    );
  }
  return (
    <ul className={cn("space-y-1", className)} data-testid="session-dates">
      {dates.map((d) => (
        <li key={d.id ?? d.date} className="flex flex-wrap items-center gap-2">
          <Text as="span" className="text-sm font-medium text-ink">{formatDayDate(d.date)}</Text>
          <DateChangeChip change={d.change} />
          {d.change && d.previous_date && (
            <Text as="span" className="text-xs text-ink/60">moved from {formatDayDate(d.previous_date)}</Text>
          )}
        </li>
      ))}
    </ul>
  );
}
