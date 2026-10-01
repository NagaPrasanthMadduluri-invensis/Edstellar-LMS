"use client";

import { apiClient } from "@/lib/api-client";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Layers, CheckCircle2, TrendingUp, Award, Star, Clock,
  ArrowUp, ArrowDown, Minus, Lightbulb, BookOpen, Route, CalendarDays,
  ClipboardCheck, Play, Bookmark, Package, Target,
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { BRAND, HAIRLINE, LEARNING_TYPES, LEARNING_TYPE_ORDER } from "@/lib/brand";
import { sessionTypeLabel } from "@/lib/session-types";

/* ────────────────────────────────────────────────────────────────────────
   Status vocabulary — the five from TASTE §10.3, no sixth hue.
──────────────────────────────────────────────────────────────────────── */
const STATUS_CFG = {
  "not started": { label: "not started", cls: "chip-idle" },
  "in progress": { label: "in progress", cls: "chip-progress" },
  completed:     { label: "completed",   cls: "chip-complete" },
  failed:        { label: "failed",      cls: "chip-error" },
  cancelled:     { label: "cancelled",   cls: "chip-error" },
  upcoming:      { label: "upcoming",    cls: "chip-idle" },
};

function StatusChip({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG["not started"];
  return (
    <Text as="span" className={cn("inline-block px-2 py-0.5 text-[11px] font-medium", cfg.cls)}>
      {cfg.label}
    </Text>
  );
}

/* The three tabs, and the colour each one owns. The hue comes from the
   learning-type tokens (globals.css) via lib/brand.js — never picked here,
   so the tab, the table, the yearly column and the chart series all say
   "sessions" in the same green. */
const TABS = [
  { key: "courses",  type: "course",  icon: BookOpen,     label: "Courses" },
  { key: "paths",    type: "path",    icon: Route,        label: "Learning Paths" },
  { key: "sessions", type: "session", icon: CalendarDays, label: "Sessions" },
];

const TIMELINE_CFG = {
  lesson:     { icon: Play,           color: "text-accent-blue" },
  assessment: { icon: ClipboardCheck, color: "text-navy" },
  assignment: { icon: Bookmark,       color: "text-text-3" },
  scorm:      { icon: Package,        color: "text-text-2" },
};

const GRANULARITIES = [
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
  { key: "quarterly", label: "Quarterly" },
  { key: "yearly", label: "Yearly" },
];

/* ── Primitives ──────────────────────────────────────────────────────── */

function ProgressSkeleton() {
  return (
    <Box className="space-y-4">
      <Box className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-line">
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16" />)}
      </Box>
      <Skeleton className="h-64" />
      <Skeleton className="h-44" />
      <Skeleton className="h-40" />
      <Box className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-56" /><Skeleton className="h-56" />
      </Box>
    </Box>
  );
}

/** A stat tile: small coloured glyph, the figure, what it is. */
function StatTile({ icon: Icon, tone, value, label }) {
  return (
    <Box className="bg-surface px-4 py-3">
      <Icon className={cn("h-3.5 w-3.5 mb-1.5", tone)} />
      <Text as="p" className="text-lg font-bold leading-none">{value}</Text>
      <Text as="p" className="text-[11px] text-text-3 mt-1">{label}</Text>
    </Box>
  );
}

/** A progress bar sized to a table cell. */
function MiniBar({ value, tone = "bg-success" }) {
  return (
    <Box className="flex items-center gap-2 min-w-0">
      <Box className="flex-1 h-1.5 bg-surface-3 overflow-hidden min-w-[3rem]">
        <Box className={cn("h-full", tone)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </Box>
      <Text as="span" className="text-[11px] font-semibold shrink-0 w-10 text-right tabular-nums whitespace-nowrap">{value}%</Text>
    </Box>
  );
}

/** A figure with nothing behind it renders an em dash, never a zero. */
function Dash() {
  return <Text as="span" className="text-text-3">—</Text>;
}

function Th({ children, className }) {
  return (
    <th className={cn(
      "text-left font-semibold text-[10px] tracking-wider text-text-3 uppercase py-2 px-3 whitespace-nowrap",
      className,
    )}>
      {children}
    </th>
  );
}

function SegmentedControl({ value, onChange, options }) {
  return (
    <Box className="flex border border-line">
      {options.map((o) => (
        <Button
          key={o.key}
          variant="ghost" size="sm"
          className={cn(
            "h-7 px-2.5 text-[11px] font-medium cursor-pointer",
            value === o.key ? "bg-navy text-white hover:bg-navy" : "hover:bg-surface-2",
          )}
          onClick={() => onChange(o.key)}
        >
          {o.label}
        </Button>
      ))}
    </Box>
  );
}

function CardHead({ title, sub, right }) {
  return (
    <Box className="flex items-start justify-between gap-4 px-4 py-3 border-b border-line">
      <Box className="min-w-0">
        <Text as="h3" className="text-sm font-semibold leading-tight">{title}</Text>
        {sub && <Text as="p" className="text-[11px] text-text-3 mt-0.5">{sub}</Text>}
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

/* Recharts tooltips: one style, and it renders hours the way the tables do. */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <Box className="border border-line bg-surface px-3 py-2">
      <Text as="p" className="text-[11px] font-semibold mb-1">{label}</Text>
      {payload.map((p) => (
        <Box key={p.dataKey} className="flex items-center gap-2">
          <Box className="w-2 h-2" style={{ background: p.color || p.fill }} />
          <Text as="span" className="text-[11px] text-text-2">{p.name}</Text>
          <Text as="span" className="text-[11px] font-semibold ml-auto tabular-nums">{p.value}h</Text>
        </Box>
      ))}
    </Box>
  );
}

const AXIS = { fontSize: 10, fill: BRAND.text3 };

/* ────────────────────────────────────────────────────────────────────────
   The page
──────────────────────────────────────────────────────────────────────── */
export function MyProgressContent() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("courses");
  const [trendGrain, setTrendGrain] = useState("monthly");
  const [typeGrain, setTypeGrain] = useState("weekly");

  useEffect(() => {
    if (!user) return;
    apiClient("/api/learner/progress").then(setData).catch((e) => setError(e.message));
  }, [user]);

  const { summary, learningHistory, learningHours, hoursByPeriod, hoursByYear } = data || {};

  const trendRows = useMemo(
    () => hoursByPeriod?.[trendGrain] ?? [],
    [hoursByPeriod, trendGrain],
  );
  const typeRows = useMemo(
    () => hoursByPeriod?.[typeGrain] ?? [],
    [hoursByPeriod, typeGrain],
  );

  if (error) return (
    <Card className="p-8 text-center">
      <Text as="p" className="text-danger text-sm">{error}</Text>
      <Button size="sm" variant="outline" className="mt-3 cursor-pointer" onClick={() => window.location.reload()}>
        Retry
      </Button>
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

  const statTiles = [
    { icon: Layers,       tone: "text-accent-blue", value: summary.assigned,  label: "Courses Assigned" },
    { icon: CheckCircle2, tone: "text-success",     value: summary.completed, label: "Completed" },
    { icon: TrendingUp,   tone: "text-success",     value: `${summary.completionRate}%`, label: "Completion Rate" },
    { icon: Award,        tone: "text-warning",     value: summary.avgScore  !== null ? `${summary.avgScore}%`  : "—", label: "Avg Score" },
    { icon: Star,         tone: "text-warning",     value: summary.bestScore !== null ? `${summary.bestScore}%` : "—", label: "Best Score" },
    { icon: Clock,        tone: "text-rust",        value: `${summary.allTimeHours}h`, label: "All-Time Hours" },
  ];

  return (
    <Box className="space-y-4">

      {/* ── Stat strip ─────────────────────────────────────────────── */}
      <Box className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-line border border-line">
        {statTiles.map((t) => <StatTile key={t.label} {...t} />)}
      </Box>

      {/* ── Learning History ───────────────────────────────────────── */}
      <Card className="p-0 gap-0 overflow-hidden">
        <CardHead
          title="Learning History"
          sub="Your record across courses, paths and sessions"
        />

        {/* Tabs. The count rides on the tab so an empty one says so before
            it is opened, rather than after. */}
        <Box className="flex border-b border-line overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map(({ key, type, icon: Icon, label }) => {
            const active = tab === key;
            return (
              <Button
                key={key}
                variant="ghost" size="sm"
                onClick={() => setTab(key)}
                className={cn(
                  "h-9 gap-1.5 px-4 text-xs font-medium border-b-2 -mb-px cursor-pointer whitespace-nowrap",
                  active
                    ? "border-accent-blue text-accent-blue hover:bg-transparent"
                    : "border-transparent text-text-2 hover:bg-surface-2",
                )}
              >
                <Icon className="h-3.5 w-3.5" style={{ color: LEARNING_TYPES[type].flat }} />
                {label}
                <Text as="span" className="text-text-3 tabular-nums">{counts[key]}</Text>
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
                {counts.courses === 0 ? (
                  <EmptyRow colSpan={5}>No courses assigned yet.</EmptyRow>
                ) : learningHistory.courses.map((c) => (
                  <tr key={c.id} className="border-t border-line">
                    <td className="py-2.5 pl-4 pr-3 font-medium max-w-[22rem]">
                      {c.name}
                      {/* An external certification IS a completed course here
                          (§10.26) — saying which keeps the row from claiming
                          this platform delivered the training. */}
                      {c.completedExternally && (
                        <Text as="span" className="ml-2 text-[10px] text-text-3">completed externally</Text>
                      )}
                    </td>
                    <td className="py-2.5 px-3"><StatusChip status={c.status} /></td>
                    <td className="py-2.5 px-3 w-40">
                      <MiniBar
                        value={c.progress}
                        tone={c.status === "failed" ? "bg-danger" : c.status === "completed" ? "bg-success" : "bg-accent-blue"}
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      {c.score === null ? <Dash /> : (
                        <Text as="span" className={cn("font-bold", c.hasPassed === false ? "text-danger" : "text-success")}>
                          {c.score}%
                        </Text>
                      )}
                    </td>
                    <td className="py-2.5 px-3 pr-4 text-text-2">{c.timeSpent ?? <Dash />}</td>
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
                  <EmptyRow colSpan={5}>
                    No learning paths assigned yet. Your admin builds these from existing courses.
                  </EmptyRow>
                ) : learningHistory.paths.map((p) => (
                  <tr key={p.id} className="border-t border-line">
                    <td className="py-2.5 pl-4 pr-3 font-medium max-w-[22rem]">{p.title}</td>
                    <td className="py-2.5 px-3"><StatusChip status={p.status} /></td>
                    <td className="py-2.5 px-3 w-40">
                      <MiniBar value={p.percent} tone={p.percent >= 100 ? "bg-success" : "bg-type-path"} />
                    </td>
                    <td className="py-2.5 px-3 text-text-2 max-w-[16rem] truncate">
                      {p.current_step || <Dash />}
                    </td>
                    <td className="py-2.5 px-3 pr-4 text-text-2">{isoDay(p.assigned_at) ?? <Dash />}</td>
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
                {counts.sessions === 0 ? (
                  <EmptyRow colSpan={6}>No sessions booked yet.</EmptyRow>
                ) : learningHistory.sessions.map((s) => (
                  <tr key={s.id} className="border-t border-line">
                    <td className="py-2.5 pl-4 pr-3 font-medium max-w-[20rem]">{s.name}</td>
                    <td className="py-2.5 px-3 text-text-2 whitespace-nowrap">{sessionTypeLabel(s.sessionType)}</td>
                    <td className="py-2.5 px-3"><StatusChip status={s.status} /></td>
                    <td className="py-2.5 px-3 text-text-2 whitespace-nowrap">{isoDay(s.sessionDate) ?? <Dash />}</td>
                    <td className="py-2.5 px-3 text-text-2 max-w-[12rem] truncate">{s.trainer || <Dash />}</td>
                    <td className="py-2.5 px-3 pr-4 text-text-2">{s.timeSpent ?? <Dash />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Box>

        {/* There is deliberately NO progress bar on a session. A learner
            cannot move it — the trainer marks them present (§10.3.1.17) —
            so a 0% bar would read as their own inaction. */}
      </Card>

      {/* ── Learning Hours ─────────────────────────────────────────── */}
      <Card className="p-0 gap-0 overflow-hidden">
        <CardHead
          title="Learning Hours"
          sub="Monthly goal and trend"
          right={
            <Text as="span" className={cn(
              "px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
              learningHours.goalPct >= 100 ? "chip-complete" : learningHours.goalPct >= 50 ? "chip-warning" : "chip-idle",
            )}>
              {learningHours.statusLabel}
            </Text>
          }
        />

        <Box className="px-4 py-4 space-y-4">
          {/* Goal meter */}
          <Box>
            <Box className="h-2.5 bg-surface-3 overflow-hidden">
              <Box className="h-full bg-warning" style={{ width: `${learningHours.goalPct}%` }} />
            </Box>
            <Box className="flex items-center justify-between mt-1">
              <Text as="span" className="text-[10px] text-text-3">0h</Text>
              <Text as="span" className="text-[11px] font-medium text-text-2">
                {learningHours.goalPct}% of {learningHours.goal}h goal
              </Text>
              <Text as="span" className="text-[10px] text-text-3">{learningHours.goal}h</Text>
            </Box>
          </Box>

          {/* Three figures */}
          <Box className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr_1fr] items-stretch gap-3">
            <Box className="border border-line py-3 text-center">
              <Text as="p" className="text-xl font-bold text-accent-blue">{learningHours.thisMonth}h</Text>
              <Text as="p" className="text-[10px] text-text-3 mt-0.5">This Month</Text>
            </Box>
            <Box className="hidden sm:flex items-center justify-center px-1">
              <DiffIcon className={cn("h-4 w-4", diffTone)} />
            </Box>
            <Box className="border border-line py-3 text-center">
              <Text as="p" className="text-xl font-bold">{learningHours.lastMonth}h</Text>
              <Text as="p" className="text-[10px] text-text-3 mt-0.5">Last Month</Text>
            </Box>
            <Box className="border border-line py-3 text-center">
              <Text as="p" className="text-xl font-bold">{learningHours.allTime}h</Text>
              <Text as="p" className="text-[10px] text-text-3 mt-0.5">All Time</Text>
            </Box>
          </Box>

          {/* What is left to do, in a sentence */}
          <Box className="flex items-start gap-2 border border-line bg-accent-tint px-3 py-2">
            <Lightbulb className="h-3.5 w-3.5 text-accent-blue mt-px shrink-0" />
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

      {/* ── Yearly summary ─────────────────────────────────────────── */}
      <Card className="p-0 gap-0 overflow-hidden">
        <CardHead title="Yearly Learning Hours Summary" sub="Your hours by kind of learning, year on year" />
        <Box className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-surface-2">
              <tr>
                <Th className="pl-4">Year</Th>
                {LEARNING_TYPE_ORDER.map((k) => <Th key={k}>{LEARNING_TYPES[k].label}</Th>)}
                <Th>Total</Th>
                <Th className="pr-4">Vs goal</Th>
              </tr>
            </thead>
            <tbody>
              {hoursByYear.length === 0 ? (
                <EmptyRow colSpan={6}>No learning hours recorded yet.</EmptyRow>
              ) : hoursByYear.map((row) => (
                <tr key={row.year} className="border-t border-line">
                  <td className="py-2.5 pl-4 pr-3 font-semibold whitespace-nowrap">
                    {row.year}{row.isCurrent && <Text as="span" className="ml-1 font-normal text-text-3">(YTD)</Text>}
                  </td>
                  {LEARNING_TYPE_ORDER.map((k) => (
                    <td key={k} className="py-2.5 px-3 font-medium tabular-nums" style={{ color: LEARNING_TYPES[k].flat }}>
                      {row[k] > 0 ? `${row[k]}h` : <Dash />}
                    </td>
                  ))}
                  <td className="py-2.5 px-3 font-bold tabular-nums">{row.total}h</td>
                  <td className={cn(
                    "py-2.5 px-3 pr-4 font-medium whitespace-nowrap",
                    row.goalPct >= 100 ? "text-success" : row.goalPct >= 50 ? "text-warning" : "text-danger",
                  )}>
                    {row.goalPct}% of {row.isCurrent ? "the year so far" : `${row.year} goal`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Box>
        {/* Why there is no Webinars column: `sessions.session_type` accepts
            ILT and Virtual only, so the column would be zero on every row
            for every learner — the empty-column failure. The colour is
            reserved in globals.css for the day the enum gains it. */}
      </Card>

      {/* ── Two charts ─────────────────────────────────────────────── */}
      <Box className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Trend */}
        <Card className="p-0 gap-0 overflow-hidden">
          <CardHead
            title="My Learning Trend"
            sub="Your total hours over time"
            right={<SegmentedControl value={trendGrain} onChange={setTrendGrain} options={GRANULARITIES} />}
          />
          <Box className="px-2 pt-4 pb-2">
            {trendRows.length < 3 ? (
              <ChartNote rows={trendRows.length} />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={trendRows} margin={{ top: 4, right: 12, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke={HAIRLINE} vertical={false} />
                  <XAxis dataKey="label" tick={AXIS} axisLine={{ stroke: HAIRLINE }} tickLine={false} />
                  <YAxis tick={AXIS} axisLine={false} tickLine={false} unit="h" width={44} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone" dataKey="total" name="Hours"
                    stroke={BRAND.accent} fill={BRAND.accent} fillOpacity={0.12} strokeWidth={2}
                    dot={{ r: 2.5, fill: BRAND.accent, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Box>
        </Card>

        {/* Stacked by kind */}
        <Card className="p-0 gap-0 overflow-hidden">
          <CardHead
            title="Hours by Learning Type"
            sub="The same hours, split by what they came from"
            right={<SegmentedControl value={typeGrain} onChange={setTypeGrain} options={GRANULARITIES} />}
          />
          <Box className="px-2 pt-4 pb-2">
            {typeRows.length === 0 ? (
              <ChartNote rows={0} />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={typeRows} margin={{ top: 4, right: 12, left: -18, bottom: 0 }}>
                    <CartesianGrid stroke={HAIRLINE} vertical={false} />
                    <XAxis dataKey="label" tick={AXIS} axisLine={{ stroke: HAIRLINE }} tickLine={false} />
                    <YAxis tick={AXIS} axisLine={false} tickLine={false} unit="h" width={44} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
                    {LEARNING_TYPE_ORDER.map((k) => (
                      <Bar
                        key={k} dataKey={k} name={LEARNING_TYPES[k].label}
                        stackId="hours" fill={LEARNING_TYPES[k].chart}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
                <Box className="flex items-center justify-center gap-4 pb-2 pt-1">
                  {LEARNING_TYPE_ORDER.map((k) => (
                    <Box key={k} className="flex items-center gap-1.5">
                      <Box className="w-2.5 h-2.5" style={{ background: LEARNING_TYPES[k].chart }} />
                      <Text as="span" className="text-[10px] text-text-2">{LEARNING_TYPES[k].label}</Text>
                    </Box>
                  ))}
                </Box>
              </>
            )}
          </Box>
        </Card>
      </Box>

      {/* ── Timeline ───────────────────────────────────────────────── */}
      <Card className="p-0 gap-0 overflow-hidden">
        <CardHead title="Learning Activity Timeline" sub="Your most recent activity, newest first" />
        <Box className="px-4 py-4">
          {data.timeline.length === 0 ? (
            <Box className="py-8 text-center">
              <Target className="h-7 w-7 mx-auto text-line-strong mb-2" />
              <Text as="p" className="text-xs text-text-3">No activity yet. Open a course to get started.</Text>
            </Box>
          ) : (
            <Box className="relative">
              <Box className="absolute left-[11px] top-1 bottom-1 w-px bg-line" />
              <Box>
                {data.timeline.map((item, i) => {
                  const cfg = TIMELINE_CFG[item.type] || TIMELINE_CFG.assignment;
                  const Icon = cfg.icon;
                  return (
                    <Box key={i} className="flex items-start gap-3 pb-4 last:pb-0">
                      <Box className="w-[23px] h-[23px] border border-line bg-surface flex items-center justify-center shrink-0 z-10">
                        <Icon className={cn("h-3 w-3", cfg.color)} />
                      </Box>
                      <Box className="min-w-0 pt-0.5">
                        <Text as="p" className="text-xs font-medium leading-snug">{item.title}</Text>
                        <Text as="p" className="text-[11px] text-text-3 mt-0.5">{item.timeLabel}</Text>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          )}
        </Box>
      </Card>
    </Box>
  );
}

/**
 * Two points are a line segment, not a trend — the same refusal §10.12
 * records as `sufficient: false` on the admin analytics. Saying so beats
 * drawing a chart that invites a conclusion the data cannot support.
 */
function ChartNote({ rows }) {
  return (
    <Box className="h-[220px] flex items-center justify-center px-6">
      <Text as="p" className="text-xs text-text-3 text-center">
        {rows === 0
          ? "No learning hours recorded yet."
          : `Only ${rows} period${rows === 1 ? "" : "s"} of activity at this granularity — too few to draw a trend. Try a finer one.`}
      </Text>
    </Box>
  );
}

/**
 * Postgres timestamps are not ISO — `2026-09-12 14:50:57.807+00` has a space
 * and a `+00` that `new Date()` rejects, which TASTE §10.3.1.15 records as a
 * whole column of em dashes on a screen being sent real dates. Only the date
 * is shown, so take the first ten characters and build from the parts.
 */
function isoDay(stamp) {
  const day = String(stamp ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}
