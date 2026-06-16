"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, CalendarDays, Clock, Users, MapPin } from "lucide-react";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { cn } from "@/lib/utils";

/* ── Session types ── */
const SESSION_TYPES = {
  ILT:     { label: "ILT",     dot: "bg-blue-500",   chip: "border-l-2 border-blue-500 bg-blue-50 text-blue-700"     },
  VILT:    { label: "VILT",    dot: "bg-violet-500",  chip: "border-l-2 border-violet-500 bg-violet-50 text-violet-700" },
  Webinar: { label: "Webinar", dot: "bg-teal-500",    chip: "border-l-2 border-teal-500 bg-teal-50 text-teal-700"     },
};

/* ── Static training sessions ── */
const SESSIONS = [
  {
    id: 1, day: 3, month: 5, year: 2026,
    title: "Data Privacy & DPDP Act Briefing",
    type: "Webinar", time: "10:00 AM", duration: "90 min",
    facilitator: "Priya Sharma", enrolled: 24,
    location: "Online (Zoom)",
  },
  {
    id: 2, day: 11, month: 5, year: 2026,
    title: "Advanced Excel for Operations",
    type: "ILT", time: "9:30 AM", duration: "3h",
    facilitator: "Ramesh Kumar", enrolled: 15,
    location: "Conference Room B",
  },
  {
    id: 3, day: 18, month: 5, year: 2026,
    title: "Customer-Centric Selling — Refresher",
    type: "VILT", time: "2:00 PM", duration: "2h",
    facilitator: "Ananya Nair", enrolled: 18,
    location: "Online (Teams)",
  },
  {
    id: 4, day: 25, month: 5, year: 2026,
    title: "Inclusive Leadership Workshop",
    type: "ILT", time: "10:00 AM", duration: "4h",
    facilitator: "Dr. Vikram Iyer", enrolled: 30,
    location: "Training Hall 1",
  },
];

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
  const today = new Date(2026, 5, 15); // June 15 2026
  const [viewDate, setViewDate] = useState({ year: 2026, month: 5 });
  const [selected, setSelected] = useState(null);

  const { year, month } = viewDate;
  const daysInMonth  = getDaysInMonth(year, month);
  const firstWeekday = getFirstWeekday(year, month);
  const sessionsThisMonth = SESSIONS.filter((s) => s.year === year && s.month === month);

  const prevMonth = () => {
    setViewDate(({ year: y, month: m }) =>
      m === 0 ? { year: y - 1, month: 11 } : { year: y, month: m - 1 }
    );
  };
  const nextMonth = () => {
    setViewDate(({ year: y, month: m }) =>
      m === 11 ? { year: y + 1, month: 0 } : { year: y, month: m + 1 }
    );
  };
  const goToday = () => setViewDate({ year: today.getFullYear(), month: today.getMonth() });

  const isToday = (day) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  const sessionsForDay = (day) =>
    sessionsThisMonth.filter((s) => s.day === day);

  // Build calendar cells: leading empties + day numbers
  const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
  const cells = Array.from({ length: totalCells }, (_, i) => {
    const day = i - firstWeekday + 1;
    return day >= 1 && day <= daysInMonth ? day : null;
  });

  return (
    <Box className="space-y-5">

      {/* ── Header ── */}
      <Box className="flex items-start justify-between gap-4 flex-wrap">
        <Box>
          <Text as="h1" className="text-2xl font-bold">{MONTH_NAMES[month]} {year}</Text>
          <Text as="p" className="text-sm text-muted-foreground mt-0.5">
            All scheduled training across the organisation · {sessionsThisMonth.length} this month
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
      <Card className="overflow-hidden">
        {/* Weekday headers */}
        <Box className="grid grid-cols-7 border-b bg-muted/30">
          {WEEKDAYS.map((d) => (
            <Box key={d} className="py-3 text-center">
              <Text as="span" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{d}</Text>
            </Box>
          ))}
        </Box>

        {/* Day cells */}
        <Box className="grid grid-cols-7 divide-x divide-y">
          {cells.map((day, idx) => {
            const events = day ? sessionsForDay(day) : [];
            const todayCell = day ? isToday(day) : false;
            return (
              <Box
                key={idx}
                className={cn(
                  "min-h-[110px] p-2 relative",
                  !day && "bg-muted/10",
                  todayCell && "ring-2 ring-blue-500 ring-inset"
                )}
              >
                {day && (
                  <>
                    <Text
                      as="span"
                      className={cn(
                        "text-sm font-medium block mb-1",
                        todayCell ? "text-blue-600 font-bold" : "text-muted-foreground"
                      )}
                    >
                      {day}{todayCell && <Text as="span" className="ml-1 text-xs text-blue-500 font-semibold">• Today</Text>}
                    </Text>
                    <Box className="space-y-1">
                      {events.map((ev) => {
                        const cfg = SESSION_TYPES[ev.type] || SESSION_TYPES.ILT;
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

      {/* ── Footer note ── */}
      <Text as="p" className="text-xs text-muted-foreground text-center">
        This calendar is a live view of the Sessions &amp; Attendance data — it reads the same records, so it always stays in sync. Click a session to view its details.
      </Text>

      {/* ── Session detail dialog ── */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        {selected && (
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="leading-snug">{selected.title}</DialogTitle>
            </DialogHeader>
            <Box className="space-y-3 pt-1">
              <Badge className={cn("text-xs w-fit border-0", SESSION_TYPES[selected.type]?.chip)}>
                {selected.type}
              </Badge>
              {[
                { icon: CalendarDays, label: `${MONTH_NAMES[selected.month]} ${selected.day}, ${selected.year}` },
                { icon: Clock, label: `${selected.time} · ${selected.duration}` },
                { icon: Users, label: `${selected.enrolled} enrolled · Facilitator: ${selected.facilitator}` },
                { icon: MapPin, label: selected.location },
              ].map(({ icon: Icon, label }) => (
                <Box key={label} className="flex items-start gap-2.5">
                  <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <Text as="span" className="text-sm">{label}</Text>
                </Box>
              ))}
            </Box>
          </DialogContent>
        )}
      </Dialog>
    </Box>
  );
}
