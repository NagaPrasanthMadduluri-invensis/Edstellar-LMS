"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, CalendarDays, Clock, Users, MapPin, Video } from "lucide-react";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { cn } from "@/lib/utils";
import { SESSION_TYPE_LABEL, sessionTypeLabel } from "@/lib/session-types";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api-client";

/* ── Session type display config ── */
const SESSION_TYPES = {
  ILT:     { label: SESSION_TYPE_LABEL.ILT,     dot: "bg-navy", chip: "border-l-2 border-navy/20 bg-paper-cream text-navy" },
  Virtual: { label: SESSION_TYPE_LABEL.Virtual, dot: "bg-navy", chip: "border-l-2 border-navy/20 bg-paper-cream text-navy" },
  Webinar: { label: SESSION_TYPE_LABEL.Webinar, dot: "bg-navy", chip: "border-l-2 border-navy/20 bg-paper-cream text-navy" },
};

/* The four session states, in the design system's fill weights. `in_progress`
   is derived from the clock by the API (display_status), not stored. */
const STATUS_CFG = {
  upcoming:    { label: "Upcoming",    cls: "bg-paper-warm text-ink/60 border-border"   },
  in_progress: { label: "In progress", cls: "bg-paper-cream text-ink border-navy/25"    },
  completed:   { label: "Completed",   cls: "bg-navy text-paper border-navy"            },
  cancelled:   { label: "Cancelled",   cls: "bg-error/10 text-error border-error/30"    },
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstWeekday(year, month) {
  return new Date(year, month, 1).getDay();
}

export function AdminCalendarContent() {
  const { user } = useAuth();
  const today = new Date();
  const [viewDate, setViewDate] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [sessions, setSessions] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (!user) return;
    apiClient("/api/admin/sessions")
      .then((d) => {
        const mapped = (d.sessions || []).map((s) => {
          const [y, m, day] = (s.date || "").split("-").map(Number);
          return { ...s, year: y, month: m - 1, day };
        });
        setSessions(mapped);
      })
      .catch(() => setSessions([]));
  }, [user]);

  const { year, month } = viewDate;
  const daysInMonth  = getDaysInMonth(year, month);
  const firstWeekday = getFirstWeekday(year, month);
  const sessionsThisMonth = (sessions || []).filter((s) => s.year === year && s.month === month);

  const prevMonth = () => setViewDate(({ year: y, month: m }) =>
    m === 0 ? { year: y - 1, month: 11 } : { year: y, month: m - 1 }
  );
  const nextMonth = () => setViewDate(({ year: y, month: m }) =>
    m === 11 ? { year: y + 1, month: 0 } : { year: y, month: m + 1 }
  );
  const goToday = () => setViewDate({ year: today.getFullYear(), month: today.getMonth() });

  const isToday = (day) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  const sessionsForDay = (day) => sessionsThisMonth.filter((s) => s.day === day);

  const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
  const cells = Array.from({ length: totalCells }, (_, i) => {
    const day = i - firstWeekday + 1;
    return day >= 1 && day <= daysInMonth ? day : null;
  });

  function formatTime(t) {
    if (!t) return "";
    const [h, min] = t.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    return `${h % 12 || 12}:${String(min).padStart(2, "0")} ${ampm}`;
  }

  if (!sessions) return (
    <Box className="space-y-5">
      <Skeleton className="h-10 w-64 rounded-lg" />
      <Skeleton className="h-[520px] rounded-xl" />
    </Box>
  );

  return (
    <Box className="space-y-5">

      {/* ── Header ── */}
      <Box className="flex items-start justify-between gap-4 flex-wrap">
        <Box>
          <Text as="h1" className="text-2xl font-bold">{MONTH_NAMES[month]} {year}</Text>
          <Text as="p" className="text-sm text-muted-foreground mt-0.5">
            All scheduled training across the organisation · {sessionsThisMonth.length} session{sessionsThisMonth.length !== 1 ? "s" : ""} this month
          </Text>
          {/* Legend */}
          <Box className="flex items-center gap-4 mt-2">
            {Object.entries(SESSION_TYPES).map(([key, cfg]) => (
              <Box key={key} className="flex items-center gap-1.5">
                <Box className={`w-3 h-3 rounded-sm ${cfg.dot}`} />
                <Text as="span" className="text-xs font-medium text-muted-foreground">{cfg.label}</Text>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Navigation */}
        <Box className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-9 px-3 gap-1.5" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />Prev
          </Button>
          <Button variant="outline" size="sm" className="h-9 px-4" onClick={goToday}>Today</Button>
          <Button variant="outline" size="sm" className="h-9 px-3 gap-1.5" onClick={nextMonth}>
            Next<ChevronRight className="h-4 w-4" />
          </Button>
        </Box>
      </Box>

      {/* ── Calendar grid ── */}
      <Card className="overflow-x-auto">
        {/* Weekday headers */}
        <Box className="grid min-w-[44rem] grid-cols-7 border-b bg-muted/30">
          {WEEKDAYS.map((d) => (
            <Box key={d} className="py-3 text-center">
              <Text as="span" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{d}</Text>
            </Box>
          ))}
        </Box>

        {/* Day cells */}
        <Box className="grid min-w-[44rem] grid-cols-7 divide-x divide-y">
          {cells.map((day, idx) => {
            const events = day ? sessionsForDay(day) : [];
            const todayCell = day ? isToday(day) : false;
            return (
              <Box
                key={idx}
                className={cn(
                  "min-h-[110px] p-2 relative",
                  !day && "bg-muted/10",
                  todayCell && "ring-2 ring-navy ring-inset"
                )}
              >
                {day && (
                  <>
                    <Text
                      as="span"
                      className={cn(
                        "text-sm font-medium block mb-1",
                        todayCell ? "text-navy font-bold" : "text-muted-foreground"
                      )}
                    >
                      {day}{todayCell && <Text as="span" className="ml-1 text-xs text-navy font-semibold">• Today</Text>}
                    </Text>
                    <Box className="space-y-1">
                      {events.map((ev) => {
                        const cfg = SESSION_TYPES[ev.session_type] || SESSION_TYPES.ILT;
                        return (
                          <Box
                            key={ev.id}
                            className={cn("rounded px-2 py-1 text-[11px] font-medium cursor-pointer hover:opacity-80 transition-opacity truncate", cfg.chip)}
                            onClick={() => setSelected(ev)}
                          >
                            {ev.title}
                          </Box>
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

      {/* ── Session detail dialog ── */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        {selected && (
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="leading-snug">{selected.title}</DialogTitle>
            </DialogHeader>
            <Box className="space-y-3 pt-1">
              <Box className="flex items-center gap-2">
                <Badge className={cn("text-xs w-fit border-0", (SESSION_TYPES[selected.session_type] || SESSION_TYPES.ILT).chip)}>
                  {sessionTypeLabel(selected.session_type)}
                </Badge>
                {/* Reads the derived status, so a session already under way no
                    longer shows as merely scheduled. The three shades this
                    replaced were also nearly identical to each other. */}
                <Badge className={cn("text-xs border",
                  (STATUS_CFG[selected.display_status || selected.status] || STATUS_CFG.upcoming).cls)}>
                  {(STATUS_CFG[selected.display_status || selected.status] || STATUS_CFG.upcoming).label}
                </Badge>
              </Box>
              {[
                { icon: CalendarDays, label: `${MONTH_NAMES[selected.month]} ${selected.day}, ${selected.year}` },
                { icon: Clock,        label: `${formatTime(selected.start_time)} – ${formatTime(selected.end_time)}` },
                { icon: Users,        label: `${selected.roster_count ?? 0} / ${selected.capacity} enrolled · ${selected.trainer}` },
                { icon: selected.session_type === "Virtual" ? Video : MapPin, label: selected.venue_url },
              ].map(({ icon: Icon, label }) => (
                <Box key={label} className="flex items-start gap-2.5">
                  <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <Text as="span" className="text-sm break-all">{label}</Text>
                </Box>
              ))}
              {selected.description && (
                <Text as="p" className="text-sm text-muted-foreground leading-relaxed border-t pt-3">{selected.description}</Text>
              )}
            </Box>
          </DialogContent>
        )}
      </Dialog>
    </Box>
  );
}
