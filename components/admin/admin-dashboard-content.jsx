"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Award, BookMarked, CheckCircle2, ChevronRight, Clock, FileText,
  Percent, Send, TrendingUp, Users, UserCheck, UserPlus, AlertTriangle,
  RotateCcw, XCircle, CalendarCheck,
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

import Box from "@/components/ui/box";
import Text from "@/components/ui/text";
import { Skeleton } from "@/components/ui/skeleton";
import { InsightPanel } from "@/components/admin/insights/insight-panel";
import { KpiStrip, StatTile } from "@/components/admin/insights/kpi-strip";
import {
  fetchActionRequired,
  fetchAdminDashboard,
  fetchRecentActivity,
} from "@/services/api/admin/admin-api";
import { BRAND, HAIRLINE } from "@/lib/brand";
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

export function AdminDashboardContent() {
  const [data, setData] = useState(null);
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

  const kpis = [
    { label: "Total learners", value: h.totalLearners ?? 0, icon: Users, tone: "tile-accent" },
    { label: "Active", value: h.activeLearners ?? 0, icon: UserCheck, tone: "tile-success" },
    { label: "Assigned", value: h.assigned ?? 0, icon: Send, tone: "tile-accent" },
    { label: "Completion", value: `${h.completionRate ?? 0}%`, icon: Percent, tone: "tile-success" },
    { label: "In progress", value: h.inProgress ?? 0, icon: TrendingUp, tone: "tile-accent" },
    { label: "Overdue", value: h.overdue ?? 0, icon: Clock, tone: "tile-rust" },
  ];

  return (
    <Box className="space-y-4">
      <KpiStrip items={kpis} />

      <InsightPanel
        insights={data.insights}
        subtitle="What the numbers are telling you right now"
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

        <Panel title="Engagement snapshot" subtitle="Key performance indicators">
          <Box className="grid grid-cols-2 gap-2.5 p-4">
            <StatTile label="Avg assessment score" value={`${e.avgScore ?? 0}%`} hint="Organisation average" icon={Percent} />
            <StatTile label="Pass rate" value={`${e.passRate ?? 0}%`} hint="Of assessed learners" icon={CheckCircle2} />
            <StatTile label="Total learning hours" value={`${e.totalHours ?? 0}h`} hint="All time, org-wide" icon={Clock} />
            <StatTile label="Avg hours / learner" value={`${e.avgHoursPerLearner ?? 0}h`} hint="All time" icon={TrendingUp} />
            <StatTile label="Hours this month" value={`${e.hoursThisMonth ?? 0}h`} hint="Org-wide" icon={Clock} />
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
          {depts.map((d) => (
            <Box key={d.dept} className="border-b border-r border-line bg-surface px-4 py-3 last:border-r-0">
              <Text as="p" className="text-[12.5px] font-semibold text-ink">{d.dept}</Text>
              <Text as="p" className="mt-1 text-2xl font-bold leading-none text-accent-blue">
                {d.pct}%
              </Text>
              <Text as="p" className="mt-1 text-[11px] text-text-3">
                {d.completed}/{d.total} completed
              </Text>
              <Box className="mt-2 h-1.5 w-full bg-surface-3">
                <Box className="h-full bg-accent-blue" style={{ width: `${d.pct}%` }} />
              </Box>
              <Box className="mt-1.5 flex justify-between text-[10.5px] text-text-3">
                <Text as="span">{d.in_progress} in progress</Text>
                <Text as="span">{d.hours_learning}h learning</Text>
              </Box>
            </Box>
          ))}
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
