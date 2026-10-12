"use client";

import { apiClient } from "@/lib/api-client";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Layers, TrendingUp, CheckCircle2, Award, AlertTriangle, Calendar,
  Clock, Flag, BookOpen, ArrowRight, CalendarDays,
  GraduationCap, Users, Brain, RefreshCcw, Shield,
  BarChart3, Target, Search, X,
  MapPin, Video, UserCircle,
} from "lucide-react";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { CourseArt } from "@/components/shared/course-art";
import { CourseCard as SpotlightCourseCard } from "@/components/shared/course-card";
import { CourseRewardStrip } from "@/components/learner/course-reward";
import { BRAND } from "@/lib/brand";
import { categoryColor, categoryTint } from "@/lib/course-taxonomy";

/* ── Light thumbnail palettes (hash-based) ── */
/* Thumbnail surfaces. The brand allows variety only across the paper family
   and navy, so the name hash picks a surface rather than inventing a hue. */
/**
 * The same chip the admin Course Library uses, so a course reads the same
 * way on both sides of the product. Colours arrive as values rather than
 * Tailwind classes because the seven category hues are DATA (§10.3.1.3) and
 * Tailwind cannot see a class name built by concatenation.
 */
function Pill({ children, bg, fg }) {
  return (
    <Text
      as="span"
      className="shrink-0 whitespace-nowrap px-2 py-0.5 text-[10px] font-bold"
      style={{ background: bg, color: fg }}
    >
      {children}
    </Text>
  );
}

/* ── Status config ──
   `pillBg` / `pillFg` are the chip on the card's meta row, and they follow
   §10.3's status vocabulary rather than the navy fills the progress bar uses:
   grey for not started, accent for in progress, green for complete, danger
   for failed. The bar is about how far along the work is; the chip is about
   which of five states it is in, and those are different questions. */
const STATUS_CFG = {
  assigned: {
    label: "Not Started",
    badgeCls: "bg-paper-warm text-ink/60 border-border border",
    pillBg: "rgba(136,136,136,.12)",
    pillFg: "var(--spectra-text-3)",
    barCls: "bg-paper-cream",
    pctCls: "text-ink/60",
    btnCls: "bg-navy hover:bg-navy-soft text-paper",
    btnLabel: "Start Learning",
  },
  "in-progress": {
    label: "In Progress",
    badgeCls: "bg-paper-cream text-ink border-navy/25 border",
    pillBg: "rgba(59,111,212,.12)",
    pillFg: BRAND.accent,
    barCls: "bg-navy-soft",
    pctCls: "text-navy",
    btnCls: "bg-navy hover:bg-navy-soft text-paper",
    btnLabel: "Continue",
  },
  completed: {
    label: "Completed",
    badgeCls: "bg-navy text-paper border-navy border",
    pillBg: "rgba(26,94,58,.12)",
    pillFg: BRAND.success,
    barCls: "bg-navy",
    pctCls: "text-navy",
    btnCls: "bg-navy hover:bg-navy-soft text-paper",
    btnLabel: "Review Course",
  },
  failed: {
    label: "Failed",
    badgeCls: "bg-error/10 text-error border-error/30 border",
    pillBg: "rgba(201,64,64,.12)",
    pillFg: BRAND.danger,
    barCls: "bg-error",
    pctCls: "text-error",
    btnCls: "bg-error hover:bg-error text-white",
    btnLabel: "Retake",
  },
};

/* ── Live session status ──
   A session training's card cannot say "Not Started": there is nothing for the
   learner to start. What matters is where the sitting is in time, which is what
   these three read as. Completion still comes from the trainer. */
const SESSION_STATUS_CFG = {
  upcoming: {
    label: "Upcoming",
    badgeCls: "bg-paper-warm text-ink/60 border-border border",
    btnLabel: "View session",
  },
  in_progress: {
    label: "In progress",
    badgeCls: "bg-paper-cream text-ink border-navy/25 border",
    btnLabel: "View session",
  },
  completed: {
    label: "Completed",
    badgeCls: "bg-navy text-paper border-navy border",
    btnLabel: "Review session",
  },
};

function formatTimeRange(start, end) {
  const one = (t) => {
    if (!t) return "";
    const [h, m] = t.split(":").map(Number);
    if (Number.isNaN(h)) return "";
    return `${h % 12 || 12}:${String(m || 0).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
  };
  const from = one(start);
  const to = one(end);
  if (!from) return "";
  return to ? `${from} – ${to}` : from;
}

/* ── Course card (grid, vertical) ── */
function CourseCard({ c }) {
  const isComplete = c.status === "completed";
  const reward = c.reward;
  // Overall points — gained if finished, otherwise what is on the table. No
  // badge line here (the card shows only points and progress).
  const points =
    reward && reward.totalPoints > 0
      ? isComplete
        ? `${reward.earnedPoints} pts earned`
        : `${reward.totalPoints} pts to earn`
      : null;
  const flag = c.isMandatory
    ? c.category === "Compliance"
      ? "Compliance"
      : "Required"
    : null;

  // Above the title: modules count + status. The category/mandatory marker is
  // NOT repeated here — it already shows as the top-right flag.
  const modules = c.modulesCount ?? 0;
  const statusLabel = isComplete
    ? "Completed"
    : c.status === "assigned"
      ? "Not started"
      : "In progress";
  const eyebrow = `${modules} module${modules === 1 ? "" : "s"} · ${statusLabel}`;

  return (
    <SpotlightCourseCard
      href={`/my-courses/${c.course.public_id ?? c.course.id}`}
      title={c.course.name}
      category={c.category || "General"}
      eyebrow={eyebrow}
      contentType={c.contentType}
      thumbnailUrl={c.course.thumbnail_url}
      progress={c.session ? null : c.status === "assigned" ? 0 : c.progressPct}
      points={points}
      flag={flag}
    />
  );
}

/* The "Learning Journey" view that used to sit here is GONE, and it was
   never a learning journey. It numbered whatever courses happened to be
   assigned to you 1..N and called the completed fraction a journey
   percentage — an arbitrary list dressed as a deliberate sequence, with no
   order anybody chose and no relation to the `journeys` an admin actually
   builds. A real one is a path with steps that unlock in turn, and that
   lives in My Learning Paths (TASTE §10.3.1.22), where the order on screen
   is the order somebody meant.

*/

/* ── Skeleton ── */
function Skeleton_() {
  return (
    <Box className="space-y-5">
      <Box className="flex gap-2">
        <Skeleton className="h-10 w-28 rounded-xl" />
        <Skeleton className="h-10 w-36 rounded-xl" />
      </Box>
      <Box className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </Box>
      <Skeleton className="h-11 w-full rounded-xl" />
      <Skeleton className="h-10 rounded-lg" />
      <Box className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {[...Array(3)].map((_, i) => (
          <Box key={i} className="glass flex flex-col overflow-hidden rounded-xl border">
            <Skeleton className="h-44 rounded-none" />
            <Box className="p-4 space-y-3">
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

/* ── Main component ── */
export function MyCoursesContent() {
  const { user } = useAuth();
  const [data, setData]           = useState(null);
  const [error, setError]         = useState(null);
  const [statusFilter, setStatus] = useState("all");
  const [search, setSearch]       = useState("");

  useEffect(() => {
    if (!user) return;
    apiClient("/api/learner/courses")
      .then(setData)
      .catch((e) => setError(e.message));
  }, [user]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.courses.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (q && !c.course.name.toLowerCase().includes(q) && !(c.category || "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [data, statusFilter, search]);

  if (error) return (
    <Card className="p-8 text-center">
      <Text as="p" className="text-error text-sm">{error}</Text>
      <Button size="sm" variant="outline" className="mt-3" onClick={() => window.location.reload()}>Retry</Button>
    </Card>
  );
  if (!data) return <Skeleton_ />;

  const { overview, courses } = data;
  const ov = overview;

  const counts = {
    all: courses.length,
    assigned: ov.assigned,
    "in-progress": ov.inProgress,
    completed: ov.completed,
    failed: ov.failed,
  };

  const activeFilterCount = (statusFilter !== "all" ? 1 : 0) + (search ? 1 : 0);

  const overviewCards = [
    // Neutral bubbles take the themed accent tint (bg-accent-tint / text-accent-blue
    // both resolve through --spectra-accent -> --theme-accent, so they re-colour with
    // the chosen VIBGYOR theme). "Failed" keeps its danger hue — status hues are never
    // themed (design-palette.md §10).
    { icon: Layers,        iconBg: "bg-accent-tint",  iconColor: "text-accent-blue",  circleBg: "bg-accent-tint",  value: ov.totalAssigned, label: "Total Assigned",  sub: `${ov.assigned} yet to start`              },
    { icon: TrendingUp,    iconBg: "bg-accent-tint",   iconColor: "text-accent-blue",   circleBg: "bg-accent-tint",   value: ov.inProgress,    label: "In Progress",     sub: "Currently active"                          },
    { icon: CheckCircle2,  iconBg: "bg-accent-tint", iconColor: "text-accent-blue", circleBg: "bg-accent-tint", value: ov.completed,     label: "Completed",       sub: `${ov.totalAssigned > 0 ? Math.round(ov.completed / ov.totalAssigned * 100) : 0}% completion rate` },
    { icon: Award,         iconBg: "bg-accent-tint",  iconColor: "text-accent-blue",  circleBg: "bg-accent-tint",  value: ov.avgScore !== null ? `${ov.avgScore}%` : "—", label: "Avg Score", sub: "Across assessments" },
    { icon: AlertTriangle, iconBg: "bg-error/10",     iconColor: "text-error",     circleBg: "bg-error/10",     value: ov.failed,        label: "Failed",          sub: "Need retake"                               },
    { icon: Calendar,      iconBg: "bg-accent-tint",    iconColor: "text-accent-blue",    circleBg: "bg-accent-tint",    value: ov.nextDeadline?.short || "—", label: "Next Deadline", sub: ov.nextDeadline ? ov.nextDeadline.courseName : "No upcoming deadlines" },
  ];

  return (
    <Box className="space-y-5">

      <>
          {/* ── Overview ── */}
          <Box>
            <Text as="p" className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground mb-3">
              Your Learning Overview
            </Text>
            <Box className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {overviewCards.map((c) => (
                <Card key={c.label} className="gap-0 relative overflow-hidden p-4">
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
          <Box className="space-y-3 p-4 bg-paper-warm rounded-2xl border border-border">
            {/* Search bar */}
            <Box className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="Search courses by name or category…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-9 h-11 bg-white border-border rounded-xl text-sm placeholder:text-muted-foreground focus-visible:ring-navy"
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
                        ? "bg-navy text-white border-navy/20 shadow-sm"
                        : "bg-white border-border text-ink/70 hover:border-navy/20 hover:text-navy"
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
                  onClick={() => { setStatus("all"); setSearch(""); }}
                  className="flex items-center gap-1 text-xs text-navy hover:text-navy font-semibold"
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
    </Box>
  );
}
