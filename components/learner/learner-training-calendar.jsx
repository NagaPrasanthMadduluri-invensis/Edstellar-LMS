"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  ChevronLeft, ChevronRight, CalendarDays, Clock,
  MapPin, Video, UserCircle, BookOpen,
} from "lucide-react";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { cn } from "@/lib/utils";
import { SESSION_TYPE_LABEL } from "@/lib/session-types";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api-client";

const SESSION_TYPES = {
  ILT:     { label: SESSION_TYPE_LABEL.ILT,     dot: "bg-navy", chip: "border-l-2 border-navy/20 bg-paper-cream text-navy" },
  Virtual: { label: SESSION_TYPE_LABEL.Virtual, dot: "bg-navy", chip: "border-l-2 border-navy/20 bg-paper-cream text-navy" },
  Webinar: { label: SESSION_TYPE_LABEL.Webinar, dot: "bg-navy", chip: "border-l-2 border-navy/20 bg-paper-cream text-navy" },
};

/* `in_progress` is derived from the scheduled start time by the API
   (display_status), so a session already under way stops reading "Upcoming"
   without anything having to run on a timer. */
const STATUS_CFG = {
  upcoming:    { label: "Upcoming",    cls: "bg-paper-warm text-ink/60 border-border"  },
  in_progress: { label: "In progress", cls: "bg-paper-cream text-ink border-navy/25"   },
  completed:   { label: "Completed",   cls: "bg-navy text-paper border-navy"           },
  cancelled:   { label: "Cancelled",   cls: "bg-error/10 text-error border-error/30"   },
};

/** The status to show. Falls back to the stored one if the API is older. */
function displayOf(session) {
  return session?.display_status || session?.status || "upcoming";
}

const ATTENDANCE_CFG = {
  present:  { label: "Present",  cls: "bg-navy text-paper border-navy" },
  absent:   { label: "Absent",   cls: "bg-error/10 text-error border-error/30"         },
  late:     { label: "Late",     cls: "bg-paper-cream text-ink border-navy/25"       },
  partial:  { label: "Partial",  cls: "bg-paper-cream text-ink border-navy/25"   },
  excused:  { label: "Excused",  cls: "bg-paper-warm text-ink/60 border-border"   },
};

const WEEKDAYS   = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function getDaysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }
function getFirstWeekday(year, month) { return new Date(year, month, 1).getDay(); }

function formatTime(t) {
  if (!t) return "";
  const [h, min] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(min).padStart(2, "0")} ${ampm}`;
}

function formatDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function LearnerTrainingCalendar() {
  const { user } = useAuth();
  const today = new Date();

  const [viewDate, setViewDate] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [sessions, setSessions]   = useState(null);
  const [selected, setSelected]   = useState(null);
  const [view,     setView]       = useState("calendar"); // "calendar" | "list"

  useEffect(() => {
    if (!user) return;
    apiClient("/api/learner/sessions")
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
  const daysInMonth   = getDaysInMonth(year, month);
  const firstWeekday  = getFirstWeekday(year, month);
  const thisMonth     = (sessions || []).filter((s) => s.year === year && s.month === month);
  const upcoming      = (sessions || []).filter((s) => displayOf(s) === "upcoming");

  const prevMonth = () => setViewDate(({ year: y, month: m }) =>
    m === 0 ? { year: y - 1, month: 11 } : { year: y, month: m - 1 }
  );
  const nextMonth = () => setViewDate(({ year: y, month: m }) =>
    m === 11 ? { year: y + 1, month: 0 } : { year: y, month: m + 1 }
  );
  const goToday = () => setViewDate({ year: today.getFullYear(), month: today.getMonth() });

  const isToday = (day) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  const sessionsForDay = (day) => thisMonth.filter((s) => s.day === day);

  const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
  const cells = Array.from({ length: totalCells }, (_, i) => {
    const day = i - firstWeekday + 1;
    return day >= 1 && day <= daysInMonth ? day : null;
  });

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
            {sessions.length === 0
              ? "You haven't been enrolled in any sessions yet."
              : `${sessions.length} session${sessions.length !== 1 ? "s" : ""} enrolled · ${upcoming.length} upcoming`}
          </Text>
          <Box className="flex items-center gap-4 mt-2">
            {Object.entries(SESSION_TYPES).map(([key, cfg]) => (
              <Box key={key} className="flex items-center gap-1.5">
                <Box className={`w-3 h-3 rounded-sm ${cfg.dot}`} />
                <Text as="span" className="text-xs font-medium text-muted-foreground">{cfg.label}</Text>
              </Box>
            ))}
          </Box>
        </Box>

        <Box className="flex flex-wrap items-center gap-2">
          {/* Calendar / List toggle */}
          <Box className="flex rounded-lg border overflow-hidden">
            <Button
              variant="ghost" size="sm"
              className={cn("h-9 px-3 rounded-none text-xs", view === "calendar" ? "bg-muted font-semibold" : "")}
              onClick={() => setView("calendar")}
            >
              Calendar
            </Button>
            <Button
              variant="ghost" size="sm"
              className={cn("h-9 px-3 rounded-none text-xs border-l", view === "list" ? "bg-muted font-semibold" : "")}
              onClick={() => setView("list")}
            >
              List
            </Button>
          </Box>

          {view === "calendar" && (
            <Box className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-9 px-3 gap-1" onClick={prevMonth}>
                <ChevronLeft className="h-4 w-4" />Prev
              </Button>
              <Button variant="outline" size="sm" className="h-9 px-4" onClick={goToday}>Today</Button>
              <Button variant="outline" size="sm" className="h-9 px-3 gap-1" onClick={nextMonth}>
                Next<ChevronRight className="h-4 w-4" />
              </Button>
            </Box>
          )}
        </Box>
      </Box>

      {sessions.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-20 gap-3">
          <CalendarDays className="h-10 w-10 text-muted-foreground/25" />
          <Text as="p" className="text-sm text-muted-foreground">No sessions enrolled yet. Your admin will assign you to sessions.</Text>
        </Card>
      ) : view === "calendar" ? (

        /* ── Calendar grid ── */
        <Card className="overflow-x-auto">
          <Box className="grid min-w-[44rem] grid-cols-7 border-b bg-muted/30">
            {WEEKDAYS.map((d) => (
              <Box key={d} className="py-3 text-center">
                <Text as="span" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{d}</Text>
              </Box>
            ))}
          </Box>

          <Box className="grid min-w-[44rem] grid-cols-7 divide-x divide-y">
            {cells.map((day, idx) => {
              const events    = day ? sessionsForDay(day) : [];
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
                        {day}
                        {todayCell && <Text as="span" className="ml-1 text-xs text-navy font-semibold">· Today</Text>}
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

      ) : (

        /* ── List view ── */
        <Box className="space-y-3">
          {sessions.map((s) => {
            const typeCfg   = SESSION_TYPES[s.session_type] || SESSION_TYPES.ILT;
            const statusCfg = STATUS_CFG[displayOf(s)] || STATUS_CFG.upcoming;
            const attCfg    = s.attendance_status ? ATTENDANCE_CFG[s.attendance_status] : null;
            return (
              <Card
                key={s.id}
                className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelected(s)}
              >
                <Box className="flex items-start justify-between gap-4 flex-wrap">
                  <Box className="flex-1 min-w-0 space-y-1.5">
                    <Box className="flex items-center gap-2 flex-wrap">
                      <Badge className={`text-[11px] font-medium border-0 ${typeCfg.chip.replace("border-l-2 ", "")}`}>
                        {typeCfg.label}
                      </Badge>
                      <Badge className={`text-[11px] font-medium ${statusCfg.cls}`}>{statusCfg.label}</Badge>
                      {attCfg && <Badge className={`text-[11px] font-medium ${attCfg.cls}`}>{attCfg.label}</Badge>}
                    </Box>
                    <Text as="h3" className="text-[15px] font-bold leading-snug">{s.title}</Text>
                    <Box className="flex items-center gap-4 flex-wrap text-xs text-muted-foreground">
                      <Box className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{formatDate(s.date)}</Box>
                      <Box className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{formatTime(s.start_time)} – {formatTime(s.end_time)}</Box>
                      <Box className="flex items-center gap-1"><UserCircle className="h-3.5 w-3.5" />{s.trainer}</Box>
                    </Box>
                    {s.course_name && (
                      <Box className="flex items-center gap-1 text-xs text-navy">
                        <BookOpen className="h-3.5 w-3.5" />{s.course_name}
                      </Box>
                    )}
                  </Box>
                  <Box className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                    {s.session_type === "Virtual"
                      ? <Video className="h-3.5 w-3.5 text-navy" />
                      : <MapPin className="h-3.5 w-3.5 text-navy" />
                    }
                    <Text as="span" className="max-w-[160px] truncate">{s.venue_url}</Text>
                  </Box>
                </Box>
              </Card>
            );
          })}
        </Box>
      )}

      {/* ── Session detail dialog ── */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        {selected && (() => {
          const typeCfg   = SESSION_TYPES[selected.session_type] || SESSION_TYPES.ILT;
          const statusCfg = STATUS_CFG[displayOf(selected)] || STATUS_CFG.upcoming;
          const attCfg    = selected.attendance_status ? ATTENDANCE_CFG[selected.attendance_status] : null;
          return (
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle className="leading-snug pr-6">{selected.title}</DialogTitle>
              </DialogHeader>
              <Box className="space-y-3 pt-1">
                <Box className="flex items-center gap-2 flex-wrap">
                  <Badge className={`text-xs border-0 ${typeCfg.chip.replace("border-l-2 ", "")}`}>{typeCfg.label}</Badge>
                  <Badge className={`text-xs ${statusCfg.cls}`}>{statusCfg.label}</Badge>
                  {attCfg && <Badge className={`text-xs ${attCfg.cls}`}>Your attendance: {attCfg.label}</Badge>}
                </Box>

                {[
                  { icon: CalendarDays, label: formatDate(selected.date) },
                  { icon: Clock,        label: `${formatTime(selected.start_time)} – ${formatTime(selected.end_time)}` },
                  { icon: UserCircle,   label: `Trainer: ${selected.trainer}` },
                  { icon: selected.session_type === "Virtual" ? Video : MapPin, label: selected.venue_url },
                ].map(({ icon: Icon, label }) => (
                  <Box key={label} className="flex items-start gap-2.5">
                    <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <Text as="span" className="text-sm break-all">{label}</Text>
                  </Box>
                ))}

                {selected.course_name && (
                  <Box className="flex items-start gap-2.5">
                    <BookOpen className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <Text as="span" className="text-sm">{selected.course_name}</Text>
                  </Box>
                )}

                {selected.description && (
                  <Text as="p" className="text-sm text-muted-foreground leading-relaxed border-t pt-3">
                    {selected.description}
                  </Text>
                )}

                {/* Being on the roster IS being assigned the training, so the
                    calendar entry leads to the same card My Courses shows. */}
                {selected.training_course_id && (
                  <Link href={`/my-courses/${selected.training_course_id}`} className="block pt-1">
                    <Button size="sm" className="w-full bg-navy hover:bg-navy-soft text-paper">
                      Open training
                    </Button>
                  </Link>
                )}
              </Box>
            </DialogContent>
          );
        })()}
      </Dialog>

    </Box>
  );
}
