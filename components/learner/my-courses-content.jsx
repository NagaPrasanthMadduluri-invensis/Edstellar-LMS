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
  const base = STATUS_CFG[c.status] || STATUS_CFG.assigned;
  // A live session overrides only the wording and the chip; the button colour
  // and bar treatment still come from the shared status config.
  const st = c.session
    ? { ...base, ...(SESSION_STATUS_CFG[c.session.status] ?? SESSION_STATUS_CFG.upcoming) }
    : base;
  const durationLabel = c.totalMinutes >= 60
    ? `${Math.floor(c.totalMinutes / 60)}h${c.totalMinutes % 60 > 0 ? ` ${c.totalMinutes % 60}m` : ""}`
    : c.totalMinutes > 0 ? `${c.totalMinutes}m` : null;

  // `py-0 gap-0` on the Card: the primitive adds py-4 and gap-4 of its own,
  // and the art and body below already carry their own spacing. Without it the
  // padding is paid twice — a white band above the artwork instead of the
  // picture meeting the card's edge, and the same strip again underneath.
  return (
    <Card className="py-0 gap-0 overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow duration-200 border border-border">
      {/* Course art. Replaces a flat paper panel with two decorative blobs and
          a generic category icon — three things competing to fill a slot that
          now carries a real picture. Light scrim so the title stays readable
          and the off-palette illustration reads as tinted artwork. */}
      <Box className="relative h-44 overflow-hidden shrink-0 bg-paper-warm">
        <CourseArt
          thumbnailUrl={c.course.thumbnail_url}
          contentType={c.contentType}
          alt={c.course.name}
          scrim="light"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="absolute inset-0"
        />

        {c.isMandatory && (
          <Box className="absolute bottom-3 left-3">
            <Badge className="text-[10px] font-bold bg-error text-white border-0 px-1.5 py-0.5 shadow-sm">
              MANDATORY
            </Badge>
          </Box>
        )}
      </Box>

      {/* Card body */}
      <Box className="flex flex-col flex-1 p-5 gap-3 bg-white">
        {/* Category · Modules · Status — the same three facts, in the same
            order, as the admin Course Library card.

            The third chip is the LEARNER'S status, not the course's publish
            state. The admin's reads "Published" because an admin can be
            looking at a draft; a learner only ever sees published courses
            (`c.is_active = 1` in the query), so the same chip here would say
            the same word on every card and carry no information. What they
            need to know is where THEY stand.

            It used to sit over the artwork as a floating badge. Keeping both
            would print the same word twice on one card, so it moved into the
            row rather than being duplicated. */}
        <Box className="flex flex-wrap items-center gap-1.5">
          {c.category && (
            <Pill bg={categoryTint(c.category)} fg={categoryColor(c.category)}>
              {c.category}
            </Pill>
          )}
          <Pill bg="var(--spectra-surface-3)" fg="var(--spectra-text-2)">
            Modules: {c.modulesCount ?? 0}
          </Pill>
          <Pill bg={st.pillBg} fg={st.pillFg}>{st.label}</Pill>
        </Box>

        {/* Title */}
        <Text as="h3" className="text-sm font-bold leading-snug line-clamp-2 -mt-1 text-ink">
          {c.course.name}
        </Text>

        {/* Where the training stands. A live session has no progress the
            learner can move — a 0% bar would read as their own inaction — so
            it shows when and where the sitting is instead. */}
        {c.session ? (
          <Box className="space-y-1.5 rounded-lg border border-navy/15 bg-paper-warm px-3 py-2.5">
            <Box className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 shrink-0 text-ink/70" />
              <Text as="span" className="text-xs font-semibold text-ink">
                {c.session.date_label}
              </Text>
              <Text as="span" className="text-xs text-muted-foreground">
                {formatTimeRange(c.session.start_time, c.session.end_time)}
              </Text>
            </Box>
            {c.session.venue && (
              <Box className="flex items-center gap-1.5">
                {c.session.type === "Virtual" ? (
                  <Video className="h-3.5 w-3.5 shrink-0 text-ink/70" />
                ) : (
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-ink/70" />
                )}
                <Text as="span" className="text-xs text-muted-foreground truncate">
                  {c.session.venue}
                </Text>
              </Box>
            )}
            {c.session.trainer && (
              <Box className="flex items-center gap-1.5">
                <UserCircle className="h-3.5 w-3.5 shrink-0 text-ink/70" />
                <Text as="span" className="text-xs text-muted-foreground truncate">
                  {c.session.trainer}
                </Text>
              </Box>
            )}
            {c.status !== "completed" && (
              <Text as="p" className="text-[11px] text-ink/50 pt-0.5">
                Your trainer marks this complete after the session.
              </Text>
            )}
          </Box>
        ) : (
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
            <Box className="h-2 bg-paper-cream rounded-full overflow-hidden">
              <Box
                className={cn("h-full rounded-full transition-all duration-500", st.barCls)}
                style={{ width: `${c.status === "assigned" ? 0 : c.progressPct}%` }}
              />
            </Box>
          </Box>
        )}

        {/* What finishing this pays. Sits under the progress bar and above the
            meta row so the incentive reads as part of "where you are", not as
            another fact about the course. */}
        <CourseRewardStrip
          reward={c.reward}
          isComplete={c.status === "completed"}
          isSession={Boolean(c.session)}
        />

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
              <Flag className="h-3.5 w-3.5 shrink-0 text-ink/70" />
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
            <Text as="span" className={cn("font-semibold", c.hasFailed ? "text-error" : "text-navy")}>
              {c.hasFailed ? `✗ ${c.bestScore}%` : `✓ ${c.bestScore}%`}
            </Text>
          )}
        </Box>

        {/* CTA.
            A second button appears ONLY when a certificate actually exists for
            this course — `certificateId` is null for a session training, which
            never auto-issues one (§10.7), and for a revoked one. "Completed"
            does not imply a certificate, so keying the button off the status
            would send a learner to a page their course is not on. */}
        <Box className="mt-auto flex items-stretch gap-2 pt-1">
          {/* Side by side when there is a certificate, full width when not.
              `flex-1 min-w-0` on both, so the pair splits the card evenly and
              neither label is pushed out — a fixed width would break the
              moment a status label got longer than "Review Course". */}
          <Link href={`/my-courses/${c.course.public_id ?? c.course.id}`} className="block min-w-0 flex-1">
            <Button className={cn("h-10 w-full gap-2 text-sm font-semibold", st.btnCls)}>
              {st.btnLabel}
              <ArrowRight className="h-4 w-4 shrink-0" />
            </Button>
          </Link>
          {c.certificateId && (
            <Link
              href={`/certifications?certificate=${c.certificatePublicId ?? c.certificateId}`}
              className="block min-w-0 flex-1"
            >
              <Button
                variant="outline"
                className="h-10 w-full gap-2 border-navy/25 text-sm font-semibold text-navy hover:bg-paper-cream"
              >
                <Award className="h-4 w-4 shrink-0" />
                Certificate
              </Button>
            </Link>
          )}
        </Box>
      </Box>
    </Card>
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
    { icon: Layers,        iconBg: "bg-paper-cream",  iconColor: "text-navy",  circleBg: "bg-paper-cream",  value: ov.totalAssigned, label: "Total Assigned",  sub: `${ov.assigned} yet to start`              },
    { icon: TrendingUp,    iconBg: "bg-paper-cream",   iconColor: "text-ink/70",   circleBg: "bg-paper-cream",   value: ov.inProgress,    label: "In Progress",     sub: "Currently active"                          },
    { icon: CheckCircle2,  iconBg: "bg-paper-cream", iconColor: "text-navy", circleBg: "bg-paper-cream", value: ov.completed,     label: "Completed",       sub: `${ov.totalAssigned > 0 ? Math.round(ov.completed / ov.totalAssigned * 100) : 0}% completion rate` },
    { icon: Award,         iconBg: "bg-paper-cream",  iconColor: "text-ink/70",  circleBg: "bg-paper-cream",  value: ov.avgScore !== null ? `${ov.avgScore}%` : "—", label: "Avg Score", sub: "Across assessments" },
    { icon: AlertTriangle, iconBg: "bg-error/10",     iconColor: "text-error",     circleBg: "bg-error/10",     value: ov.failed,        label: "Failed",          sub: "Need retake"                               },
    { icon: Calendar,      iconBg: "bg-paper-cream",    iconColor: "text-navy",    circleBg: "bg-paper-cream",    value: ov.nextDeadline?.short || "—", label: "Next Deadline", sub: ov.nextDeadline ? ov.nextDeadline.courseName : "No upcoming deadlines" },
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
