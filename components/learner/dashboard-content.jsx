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
  Settings,
} from "lucide-react";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { fetchDashboard } from "@/services/api/learner/learner-api";

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
  "in-progress": { label: "In Progress", cls: "bg-blue-100 text-blue-700"   },
  "assigned":    { label: "Assigned",    cls: "bg-gray-100 text-gray-600"   },
  "completed":   { label: "Completed",   cls: "bg-emerald-100 text-emerald-700" },
};

const ACTIVITY_ICON = {
  lesson:     { icon: Play,          bg: "bg-blue-100",    color: "text-blue-600"    },
  assessment: { icon: CheckCircle2,  bg: "bg-emerald-100", color: "text-emerald-600" },
  assignment: { icon: ClipboardList, bg: "bg-amber-100",   color: "text-amber-600"   },
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
export function DashboardContent() {
  const { user, token } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [greet, setGreet] = useState("Good morning");

  useEffect(() => { setGreet(greeting()); }, []);

  useEffect(() => {
    if (!token || !user) return;
    fetchDashboard({ token }).then(setData).catch((e) => setError(e.message));
  }, [token, user]);

  if (error) return (
    <Card className="p-8 text-center">
      <Text as="p" className="text-red-500 text-sm">{error}</Text>
      <Button size="sm" variant="outline" className="mt-3" onClick={() => window.location.reload()}>Retry</Button>
    </Card>
  );
  if (!data) return <DashboardSkeleton />;

  const {
    stats = {}, enrolled_courses = [], points = 0,
    rank = 1, rank_of = 1, badges = 0, skill_tags = [],
    continue_learning, journey = { courses: [], completed: 0, total: 0 },
    upcoming_deadlines = [], recent_activity = [], recentAttempts = [],
  } = data;

  const inProgressCount = stats.in_progress_courses ?? 0;
  const yetToStart      = stats.yet_to_start ?? 0;

  const statCards = [
    {
      value: stats.assigned_courses ?? 0,
      label: "Total Assigned",
      sub: yetToStart > 0 ? `${yetToStart} yet to start` : "All in progress",
      icon: Package,
      iconBg: "bg-blue-100", iconColor: "text-blue-600", circle: "bg-blue-50",
    },
    {
      value: inProgressCount,
      label: "In Progress",
      sub: "+ Active courses",
      icon: TrendingUp,
      iconBg: "bg-amber-100", iconColor: "text-amber-600", circle: "bg-amber-50",
    },
    {
      value: stats.completed_courses ?? 0,
      label: "Completed",
      sub: stats.assigned_courses ? `${Math.round(((stats.completed_courses ?? 0) / stats.assigned_courses) * 100)}% completion` : "0% completion",
      icon: CheckCircle2,
      iconBg: "bg-emerald-100", iconColor: "text-emerald-600", circle: "bg-emerald-50",
    },
    {
      value: `${stats.hours_this_month ?? 0}h`,
      label: "Hours This Month",
      sub: `+${Math.max(0, (stats.hours_goal ?? 10) - (stats.hours_this_month ?? 0)).toFixed(1)}h to goal`,
      icon: Clock,
      iconBg: "bg-pink-100", iconColor: "text-pink-600", circle: "bg-pink-50",
    },
  ];

  const hoursGoalPct = Math.min(Math.round(((stats.hours_this_month ?? 0) / (stats.hours_goal ?? 10)) * 100), 100);

  return (
    <Box className="space-y-5">

      {/* ── Welcome Banner ── */}
      <Card className="px-6 py-5 border-0 shadow-sm bg-white">
        <Box className="flex items-center justify-between gap-4 flex-wrap">
          <Box>
            <Text as="h1" className="text-xl font-bold">
              {greet}, {user?.firstName || "Learner"} 👋
            </Text>
            <Text as="p" className="text-sm text-muted-foreground mt-0.5">
              {inProgressCount > 0
                ? <>You have <Text as="span" className="text-blue-600 font-semibold">{inProgressCount} course{inProgressCount !== 1 ? "s" : ""} in progress</Text>{yetToStart > 0 ? <> and <Text as="span" className="text-blue-600 font-semibold">{yetToStart} assigned</Text> and waiting</> : ""}.</>
                : <>You have <Text as="span" className="text-blue-600 font-semibold">{stats.assigned_courses ?? 0} course{(stats.assigned_courses ?? 0) !== 1 ? "s" : ""} assigned</Text>. Start learning today!</>}
            </Text>
          </Box>
          {skill_tags.length > 0 && (
            <Box className="flex items-center gap-2 flex-wrap">
              {skill_tags.map((tag) => (
                <Text key={tag} as="span" className="px-3 py-1 text-xs border border-gray-200 rounded-full text-gray-500 bg-white">
                  {tag}
                </Text>
              ))}
            </Box>
          )}
        </Box>
      </Card>

      {/* ── Stats Bar (gradient) ── */}
      <Box className="bg-gradient-to-r from-violet-600 to-blue-600 rounded-xl px-6 py-4 flex items-center gap-0">
        <Box className="flex items-center gap-8 text-white flex-1">
          <Box>
            <Text as="p" className="text-2xl font-extrabold leading-none">{points}</Text>
            <Text as="p" className="text-[10px] font-semibold uppercase tracking-widest opacity-75 mt-0.5">Points</Text>
          </Box>
          <Box className="w-px h-8 bg-white/30" />
          <Box>
            <Box className="flex items-baseline gap-1">
              <Text as="p" className="text-2xl font-extrabold leading-none">#{rank}</Text>
              <Text as="span" className="text-sm opacity-75">of {rank_of}</Text>
            </Box>
            <Text as="p" className="text-[10px] font-semibold uppercase tracking-widest opacity-75 mt-0.5">Rank</Text>
          </Box>
          <Box className="w-px h-8 bg-white/30" />
          <Box>
            <Box className="flex items-baseline gap-1.5">
              <Text as="p" className="text-2xl font-extrabold leading-none">{badges}</Text>
              <Text as="span" className="text-lg">🏅</Text>
            </Box>
            <Text as="p" className="text-[10px] font-semibold uppercase tracking-widest opacity-75 mt-0.5">Badges</Text>
          </Box>
        </Box>
        <Link href="/certifications">
          <Button variant="ghost" className="text-white/90 hover:text-white hover:bg-white/10 text-sm gap-1 shrink-0">
            View achievements <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </Box>

      {/* ── 4 Stat Cards ── */}
      <Box className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((s) => (
          <Card key={s.label} className="relative overflow-hidden p-5">
            <Box className="flex flex-col gap-1">
              <Box className={`w-10 h-10 rounded-xl flex items-center justify-center mb-1 ${s.iconBg}`}>
                <s.icon className={`h-5 w-5 ${s.iconColor}`} />
              </Box>
              <Text as="h2" className="text-3xl font-bold leading-none">{s.value}</Text>
              <Text as="p" className="text-sm text-muted-foreground">{s.label}</Text>
              <Text as="p" className="text-xs text-muted-foreground/70">{s.sub}</Text>
            </Box>
            <Box className={`absolute -right-4 -top-4 w-20 h-20 rounded-full opacity-50 ${s.circle}`} />
          </Card>
        ))}
      </Box>

      {/* ── Two-column grid ── */}
      <Box className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* LEFT column */}
        <Box className="space-y-4">

          {/* Continue Learning */}
          <Card className="p-5">
            <Box className="flex items-center justify-between mb-4">
              <Text as="h3" className="text-sm font-bold">Continue Learning</Text>
              <Text as="p" className="text-xs text-muted-foreground">Pick up where you left off</Text>
            </Box>
            {continue_learning ? (
              <Box className="space-y-3">
                <Box className="flex items-start gap-3">
                  <Box className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
                    <Settings className="h-5 w-5 text-blue-400" />
                  </Box>
                  <Box className="flex-1 min-w-0">
                    <Text as="p" className="text-sm font-semibold leading-snug">{continue_learning.course.name}</Text>
                    <Box className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                      <Text as="span" className="text-xs text-muted-foreground">
                        {continue_learning.course.total_lessons - continue_learning.course.completed_lessons} lessons left
                        {continue_learning.due_date ? ` · Due: ${fmtDate(continue_learning.due_date)}` : ""}
                      </Text>
                    </Box>
                  </Box>
                </Box>
                <Box className="space-y-1.5">
                  <Box className="flex items-center justify-between">
                    <Box className="flex-1 h-2 bg-muted rounded-full overflow-hidden mr-3">
                      <Box className="h-full bg-blue-500 rounded-full" style={{ width: `${continue_learning.progress_percentage}%` }} />
                    </Box>
                    <Text as="span" className="text-xs font-semibold text-blue-600 shrink-0">{continue_learning.progress_percentage}%</Text>
                  </Box>
                </Box>
                <Link href={`/my-courses/${continue_learning.course.id}`}>
                  <Button size="sm" className="h-9 bg-blue-500 hover:bg-blue-600 text-white gap-1.5 w-full mt-1">
                    Continue <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </Box>
            ) : (
              <Box className="py-6 text-center">
                <BookOpen className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                <Text as="p" className="text-sm text-muted-foreground">No course in progress yet.</Text>
                <Link href="/my-courses">
                  <Button size="sm" variant="outline" className="mt-2 text-xs">Browse Courses</Button>
                </Link>
              </Box>
            )}
          </Card>

          {/* Learning Journey */}
          <Card className="p-5">
            <Box className="flex items-center justify-between mb-1">
              <Text as="h3" className="text-sm font-bold">Learning Journey</Text>
              <Link href="/my-courses" className="text-xs text-blue-500 hover:underline font-medium flex items-center gap-0.5">
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
                          background: journey.completed / journey.total < 0.5 ? "#ef4444" : "#10b981",
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
                      <Link key={c.course_id} href={`/my-courses/${c.course_id}`}>
                        <Box className={cn(
                          "flex items-center gap-3 py-2 px-3 rounded-lg transition-colors hover:bg-muted/30",
                          c.status === "assigned" && "opacity-50"
                        )}>
                          {c.status === "completed" ? (
                            <Box className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                              <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                            </Box>
                          ) : (
                            <Box className={cn(
                              "w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold",
                              isCurrent ? "bg-blue-500 text-white" : "bg-muted text-muted-foreground"
                            )}>
                              {i + 1}
                            </Box>
                          )}
                          <Text as="p" className={cn(
                            "text-xs font-medium flex-1 truncate",
                            c.status === "completed" ? "text-emerald-600" : "text-foreground"
                          )}>
                            {c.name}
                          </Text>
                          {isCurrent && (
                            <Badge className="text-[10px] bg-blue-100 text-blue-700 border-0 shrink-0">Current</Badge>
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
        </Box>

        {/* RIGHT column */}
        <Box className="space-y-4">

          {/* Upcoming Deadlines */}
          <Card className="p-5">
            <Box className="flex items-center justify-between mb-4">
              <Text as="h3" className="text-sm font-bold">Upcoming Deadlines</Text>
              <Text as="p" className="text-xs text-muted-foreground">Courses due soon</Text>
            </Box>
            {upcoming_deadlines.length === 0 ? (
              <Box className="py-4 text-center">
                <Calendar className="h-6 w-6 mx-auto text-muted-foreground/30 mb-1" />
                <Text as="p" className="text-xs text-muted-foreground">No upcoming deadlines</Text>
              </Box>
            ) : (
              <Box className="space-y-3">
                {upcoming_deadlines.map((d) => {
                  const scfg = STATUS_CFG[d.status] || STATUS_CFG["assigned"];
                  return (
                    <Link key={d.course_id} href={`/my-courses/${d.course_id}`}>
                      <Box className="flex items-center gap-3 hover:bg-muted/20 rounded-lg px-2 py-2 -mx-2 transition-colors">
                        <Box className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                          <Settings className="h-4 w-4 text-gray-400" />
                        </Box>
                        <Box className="flex-1 min-w-0">
                          <Text as="p" className="text-sm font-semibold truncate">{d.name}</Text>
                          <Text as="p" className="text-xs text-muted-foreground">Due: {fmtDate(d.due_date)}</Text>
                        </Box>
                        <Badge className={cn("text-[10px] shrink-0 border-0", scfg.cls)}>{scfg.label}</Badge>
                      </Box>
                    </Link>
                  );
                })}
              </Box>
            )}
          </Card>

          {/* Hours Goal */}
          <Card className="p-5">
            <Box className="flex items-center justify-between mb-3">
              <Box>
                <Text as="h3" className="text-sm font-bold">Hours Goal</Text>
                <Text as="p" className="text-xs text-muted-foreground">June 2026</Text>
              </Box>
              <Link href="/progress" className="text-xs text-blue-500 hover:underline font-medium flex items-center gap-0.5">
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
                    background: hoursGoalPct >= 100 ? "#10b981" : hoursGoalPct >= 60 ? "#f59e0b" : "#ef4444",
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
          <Card className="p-5">
            <Text as="h3" className="text-sm font-bold mb-4">Recent Activity</Text>
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
      </Box>
    </Box>
  );
}
