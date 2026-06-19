"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Layers, TrendingUp, CheckCircle2, Award, AlertTriangle, Calendar,
  Clock, Flag, BookOpen, Map, ArrowRight, CalendarDays,
  Play, GraduationCap, Users, Brain, RefreshCcw, Shield,
  BarChart3, Target, ChevronRight, Search, X,
} from "lucide-react";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

/* ── Light thumbnail palettes (hash-based) ── */
const GRADIENTS = [
  { from: "#EEF2FF", to: "#E0E7FF", iconColor: "#4F46E5" },  // indigo
  { from: "#ECFDF5", to: "#D1FAE5", iconColor: "#059669" },  // emerald
  { from: "#FFF7ED", to: "#FFEDD5", iconColor: "#EA580C" },  // orange
  { from: "#FDF4FF", to: "#F3E8FF", iconColor: "#9333EA" },  // purple
  { from: "#EFF6FF", to: "#DBEAFE", iconColor: "#2563EB" },  // blue
  { from: "#F0FDF4", to: "#DCFCE7", iconColor: "#16A34A" },  // green
  { from: "#FFF1F2", to: "#FFE4E6", iconColor: "#E11D48" },  // rose
  { from: "#FFFBEB", to: "#FEF3C7", iconColor: "#D97706" },  // amber
];

function getThumbnailGradient(name) {
  let h = 0;
  for (const c of (name || "A")) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return GRADIENTS[h % GRADIENTS.length];
}

function getCategoryIcon(category) {
  if (!category) return GraduationCap;
  const c = category.toLowerCase();
  if (c.includes("project") || c.includes("mgmt")) return Layers;
  if (c.includes("agile") || c.includes("scrum")) return RefreshCcw;
  if (c.includes("ai") || c.includes("finance") || c.includes("banking")) return Brain;
  if (c.includes("leadership")) return Users;
  if (c.includes("communication")) return Target;
  if (c.includes("security") || c.includes("compliance")) return Shield;
  if (c.includes("analytics") || c.includes("data")) return BarChart3;
  return BookOpen;
}

/* ── Status config ── */
const STATUS_CFG = {
  assigned: {
    label: "Not Started",
    badgeCls: "bg-gray-100 text-gray-600 border border-gray-200",
    barCls: "bg-gray-300",
    pctCls: "text-gray-500",
    btnCls: "bg-gray-800 hover:bg-gray-900 text-white",
    btnLabel: "Start Learning",
  },
  "in-progress": {
    label: "In Progress",
    badgeCls: "bg-blue-50 text-blue-700 border border-blue-200",
    barCls: "bg-blue-500",
    pctCls: "text-blue-600",
    btnCls: "bg-blue-600 hover:bg-blue-700 text-white",
    btnLabel: "Continue",
  },
  completed: {
    label: "Completed",
    badgeCls: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    barCls: "bg-emerald-500",
    pctCls: "text-emerald-600",
    btnCls: "bg-emerald-600 hover:bg-emerald-700 text-white",
    btnLabel: "Review Course",
  },
  failed: {
    label: "Failed",
    badgeCls: "bg-red-50 text-red-600 border border-red-200",
    barCls: "bg-red-400",
    pctCls: "text-red-500",
    btnCls: "bg-red-600 hover:bg-red-700 text-white",
    btnLabel: "Retake",
  },
};

/* ── Course card (grid, vertical) ── */
function CourseCard({ c }) {
  const st   = STATUS_CFG[c.status] || STATUS_CFG.assigned;
  const grad = getThumbnailGradient(c.course.name);
  const Icon = getCategoryIcon(c.category);
  const durationLabel = c.totalMinutes >= 60
    ? `${Math.floor(c.totalMinutes / 60)}h${c.totalMinutes % 60 > 0 ? ` ${c.totalMinutes % 60}m` : ""}`
    : c.totalMinutes > 0 ? `${c.totalMinutes}m` : null;

  return (
    <Card className="overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-200/80">
      {/* Thumbnail */}
      <Box
        style={{ background: `linear-gradient(145deg, ${grad.from} 0%, ${grad.to} 100%)` }}
        className="relative h-44 overflow-hidden shrink-0"
      >
        {/* Soft decorative shapes */}
        <Box
          className="absolute rounded-full"
          style={{ width: 140, height: 140, top: -44, right: -36, background: "rgba(0,0,0,0.03)" }}
        />
        <Box
          className="absolute rounded-full"
          style={{ width: 96, height: 96, bottom: -28, left: -20, background: "rgba(0,0,0,0.025)" }}
        />
        {/* Center icon */}
        <Box className="absolute inset-0 flex items-center justify-center">
          <Icon style={{ width: 56, height: 56, color: grad.iconColor, strokeWidth: 1.5, opacity: 0.85 }} />
        </Box>
        {/* Status badge — top right */}
        <Box className="absolute top-3 right-3">
          <Badge className={cn("text-[11px] font-semibold px-2 py-0.5 shadow-sm", st.badgeCls)}>
            {st.label}
          </Badge>
        </Box>
        {/* Mandatory badge — bottom left */}
        {c.isMandatory && (
          <Box className="absolute bottom-3 left-3">
            <Badge className="text-[10px] font-bold bg-red-500 text-white border-0 px-1.5 py-0.5 shadow-sm">
              MANDATORY
            </Badge>
          </Box>
        )}
      </Box>

      {/* Card body */}
      <Box className="flex flex-col flex-1 p-5 gap-3 bg-white">
        {/* Category */}
        {c.category && (
          <Text as="span" className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">
            {c.category}
          </Text>
        )}

        {/* Title */}
        <Text as="h3" className="text-sm font-bold leading-snug line-clamp-2 -mt-1 text-gray-900">
          {c.course.name}
        </Text>

        {/* Progress bar */}
        <Box className="space-y-1.5">
          <Box className="flex items-center justify-between">
            <Text as="span" className="text-xs text-muted-foreground">
              {c.status === "assigned"
                ? "Not started yet"
                : c.status === "completed"
                ? "All lessons done"
                : "Progress"}
            </Text>
            {c.status !== "assigned" && (
              <Text as="span" className={cn("text-xs font-bold tabular-nums", st.pctCls)}>
                {c.progressPct}%
              </Text>
            )}
          </Box>
          <Box className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <Box
              className={cn("h-full rounded-full transition-all duration-500", st.barCls)}
              style={{ width: `${c.status === "assigned" ? 0 : c.progressPct}%` }}
            />
          </Box>
        </Box>

        {/* Meta row */}
        <Box className="flex items-center gap-4 flex-wrap text-xs text-muted-foreground">
          {durationLabel && (
            <Box className="flex items-center gap-1.5 font-medium">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <Text as="span">{durationLabel}</Text>
            </Box>
          )}
          {c.dueFmt && (
            <Box className="flex items-center gap-1.5">
              <Flag className="h-3.5 w-3.5 shrink-0 text-orange-400" />
              <Text as="span">Due {c.dueFmt}</Text>
            </Box>
          )}
          {c.assignedFmt && !c.dueFmt && (
            <Box className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 shrink-0" />
              <Text as="span">Assigned {c.assignedFmt}</Text>
            </Box>
          )}
          {c.bestScore !== null && (
            <Text as="span" className={cn("font-semibold", c.hasFailed ? "text-red-500" : "text-emerald-600")}>
              {c.hasFailed ? `✗ ${c.bestScore}%` : `✓ ${c.bestScore}%`}
            </Text>
          )}
        </Box>

        {/* CTA */}
        <Box className="mt-auto pt-1">
          <Link href={`/my-courses/${c.course.id}`} className="block">
            <Button className={cn("w-full h-10 text-sm font-semibold gap-2", st.btnCls)}>
              {st.btnLabel}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </Box>
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
        const grad      = getThumbnailGradient(c.course.name);
        return (
          <Link key={c.enrollmentId} href={`/my-courses/${c.course.id}`}>
            <Box className={cn("flex items-center gap-4 p-4 rounded-xl border transition-colors hover:bg-muted/20",
              isCurrent && "border-blue-200 bg-blue-50/30",
              isDone && "border-emerald-200 bg-emerald-50/20",
              !isCurrent && !isDone && "opacity-60"
            )}>
              <Box
                style={{
                  background: isDone
                    ? "#10b981"
                    : isCurrent
                    ? `linear-gradient(135deg, ${grad.from}, ${grad.to})`
                    : "#f3f4f6",
                  width: 36,
                  height: 36,
                  border: isCurrent ? `2px solid ${grad.iconColor}` : undefined,
                }}
                className="rounded-full flex items-center justify-center shrink-0"
              >
                {isDone
                  ? <CheckCircle2 className="h-5 w-5 text-white" />
                  : <Text as="span" style={{ color: isCurrent ? grad.iconColor : "#9ca3af", fontWeight: 700, fontSize: 13 }}>{i + 1}</Text>
                }
              </Box>
              <Box className="flex-1 min-w-0">
                <Text as="p" className="text-sm font-semibold truncate">{c.course.name}</Text>
                <Text as="p" className="text-xs text-muted-foreground">{c.category || "Course"} · {c.progressPct}% complete</Text>
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
    <Box className="space-y-5">
      <Box className="flex gap-2">
        <Skeleton className="h-10 w-28 rounded-xl" />
        <Skeleton className="h-10 w-36 rounded-xl" />
      </Box>
      <Box className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </Box>
      <Skeleton className="h-11 w-full rounded-xl" />
      <Skeleton className="h-10 rounded-lg" />
      <Box className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {[...Array(3)].map((_, i) => (
          <Box key={i} className="flex flex-col overflow-hidden rounded-xl border">
            <Skeleton className="h-44 rounded-none" />
            <Box className="p-4 space-y-3 bg-white">
              <Skeleton className="h-3 w-20 rounded" />
              <Skeleton className="h-4 w-4/5 rounded" />
              <Skeleton className="h-2 w-full rounded" />
              <Skeleton className="h-10 w-full rounded-md" />
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

/* ── Status filter options ── */
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
  const [data, setData]           = useState(null);
  const [error, setError]         = useState(null);
  const [view, setView]           = useState("courses");
  const [statusFilter, setStatus] = useState("all");
  const [typeFilter, setType]     = useState("all");
  const [search, setSearch]       = useState("");

  useEffect(() => {
    if (!token || !user) return;
    fetch("/api/learner/courses", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { if (d.message) throw new Error(d.message); setData(d); })
      .catch((e) => setError(e.message));
  }, [token, user]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.courses.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (typeFilter   !== "all" && c.contentType !== typeFilter) return false;
      if (q && !c.course.name.toLowerCase().includes(q) && !(c.category || "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [data, statusFilter, typeFilter, search]);

  if (error) return (
    <Card className="p-8 text-center">
      <Text as="p" className="text-red-500 text-sm">{error}</Text>
      <Button size="sm" variant="outline" className="mt-3" onClick={() => window.location.reload()}>Retry</Button>
    </Card>
  );
  if (!data) return <Skeleton_ />;

  const { overview, journeyPct, courses } = data;
  const ov = overview;

  const counts = {
    all: courses.length,
    assigned: ov.assigned,
    "in-progress": ov.inProgress,
    completed: ov.completed,
    failed: ov.failed,
  };

  const activeFilterCount = (statusFilter !== "all" ? 1 : 0) + (typeFilter !== "all" ? 1 : 0) + (search ? 1 : 0);

  const overviewCards = [
    { icon: Layers,        iconBg: "bg-indigo-100",  iconColor: "text-indigo-600",  circleBg: "bg-indigo-50",  value: ov.totalAssigned, label: "Total Assigned",  sub: `${ov.assigned} yet to start`              },
    { icon: TrendingUp,    iconBg: "bg-amber-100",   iconColor: "text-amber-600",   circleBg: "bg-amber-50",   value: ov.inProgress,    label: "In Progress",     sub: "Currently active"                          },
    { icon: CheckCircle2,  iconBg: "bg-emerald-100", iconColor: "text-emerald-600", circleBg: "bg-emerald-50", value: ov.completed,     label: "Completed",       sub: `${ov.totalAssigned > 0 ? Math.round(ov.completed / ov.totalAssigned * 100) : 0}% completion rate` },
    { icon: Award,         iconBg: "bg-orange-100",  iconColor: "text-orange-500",  circleBg: "bg-orange-50",  value: ov.avgScore !== null ? `${ov.avgScore}%` : "—", label: "Avg Score", sub: "Across assessments" },
    { icon: AlertTriangle, iconBg: "bg-red-100",     iconColor: "text-red-500",     circleBg: "bg-red-50",     value: ov.failed,        label: "Failed",          sub: "Need retake"                               },
    { icon: Calendar,      iconBg: "bg-pink-100",    iconColor: "text-pink-500",    circleBg: "bg-pink-50",    value: ov.nextDeadline?.short || "—", label: "Next Deadline", sub: ov.nextDeadline ? ov.nextDeadline.courseName : "No upcoming deadlines" },
  ];

  return (
    <Box className="space-y-5">

      {/* ── View toggle ── */}
      <Box className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setView("courses")}
          className={cn("flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors",
            view === "courses" ? "bg-blue-600 text-white shadow-sm" : "bg-white border text-muted-foreground hover:bg-muted"
          )}
        >
          <BookOpen className="h-4 w-4" /> Courses
        </button>
        <button
          type="button"
          onClick={() => setView("journey")}
          className={cn("flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors",
            view === "journey" ? "bg-blue-600 text-white shadow-sm" : "bg-white border text-muted-foreground hover:bg-muted"
          )}
        >
          <Map className="h-4 w-4" /> Learning Journey {journeyPct}%
        </button>
      </Box>

      {view === "journey" ? (
        <JourneyView courses={courses} />
      ) : (
        <>
          {/* ── Overview ── */}
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
                  <Text as="h2" className="text-3xl font-extrabold leading-none tracking-tight">{c.value}</Text>
                  <Text as="p" className="text-xs text-muted-foreground mt-0.5">{c.label}</Text>
                  <Text as="p" className="text-[10px] text-muted-foreground/70 mt-0.5 leading-tight line-clamp-1">{c.sub}</Text>
                  <Box className={cn("absolute -right-4 -top-4 w-16 h-16 rounded-full opacity-30", c.circleBg)} />
                </Card>
              ))}
            </Box>
          </Box>

          {/* ── Search + Filters ── */}
          <Box className="space-y-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
            {/* Search bar */}
            <Box className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="Search courses by name or category…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-9 h-11 bg-white border-gray-200 rounded-xl text-sm placeholder:text-muted-foreground focus-visible:ring-blue-500"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </Box>

            {/* Filter row */}
            <Box className="flex items-center gap-3 flex-wrap">
              {/* Status filters */}
              <Box className="flex items-center gap-1.5 flex-wrap flex-1">
                <Text as="span" className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mr-1 shrink-0">
                  Status
                </Text>
                {STATUS_TABS.filter((t) => t.key === "all" || counts[t.key] > 0).map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setStatus(t.key)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border",
                      statusFilter === t.key
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : "bg-white border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600"
                    )}
                  >
                    {t.label}
                    {t.key !== "all" && counts[t.key] !== undefined && (
                      <Text as="span" className={cn("ml-1.5 font-bold tabular-nums",
                        statusFilter === t.key ? "opacity-80" : "text-muted-foreground"
                      )}>
                        {counts[t.key]}
                      </Text>
                    )}
                  </button>
                ))}
              </Box>

              {/* Divider */}
              <Box className="hidden sm:block w-px h-5 bg-gray-200 shrink-0" />

              {/* Type filters */}
              <Box className="flex items-center gap-1.5 flex-wrap">
                <Text as="span" className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mr-1 shrink-0">
                  Type
                </Text>
                {TYPE_TABS.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setType(t.key)}
                    className={cn(
                      "flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border",
                      typeFilter === t.key
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                        : "bg-white border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600"
                    )}
                  >
                    {t.icon}{t.label}
                  </button>
                ))}
              </Box>
            </Box>

            {/* Result count + clear */}
            <Box className="flex items-center justify-between">
              <Text as="p" className="text-xs text-muted-foreground">
                Showing <Text as="span" className="font-semibold text-foreground">{filtered.length}</Text> of{" "}
                <Text as="span" className="font-semibold text-foreground">{courses.length}</Text> courses
              </Text>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={() => { setStatus("all"); setType("all"); setSearch(""); }}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold"
                >
                  <X className="h-3 w-3" />
                  Clear filters{activeFilterCount > 1 ? ` (${activeFilterCount})` : ""}
                </button>
              )}
            </Box>
          </Box>

          {/* ── Course grid ── */}
          {filtered.length === 0 ? (
            <Card className="p-10 text-center border-dashed">
              <BookOpen className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
              <Text as="p" className="text-sm font-medium text-muted-foreground">No courses match your search.</Text>
              <Text as="p" className="text-xs text-muted-foreground/70 mt-1">Try adjusting your filters or search term.</Text>
            </Card>
          ) : (
            <Box className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
              {filtered.map((c) => <CourseCard key={c.enrollmentId} c={c} />)}
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
