"use client";

import { apiClient } from "@/lib/api-client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Layers, CheckCircle2, TrendingUp, Award, Star, Clock,
  ArrowUp, ArrowDown, Minus, Lightbulb, BookOpen, Route, CalendarDays,
  AlertTriangle, ArrowRight,
} from "lucide-react";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { LEARNING_TYPES } from "@/lib/brand";
import { sessionTypeLabel } from "@/lib/session-types";
import { KpiStatCard } from "@/components/shared/kpi-stat-card";

/* ────────────────────────────────────────────────────────────────────────
   My Progress — refactored to the Harbor reference "Progress" view:
   a KPI stat-card row, Deadlines & At-Risk + Skills & Competencies, the
   Learning Hours meter + tiles, and the tabbed Learning History.

   Deliberately NOT ported from the reference: AI Insights and the Day Streak
   (owner's call — both are fabricated in the mock, no real data). The trend/
   stacked charts and the yearly table live on the Learning Hours page, which
   the reference Progress view does not carry either.
──────────────────────────────────────────────────────────────────────── */

const STATUS_CFG = {
  "not started": { label: "not started", cls: "chip-idle" },
  "in progress": { label: "in progress", cls: "chip-progress" },
  completed:     { label: "completed",   cls: "chip-complete" },
  failed:        { label: "failed",      cls: "chip-error" },
  cancelled:     { label: "cancelled",   cls: "chip-error" },
  upcoming:      { label: "upcoming",    cls: "chip-idle" },
  complete:      { label: "completed",   cls: "chip-complete" },
  in_progress:   { label: "in progress", cls: "chip-progress" },
  not_started:   { label: "not started", cls: "chip-idle" },
};

function StatusChip({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG["not started"];
  return (
    <Text as="span" className={cn("inline-block px-2 py-0.5 text-[11px] font-medium", cfg.cls)}>
      {cfg.label}
    </Text>
  );
}

const TABS = [
  { key: "courses",  type: "course",  icon: BookOpen,     label: "Courses" },
  { key: "paths",    type: "path",    icon: Route,        label: "Learning Paths" },
  { key: "sessions", type: "session", icon: CalendarDays, label: "Sessions" },
];

/* ── Primitives ──────────────────────────────────────────────────────── */

function ProgressSkeleton() {
  return (
    <Box className="space-y-4">
      <Box className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24" />)}
      </Box>
      <Box className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-56" /><Skeleton className="h-56" />
      </Box>
      <Skeleton className="h-44" />
      <Skeleton className="h-64" />
    </Box>
  );
}

function MiniBar({ value, tone = "bg-success" }) {
  return (
    <Box className="flex min-w-0 items-center gap-2">
      <Box className="h-1.5 min-w-[3rem] flex-1 overflow-hidden rounded-full bg-surface-3">
        <Box className={cn("h-full rounded-full", tone)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </Box>
      <Text as="span" className="w-10 shrink-0 whitespace-nowrap text-right text-[11px] font-semibold tabular-nums">{value}%</Text>
    </Box>
  );
}

function Dash() {
  return <Text as="span" className="text-text-3">—</Text>;
}

function Th({ children, className }) {
  return (
    <th className={cn("whitespace-nowrap px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-text-3", className)}>
      {children}
    </th>
  );
}

function CardHead({ title, sub, right }) {
  return (
    <Box className="flex items-start justify-between gap-4 border-b border-line px-4 py-3">
      <Box className="min-w-0">
        <Text as="h3" className="text-sm font-semibold leading-tight">{title}</Text>
        {sub && <Text as="p" className="mt-0.5 text-[11px] text-text-3">{sub}</Text>}
      </Box>
      {right}
    </Box>
  );
}

function EmptyRow({ colSpan, children }) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-10 text-center">
        <Text as="p" className="text-xs text-text-3">{children}</Text>
      </td>
    </tr>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   The page
──────────────────────────────────────────────────────────────────────── */
export function MyProgressContent() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("courses");

  useEffect(() => {
    if (!user) return;
    apiClient("/api/learner/progress").then(setData).catch((e) => setError(e.message));
  }, [user]);

  const { summary, learningHistory, learningHours, courseHistory, skills } = data || {};

  const atRisk = useMemo(() => {
    if (!courseHistory) return [];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return courseHistory
      .filter((c) => c.status !== "completed" && c.status !== "failed" && c.dueDate)
      .map((c) => {
        const day = String(c.dueDate).slice(0, 10);
        const [y, m, d] = day.split("-").map(Number);
        const due = y ? new Date(y, m - 1, d) : null;
        const days = due ? Math.round((due - today) / 86400000) : null;
        return { ...c, days };
      })
      .filter((c) => c.days !== null && c.days <= 14)
      .sort((a, b) => a.days - b.days);
  }, [courseHistory]);

  const skillGroups = useMemo(() => {
    const groups = (learningHistory?.paths ?? [])
      .map((p) => ({
        title: p.title,
        state: p.status === "complete" ? "earned" : p.status === "in_progress" ? "progress" : "locked",
        skills: String(p.skills ?? "").split(",").map((s) => s.trim()).filter(Boolean),
      }))
      .filter((g) => g.skills.length);
    if (groups.length) return groups;
    // Fall back to the flat skills earned from completed courses, as one group.
    const flat = Array.isArray(skills) ? skills : [];
    return flat.length ? [{ title: "Skills you have gained", state: "earned", skills: flat }] : [];
  }, [learningHistory, skills]);

  if (error) return (
    <Card className="p-8 text-center">
      <Text as="p" className="text-sm text-danger">{error}</Text>
      <Button size="sm" variant="outline" className="mt-3 cursor-pointer" onClick={() => window.location.reload()}>Retry</Button>
    </Card>
  );
  if (!data) return <ProgressSkeleton />;

  const counts = {
    courses: learningHistory.courses.length,
    paths: learningHistory.paths.length,
    sessions: learningHistory.sessions.length,
  };

  const diff = learningHours.diff;
  const DiffIcon = diff > 0 ? ArrowUp : diff < 0 ? ArrowDown : Minus;
  const diffTone = diff > 0 ? "text-success" : diff < 0 ? "text-warning" : "text-text-3";
  const avgWeek = Math.round((learningHours.thisMonth / 4.345) * 10) / 10;
  const overdue = atRisk.filter((c) => c.days < 0).length;
  const dueSoon = atRisk.length - overdue;

  return (
    <Box className="space-y-5">

      {/* ── KPI stat-cards ─────────────────────────────────────────── */}
      <Box className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiStatCard icon={Layers} tone="accent" value={summary.assigned} label="Courses assigned" sub={`${counts.courses} direct`} />
        <KpiStatCard icon={CheckCircle2} tone="success" value={summary.completed} label="Completed" sub={`${summary.completionRate}% of assigned`} />
        <KpiStatCard icon={TrendingUp} tone="success" value={`${summary.completionRate}%`} label="Completion rate" sub="Of assigned" />
        <KpiStatCard icon={Award} tone="warning" value={summary.avgScore !== null ? `${summary.avgScore}%` : "—"} label="Avg score" sub={summary.bestScore !== null ? `Best ${summary.bestScore}%` : "No scores yet"} />
        <KpiStatCard icon={Star} tone="rust" value={summary.certificates ?? 0} label="Certificates" sub="Earned" />
        <KpiStatCard icon={Clock} tone="accent" value={`${summary.allTimeHours}h`} label="All-time hours" sub="Across every course" />
      </Box>

      {/* ── Deadlines & At-Risk  +  Skills & Competencies ───────────── */}
      <Box className="grid items-start gap-4 lg:grid-cols-2">

        <Card className="gap-0 overflow-hidden p-0">
          <CardHead
            title="Deadlines & at-risk"
            sub="Assigned learning that is due soon or overdue"
            right={
              atRisk.length ? (
                <Text as="span" className="whitespace-nowrap rounded-full bg-danger/10 px-2.5 py-0.5 text-[11px] font-semibold text-danger">
                  {overdue} overdue · {dueSoon} due soon
                </Text>
              ) : (
                <Text as="span" className="whitespace-nowrap rounded-full bg-success/10 px-2.5 py-0.5 text-[11px] font-semibold text-success">
                  On track
                </Text>
              )
            }
          />
          <Box className="p-3">
            {atRisk.length === 0 ? (
              <Box className="px-2 py-6 text-center">
                <Text as="p" className="text-[13px] text-text-2">Nothing overdue or due within two weeks. You are all caught up.</Text>
              </Box>
            ) : (
              <Box className="flex flex-col gap-2">
                {atRisk.slice(0, 5).map((c) => {
                  const over = c.days < 0;
                  const label = over ? `${Math.abs(c.days)}d overdue` : c.days === 0 ? "Due today" : `Due in ${c.days}d`;
                  return (
                    <Box key={c.id} className="flex items-center gap-3 rounded-lg border border-line bg-surface-2 px-3 py-2.5">
                      <AlertTriangle className={cn("size-4 shrink-0", over ? "text-danger" : "text-warning")} />
                      <Box className="min-w-0 flex-1">
                        <Text as="p" className="truncate text-[13px] font-semibold text-ink">{c.name}</Text>
                        <Text as="p" className="mt-0.5 text-[11px] text-text-3">
                          {(STATUS_CFG[c.status]?.label ?? c.status)} · {c.progress}% done
                        </Text>
                      </Box>
                      <Text as="span" className={cn("whitespace-nowrap text-[11px] font-bold", over ? "text-danger" : "text-warning")}>{label}</Text>
                      <Link href="/my-courses">
                        <Button size="sm" variant="outline" className="h-7 cursor-pointer whitespace-nowrap px-2.5 text-[11px]">
                          Resume <ArrowRight className="ml-1 size-3" />
                        </Button>
                      </Link>
                    </Box>
                  );
                })}
              </Box>
            )}
          </Box>
        </Card>

        <Card className="gap-0 overflow-hidden p-0">
          <CardHead title="Skills & competencies" sub="What your learning paths build towards" />
          <Box className="p-4">
            {skillGroups.length === 0 ? (
              <Box className="px-2 py-6 text-center">
                <Text as="p" className="text-[13px] text-text-2">No competency paths assigned yet. Your admin builds these from existing courses.</Text>
              </Box>
            ) : (
              <>
                <Box className="flex flex-col gap-3.5">
                  {skillGroups.map((g) => (
                    <Box key={g.title}>
                      <Text as="p" className="mb-2 font-mono text-[10px] font-bold uppercase tracking-wide text-text-3">{g.title}</Text>
                      <Box className="flex flex-wrap gap-2">
                        {g.skills.map((s) => (
                          <SkillChip key={s} name={s} state={g.state} />
                        ))}
                      </Box>
                    </Box>
                  ))}
                </Box>
                <Box className="mt-3.5 flex gap-4 border-t border-line pt-3 text-[11px] text-text-3">
                  <Text as="span">✓ Earned</Text>
                  <Text as="span">◐ In progress</Text>
                  <Text as="span">○ Not started</Text>
                </Box>
              </>
            )}
          </Box>
        </Card>
      </Box>

      {/* ── Learning Hours ─────────────────────────────────────────── */}
      <Card className="gap-0 overflow-hidden p-0">
        <CardHead
          title="Learning hours"
          sub="This month against your goal"
          right={
            <Text as="span" className={cn(
              "whitespace-nowrap px-2 py-0.5 text-[11px] font-medium",
              learningHours.goalPct >= 100 ? "chip-complete" : learningHours.goalPct >= 50 ? "chip-warning" : "chip-idle",
            )}>
              {learningHours.statusLabel}
            </Text>
          }
        />
        <Box className="space-y-4 px-4 py-4">
          <Box>
            <Box className="h-2.5 overflow-hidden rounded-full bg-surface-3">
              <Box className="h-full rounded-full bg-warning" style={{ width: `${learningHours.goalPct}%` }} />
            </Box>
            <Box className="mt-1 flex items-center justify-between">
              <Text as="span" className="text-[10px] text-text-3">0h</Text>
              <Text as="span" className="text-[11px] font-medium text-text-2">{learningHours.goalPct}% of {learningHours.goal}h goal</Text>
              <Text as="span" className="text-[10px] text-text-3">{learningHours.goal}h</Text>
            </Box>
          </Box>

          <Box className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
            <HoursTile value={`${learningHours.thisMonth}h`} label="This month" tone="text-accent-blue"
              delta={<span className={cn("flex items-center justify-center gap-0.5", diffTone)}><DiffIcon className="size-3" />{Math.abs(diff)}h vs last</span>} />
            <HoursTile value={`${learningHours.lastMonth}h`} label="Last month" />
            <HoursTile value={`${learningHours.goal}h`} label="Monthly goal" />
            <HoursTile value={`${learningHours.remaining}h`} label="Remaining" tone={learningHours.remaining > 0 ? "text-warning" : "text-success"} />
            <HoursTile value={`${avgWeek}h`} label="Avg / week" />
            <HoursTile value={`${learningHours.allTime}h`} label="All time" />
          </Box>

          <Box className="flex items-start gap-2 rounded-lg border border-line bg-accent-tint px-3 py-2">
            <Lightbulb className="mt-px size-3.5 shrink-0 text-accent-blue" />
            <Text as="p" className="text-[11px] text-text-2">
              {learningHours.remaining > 0 ? (
                <>You need <Text as="span" className="font-semibold text-ink">{learningHours.remaining}h more</Text> to reach your {learningHours.goal}h goal this month.</>
              ) : (
                <>You have met this month&rsquo;s {learningHours.goal}h goal. Everything from here is ahead of it.</>
              )}
            </Text>
          </Box>
        </Box>
      </Card>

      {/* ── Learning History ───────────────────────────────────────── */}
      <Card className="gap-0 overflow-hidden p-0">
        <CardHead title="Learning history" sub="Your record across courses, paths and sessions" />

        <Box className="flex overflow-x-auto border-b border-line [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map(({ key, type, icon: Icon, label }) => {
            const active = tab === key;
            return (
              <Button key={key} variant="ghost" size="sm" onClick={() => setTab(key)}
                className={cn("-mb-px h-9 cursor-pointer gap-1.5 whitespace-nowrap border-b-2 px-4 text-xs font-medium",
                  active ? "border-accent-blue text-accent-blue hover:bg-transparent" : "border-transparent text-text-2 hover:bg-surface-2")}>
                <Icon className="h-3.5 w-3.5" style={{ color: LEARNING_TYPES[type].flat }} />
                {label}
                <Text as="span" className="tabular-nums text-text-3">{counts[key]}</Text>
              </Button>
            );
          })}
        </Box>

        <Box className="overflow-x-auto">
          {tab === "courses" && (
            <table className="w-full text-xs">
              <thead className="bg-surface-2">
                <tr><Th className="pl-4">Course</Th><Th>Status</Th><Th className="w-40">Progress</Th><Th>Score</Th><Th className="pr-4">Time spent</Th></tr>
              </thead>
              <tbody>
                {counts.courses === 0 ? <EmptyRow colSpan={5}>No courses assigned yet.</EmptyRow> : learningHistory.courses.map((c) => (
                  <tr key={c.id} className="border-t border-line">
                    <td className="max-w-[22rem] py-2.5 pl-4 pr-3 font-medium">
                      {c.name}
                      {c.completedExternally && <Text as="span" className="ml-2 text-[10px] text-text-3">completed externally</Text>}
                    </td>
                    <td className="px-3 py-2.5"><StatusChip status={c.status} /></td>
                    <td className="w-40 px-3 py-2.5">
                      <MiniBar value={c.progress} tone={c.status === "failed" ? "bg-danger" : c.status === "completed" ? "bg-success" : "bg-accent-blue"} />
                    </td>
                    <td className="px-3 py-2.5">
                      {c.score === null ? <Dash /> : <Text as="span" className={cn("font-bold", c.hasPassed === false ? "text-danger" : "text-success")}>{c.score}%</Text>}
                    </td>
                    <td className="px-3 py-2.5 pr-4 text-text-2">{c.timeSpent ?? <Dash />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === "paths" && (
            <table className="w-full text-xs">
              <thead className="bg-surface-2">
                <tr><Th className="pl-4">Learning path</Th><Th>Status</Th><Th className="w-40">Progress</Th><Th>Next step</Th><Th className="pr-4">Assigned</Th></tr>
              </thead>
              <tbody>
                {counts.paths === 0 ? (
                  <EmptyRow colSpan={5}>No learning paths assigned yet. Your admin builds these from existing courses.</EmptyRow>
                ) : learningHistory.paths.map((p) => (
                  <tr key={p.id} className="border-t border-line">
                    <td className="max-w-[22rem] py-2.5 pl-4 pr-3 font-medium">{p.title}</td>
                    <td className="px-3 py-2.5"><StatusChip status={p.status} /></td>
                    <td className="w-40 px-3 py-2.5"><MiniBar value={p.percent} tone={p.percent >= 100 ? "bg-success" : "bg-type-path"} /></td>
                    <td className="max-w-[16rem] truncate px-3 py-2.5 text-text-2">{p.current_step || <Dash />}</td>
                    <td className="px-3 py-2.5 pr-4 text-text-2">{isoDay(p.assigned_at) ?? <Dash />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === "sessions" && (
            <table className="w-full text-xs">
              <thead className="bg-surface-2">
                <tr><Th className="pl-4">Session</Th><Th>Type</Th><Th>Status</Th><Th>When</Th><Th>Trainer</Th><Th className="pr-4">Time spent</Th></tr>
              </thead>
              <tbody>
                {counts.sessions === 0 ? <EmptyRow colSpan={6}>No sessions booked yet.</EmptyRow> : learningHistory.sessions.map((s) => (
                  <tr key={s.id} className="border-t border-line">
                    <td className="max-w-[20rem] py-2.5 pl-4 pr-3 font-medium">{s.name}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-text-2">{sessionTypeLabel(s.sessionType)}</td>
                    <td className="px-3 py-2.5"><StatusChip status={s.status} /></td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-text-2">{isoDay(s.sessionDate) ?? <Dash />}</td>
                    <td className="max-w-[12rem] truncate px-3 py-2.5 text-text-2">{s.trainer || <Dash />}</td>
                    <td className="px-3 py-2.5 pr-4 text-text-2">{s.timeSpent ?? <Dash />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Box>
      </Card>
    </Box>
  );
}

function SkillChip({ name, state }) {
  const cfg =
    state === "earned"
      ? { cls: "bg-success/12 text-success border-success/30", mark: "✓" }
      : state === "progress"
        ? { cls: "bg-warning/12 text-warning border-warning/30", mark: "◐" }
        : { cls: "bg-surface-2 text-text-3 border-line", mark: "○" };
  return (
    <Text as="span" className={cn("rounded-full border px-3 py-1 text-[12px] font-semibold", cfg.cls)}>
      {cfg.mark} {name}
    </Text>
  );
}

function HoursTile({ value, label, tone, delta }) {
  return (
    <Box className="rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-center">
      <Text as="p" className={cn("text-xl font-bold leading-none", tone || "text-ink")}>{value}</Text>
      <Text as="p" className="mt-1 text-[10px] text-text-3">{label}</Text>
      {delta && <Text as="p" className="mt-1 text-[10px] font-semibold">{delta}</Text>}
    </Box>
  );
}

function isoDay(stamp) {
  const day = String(stamp ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
