"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Layers, TrendingUp, CheckCircle2, Award, AlertTriangle, Calendar,
  Play, Clock, Flag, CalendarDays, ChevronRight, BookOpen,
  Map, RotateCcw,
} from "lucide-react";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

/* ── Status config ── */
const STATUS_CFG = {
  assigned:    { border: "border-l-gray-300",    playBg: "bg-gray-100",    playColor: "text-gray-400",    label: "Assigned",    labelCls: "bg-gray-100 text-gray-600 border-gray-200"    },
  "in-progress":{ border: "border-l-blue-500",   playBg: "bg-blue-50",     playColor: "text-blue-500",    label: "In Progress", labelCls: "bg-blue-50 text-blue-700 border-blue-200"     },
  completed:   { border: "border-l-emerald-500", playBg: "bg-emerald-50",  playColor: "text-emerald-500", label: "Completed",   labelCls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  failed:      { border: "border-l-red-500",     playBg: "bg-red-50",      playColor: "text-red-500",     label: "Failed",      labelCls: "bg-red-50 text-red-600 border-red-200"        },
};

const TYPE_CFG = {
  VIDEO: { label: "VIDEO", cls: "bg-blue-100 text-blue-700 border-0",  icon: <Play className="h-2.5 w-2.5 fill-current" /> },
  SCORM: { label: "SCORM", cls: "bg-green-100 text-green-700 border-0", icon: null },
  Doc:   { label: "DOC",   cls: "bg-gray-100 text-gray-600 border-0",  icon: null },
};

/* ── Action button per status ── */
function ActionButton({ status, courseId }) {
  const cfg = {
    assigned:     { label: "Start →",    cls: "bg-blue-600 hover:bg-blue-700 text-white"                },
    "in-progress":{ label: "Continue →", cls: "bg-blue-600 hover:bg-blue-700 text-white"                },
    completed:    { label: "Review →",   cls: "border border-emerald-500 text-emerald-600 hover:bg-emerald-50 bg-white" },
    failed:       { label: "Retake →",   cls: "bg-red-500 hover:bg-red-600 text-white"                  },
  };
  const c = cfg[status] || cfg.assigned;
  return (
    <Link href={`/my-courses/${courseId}`}>
      <Button size="sm" className={cn("h-8 px-4 text-xs font-semibold shrink-0", c.cls)}>{c.label}</Button>
    </Link>
  );
}

/* ── Single course row ── */
function CourseRow({ c }) {
  const st = STATUS_CFG[c.status] || STATUS_CFG.assigned;
  const tc = TYPE_CFG[c.contentType] || TYPE_CFG.VIDEO;
  const durationLabel = c.totalMinutes > 0 ? (c.totalMinutes >= 60 ? `${Math.floor(c.totalMinutes / 60)}h ${c.totalMinutes % 60}m` : `${c.totalMinutes}m`) : null;

  return (
    <Card className={cn("flex items-stretch border-l-4 overflow-hidden", st.border)}>
      {/* play icon */}
      <Box className={cn("flex items-center justify-center w-14 shrink-0", st.playBg)}>
        <Play className={cn("h-5 w-5 fill-current", st.playColor)} />
      </Box>

      {/* content */}
      <Box className="flex-1 px-4 py-3 min-w-0">
        <Box className="flex items-start justify-between gap-3">
          <Box className="min-w-0">
            {/* title */}
            <Text as="h3" className="text-sm font-bold leading-snug mb-1.5">{c.course.name}</Text>

            {/* badges row */}
            <Box className="flex items-center gap-1.5 flex-wrap mb-2">
              <Badge className={cn("text-[10px] font-bold px-1.5 py-0 flex items-center gap-1", tc.cls)}>
                {tc.icon}{tc.label}
              </Badge>
              {c.category && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-gray-500 border-gray-200">{c.category}</Badge>
              )}
              {c.status !== "assigned" && c.status !== "in-progress" && (
                <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", st.labelCls)}>{st.label}</Badge>
              )}
              {c.isMandatory && (
                <Badge className="text-[10px] px-1.5 py-0 bg-red-100 text-red-700 border-0 flex items-center gap-1">
                  <Box className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                  MANDATORY
                </Badge>
              )}
            </Box>

            {/* meta row */}
            <Box className="flex items-center gap-3 flex-wrap text-[11px] text-muted-foreground">
              {durationLabel && (
                <Box className="flex items-center gap-1">
                  <Clock className="h-3 w-3 shrink-0" />
                  <Text as="span">{durationLabel}</Text>
                </Box>
              )}
              {c.dueFmt && (
                <Box className="flex items-center gap-1">
                  <Flag className="h-3 w-3 shrink-0 text-red-400" />
                  <Text as="span">Due: {c.dueFmt}</Text>
                </Box>
              )}
              {c.assignedFmt && (
                <Box className="flex items-center gap-1">
                  <CalendarDays className="h-3 w-3 shrink-0" />
                  <Text as="span">Assigned: {c.assignedFmt}</Text>
                </Box>
              )}
              {c.bestScore !== null && (
                <Box className="flex items-center gap-1">
                  {c.hasFailed
                    ? <Text as="span" className="text-red-600 font-semibold">✗ Score: {c.bestScore}% — Failed (need {c.passingScore}%)</Text>
                    : <Text as="span" className="text-emerald-600 font-semibold">✓ Score: {c.bestScore}%</Text>
                  }
                </Box>
              )}
            </Box>

            {/* description */}
            {c.course.description && (
              <Text as="p" className="text-xs text-muted-foreground mt-1.5 line-clamp-1">
                {c.course.description}
              </Text>
            )}
          </Box>

          {/* action button */}
          <Box className="shrink-0 pt-0.5">
            <ActionButton status={c.status} courseId={c.course.id} />
          </Box>
        </Box>

        {/* progress bar (only for in-progress) */}
        {c.status === "in-progress" && (
          <Box className="mt-2.5 flex items-center gap-2">
            <Box className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <Box className="h-full bg-blue-500 rounded-full" style={{ width: `${c.progressPct}%` }} />
            </Box>
            <Text as="span" className="text-[11px] font-semibold text-blue-600 shrink-0">{c.progressPct}%</Text>
          </Box>
        )}
      </Box>
    </Card>
  );
}

/* ── Journey view ── */
function JourneyView({ courses }) {
  const total     = courses.length;
  const completed = courses.filter((c) => c.status === "completed").length;
  const pct       = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <Box className="space-y-3">
      <Box className="flex items-center gap-3 mb-4">
        <Box className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <Box className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500" style={{ width: `${pct}%` }} />
        </Box>
        <Text as="span" className="text-sm font-bold shrink-0">{pct}% complete</Text>
      </Box>
      {courses.map((c, i) => {
        const isCurrent = c.status === "in-progress";
        const isDone    = c.status === "completed";
        return (
          <Link key={c.enrollmentId} href={`/my-courses/${c.course.id}`}>
            <Box className={cn("flex items-center gap-4 p-4 rounded-xl border transition-colors hover:bg-muted/20", isCurrent && "border-blue-300 bg-blue-50/40", isDone && "border-emerald-200 bg-emerald-50/30", !isCurrent && !isDone && "opacity-60")}>
              <Box className={cn("w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-bold text-sm", isDone ? "bg-emerald-500 text-white" : isCurrent ? "bg-blue-500 text-white" : "bg-muted text-muted-foreground")}>
                {isDone ? <CheckCircle2 className="h-5 w-5" /> : i + 1}
              </Box>
              <Box className="flex-1 min-w-0">
                <Text as="p" className="text-sm font-semibold truncate">{c.course.name}</Text>
                <Text as="p" className="text-xs text-muted-foreground">{c.category} · {c.progressPct}% complete</Text>
              </Box>
              {isCurrent && <Badge className="bg-blue-500 text-white border-0 text-[10px]">Current</Badge>}
              {isDone    && <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px]">Done</Badge>}
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </Box>
          </Link>
        );
      })}
    </Box>
  );
}

/* ── Skeleton ── */
function Skeleton_() {
  return (
    <Box className="space-y-4">
      <Box className="flex gap-2"><Skeleton className="h-10 w-28 rounded-xl" /><Skeleton className="h-10 w-36 rounded-xl" /></Box>
      <Box className="grid grid-cols-3 lg:grid-cols-6 gap-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</Box>
      <Skeleton className="h-10 rounded-lg" />
      {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
    </Box>
  );
}

/* ── Status filter tabs ── */
const STATUS_TABS = [
  { key: "all",         label: "All"         },
  { key: "assigned",    label: "Assigned"    },
  { key: "in-progress", label: "In Progress" },
  { key: "completed",   label: "Completed"   },
  { key: "failed",      label: "Failed"      },
];
const TYPE_TABS = [
  { key: "all",   label: "All Types" },
  { key: "VIDEO", label: "Video",    icon: <Play className="h-2.5 w-2.5 fill-current" /> },
  { key: "SCORM", label: "SCORM"     },
  { key: "Doc",   label: "Doc"       },
];

/* ── Main component ── */
export function MyCoursesContent() {
  const { user, token } = useAuth();
  const [data, setData]       = useState(null);
  const [error, setError]     = useState(null);
  const [view, setView]       = useState("courses");   // courses | journey
  const [statusFilter, setStatus] = useState("all");
  const [typeFilter, setType]     = useState("all");

  useEffect(() => {
    if (!token || !user) return;
    fetch("/api/learner/courses", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { if (d.message) throw new Error(d.message); setData(d); })
      .catch((e) => setError(e.message));
  }, [token, user]);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.courses.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (typeFilter   !== "all" && c.contentType !== typeFilter)   return false;
      return true;
    });
  }, [data, statusFilter, typeFilter]);

  if (error) return (
    <Card className="p-8 text-center">
      <Text as="p" className="text-red-500 text-sm">{error}</Text>
      <Button size="sm" variant="outline" className="mt-3" onClick={() => window.location.reload()}>Retry</Button>
    </Card>
  );
  if (!data) return <Skeleton_ />;

  const { overview, journeyPct, courses } = data;
  const ov = overview;

  /* tab counts */
  const counts = { all: courses.length, assigned: ov.assigned, "in-progress": ov.inProgress, completed: ov.completed, failed: ov.failed };

  /* overview cards */
  const overviewCards = [
    { icon: Layers,       iconBg: "bg-blue-100",   iconColor: "text-blue-600",    circleBg: "bg-blue-50",    value: ov.totalAssigned, label: "Total Assigned",   sub: `${ov.assigned} yet to start`              },
    { icon: TrendingUp,   iconBg: "bg-amber-100",  iconColor: "text-amber-600",   circleBg: "bg-amber-50",   value: ov.inProgress,    label: "In Progress",      sub: "Currently active"                          },
    { icon: CheckCircle2, iconBg: "bg-emerald-100",iconColor: "text-emerald-600", circleBg: "bg-emerald-50", value: ov.completed,     label: "Completed",        sub: `${ov.totalAssigned > 0 ? Math.round(ov.completed / ov.totalAssigned * 100) : 0}% completion rate` },
    { icon: Award,        iconBg: "bg-orange-100", iconColor: "text-orange-500",  circleBg: "bg-orange-50",  value: ov.avgScore !== null ? `${ov.avgScore}%` : "—", label: "Avg Score", sub: "Across assessments" },
    { icon: AlertTriangle,iconBg: "bg-red-100",    iconColor: "text-red-500",     circleBg: "bg-red-50",     value: ov.failed,        label: "Failed",           sub: "Need retake"                               },
    { icon: Calendar,     iconBg: "bg-pink-100",   iconColor: "text-pink-500",    circleBg: "bg-pink-50",    value: ov.nextDeadline?.short || "—", label: "Next Deadline", sub: ov.nextDeadline ? ov.nextDeadline.courseName : "No upcoming deadlines" },
  ];

  return (
    <Box className="space-y-4">

      {/* ── Tab bar ── */}
      <Box className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setView("courses")}
          className={cn("flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors", view === "courses" ? "bg-blue-600 text-white shadow-sm" : "bg-white border text-muted-foreground hover:bg-muted")}
        >
          <BookOpen className="h-4 w-4" /> Courses
        </button>
        <button
          type="button"
          onClick={() => setView("journey")}
          className={cn("flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors", view === "journey" ? "bg-blue-600 text-white shadow-sm" : "bg-white border text-muted-foreground hover:bg-muted")}
        >
          <Map className="h-4 w-4" /> Learning Journey {journeyPct}%
        </button>
      </Box>

      {view === "journey" ? (
        <JourneyView courses={courses} />
      ) : (
        <>
          {/* ── Your Learning Overview ── */}
          <Box>
            <Text as="p" className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground mb-3">
              Your Learning Overview
            </Text>
            <Box className="grid grid-cols-3 lg:grid-cols-6 gap-3">
              {overviewCards.map((c) => (
                <Card key={c.label} className="relative overflow-hidden p-4">
                  <Box className={cn("w-9 h-9 rounded-lg flex items-center justify-center mb-2", c.iconBg)}>
                    <c.icon className={cn("h-4 w-4", c.iconColor)} />
                  </Box>
                  <Text as="h2" className="text-xl font-extrabold leading-none">{c.value}</Text>
                  <Text as="p" className="text-xs text-muted-foreground mt-0.5">{c.label}</Text>
                  <Text as="p" className="text-[10px] text-muted-foreground/70 mt-0.5 leading-tight line-clamp-1">{c.sub}</Text>
                  <Box className={cn("absolute -right-4 -top-4 w-16 h-16 rounded-full opacity-40", c.circleBg)} />
                </Card>
              ))}
            </Box>
          </Box>

          {/* ── Filter bar ── */}
          <Box className="flex items-center gap-2 flex-wrap justify-between">
            <Box className="flex items-center gap-1.5 flex-wrap">
              {/* status pills */}
              {STATUS_TABS.filter((t) => t.key === "all" || counts[t.key] > 0).map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setStatus(t.key)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-semibold transition-colors",
                    statusFilter === t.key
                      ? "bg-blue-600 text-white"
                      : "bg-white border text-muted-foreground hover:bg-muted"
                  )}
                >
                  {t.label}{counts[t.key] !== undefined ? ` (${counts[t.key]})` : ""}
                </button>
              ))}

              <Box className="w-px h-5 bg-border mx-1" />

              {/* type pills */}
              {TYPE_TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setType(t.key)}
                  className={cn(
                    "flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border",
                    typeFilter === t.key
                      ? "bg-blue-50 border-blue-500 text-blue-700"
                      : "bg-white border-gray-200 text-muted-foreground hover:bg-muted"
                  )}
                >
                  {t.icon}{t.label}
                </button>
              ))}
            </Box>

            <Text as="p" className="text-xs text-muted-foreground shrink-0">
              {filtered.length} course{filtered.length !== 1 ? "s" : ""} shown
            </Text>
          </Box>

          {/* ── Course list ── */}
          {filtered.length === 0 ? (
            <Card className="p-10 text-center">
              <BookOpen className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
              <Text as="p" className="text-sm text-muted-foreground">No courses match this filter.</Text>
            </Card>
          ) : (
            <Box className="space-y-3">
              {filtered.map((c) => <CourseRow key={c.enrollmentId} c={c} />)}
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
