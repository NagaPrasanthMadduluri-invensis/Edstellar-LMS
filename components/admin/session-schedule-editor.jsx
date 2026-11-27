"use client";

import { useMemo } from "react";
import { CalendarDays, Trash2 } from "lucide-react";

import Box from "@/components/ui/box";
import Text from "@/components/ui/text";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateChangeChip } from "@/components/shared/session-dates";
import { formatDayDate, formatSessionDates, planSchedule } from "@/lib/sittings";

/**
 * A session's dates, edited (0076, BACKEND_STRUCTURE 10.67).
 *
 * Controlled: `value` is the list of "YYYY-MM-DD" the admin wants and
 * `onChange` sets it; the caller saves it (the Edit Session dialog sends it as
 * `dates`, the Schedule dialog to PUT :id/schedule). `saved` is the schedule
 * as stored, for the Postponed/Preponed chips and the preview.
 *
 * Every date is listed in order with a delete button and its own date field
 * to change it, and the calendar shows the same dates highlighted: clicking
 * one deselects it, clicking another day adds it. Before saving, the preview
 * says what will happen, using the server's own pairing rule: a date taken
 * away and one put in become a MOVE that keeps its batches, people and
 * attendance, labelled postponed or preponed.
 */
export function SessionScheduleEditor({ saved = [], value, onChange, disabled = false }) {
  const savedDates = useMemo(() => saved.map((d) => d.date), [saved]);
  const sorted = useMemo(() => [...new Set(value)].sort(), [value]);
  const plan = useMemo(() => planSchedule(savedDates, sorted), [savedDates, sorted]);
  const byDate = useMemo(() => new Map(saved.map((d) => [d.date, d])), [saved]);
  const moveTo = new Map(plan.moves.map((m) => [m.to, m]));

  const toIso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const toDate = (iso) => new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));

  const replace = (from, to) => {
    if (!to || to === from) return;
    if (sorted.includes(to)) return;
    onChange(sorted.map((d) => (d === from ? to : d)));
  };
  const remove = (d) => onChange(sorted.filter((x) => x !== d));

  const changed = plan.moves.length + plan.added.length + plan.removed.length > 0;

  return (
    <Box className="space-y-3" data-testid="schedule-editor">
      <Box className="flex items-center gap-2">
        <CalendarDays className="size-4 text-accent-blue" />
        <Label className="text-sm font-medium">Session dates</Label>
        <Text as="span" className="text-[11px] text-text-3">
          {sorted.length} date{sorted.length === 1 ? "" : "s"}
          {sorted.length > 0 && ` · ${formatSessionDates(sorted)}`}
        </Text>
      </Box>

      <Box className="grid gap-4 md:grid-cols-[auto_1fr]">
        <Box className="rounded-md border border-line bg-surface">
          <Calendar
            mode="multiple"
            selected={sorted.map(toDate)}
            defaultMonth={sorted[0] ? toDate(sorted[0]) : undefined}
            onSelect={(days) => {
              if (disabled) return;
              const next = (days || []).map(toIso);
              if (next.length === 0) return; // a session keeps at least one date
              onChange(next);
            }}
            disabled={disabled}
          />
        </Box>

        <Box className="space-y-1.5">
          {sorted.length === 0 && (
            <Text as="p" className="text-[12px] text-text-3">Pick at least one date on the calendar.</Text>
          )}
          <ul className="divide-y divide-line rounded-md border border-line bg-surface" data-testid="schedule-dates">
            {sorted.map((d) => {
              const stored = byDate.get(d);
              const move = moveTo.get(d);
              return (
                <li key={d} className="flex flex-wrap items-center gap-2 px-3 py-2" data-testid={`schedule-date-${d}`}>
                  <Box className="min-w-0 flex-1">
                    <Text as="p" className="text-[12.5px] font-semibold text-ink">{formatDayDate(d)}</Text>
                    <Box className="mt-0.5 flex flex-wrap items-center gap-1.5">
                      {stored && <DateChangeChip change={stored.change} />}
                      {stored?.change && stored.previous_date && (
                        <Text as="span" className="text-[10.5px] text-text-3">moved from {formatDayDate(stored.previous_date)}</Text>
                      )}
                      {move && (
                        <Text as="span" className="text-[10.5px] text-text-2">
                          Will be {move.change} from {formatDayDate(move.from)}
                        </Text>
                      )}
                      {!stored && !move && (
                        <Text as="span" className="text-[10.5px] text-text-2">New date</Text>
                      )}
                    </Box>
                  </Box>
                  <Input
                    type="date"
                    aria-label={`Change ${formatDayDate(d)}`}
                    value={d}
                    onChange={(e) => replace(d, e.target.value)}
                    disabled={disabled}
                    className="h-8 w-[9.5rem] text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => remove(d)}
                    disabled={disabled || sorted.length <= 1}
                    title={sorted.length <= 1 ? "A session needs at least one date" : `Delete ${formatDayDate(d)}`}
                    aria-label={`Delete ${formatDayDate(d)}`}
                    className="flex size-8 cursor-pointer items-center justify-center rounded border border-line text-text-3 transition-colors hover:bg-danger hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        </Box>
      </Box>

      {saved.length > 0 && changed && (
        <Box className="rounded-md border-l-2 border-warning bg-surface-2 px-3 py-2" data-testid="schedule-preview">
          <Text as="p" className="text-[11.5px] font-semibold text-ink">When you save:</Text>
          <ul className="mt-1 space-y-0.5">
            {plan.moves.map((m) => (
              <li key={`m${m.from}`} className="text-[11.5px] text-text-2">
                <strong className="font-semibold">{m.change === "postponed" ? "Postponed" : "Preponed"}:</strong>{" "}
                {formatDayDate(m.from)} moves to {formatDayDate(m.to)}, keeping its batches, people and attendance.
              </li>
            ))}
            {plan.added.map((d) => (
              <li key={`a${d}`} className="text-[11.5px] text-text-2">
                <strong className="font-semibold">Added:</strong> {formatDayDate(d)}, with the batches of the nearest date.
              </li>
            ))}
            {plan.removed.map((d) => (
              <li key={`r${d}`} className="text-[11.5px] text-text-2">
                <strong className="font-semibold">Removed:</strong> {formatDayDate(d)} and its batches.
              </li>
            ))}
          </ul>
          <Text as="p" className="mt-1 text-[11px] text-text-3">
            Enrolled learners and the trainer are told by notification and email.
          </Text>
        </Box>
      )}
    </Box>
  );
}
