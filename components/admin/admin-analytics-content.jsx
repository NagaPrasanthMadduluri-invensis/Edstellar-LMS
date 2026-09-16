"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Clock, Info, Layers, Search, Users } from "lucide-react";

import Box from "@/components/ui/box";
import Text from "@/components/ui/text";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { InsightPanel } from "@/components/admin/insights/insight-panel";
import { StatTile } from "@/components/admin/insights/kpi-strip";
import { fetchAnalytics } from "@/services/api/admin/admin-api";
import { BRAND, HAIRLINE } from "@/lib/brand";
import { cn } from "@/lib/utils";

const GRANULARITIES = [
  { key: "monthly", label: "Monthly" },
  { key: "quarterly", label: "Quarterly" },
  { key: "half-yearly", label: "Half-yearly" },
  { key: "yearly", label: "Yearly" },
  { key: "multi-year", label: "Multi-year" },
];

/**
 * Mode of learning → colour, assigned deliberately rather than by series
 * index.
 *
 * The NAVY family is instructor-led, the BLUE family is self-paced. That
 * matters because "Type of learning" sits beside this chart showing exactly
 * that split, and with an index-assigned ramp the two disagreed: blue meant
 * "Document" in one and "Instructor-led" in the other, so a reader comparing
 * them drew the opposite conclusion. Dark is a person teaching, blue is
 * content the learner works through alone — in both charts.
 */
const MODE_COLOR = {
  ILT: BRAND.navy,
  VILT: "#1E3A6E",
  eLearning: BRAND.accent,
  Video: "#6A92D4",
  Document: BRAND.accentSoft,
  Assessment: BRAND.text3,
};

const AXIS = { fontSize: 11, fill: BRAND.text2 };
const TOOLTIP = {
  background: BRAND.surface,
  border: `1px solid ${BRAND.line}`,
  borderRadius: 0,
  fontSize: 12,
};

function Panel({ title, subtitle, children, action, className }) {
  return (
    <Box className={cn("border border-line bg-surface", className)}>
      <Box className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
        <Box>
          <Text as="h3" className="text-[13px] font-bold text-ink">{title}</Text>
          {subtitle && <Text as="p" className="mt-0.5 text-[11px] text-text-3">{subtitle}</Text>}
        </Box>
        {action}
      </Box>
      {children}
    </Box>
  );
}

/**
 * Shown in place of a chart when the axis is too short to read as a trend.
 *
 * Two points are a line segment. Drawing one anyway invites a conclusion the
 * data cannot support, so the page says what is missing and what would fix it
 * — which is more useful than a chart that looks broken.
 */
function NotEnoughHistory({ periods }) {
  return (
    <Box className="flex items-start gap-2.5 border border-line bg-surface-2 px-4 py-3">
      <Info className="mt-0.5 size-4 shrink-0 text-accent-blue" />
      <Text as="p" className="text-[12px] leading-relaxed text-text-2">
        Only {periods} period{periods === 1 ? "" : "s"} of history at this
        granularity — not enough to read as a trend. The charts below still show
        it, but switch to a finer granularity for a comparison you can act on.
      </Text>
    </Box>
  );
}

function AnalyticsSkeleton() {
  return (
    <Box className="space-y-4">
      <Skeleton className="h-9 w-[420px] max-w-full" />
      <Skeleton className="h-[130px] w-full" />
      <Skeleton className="h-[320px] w-full" />
      <Box className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-[280px]" />
        <Skeleton className="h-[280px]" />
      </Box>
    </Box>
  );
}

export function AdminAnalyticsContent() {
  const [granularity, setGranularity] = useState("monthly");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    fetchAnalytics({ granularity })
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e.message || "Failed to load analytics"))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [granularity]);

  /** Recharts wants one row per period with every series as a key. */
  const rows = useMemo(() => {
    if (!data) return [];
    const s = data.series;
    return data.periods.map((p, i) => {
      const row = {
        period: p.label,
        hours: s.hours[i] ?? 0,
        enrollments: s.enrollments[i] ?? 0,
        completions: s.completions[i] ?? 0,
        joined: s.learnersJoined[i] ?? 0,
        active: s.learnersActive[i] ?? 0,
        certificates: s.certificates[i] ?? 0,
      };
      for (const m of s.modes) row[m.name] = m.data[i] ?? 0;
      for (const t of s.types) row[t.name] = t.data[i] ?? 0;
      return row;
    });
  }, [data]);

  const learners = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    if (!q) return data.learnerEngagement;
    return data.learnerEngagement.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        (l.department ?? "").toLowerCase().includes(q),
    );
  }, [data, query]);

  const maxLearnerHours = Math.max(1, ...(data?.learnerEngagement ?? []).map((l) => l.allTimeHours));

  return (
    <Box className="space-y-4">
      {/* The granularity switcher stays mounted while a new window loads, so
          the control the admin just clicked does not disappear under them. */}
      <Box className="flex flex-wrap items-center justify-between gap-3">
        <Text as="p" className="text-[12.5px] text-text-2">
          Viewing{" "}
          <Text as="span" className="font-bold text-ink">
            {GRANULARITIES.find((g) => g.key === granularity)?.label}
          </Text>{" "}
          trends
        </Text>
        <Box className="flex flex-wrap border border-line">
          {GRANULARITIES.map((g) => (
            <button
              key={g.key}
              type="button"
              onClick={() => setGranularity(g.key)}
              className={cn(
                "border-r border-line px-3 py-1.5 text-[12px] font-semibold transition-colors last:border-r-0",
                granularity === g.key
                  ? "bg-navy text-accent-soft"
                  : "bg-surface text-text-2 hover:bg-surface-2 hover:text-ink",
              )}
            >
              {g.label}
            </button>
          ))}
        </Box>
      </Box>

      {error && (
        <Box className="border border-line bg-surface px-4 py-10 text-center">
          <Text as="p" className="text-sm text-danger">{error}</Text>
        </Box>
      )}

      {loading && !error && <AnalyticsSkeleton />}

      {!loading && !error && data && (
        <>
          {!data.sufficient && <NotEnoughHistory periods={data.periods.length} />}

          <InsightPanel
            insights={data.insights}
            title={`Insights — ${GRANULARITIES.find((g) => g.key === granularity)?.label}`}
            subtitle="Generated from the data below"
          />

          <Panel
            title="Engagement — hours spent on learning"
            subtitle="Total time your people spend learning on the LMS"
          >
            <Box className="grid gap-2.5 p-4 sm:grid-cols-3">
              <StatTile
                label="Organisation — all time"
                value={`${data.engagement.totalHours}h`}
                icon={Clock}
              />
              <StatTile
                label="Avg per learner"
                value={`${data.engagement.avgPerLearner}h`}
                icon={Users}
              />
              <StatTile
                label="Top department"
                value={data.engagement.topDepartment?.name ?? "—"}
                hint={
                  data.engagement.topDepartment
                    ? `${data.engagement.topDepartment.hours}h`
                    : "No hours recorded"
                }
                icon={Layers}
              />
            </Box>

            <Box className="grid gap-4 border-t border-line p-4 lg:grid-cols-2">
              <Box>
                <Text as="p" className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-text-3">
                  Engagement over time (org hours)
                </Text>
                <Box className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={rows} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={HAIRLINE} vertical={false} />
                      <XAxis dataKey="period" tick={AXIS} tickLine={false} axisLine={{ stroke: HAIRLINE }} />
                      <YAxis tick={AXIS} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={TOOLTIP} />
                      <Area
                        type="monotone" dataKey="hours" name="Hours"
                        stroke={BRAND.accent} strokeWidth={2}
                        fill={BRAND.accentTint} dot={{ r: 3, fill: BRAND.accent }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Box>
              </Box>

              <Box>
                <Text as="p" className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-text-3">
                  Engagement by department (hours)
                </Text>
                <Box className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.departmentEngagement} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={HAIRLINE} vertical={false} />
                      <XAxis dataKey="department" tick={AXIS} tickLine={false} axisLine={{ stroke: HAIRLINE }} />
                      <YAxis tick={AXIS} tickLine={false} axisLine={false} unit="h" />
                      <Tooltip cursor={{ fill: BRAND.surface2 }} contentStyle={TOOLTIP} />
                      <Bar dataKey="hours" name="Hours" fill={BRAND.accent} maxBarSize={44} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Box>
            </Box>
          </Panel>

          <Box className="grid gap-4 lg:grid-cols-2">
            <Panel title="Learners over time" subtitle="Joined and active, per period">
              <Box className="h-[240px] p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={rows} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={HAIRLINE} vertical={false} />
                    <XAxis dataKey="period" tick={AXIS} tickLine={false} axisLine={{ stroke: HAIRLINE }} />
                    <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={TOOLTIP} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="active" name="Active" stroke={BRAND.accent} strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="joined" name="New" stroke={BRAND.navy} strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </Panel>

            <Panel title="Enrolments vs completions" subtitle="Assignments made against courses finished">
              <Box className="h-[240px] p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rows} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={HAIRLINE} vertical={false} />
                    <XAxis dataKey="period" tick={AXIS} tickLine={false} axisLine={{ stroke: HAIRLINE }} />
                    <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip cursor={{ fill: BRAND.surface2 }} contentStyle={TOOLTIP} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="enrollments" name="Enrolments" fill={BRAND.navy} maxBarSize={22} />
                    <Bar dataKey="completions" name="Completions" fill={BRAND.accent} maxBarSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Panel>
          </Box>

          <Box className="grid gap-4 lg:grid-cols-2">
            <Panel title="Learning hours" subtitle="Total org hours per period">
              <Box className="h-[240px] p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rows} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={HAIRLINE} vertical={false} />
                    <XAxis dataKey="period" tick={AXIS} tickLine={false} axisLine={{ stroke: HAIRLINE }} />
                    <YAxis tick={AXIS} tickLine={false} axisLine={false} unit="h" />
                    <Tooltip cursor={{ fill: BRAND.surface2 }} contentStyle={TOOLTIP} />
                    <Bar dataKey="hours" name="Hours" fill={BRAND.accent} maxBarSize={44} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Panel>

            <Panel
              title="Mode of learning"
              subtitle={(data.series.modes ?? []).map((m) => m.name).join(" · ") || "No modes recorded"}
            >
              <Box className="h-[240px] p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rows} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={HAIRLINE} vertical={false} />
                    <XAxis dataKey="period" tick={AXIS} tickLine={false} axisLine={{ stroke: HAIRLINE }} />
                    <YAxis tick={AXIS} tickLine={false} axisLine={false} unit="h" />
                    <Tooltip cursor={{ fill: BRAND.surface2 }} contentStyle={TOOLTIP} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {/* Instructor-led modes first, so the stack reads dark at
                        the base and blue on top — the same order as the Type
                        chart below. */}
                    {(data.series.modes ?? [])
                      .slice()
                      .sort((a, b) => order(a.name) - order(b.name))
                      .map((m) => (
                        <Bar
                          key={m.name}
                          dataKey={m.name}
                          name={m.name}
                          stackId="mode"
                          fill={MODE_COLOR[m.name] ?? BRAND.text3}
                          maxBarSize={44}
                        />
                      ))}
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Panel>
          </Box>

          <Panel
            title="Type of learning"
            subtitle="Self-paced against instructor-led, over time"
          >
            <Box className="h-[260px] p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rows} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={HAIRLINE} vertical={false} />
                  <XAxis dataKey="period" tick={AXIS} tickLine={false} axisLine={{ stroke: HAIRLINE }} />
                  <YAxis tick={AXIS} tickLine={false} axisLine={false} unit="h" />
                  <Tooltip cursor={{ fill: BRAND.surface2 }} contentStyle={TOOLTIP} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {/* Navy is instructor-led, blue is self-paced — the same
                      rule MODE_COLOR follows in the chart above. */}
                  <Bar dataKey="Instructor-led" stackId="type" fill={BRAND.navy} maxBarSize={56} />
                  <Bar dataKey="Self-paced" stackId="type" fill={BRAND.accent} maxBarSize={56} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Panel>

          <Panel
            title="Individual learner engagement"
            subtitle="Hours spent on the LMS, per learner"
          >
            <Box className="border-b border-line p-3">
              <Box className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-text-3" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search learner or department…"
                  className="h-8 pl-8 text-[12.5px]"
                />
              </Box>
            </Box>

            <Box className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse">
                <thead>
                  <tr>
                    {["Learner", "Department", "Job level", "This month", "All time", "Engagement"].map((h, i) => (
                      <th
                        key={h}
                        className={cn(
                          "border-b border-line bg-surface-2 px-4 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.06em] text-text-3",
                          i >= 3 ? "text-right" : "text-left",
                        )}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {learners.map((l) => (
                    <tr key={l.id} className="hover:bg-surface-2">
                      <td className="border-b border-line px-4 py-2.5 text-[12.5px] text-ink">{l.name}</td>
                      <td className="border-b border-line px-4 py-2.5 text-[12.5px] text-text-2">
                        {l.department ?? "—"}
                      </td>
                      <td className="border-b border-line px-4 py-2.5 text-[12.5px] text-text-2">
                        {l.job_level ?? "—"}
                      </td>
                      <td className="border-b border-line px-4 py-2.5 text-right text-[12.5px] text-text-2">
                        {l.thisMonthHours}h
                      </td>
                      <td className="border-b border-line px-4 py-2.5 text-right text-[12.5px] font-bold text-ink">
                        {l.allTimeHours}h
                      </td>
                      <td className="border-b border-line px-4 py-2.5">
                        <Box className="ml-auto h-1.5 w-[140px] bg-surface-3">
                          <Box
                            className="h-full bg-accent-blue"
                            style={{ width: `${Math.round((l.allTimeHours / maxLearnerHours) * 100)}%` }}
                          />
                        </Box>
                      </td>
                    </tr>
                  ))}
                  {learners.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-[12.5px] text-text-3">
                        No learner matches “{query}”.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Box>
          </Panel>
        </>
      )}
    </Box>
  );
}

/** Stack order: instructor-led at the base, self-paced above it. */
function order(mode) {
  const rank = { ILT: 0, VILT: 1, eLearning: 2, Video: 3, Document: 4, Assessment: 5 };
  return rank[mode] ?? 9;
}
