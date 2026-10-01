"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Award, BookMarked, CheckCircle2, ChevronRight, Clock, FileText,
  ArrowRight, Percent, Send, TrendingUp, Users, UserCheck, UserPlus, AlertTriangle,
  RotateCcw, XCircle, CalendarCheck,
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

import Box from "@/components/ui/box";
import { Button } from "@/components/ui/button";
import Text from "@/components/ui/text";
import { Skeleton } from "@/components/ui/skeleton";
import { InsightPanel } from "@/components/admin/insights/insight-panel";
import { KpiStrip, StatTile } from "@/components/admin/insights/kpi-strip";
import {
  fetchActionRequired,
  fetchAdminDashboard,
  fetchRecentActivity,
} from "@/services/api/admin/admin-api";
import { BRAND, HAIRLINE, metricTone, NEUTRAL_TONE } from "@/lib/brand";
import { cn } from "@/lib/utils";

const STATUS_COLOR = {
  Completed: BRAND.success,
  "In Progress": BRAND.accent,
  "Not Started": BRAND.text3,
  Failed: BRAND.danger,
};

/** Activity group → the icon and tint the feed marks a row with. */
const ACTIVITY_LOOK = {
  users: { icon: UserPlus, tone: "tile-accent" },
  content: { icon: FileText, tone: "tile-success" },
  assign: { icon: Send, tone: "tile-warning" },
  sessions: { icon: CalendarCheck, tone: "tile-accent" },
  recognition: { icon: Award, tone: "tile-rust" },
};

/** Action kind → the icon beside the row. The label already says the rest. */
const ACTION_LOOK = {
  "not-started": { icon: AlertTriangle, tone: "tile-warning" },
  stalled: { icon: RotateCcw, tone: "tile-accent" },
  failed: { icon: XCircle, tone: "chip-error" },
};

function Panel({ title, subtitle, action, children, className }) {
  return (
    <Box className={cn("border border-line bg-surface", className)}>
      <Box className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
        <Box>
          <Text as="h3" className="text-[13px] font-bold text-ink">{title}</Text>
          {subtitle && (
            <Text as="p" className="mt-0.5 text-[11px] text-text-3">{subtitle}</Text>
          )}
        </Box>
        {action}
      </Box>
      {children}
    </Box>
  );
}

function DashboardSkeleton() {
  return (
    <Box className="space-y-4">
      <Skeleton className="h-[86px] w-full" />
      <Skeleton className="h-[150px] w-full" />
      <Box className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-[320px]" />
        <Skeleton className="h-[320px]" />
      </Box>
      <Skeleton className="h-[260px] w-full" />
    </Box>
  );
}

/**
 * The one period-scoped figure on this page. All four arrive together from
 * the same per-learner sum the month always came from (§10.4), so switching
 * costs no request and cannot switch which definition of an hour is in play.
 */
const HOURS_PERIODS = [
  { key: "weekly", label: "W", noun: "this week" },
  { key: "monthly", label: "M", noun: "this month" },
  { key: "quarterly", label: "Q", noun: "this quarter" },
  { key: "yearly", label: "Y", noun: "this year" },
];

export function AdminDashboardContent() {
  const [data, setData] = useState(null);
  const [hoursPeriod, setHoursPeriod] = useState("monthly");
  const [actions, setActions] = useState(null);
  const [activity, setActivity] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    fetchAdminDashboard()
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e.message || "Failed to load the dashboard"));

    // The two panels below the fold load independently, so the KPI strip is
    // never waiting on the slowest query on the page. Each fails to an empty
    // array rather than taking the whole dashboard down with it.
    fetchActionRequired()
      .then((d) => alive && setActions(d.items ?? []))
      .catch(() => alive && setActions([]));
    fetchRecentActivity({ limit: 8 })
      .then((d) => alive && setActivity(d.activity ?? []))
      .catch(() => alive && setActivity([]));

    return () => { alive = false; };
  }, []);

  if (error) {
    return (
      <Box className="border border-line bg-surface px-4 py-10 text-center">
        <Text as="p" className="text-sm text-danger">{error}</Text>
      </Box>
    );
  }
  if (!data) return <DashboardSkeleton />;

  const h = data.headline ?? {};
  const e = data.engagement ?? {};
  const statusData = (data.statusBreakdown ?? []).filter((s) => s.value > 0);
  const depts = data.deptCompletion ?? [];

  /* WHICH FIGURES CARRY A VERDICT, and which deliberately do not.
     A learner count and an in-progress count have no good direction —
     colouring them would spend the reader's attention on something that is
     not asking for it, and make the two that ARE asking harder to find. */
  const activePct = h.totalLearners ? Math.round((h.activeLearners / h.totalLearners) * 100) : null;
  const kpis = [
    { label: "Total learners", value: h.totalLearners ?? 0, icon: Users, tone: NEUTRAL_TONE },
    {
      label: "Active", value: h.activeLearners ?? 0, icon: UserCheck,
      hint: activePct !== null ? `${activePct}% of all learners` : undefined,
      tone: metricTone(activePct, { good: 80, warn: 60 }),
    },
    {
      label: "Completion", value: `${h.completionRate ?? 0}%`, icon: Percent,
      tone: metricTone(h.completionRate),
    },
    { label: "In progress", value: h.inProgress ?? 0, icon: TrendingUp, tone: NEUTRAL_TONE },
    {
      label: "Overdue", value: h.overdue ?? 0, icon: Clock,
      hint: (h.overdue ?? 0) > 0 ? "Needs attention" : "Nothing overdue",
      /* Zero overdue is genuinely GOOD and says so in green. A red zero is
         the false alarm §10.3.1.8 warns about, and it is the reason this
         tile was a flat rust before — it could not tell the two apart. */
      tone: metricTone(h.overdue ?? 0, { lowerIsBetter: true, warnAbove: 5 }),
    },
  ];

  return (
    <Box className="space-y-4">
      <KpiStrip items={kpis} />

      <InsightPanel
        insights={data.insights}
        subtitle="What the numbers are telling you right now"
        /* The dashboard says what is true NOW; Analytics says how it got
           there (BACKEND_STRUCTURE §10.12). A reader who has just been told
           something is wrong wants the trend behind it, and until now had to
           find it in the sidebar. */
        action={
          <Link href="/admin/analytics" className="shrink-0">
            <Button
              size="sm"
              className="h-8 cursor-pointer gap-1.5 bg-navy px-3.5 text-xs text-white hover:bg-navy-soft"
            >
              See full analytics<ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        }
      />

      <Box className="grid gap-4 lg:grid-cols-2">
        <Panel title="Completion status" subtitle="Overall learner distribution">
          <Box className="grid items-center gap-4 p-4 sm:grid-cols-[180px_1fr]">
            <Box className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="status"
                    innerRadius={52}
                    outerRadius={80}
                    paddingAngle={1}
                    stroke="none"
                  >
                    {statusData.map((s) => (
                      <Cell key={s.status} fill={STATUS_COLOR[s.status] ?? BRAND.navy} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: BRAND.surface,
                      border: `1px solid ${BRAND.line}`,
                      borderRadius: 0,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </Box>

            <Box className="space-y-2.5">
              {(data.statusBreakdown ?? []).map((s) => {
                const total = (data.statusBreakdown ?? []).reduce((a, x) => a + x.value, 0);
                const pct = total ? Math.round((s.value / total) * 100) : 0;
                return (
                  <Box key={s.status}>
                    <Box className="flex items-baseline justify-between gap-2">
                      <Text as="span" className="text-[12.5px] text-ink">{s.status}</Text>
                      <Text as="span" className="text-[12.5px] text-text-2">
                        <Text as="span" className="font-bold text-ink">{s.value}</Text>{" "}
                        ({pct}%)
                      </Text>
                    </Box>
                    {/* A track that is always full width with a fill inside it:
                        a bare bar would make 0% invisible rather than empty. */}
                    <Box className="mt-1 h-1.5 w-full bg-surface-3">
                      <Box
                        className="h-full"
                        style={{
                          width: `${pct}%`,
                          background: STATUS_COLOR[s.status] ?? BRAND.navy,
                        }}
                      />
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Box>
        </Panel>

        <Panel
          title="Engagement snapshot"
          subtitle="Key performance indicators"
          /* ONE tile here is period-scoped and the rest are all-time, so
             the control sits on the panel and its effect is named on the
             tile it moves. A selector over figures it cannot change would
             be the control that lies (§10.3.1.2). */
          action={
            <Box className="flex border border-line">
              {HOURS_PERIODS.map((p) => (
                <Button
                  key={p.key}
                  variant="ghost" size="sm"
                  onClick={() => setHoursPeriod(p.key)}
                  className={cn(
                    "h-6 cursor-pointer px-2 text-[10px] font-medium",
                    hoursPeriod === p.key ? "bg-navy text-white hover:bg-navy" : "hover:bg-surface-2",
                  )}
                >
                  {p.label}
                </Button>
              ))}
            </Box>
          }
        >
          <Box className="grid grid-cols-2 gap-2.5 p-4">
            {/* Two of these six are scored and four are scale. Only the
                scored ones take a verdict colour. */}
            <StatTile label="Avg assessment score" value={`${e.avgScore ?? 0}%`} hint="Organisation average" icon={Percent}
              tone={metricTone(e.avgScore)} />
            <StatTile label="Pass rate" value={`${e.passRate ?? 0}%`} hint="Of assessed learners" icon={CheckCircle2}
              tone={metricTone(e.passRate)} />
            <StatTile label="Total learning hours" value={`${e.totalHours ?? 0}h`} hint="All time, org-wide" icon={Clock} />
            <StatTile label="Avg hours / learner" value={`${e.avgHoursPerLearner ?? 0}h`} hint="All time" icon={TrendingUp} />
            <StatTile
              label={`Hours ${HOURS_PERIODS.find((p) => p.key === hoursPeriod).noun}`}
              value={`${e.hoursByPeriod?.[hoursPeriod] ?? e.hoursThisMonth ?? 0}h`}
              hint="Org-wide"
              icon={Clock}
            />
            <StatTile label="Certificates issued" value={e.certificatesIssued ?? 0} hint="All time" icon={Award} />
          </Box>
        </Panel>
      </Box>

      <Panel
        title="Department progress"
        subtitle="Completion & engagement by department"
        action={
          <Link
            href="/admin/departments"
            className="flex items-center gap-1 text-[12px] font-semibold text-accent-blue hover:underline"
          >
            View all <ChevronRight className="size-3.5" />
          </Link>
        }
      >
        {/* Borders on the cells, not a `gap-px` over a coloured container: a
            short final row would otherwise leave the container's grey showing
            through where the missing cells would have been. */}
        <Box className="grid border-b border-line sm:grid-cols-2 xl:grid-cols-4">
          {depts.map((d) => {
            /* The whole point of this grid is spotting the department that
               is behind. One accent blue across all of them made that a
               reading exercise rather than a glance. */
            const t = metricTone(d.pct);
            return (
            <Box key={d.dept} className="border-b border-r border-line bg-surface px-4 py-3 last:border-r-0">
              <Text as="p" className="text-[12.5px] font-semibold text-ink">{d.dept}</Text>
              <Text as="p" className={cn("mt-1 text-2xl font-bold leading-none", t.text)}>
                {d.pct}%
              </Text>
              <Text as="p" className="mt-1 text-[11px] text-text-3">
                {d.completed}/{d.total} completed
              </Text>
              <Box className="mt-2 h-1.5 w-full bg-surface-3">
                <Box className={cn("h-full", t.bar)} style={{ width: `${d.pct}%` }} />
              </Box>
              <Box className="mt-1.5 flex justify-between text-[10.5px] text-text-3">
                <Text as="span">{d.in_progress} in progress</Text>
                <Text as="span">{d.hours_learning}h learning</Text>
              </Box>
            </Box>
          );})}
        </Box>

        {depts.length > 0 && (
          <Box className="h-[220px] p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={depts} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={HAIRLINE} vertical={false} />
                <XAxis dataKey="dept" tick={{ fontSize: 11, fill: BRAND.text2 }} tickLine={false} axisLine={{ stroke: HAIRLINE }} />
                <YAxis tick={{ fontSize: 11, fill: BRAND.text2 }} tickLine={false} axisLine={false} unit="%" />
                <Tooltip
                  cursor={{ fill: BRAND.surface2 }}
                  contentStyle={{ background: BRAND.surface, border: `1px solid ${BRAND.line}`, borderRadius: 0, fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="pct" name="Completed %" fill={BRAND.accent} maxBarSize={38} />
                <Bar dataKey="in_progress_pct" name="In progress %" fill={BRAND.navy} maxBarSize={38} />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        )}
      </Panel>

      <Box className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Action required"
          subtitle={actions ? `${actions.length} item${actions.length === 1 ? "" : "s"} need attention` : "Loading…"}
          /* The one panel on the page whose whole reason to exist is that
             somebody has to do something. The count is stated in its own
             colour so the panel announces itself from across the page —
             and goes green at zero rather than red, because "nothing needs
             attention" is the good outcome, not a missing number. */
          action={actions ? (
            <Text
              as="span"
              className={cn(
                "px-2 py-0.5 text-[11px] font-bold",
                metricTone(actions.length, { lowerIsBetter: true, warnAbove: 3 }).key === "good"
                  ? "chip-complete"
                  : metricTone(actions.length, { lowerIsBetter: true, warnAbove: 3 }).key === "warn"
                    ? "chip-warning"
                    : "chip-error",
              )}
            >
              {actions.length}
            </Text>
          ) : null}
        >
          {!actions ? (
            <Box className="space-y-2 p-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
            </Box>
          ) : actions.length === 0 ? (
            <Box className="px-4 py-10 text-center">
              <CheckCircle2 className="mx-auto mb-2 size-7 text-success" />
              <Text as="p" className="text-[12.5px] text-text-2">
                Nothing needs chasing. Every learner is on track.
              </Text>
            </Box>
          ) : (
            <Box className="max-h-[420px] divide-y divide-line overflow-y-auto">
              {actions.map((a, i) => {
                const look = ACTION_LOOK[a.kind] ?? ACTION_LOOK["not-started"];
                const Icon = look.icon;
                return (
                  <Box key={`${a.user_id}-${a.course_id}-${i}`} className="flex items-center gap-3 px-4 py-2.5">
                    <Box className={cn("flex size-7 shrink-0 items-center justify-center", look.tone)}>
                      <Icon className="size-3.5" />
                    </Box>
                    <Box className="min-w-0 flex-1">
                      <Text as="p" className="truncate text-[12.5px] font-semibold text-ink">
                        {a.name}
                      </Text>
                      <Text as="p" className="truncate text-[11px] text-text-3">
                        {a.department ? `${a.department} · ` : ""}{a.course_name}
                      </Text>
                      <Text as="p" className="truncate text-[11px] text-text-2">{a.reason}</Text>
                    </Box>
                    {/* A label, not a button. Nudging is not built, and a
                        button that does nothing is worse than no button. */}
                    <Text
                      as="span"
                      className="shrink-0 border border-line px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-text-2"
                    >
                      {a.action}
                    </Text>
                  </Box>
                );
              })}
            </Box>
          )}
        </Panel>

        <Panel title="Recent activity" subtitle="Latest admin actions">
          {!activity ? (
            <Box className="space-y-2 p-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
            </Box>
          ) : activity.length === 0 ? (
            <Box className="px-4 py-10 text-center">
              <Text as="p" className="text-[12.5px] text-text-3">
                No activity recorded yet. Entries appear here as your team creates
                users, publishes courses and assigns learning.
              </Text>
            </Box>
          ) : (
            <Box className="divide-y divide-line">
              {activity.map((a) => {
                const look = ACTIVITY_LOOK[a.group] ?? ACTIVITY_LOOK.content;
                const Icon = look.icon;
                return (
                  <Box key={a.id} className="flex items-start gap-3 px-4 py-2.5">
                    <Box className={cn("flex size-7 shrink-0 items-center justify-center", look.tone)}>
                      <Icon className="size-3.5" />
                    </Box>
                    <Box className="min-w-0 flex-1">
                      <Text as="p" className="text-[12.5px] font-semibold text-ink">{a.title}</Text>
                      {a.detail && (
                        <Text as="p" className="truncate text-[11px] text-text-2">{a.detail}</Text>
                      )}
                      <Text as="p" className="text-[11px] text-text-3">
                        {a.actor_name} · {formatWhen(a.created_at)}
                      </Text>
                    </Box>
                    <Text
                      as="span"
                      className="shrink-0 font-mono text-[9.5px] uppercase tracking-[0.12em] text-text-3"
                    >
                      {a.group}
                    </Text>
                  </Box>
                );
              })}
            </Box>
          )}
        </Panel>
      </Box>
    </Box>
  );
}

/** `28 Apr 2026, 09:14` — the reference's format, in the user's locale. */
function formatWhen(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
