"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays, ChevronLeft, ChevronRight, ChevronRight as Arrow,
  Clock, MapPin, Users, Video,
} from "lucide-react";

import Box from "@/components/ui/box";
import Text from "@/components/ui/text";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";

/**
 * The trainer's Training calendar.
 *
 * **It is a second VIEW over `GET /api/trainer/sessions`, not a second
 * query.** My Sessions already reads every session assigned to this trainer
 * with its date, times, venue and attendance counts; a calendar endpoint
 * beside it would be two definitions of "my sessions" that could disagree
 * about, say, whether a cancelled sitting still counts. Same rule the KPI
 * tiles follow — reduce from the rows already on screen (§10.3.1.8).
 *
 * The API filters by `trainer_user_id` in SQL (including batch assignments),
 * so there is no "all sessions" state for this component to get wrong.
 */

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * Status carries the fill weight, per §10.3 — the same four a session has
 * everywhere else. `in_progress` arrives derived from the API
 * (`display_status`); nothing here recomputes it from the clock, or the
 * calendar would disagree with the session list beside it.
 */
const STATUS = {
  upcoming:    { label: "Upcoming",    dot: "bg-text-3",     chip: "chip chip-idle" },
  in_progress: { label: "In progress", dot: "bg-accent-blue", chip: "chip chip-progress" },
  completed:   { label: "Completed",   dot: "bg-success",     chip: "chip chip-complete" },
  cancelled:   { label: "Cancelled",   dot: "bg-danger",      chip: "chip chip-error" },
};

function statusOf(s) {
  return s?.display_status || s?.status || "upcoming";
}

function formatDate(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function formatTime(t) {
  if (!t) return "";
  const [h, min] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(min).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

/** Monday-first, which is how a working week is read here. */
function mondayFirst(jsDay) {
  return (jsDay + 6) % 7;
}

export function TrainerTrainingCalendar() {
  const today = new Date();
  const [sessions, setSessions] = useState(null);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [view, setView] = useState({
    year: today.getFullYear(),
    month: today.getMonth(),
  });

  useEffect(() => {
    apiClient("/api/trainer/sessions")
      .then((d) => setSessions(d.sessions || []))
      .catch((e) => setError(e.message));
  }, []);

  const dated = useMemo(
    () =>
      (sessions || [])
        .filter((s) => s.date)
        .map((s) => {
          const [y, m, d] = s.date.split("-").map(Number);
          return { ...s, _y: y, _m: m - 1, _d: d };
        }),
    [sessions],
  );

  const { year, month } = view;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leading = mondayFirst(new Date(year, month, 1).getDay());
  const monthSessions = dated.filter((s) => s._y === year && s._m === month);

  const cells = Array.from(
    { length: Math.ceil((leading + daysInMonth) / 7) * 7 },
    (_, i) => {
      const day = i - leading + 1;
      return day >= 1 && day <= daysInMonth ? day : null;
    },
  );

  const isToday = (day) =>
    day === today.getDate() &&
    month === today.getMonth() &&
    year === today.getFullYear();

  const step = (delta) =>
    setView(({ year: y, month: m }) => {
      const next = m + delta;
      if (next < 0) return { year: y - 1, month: 11 };
      if (next > 11) return { year: y + 1, month: 0 };
      return { year: y, month: next };
    });

  if (error) {
    return (
      <Card className="p-6">
        <Text as="p" className="text-[12.5px] text-danger">{error}</Text>
      </Card>
    );
  }

  if (!sessions) {
    return (
      <Box className="space-y-4">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-[30rem] w-full" />
      </Box>
    );
  }

  if (sessions.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center gap-2 border-dashed border-line-strong py-16 text-center">
        <CalendarDays className="size-8 text-text-3" />
        <Text as="p" className="text-[13px] font-semibold text-ink">
          Nothing scheduled
        </Text>
        <Text as="p" className="max-w-sm text-[11.5px] text-text-2">
          No sessions are assigned to you yet. An admin picks you as the
          trainer when they schedule one, and it appears here the moment
          they do.
        </Text>
      </Card>
    );
  }

  /* Counted from the rows already on screen, never a second request. */
  const upcoming = dated.filter((s) => statusOf(s) === "upcoming").length;
  const undated = (sessions || []).filter((s) => !s.date).length;

  return (
    <Box className="space-y-4">
      {/* ── Month bar ── */}
      <Box className="flex flex-wrap items-center justify-between gap-3">
        <Box>
          <Text as="h2" className="text-[17px] font-bold text-ink">
            {MONTHS[month]} {year}
          </Text>
          <Text as="p" className="mt-0.5 text-[11.5px] text-text-2">
            {monthSessions.length === 0
              ? "Nothing this month"
              : `${monthSessions.length} this month`}
            {" · "}
            {sessions.length} assigned to you
            {upcoming > 0 ? ` · ${upcoming} upcoming` : ""}
          </Text>
        </Box>

        <Box className="flex items-center">
          <button
            type="button" onClick={() => step(-1)}
            aria-label="Previous month" title="Previous month"
            className="flex size-8 cursor-pointer items-center justify-center border border-line bg-surface text-text-2 transition-colors hover:bg-accent-blue hover:text-white"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setView({ year: today.getFullYear(), month: today.getMonth() })}
            className="h-8 cursor-pointer border-y border-line bg-surface px-3 text-[11.5px] font-semibold text-text-2 transition-colors hover:bg-accent-blue hover:text-white"
          >
            Today
          </button>
          <button
            type="button" onClick={() => step(1)}
            aria-label="Next month" title="Next month"
            className="flex size-8 cursor-pointer items-center justify-center border border-line bg-surface text-text-2 transition-colors hover:bg-accent-blue hover:text-white"
          >
            <ChevronRight className="size-4" />
          </button>
        </Box>
      </Box>

      {/* ── Grid ── */}
      <Card className="gap-0 overflow-x-auto p-0">
        <Box className="grid min-w-[46rem] grid-cols-7 border-b border-line bg-surface-2">
          {WEEKDAYS.map((d) => (
            <Text
              key={d} as="span"
              className="py-2 text-center font-mono text-[10px] uppercase tracking-wider text-text-3"
            >
              {d}
            </Text>
          ))}
        </Box>

        <Box className="grid min-w-[46rem] grid-cols-7">
          {cells.map((day, i) => {
            const events = day ? monthSessions.filter((s) => s._d === day) : [];
            return (
              <Box
                key={i}
                className={cn(
                  "min-h-[7rem] border-b border-r border-line p-1.5",
                  i % 7 === 6 && "border-r-0",
                  !day && "bg-surface-2/60",
                  day && isToday(day) && "bg-accent-tint",
                )}
              >
                {day && (
                  <>
                    <Text
                      as="span"
                      className={cn(
                        "mb-1 block font-mono text-[10.5px]",
                        isToday(day)
                          ? "font-bold text-accent-blue"
                          : "text-text-3",
                      )}
                    >
                      {day}
                      {isToday(day) && " · Today"}
                    </Text>
                    <Box className="space-y-1">
                      {events.map((ev) => {
                        const cfg = STATUS[statusOf(ev)] || STATUS.upcoming;
                        return (
                          <button
                            key={ev.id}
                            type="button"
                            onClick={() => setSelected(ev)}
                            title={`${ev.title} — ${formatTime(ev.start_time)}`}
                            className="flex w-full cursor-pointer items-center gap-1 border-l-2 border-accent-blue bg-surface-2 px-1.5 py-1 text-left transition-colors hover:bg-accent-tint"
                          >
                            <Box className={cn("size-1.5 shrink-0", cfg.dot)} />
                            <Text as="span" className="truncate text-[10.5px] font-medium text-ink">
                              {ev.title}
                            </Text>
                          </button>
                        );
                      })}
                    </Box>
                  </>
                )}
              </Box>
            );
          })}
        </Box>
      </Card>

      {/* A session with no date cannot be placed on a grid, and silently
          leaving it off is how a trainer misses work. Named, not hidden. */}
      {undated > 0 && (
        <Text as="p" className="text-[11px] text-warning">
          {undated} session{undated === 1 ? " has" : "s have"} no date set and
          cannot be shown on the grid. {undated === 1 ? "It is" : "They are"}{" "}
          listed under My Sessions.
        </Text>
      )}

      {/* ── Legend ── */}
      <Box className="flex flex-wrap items-center gap-3">
        {Object.entries(STATUS).map(([key, cfg]) => (
          <Box key={key} className="flex items-center gap-1.5">
            <Box className={cn("size-2", cfg.dot)} />
            <Text as="span" className="text-[10.5px] text-text-2">{cfg.label}</Text>
          </Box>
        ))}
      </Box>

      {/* ── Day detail ── */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-md">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="text-[15px]">{selected.title}</DialogTitle>
              </DialogHeader>

              <Box className="space-y-3">
                <Box className="flex flex-wrap items-center gap-1.5">
                  <Text as="span" className={cn("text-[11px]", (STATUS[statusOf(selected)] || STATUS.upcoming).chip)}>
                    {(STATUS[statusOf(selected)] || STATUS.upcoming).label}
                  </Text>
                  {selected.course_name && (
                    <Text as="span" className="border border-line bg-surface-2 px-1.5 py-0.5 text-[11px] text-text-2">
                      {selected.course_name}
                    </Text>
                  )}
                </Box>

                <Box className="space-y-1.5 border border-line bg-surface-2 p-3">
                  <Detail icon={CalendarDays} label={formatDate(selected.date)} />
                  <Detail
                    icon={Clock}
                    label={`${formatTime(selected.start_time)} – ${formatTime(selected.end_time)} IST`}
                  />
                  <Detail
                    icon={selected.session_type === "Virtual" ? Video : MapPin}
                    label={selected.venue_url || "No venue recorded"}
                  />
                  <Detail
                    icon={Users}
                    label={`${selected.roster_count ?? 0} of ${selected.capacity} registered`}
                  />
                </Box>

                {/* The one thing the trainer might still owe on this session. */}
                {statusOf(selected) !== "cancelled" &&
                  Number(selected.roster_count) > 0 &&
                  Number(selected.attendance_marked_count ?? 0) === 0 && (
                    <Text as="p" className="text-[11.5px] text-warning">
                      Attendance is not marked. Until it is, nobody on this
                      roster has been credited for the training.
                    </Text>
                  )}

                <Link
                  href={`/trainer/sessions/${selected.id}`}
                  className="inline-flex cursor-pointer items-center gap-1 border border-line bg-surface px-2.5 py-1.5 text-[12px] font-semibold text-accent-blue transition-colors hover:bg-accent-blue hover:text-white"
                >
                  Open session <Arrow className="size-3.5" />
                </Link>
              </Box>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}

function Detail({ icon: Icon, label }) {
  return (
    <Box className="flex items-start gap-2">
      <Icon className="mt-0.5 size-3.5 shrink-0 text-text-3" />
      <Text as="span" className="text-[12px] text-ink">{label}</Text>
    </Box>
  );
}
