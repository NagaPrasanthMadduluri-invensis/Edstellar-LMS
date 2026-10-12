"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  BookOpen, CheckCircle2, Clock, TrendingUp, ArrowRight,
  Play, ClipboardList, Package, Calendar, ChevronRight,
  Settings, Award, Trophy, AlertTriangle, PartyPopper,
} from "lucide-react";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { UserAvatar } from "@/components/shared/user-avatar";
import { CourseCard } from "@/components/shared/course-card";
import { fetchDashboard } from "@/services/api/learner/learner-api";
import { CourseRewardStrip } from "@/components/learner/course-reward";
import { DashboardUpcomingSessions } from "@/components/learner/dashboard-upcoming-sessions";
import { DashboardPendingSurveys } from "@/components/learner/dashboard-pending-surveys";
import { DashboardRecommended } from "@/components/learner/dashboard-recommended";
import { BRAND } from "@/lib/brand";

/* ── helpers ── */
function greeting() {
  const h = new Date().getHours();
  if (h >= 5  && h < 12) return "Good morning";
  if (h >= 12 && h < 17) return "Good afternoon";
  return "Good evening";
}

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const STATUS_CFG = {
  "in-progress": { label: "In Progress", cls: "bg-paper-cream text-ink border-navy/25"   },
  "assigned":    { label: "Assigned",    cls: "bg-paper-warm text-ink/60 border-border"   },
  "completed":   { label: "Completed",   cls: "bg-navy text-paper border-navy" },
};

const ACTIVITY_ICON = {
  lesson:     { icon: Play,          bg: "bg-paper-cream",    color: "text-navy"    },
  assessment: { icon: CheckCircle2,  bg: "bg-paper-cream", color: "text-navy" },
  assignment: { icon: ClipboardList, bg: "bg-paper-cream",   color: "text-ink/70"   },
};

/* ── Skeleton ── */
function DashboardSkeleton() {
  return (
    <Box className="space-y-5">
      <Skeleton className="h-20 rounded-xl" />
      <Skeleton className="h-14 rounded-xl" />
      <Box className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
      </Box>
      <Box className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Box className="space-y-4"><Skeleton className="h-48 rounded-xl" /><Skeleton className="h-52 rounded-xl" /></Box>
        <Box className="space-y-4"><Skeleton className="h-36 rounded-xl" /><Skeleton className="h-32 rounded-xl" /><Skeleton className="h-52 rounded-xl" /></Box>
      </Box>
    </Box>
  );
}

/* ── Main component ── */
/** A hero stat chip: lucide icon + mono value + quiet label, on the navy panel. */
function HeroChip({ icon: Icon, label, children }) {
  return (
    <Box className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white">
      <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" />
      <Text as="span" className="font-mono font-bold text-inherit">{children}</Text>
      <Text as="span" className="text-inherit opacity-70">{label}</Text>
    </Box>
  );
}

export function DashboardContent() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [greet, setGreet] = useState("Good morning");

  useEffect(() => { setGreet(greeting()); }, []);

  useEffect(() => {
    if (!user) return;
    fetchDashboard().then(setData).catch((e) => setError(e.message));
  }, [user]);

  if (error) return (
    <Card className="p-8 text-center">
      <Text as="p" className="text-error text-sm">{error}</Text>
      <Button size="sm" variant="outline" className="mt-3" onClick={() => window.location.reload()}>Retry</Button>
    </Card>
  );
  if (!data) return <DashboardSkeleton />;

  const {
    stats = {}, enrolled_courses = [], points = 0,
    rank = 1, rank_of = 1, badges = 0, skill_tags = [],
    continue_learning, journey = { courses: [], completed: 0, total: 0 },
    upcoming_deadlines = [], recent_activity = [], recentAttempts = [],
    latest_badge = null, overdue_items = [],
  } = data;

  const inProgressCount = stats.in_progress_courses ?? 0;
  const yetToStart      = stats.yet_to_start ?? 0;

  // Cards for the Continue Learning row: in-progress courses first, falling
  // back to the single continue_learning course (an assigned one to start).
  const inProgressCourses = enrolled_courses.filter((c) => c.status === "in-progress");
  const continueItems =
    inProgressCourses.length > 0
      ? inProgressCourses.slice(0, 3)
      : continue_learning
        ? [continue_learning]
        : [];

  // KPI tiles — each a soft tint from the EXISTING palette (no new colours):
  // Total Assigned → accent, In Progress → warning, Completed → success,
  // Hours → danger (it carries the behind/ahead-of-goal signal).
  const completionPct = stats.assigned_courses
    ? Math.round(((stats.completed_courses ?? 0) / stats.assigned_courses) * 100)
    : 0;
  const hoursToGoal = Math.max(0, (stats.hours_goal ?? 10) - (stats.hours_this_month ?? 0));
  const statCards = [
    {
      value: stats.assigned_courses ?? 0,
      label: "Total Assigned",
      sub: yetToStart > 0 ? `${yetToStart} yet to start` : "All in progress",
      icon: Package, tile: "bg-accent-tint", iconColor: "text-accent-blue",
    },
    {
      value: inProgressCount,
      label: "In Progress",
      sub: "Active courses", subTone: "up",
      icon: TrendingUp, tile: "bg-warning/10", iconColor: "text-warning",
    },
    {
      value: stats.completed_courses ?? 0,
      label: "Completed",
      sub: `${completionPct}% completion`, subTone: "up",
      icon: CheckCircle2, tile: "bg-success/10", iconColor: "text-success",
    },
    {
      value: `${stats.hours_this_month ?? 0}h`,
      label: "Hours This Month",
      sub: hoursToGoal > 0 ? `${hoursToGoal.toFixed(1)}h to goal` : "Goal reached",
      subTone: hoursToGoal > 0 ? "down" : "up",
      icon: Clock, tile: "bg-danger/10", iconColor: "text-danger",
    },
  ];

  const hoursGoalPct = Math.min(Math.round(((stats.hours_this_month ?? 0) / (stats.hours_goal ?? 10)) * 100), 100);

  // ── Harbor split-hero bits (reference: .lhh-hero2) ──
  const firstName = user?.firstName || "Learner";
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
  const nextUp = continue_learning;
  const resumeHref = nextUp
    ? `/my-courses/${nextUp.course.public_id ?? nextUp.course.id}`
    : "/catalogue";
  const resumeLabel = nextUp ? `Resume ${nextUp.course.name}` : "Explore the catalogue";
  const heroSubline =
    inProgressCount > 0
      ? `You have ${inProgressCount} course${inProgressCount !== 1 ? "s" : ""} in progress — pick up where you left off.`
      : yetToStart > 0
        ? `You have ${yetToStart} assigned and waiting. Start today.`
        : "Welcome back — ready to pick up where you left off?";

  return (
    <Box className="space-y-5">

      {/* ── Date line ── */}
      <Text as="p" className="px-0.5 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-text-2">
        {today}
      </Text>

      {/* ── Split hero (reference: .lhh-hero2) — navy text panel on the left,
          cover photo fading in on the right (md+). Greeting is Fraunces. ── */}
      <Box className="home-hero-panel relative min-h-[232px] overflow-hidden rounded-2xl border border-line">
        <Box
          aria-hidden
          className="home-hero-photo hidden md:block"
          style={{ backgroundImage: "url('/home-hero.jpg')" }}
        />
        <Box className="relative z-[2] flex min-h-[232px] w-full flex-col justify-center p-7 text-white md:w-1/2 md:p-9">
          <Box className="mb-4 flex items-center gap-3.5">
            <UserAvatar src={user?.avatar} name={user?.name} className="size-12 shrink-0 ring-2 ring-white/30" />
            <Box className="min-w-0">
              <Text as="p" className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-white/60">
                Welcome back
              </Text>
              <Text as="h1" className="text-[28px] font-semibold leading-[1.08] text-white">
                {greet}, {firstName}.
              </Text>
            </Box>
          </Box>
          <Text as="p" className="mb-4 text-[13px] leading-relaxed text-white/85">
            {heroSubline}
          </Text>
          <Link href={resumeHref} className="self-start">
            <Button className="gap-2 bg-accent-blue text-white hover:brightness-110">
              <Text as="span" className="max-w-[16rem] truncate text-inherit">{resumeLabel}</Text>
              <ArrowRight className="h-4 w-4 shrink-0" />
            </Button>
          </Link>
          <Box className="mt-4 flex flex-wrap gap-2.5">
            <HeroChip icon={Clock} label="this month">{stats.hours_this_month ?? 0}h</HeroChip>
            <HeroChip icon={BookOpen} label="in progress">{inProgressCount}</HeroChip>
            {yetToStart > 0 && (
              <HeroChip icon={Package} label="assigned">{yetToStart}</HeroChip>
            )}
          </Box>
        </Box>
      </Box>

      {/* ── Attention strip: overdue + a fresh badge win. Shown just above the
          Achievements KPIs, each cell only when there is something to say. ── */}
      {(overdue_items.length > 0 || latest_badge) && (
        <Box className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {overdue_items.length > 0 && (
            <Link
              href="/my-courses"
              className="flex items-center gap-3 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 transition-colors hover:bg-danger/15"
            >
              <AlertTriangle className="h-5 w-5 shrink-0 text-danger" />
              <Box className="min-w-0 flex-1">
                <Text as="p" className="text-sm font-bold text-ink">
                  {overdue_items.length} item{overdue_items.length > 1 ? "s" : ""} overdue
                </Text>
                <Text as="p" className="truncate text-xs text-text-2">
                  {overdue_items.slice(0, 2).map((o) => o.name).join(", ")}
                  {overdue_items.length > 2 ? ` +${overdue_items.length - 2} more` : ""}
                </Text>
              </Box>
              <Text as="span" className="shrink-0 text-xs font-bold text-danger">Review →</Text>
            </Link>
          )}
          {latest_badge && (
            <Box className="flex items-center gap-3 rounded-xl border border-warning/35 bg-warning/10 px-4 py-3">
              <PartyPopper className="h-5 w-5 shrink-0 text-warning" />
              <Box className="min-w-0 flex-1">
                <Text as="p" className="text-sm font-bold text-ink">
                  You earned the {latest_badge.label} badge!
                </Text>
                <Text as="p" className="truncate text-xs text-text-2">
                  {latest_badge.description || "A fresh win — keep the momentum going."}
                </Text>
              </Box>
              <Link href="/achievements" className="shrink-0">
                <Button size="sm" className="bg-navy text-paper hover:bg-navy-soft">View achievements</Button>
              </Link>
            </Box>
          )}
        </Box>
      )}

      {/* ── KPI row: a wide Achievements tile + four stat tiles.
          Replaces the old navy rank strip. Tints are existing palette colours
          (cream / accent / warning / success / danger), no new hues. ── */}
      <Box className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        {/* Achievements — points / rank / badges, spanning two columns. */}
        <Card className="col-span-2 flex flex-col justify-between border-2 border-accent-blue bg-paper-cream p-5">
          <Box className="flex items-center justify-between gap-2">
            <Box className="flex items-center gap-2.5 min-w-0">
              <Box className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/70">
                <Award className="h-4 w-4 text-warning" />
              </Box>
              <Text as="span" className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-ink/70">
                Achievements
              </Text>
            </Box>
            <Link href="/achievements" className="shrink-0 text-[11.5px] font-bold text-accent-blue hover:underline">
              View all →
            </Link>
          </Box>
          <Box className="mt-4 flex items-end gap-5">
            <Box>
              <Text as="p" className="font-mono text-2xl font-extrabold leading-none text-ink">{points}</Text>
              <Text as="p" className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.1em] text-text-3">Points</Text>
            </Box>
            <Box className="h-9 w-px bg-line" />
            <Box>
              <Box className="flex items-baseline gap-1">
                <Text as="p" className="font-mono text-2xl font-extrabold leading-none text-ink">#{rank}</Text>
                <Text as="span" className="text-xs text-text-3">/ {rank_of}</Text>
              </Box>
              <Text as="p" className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.1em] text-text-3">Rank</Text>
            </Box>
            <Box className="h-9 w-px bg-line" />
            <Box>
              <Box className="flex items-center gap-1.5">
                <Text as="p" className="font-mono text-2xl font-extrabold leading-none text-ink">{badges}</Text>
                <Trophy className="h-4 w-4 text-warning" />
              </Box>
              <Text as="p" className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.1em] text-text-3">Badges</Text>
            </Box>
          </Box>
        </Card>

        {/* Four stat tiles — pastel tint, white icon square, value, label, sub. */}
        {statCards.map((s) => (
          <Card key={s.label} className={`flex flex-col gap-2 p-4 ${s.tile}`}>
            <Box className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/70">
              <s.icon className={`h-4 w-4 ${s.iconColor}`} />
            </Box>
            <Text as="p" className="mt-1 font-mono text-[26px] font-extrabold leading-none text-ink">{s.value}</Text>
            <Text as="p" className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-text-3">{s.label}</Text>
            <Text
              as="p"
              className={`text-[11px] font-medium ${s.subTone === "up" ? "text-success" : s.subTone === "down" ? "text-danger" : "text-text-3"}`}
            >
              {s.subTone === "up" ? "↑ " : s.subTone === "down" ? "↓ " : ""}{s.sub}
            </Text>
          </Card>
        ))}
      </Box>

      {/* ── Continue learning — spotlight card row ── */}
      <Box className="space-y-3">
        <Box className="flex items-end justify-between gap-2">
          <Box>
            <Text as="h2" className="font-mono text-[12px] font-bold uppercase tracking-[0.14em] text-ink/70">Continue learning</Text>
            <Text as="p" className="mt-0.5 text-xs text-muted-foreground">Pick up where you left off</Text>
          </Box>
          <Link href="/my-courses" className="shrink-0 text-xs font-bold text-accent-blue hover:underline">View all →</Link>
        </Box>
        {continueItems.length ? (
          <Box className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {continueItems.map((c) => (
              <CourseCard
                key={c.enrollment_id ?? c.course.id}
                href={`/my-courses/${c.course.public_id ?? c.course.id}`}
                title={c.course.name}
                category={c.category || "General"}
                contentType={c.session ? "session" : undefined}
                thumbnailUrl={c.course.thumbnail_url}
                progress={c.session ? null : (c.progress_percentage ?? 0)}
                flag={c.is_mandatory ? (c.category === "Compliance" ? "Compliance" : "Required") : null}
                ctaLabel={(c.progress_percentage ?? 0) > 0 ? "Continue" : "Start"}
              />
            ))}
          </Box>
        ) : (
          <Card className="border-dashed p-6 text-center">
            <BookOpen className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
            <Text as="p" className="text-sm text-muted-foreground">No course in progress yet.</Text>
            <Link href="/my-courses"><Button size="sm" variant="outline" className="mt-2 text-xs">Browse Courses</Button></Link>
          </Card>
        )}
      </Box>

      {/* ── Upcoming — courses due soon, as spotlight cards ── */}
      {upcoming_deadlines.length > 0 && (
        <Box className="space-y-3">
          <Box>
            <Text as="h2" className="font-mono text-[12px] font-bold uppercase tracking-[0.14em] text-ink/70">Upcoming</Text>
            <Text as="p" className="mt-0.5 text-xs text-muted-foreground">Due soon</Text>
          </Box>
          <Box className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming_deadlines.map((d) => (
              <CourseCard
                key={d.course_id}
                href={`/my-courses/${d.course_public_id ?? d.course_id}`}
                title={d.name}
                category={d.category || "General"}
                thumbnailUrl={d.thumbnail_url}
                eyebrow={`Due ${fmtDate(d.due_date)}`}
                progress={typeof d.progress_percentage === "number" ? d.progress_percentage : null}
                ctaLabel="Open"
              />
            ))}
          </Box>
        </Box>
      )}

      {/* ── Learning journey · Hours goal · Recent wins (compact) ── */}
      <Box className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Learning Journey */}
          <Card className="gap-0 p-5">
            <Box className="flex items-center justify-between mb-1">
              <Text as="h3" className="text-base font-semibold">Learning Journey</Text>
              <Link href="/my-courses" className="text-xs text-navy hover:underline font-medium flex items-center gap-0.5">
                View full <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </Box>
            <Text as="p" className="text-xs text-muted-foreground mb-4">Your assigned curriculum</Text>

            {journey.total > 0 ? (
              <Box className="space-y-3">
                <Box className="flex items-center gap-3">
                  <Box className="flex-1">
                    <Box className="h-2 bg-muted rounded-full overflow-hidden">
                      <Box
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.round((journey.completed / journey.total) * 100)}%`,
                          background: journey.completed / journey.total < 0.5 ? BRAND.danger : BRAND.accent,
                        }}
                      />
                    </Box>
                  </Box>
                  <Text as="span" className="text-sm font-bold shrink-0">
                    {Math.round((journey.completed / journey.total) * 100)}%
                  </Text>
                </Box>
                <Text as="p" className="text-xs text-muted-foreground">
                  {journey.completed} of {journey.total} courses complete
                </Text>

                <Box className="space-y-2 mt-2">
                  {journey.courses.map((c, i) => {
                    const isCurrent = c.status === "in-progress" && journey.courses.slice(0, i).every((x) => x.status === "completed");
                    return (
                      <Link key={c.course_id} href={`/my-courses/${c.course_public_id ?? c.course_id}`}>
                        <Box className={cn(
                          "flex items-center gap-3 py-2 px-3 rounded-lg transition-colors hover:bg-muted/30",
                          c.status === "assigned" && "opacity-50"
                        )}>
                          {c.status === "completed" ? (
                            <Box className="w-6 h-6 rounded-full bg-navy flex items-center justify-center shrink-0">
                              <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                            </Box>
                          ) : (
                            <Box className={cn(
                              "w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold",
                              isCurrent ? "bg-navy text-white" : "bg-muted text-muted-foreground"
                            )}>
                              {i + 1}
                            </Box>
                          )}
                          <Text as="p" className={cn(
                            "text-xs font-medium flex-1 truncate",
                            c.status === "completed" ? "text-navy" : "text-foreground"
                          )}>
                            {c.name}
                          </Text>
                          {isCurrent && (
                            <Badge className="text-[10px] bg-paper-cream text-navy border-0 shrink-0">Current</Badge>
                          )}
                        </Box>
                      </Link>
                    );
                  })}
                </Box>
              </Box>
            ) : (
              <Box className="py-6 text-center">
                <Text as="p" className="text-sm text-muted-foreground">No courses assigned yet.</Text>
              </Box>
            )}
          </Card>
        {/* Hours Goal */}
          <Card className="gap-0 p-5">
            <Box className="flex items-center justify-between mb-3">
              <Box>
                <Text as="h3" className="text-base font-semibold">Hours Goal</Text>
                <Text as="p" className="text-xs text-muted-foreground">June 2026</Text>
              </Box>
              <Link href="/progress" className="text-xs text-navy hover:underline font-medium flex items-center gap-0.5">
                Details <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </Box>
            <Box className="flex items-baseline gap-1 mb-3">
              <Text as="h2" className="text-3xl font-extrabold text-foreground">{stats.hours_this_month ?? 0}h</Text>
              <Text as="span" className="text-sm text-muted-foreground">/ {stats.hours_goal ?? 10}h goal</Text>
            </Box>
            <Box className="relative">
              <Box className="h-3 bg-muted rounded-full overflow-hidden">
                <Box
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${hoursGoalPct}%`,
                    background: hoursGoalPct >= 100 ? BRAND.success : hoursGoalPct >= 60 ? BRAND.accent : BRAND.danger,
                  }}
                />
              </Box>
              <Box className="flex justify-between mt-1">
                <Text as="span" className="text-[10px] text-muted-foreground">0h</Text>
                <Text as="span" className="text-[10px] text-muted-foreground font-medium">{hoursGoalPct}%</Text>
                <Text as="span" className="text-[10px] text-muted-foreground">{stats.hours_goal ?? 10}h</Text>
              </Box>
            </Box>
          </Card>
        {/* Recent Activity */}
          <Card className="gap-0 p-5">
            <Text as="h3" className="text-base font-semibold mb-4">Recent Activity</Text>
            {recent_activity.length === 0 ? (
              <Box className="py-4 text-center">
                <Text as="p" className="text-xs text-muted-foreground">No activity yet. Start a course!</Text>
              </Box>
            ) : (
              <Box className="space-y-3">
                {recent_activity.map((act, i) => {
                  const cfg = ACTIVITY_ICON[act.type] || ACTIVITY_ICON.assignment;
                  const Icon = cfg.icon;
                  return (
                    <Box key={i} className="flex items-start gap-3">
                      <Box className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5", cfg.bg)}>
                        <Icon className={cn("h-3.5 w-3.5", cfg.color)} />
                      </Box>
                      <Box className="flex-1 min-w-0">
                        <Text as="p" className="text-xs font-medium leading-snug line-clamp-1">{act.title}</Text>
                        <Text as="p" className="text-[10px] text-muted-foreground mt-0.5">{act.time_label}</Text>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            )}
          </Card>
      </Box>

      {/* Live sessions you are booked onto. */}
      <DashboardUpcomingSessions />

      {/* Surveys — under the two-column grid rather than inside a column, so
          it spans the full width and is not competing with a panel beside
          it. It renders nothing when there is nothing pending. */}
      <DashboardPendingSurveys />

      {/* Recommended courses, last: it is the only block on the page about
          something the learner has NOT been given, so it sits below
          everything that is already theirs. */}
      <DashboardRecommended />
    </Box>
  );
}
