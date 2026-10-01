"use client";

import { apiClient } from "@/lib/api-client";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  ArrowDown, ArrowUp, Clock, Lightbulb, Minus, Target, Trophy, Users,
} from "lucide-react";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import {
  BRAND, HAIRLINE, LEARNING_TYPES, LEARNING_TYPE_ORDER, goalTone,
} from "@/lib/brand";

/* One control, four granularities — the same set My Progress offers, so a
   learner moving between the two pages keeps the same vocabulary. */
const GRANULARITIES = [
  { key: "weekly",    label: "Weekly",    one: "week",    per: "this week" },
  { key: "monthly",   label: "Monthly",   one: "month",   per: "this month" },
  { key: "quarterly", label: "Quarterly", one: "quarter", per: "this quarter" },
  { key: "yearly",    label: "Yearly",    one: "year",    per: "this year" },
];

const AXIS = { fontSize: 10, fill: BRAND.text3 };

/* ── Primitives ──────────────────────────────────────────────────────── */

function LHSkeleton() {
  return (
    <Box className="space-y-4">
      <Box className="grid grid-cols-2 gap-px bg-line lg:grid-cols-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}
      </Box>
      <Skeleton className="h-44" />
      <Skeleton className="h-64" />
      <Box className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-64" /><Skeleton className="h-64" />
      </Box>
    </Box>
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
            "h-7 cursor-pointer px-2.5 text-[11px] font-medium",
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
    <Box className="flex items-start justify-between gap-4 border-b border-line px-4 py-3">
      <Box className="min-w-0">
        <Text as="h3" className="text-sm font-semibold leading-tight">{title}</Text>
        {sub && <Text as="p" className="mt-0.5 text-[11px] text-text-3">{sub}</Text>}
      </Box>
      {right}
    </Box>
  );
}

function Th({ children, className }) {
  return (
    <th className={cn(
      "whitespace-nowrap px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-text-3",
      className,
    )}>{children}</th>
  );
}

function Dash() { return <Text as="span" className="text-text-3">—</Text>; }

function BandChip({ label }) {
  return (
    <Text as="span" className={cn("px-2 py-0.5 text-[11px] font-medium whitespace-nowrap", goalTone(label).chip)}>
      {label}
    </Text>
  );
}

/** A stat tile. `tone` colours the figure when the figure is a verdict. */
function StatTile({ icon: Icon, iconTone, value, valueTone, label, sub }) {
  return (
    <Box className="bg-surface px-4 py-3">
      <Icon className={cn("mb-1.5 h-3.5 w-3.5", iconTone)} />
      <Text as="p" className={cn("text-lg font-bold leading-none", valueTone)}>{value}</Text>
      <Text as="p" className="mt-1 text-[11px] text-text-3">{label}</Text>
      {sub && <Text as="p" className="mt-0.5 text-[10px] text-text-3">{sub}</Text>}
    </Box>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <Box className="border border-line bg-surface px-3 py-2">
      <Text as="p" className="mb-1 text-[11px] font-semibold">{label}</Text>
      {payload.map((p) => (
        <Box key={p.dataKey} className="flex items-center gap-2">
          <Box className="h-2 w-2" style={{ background: p.color || p.fill }} />
          <Text as="span" className="text-[11px] text-text-2">{p.name}</Text>
          <Text as="span" className="ml-auto text-[11px] font-semibold tabular-nums">{p.value}h</Text>
        </Box>
      ))}
    </Box>
  );
}

function ChartNote({ rows }) {
  return (
    <Box className="flex h-[220px] items-center justify-center px-6">
      <Text as="p" className="text-center text-xs text-text-3">
        {rows === 0
          ? "No learning hours recorded yet."
          : `Only ${rows} period${rows === 1 ? "" : "s"} of activity at this granularity — too few to draw a trend. Try a finer one.`}
      </Text>
    </Box>
  );
}

/* ────────────────────────────────────────────────────────────────────── */

export function LearningHoursContent() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [grain, setGrain] = useState("monthly");

  useEffect(() => {
    if (!user) return;
    apiClient("/api/learner/learning-hours").then(setData).catch((e) => setError(e.message));
  }, [user]);

  const rows = useMemo(() => data?.hoursByPeriod?.[grain] ?? [], [data, grain]);
  const meta = GRANULARITIES.find((g) => g.key === grain);

  if (error) return (
    <Card className="p-8 text-center">
      <Text as="p" className="text-sm text-danger">{error}</Text>
      <Button size="sm" variant="outline" className="mt-3 cursor-pointer" onClick={() => window.location.reload()}>
        Retry
      </Button>
    </Card>
  );
  if (!data) return <LHSkeleton />;

  const s = data.summary;

  /* The period in view is the LAST bucket on the axis. That is the current
     one when the learner has been active in it, and their most recent
     otherwise — which is the honest thing to lead with either way, as long
     as the label says which (below). */
  const latest = rows[rows.length - 1] ?? null;
  const previous = rows.length > 1 ? rows[rows.length - 2] : null;
  const delta = latest && previous ? Math.round((latest.total - previous.total) * 10) / 10 : 0;
  const DeltaIcon = delta > 0 ? ArrowUp : delta < 0 ? ArrowDown : Minus;
  const deltaTone = delta > 0 ? "text-success" : delta < 0 ? "text-danger" : "text-text-3";

  const tone = latest ? goalTone(latest.statusLabel) : goalTone("Behind");

  return (
    <Box className="space-y-4">

      {/* ── The control that drives the page ─────────────────────────── */}
      <Box className="flex flex-wrap items-center justify-between gap-3 border border-line bg-surface px-4 py-2.5">
        <Box className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-accent-blue" />
          <Text as="p" className="text-xs text-text-2">
            Everything below is shown{" "}
            <Text as="span" className="font-semibold text-ink">{meta.label.toLowerCase()}</Text>
            {" — the goal scales with the period."}
          </Text>
        </Box>
        <SegmentedControl value={grain} onChange={setGrain} options={GRANULARITIES} />
      </Box>

      {rows.length === 0 ? (
        <Card className="p-12 text-center">
          <Clock className="mx-auto mb-3 h-8 w-8 text-line-strong" />
          <Text as="p" className="text-sm font-semibold">No learning hours yet</Text>
          <Text as="p" className="mt-1 text-xs text-text-2">
            Hours are credited as you finish lessons, and for a live session once your trainer marks you present.
          </Text>
        </Card>
      ) : (
        <>
          {/* ── Four figures for the period in view ───────────────────── */}
          <Box className="grid grid-cols-2 gap-px border border-line bg-line lg:grid-cols-4">
            <StatTile
              icon={Clock} iconTone="text-accent-blue"
              value={`${latest.total}h`} valueTone={tone.fg}
              label={latest.is_current ? `This ${meta.one} so far` : `Latest ${meta.one} · ${latest.label}`}
              sub={`Goal ${latest.goal}h`}
            />
            <StatTile
              icon={DeltaIcon} iconTone={deltaTone}
              value={previous ? `${previous.total}h` : "—"}
              label={`Previous ${meta.one}`}
              sub={previous
                ? delta > 0 ? `${delta}h more now` : delta < 0 ? `${Math.abs(delta)}h less now` : "No change"
                : "Nothing before this"}
            />
            <StatTile
              icon={Target} iconTone={tone.fg}
              value={`${latest.goalPct}%`} valueTone={tone.fg}
              label="Of the goal"
              sub={latest.remaining > 0 ? `${latest.remaining}h to go` : "Goal reached"}
            />
            <StatTile
              icon={Trophy} iconTone="text-rust"
              value={`${s.allTime}h`} label="All time" sub="Every period" />
          </Box>

          {/* ── The meter ─────────────────────────────────────────────── */}
          <Card className="gap-0 overflow-hidden p-0">
            <CardHead
              title={`Goal for ${latest.is_current ? meta.per : latest.label}`}
              sub={latest.is_current
                ? `Measured against the part of the ${meta.one} that has happened so far`
                : `The whole ${meta.one}`}
              right={<BandChip label={latest.statusLabel} />}
            />
            <Box className="space-y-3 px-4 py-4">
              <Box>
                <Box className="h-2.5 overflow-hidden bg-surface-3">
                  <Box className={cn("h-full", tone.bg)} style={{ width: `${latest.goalPct}%` }} />
                </Box>
                <Box className="mt-1 flex items-center justify-between">
                  <Text as="span" className="text-[10px] text-text-3">0h</Text>
                  <Text as="span" className={cn("text-[11px] font-semibold", tone.fg)}>
                    {latest.total}h of {latest.goal}h · {latest.goalPct}%
                  </Text>
                  <Text as="span" className="text-[10px] text-text-3">{latest.goal}h</Text>
                </Box>
              </Box>

              <Box className="flex items-start gap-2 border border-line bg-accent-tint px-3 py-2">
                <Lightbulb className="mt-px h-3.5 w-3.5 shrink-0 text-accent-blue" />
                <Text as="p" className="text-[11px] text-text-2">
                  {latest.remaining > 0 ? (
                    <>
                      <Text as="span" className="font-semibold text-ink">{latest.remaining}h more</Text>
                      {` to reach the ${meta.one}'s ${latest.goal}h goal`}
                      {latest.is_current ? " at this point in it." : "."}
                    </>
                  ) : (
                    <>Goal met for this {meta.one}. Everything from here is ahead of it.</>
                  )}
                </Text>
              </Box>
            </Box>
          </Card>

          {/* ── Every period, in full ─────────────────────────────────── */}
          <Card className="gap-0 overflow-hidden p-0">
            <CardHead
              title={`Every ${meta.one}`}
              sub="Hours by kind of learning, against the goal for each one"
            />
            <Box className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-surface-2">
                  <tr>
                    <Th className="pl-4">{meta.one}</Th>
                    {LEARNING_TYPE_ORDER.map((k) => <Th key={k}>{LEARNING_TYPES[k].label}</Th>)}
                    <Th>Total</Th>
                    <Th>Goal</Th>
                    <Th className="w-32">Vs goal</Th>
                    <Th className="pr-4">Standing</Th>
                  </tr>
                </thead>
                <tbody>
                  {[...rows].reverse().map((r) => {
                    const t = goalTone(r.statusLabel);
                    return (
                      <tr key={r.period} className="border-t border-line">
                        <td className="whitespace-nowrap py-2.5 pl-4 pr-3 font-semibold">
                          {r.label}
                          {r.is_current && <Text as="span" className="ml-1 font-normal text-text-3">(so far)</Text>}
                        </td>
                        {LEARNING_TYPE_ORDER.map((k) => (
                          <td key={k} className="px-3 py-2.5 font-medium tabular-nums"
                              style={{ color: LEARNING_TYPES[k].flat }}>
                            {r[k] > 0 ? `${r[k]}h` : <Dash />}
                          </td>
                        ))}
                        <td className="px-3 py-2.5 font-bold tabular-nums">{r.total}h</td>
                        <td className="px-3 py-2.5 tabular-nums text-text-2">{r.goal}h</td>
                        <td className="w-32 px-3 py-2.5">
                          <Box className="flex items-center gap-2">
                            <Box className="h-1.5 flex-1 overflow-hidden bg-surface-3">
                              <Box className={cn("h-full", t.bg)} style={{ width: `${r.goalPct}%` }} />
                            </Box>
                            <Text as="span" className={cn("w-9 shrink-0 text-right text-[11px] font-bold tabular-nums", t.fg)}>
                              {r.goalPct}%
                            </Text>
                          </Box>
                        </td>
                        <td className="py-2.5 pl-3 pr-4"><BandChip label={r.statusLabel} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Box>
          </Card>

          {/* ── Two charts ────────────────────────────────────────────── */}
          <Box className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className="gap-0 overflow-hidden p-0">
              <CardHead title="Hours over time" sub={`Your total per ${meta.one}, against the goal line`} />
              <Box className="px-2 pb-2 pt-4">
                {rows.length < 3 ? <ChartNote rows={rows.length} /> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={rows} margin={{ top: 4, right: 12, left: -18, bottom: 0 }}>
                      <CartesianGrid stroke={HAIRLINE} vertical={false} />
                      <XAxis dataKey="label" tick={AXIS} axisLine={{ stroke: HAIRLINE }} tickLine={false} />
                      <YAxis tick={AXIS} axisLine={false} tickLine={false} unit="h" width={44} />
                      <Tooltip content={<ChartTooltip />} />
                      {/* The goal, drawn where it belongs — on the chart the
                          learner is reading, not only in a tile above it. */}
                      <ReferenceLine
                        y={Math.round(10 * (rows[rows.length - 1]?.goal ?? 0)) / 10}
                        stroke={BRAND.warning} strokeDasharray="4 3"
                        label={{ value: "goal", position: "right", fontSize: 9, fill: BRAND.warning }}
                      />
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

            <Card className="gap-0 overflow-hidden p-0">
              <CardHead title="Where the hours came from" sub="The same hours, split by kind of learning" />
              <Box className="px-2 pb-2 pt-4">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={rows} margin={{ top: 4, right: 12, left: -18, bottom: 0 }}>
                    <CartesianGrid stroke={HAIRLINE} vertical={false} />
                    <XAxis dataKey="label" tick={AXIS} axisLine={{ stroke: HAIRLINE }} tickLine={false} />
                    <YAxis tick={AXIS} axisLine={false} tickLine={false} unit="h" width={44} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
                    {LEARNING_TYPE_ORDER.map((k) => (
                      <Bar key={k} dataKey={k} name={LEARNING_TYPES[k].label}
                           stackId="hours" fill={LEARNING_TYPES[k].chart} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
                <Box className="flex items-center justify-center gap-4 pb-2 pt-1">
                  {LEARNING_TYPE_ORDER.map((k) => (
                    <Box key={k} className="flex items-center gap-1.5">
                      <Box className="h-2.5 w-2.5" style={{ background: LEARNING_TYPES[k].chart }} />
                      <Text as="span" className="text-[10px] text-text-2">{LEARNING_TYPES[k].label}</Text>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Card>
          </Box>
        </>
      )}

      {/* ── Department, this month ────────────────────────────────────── */}
      <Card className="gap-0 overflow-hidden p-0">
        <CardHead
          title={`Your department — ${s.dept}`}
          /* Deliberately NOT period-aware, and it says so. The comparison is
             against colleagues whose figures the API only computes for the
             current month; bucketing it the four ways would mean four
             org-wide passes to answer a question nobody asked of a quarter.
             Labelling it beats silently showing monthly numbers under a
             "Yearly" toggle. */
          sub="This month only — the rest of this page follows the control above"
          right={
            <Text as="span" className="whitespace-nowrap text-[11px] text-text-3">
              #{s.deptRank} of {s.deptTotal}
            </Text>
          }
        />
        <Box className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-surface-2">
              <tr>
                <Th className="pl-4">Learner</Th><Th>This month</Th><Th>Last month</Th>
                <Th>All time</Th><Th className="w-28">Vs goal</Th><Th className="pr-4">Standing</Th>
              </tr>
            </thead>
            <tbody>
              {data.deptPeers.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center">
                  <Text as="p" className="text-xs text-text-3">Nobody else in your department yet.</Text>
                </td></tr>
              ) : data.deptPeers.map((p) => {
                const t = goalTone(p.status);
                return (
                  <tr key={p.id} className={cn("border-t border-line", p.isYou && "bg-accent-tint")}>
                    <td className="py-2.5 pl-4 pr-3 font-medium">
                      {p.name}
                      {p.isYou && <Text as="span" className="ml-1.5 text-[10px] font-semibold text-accent-blue">you</Text>}
                    </td>
                    <td className="px-3 py-2.5 font-semibold tabular-nums">{p.thisMonth}h</td>
                    <td className="px-3 py-2.5 tabular-nums text-text-2">{p.lastMonth}h</td>
                    <td className="px-3 py-2.5 tabular-nums text-text-2">{p.allTime}h</td>
                    <td className="w-28 px-3 py-2.5">
                      <Box className="flex items-center gap-2">
                        <Box className="h-1.5 flex-1 overflow-hidden bg-surface-3">
                          <Box className={cn("h-full", t.bg)} style={{ width: `${p.goalPct}%` }} />
                        </Box>
                        <Text as="span" className={cn("w-8 shrink-0 text-right text-[11px] font-bold tabular-nums", t.fg)}>
                          {p.goalPct}%
                        </Text>
                      </Box>
                    </td>
                    <td className="py-2.5 pl-3 pr-4"><BandChip label={p.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Box>
      </Card>

      {/* ── Organisation, this month ─────────────────────────────────── */}
      <Card className="gap-0 overflow-hidden p-0">
        <CardHead
          title="Across the organisation"
          sub="This month only · average hours per person in each department"
          right={<Users className="h-3.5 w-3.5 text-text-3" />}
        />
        <Box className="grid grid-cols-2 gap-px bg-line lg:grid-cols-4">
          {data.orgOverview.map((d) => (
            <Box key={d.dept} className={cn("bg-surface px-4 py-3", d.isYourDept && "bg-accent-tint")}>
              <Text as="p" className="truncate text-[11px] font-semibold">{d.dept}</Text>
              <Text as="p" className="mt-1 text-base font-bold leading-none">{d.avgHours}h</Text>
              <Text as="p" className="mt-1 text-[10px] text-text-3">
                avg · {d.onTrack > 0
                  ? <Text as="span" className="text-success">{d.onTrack} of {d.total} at goal</Text>
                  : <Text as="span" className="text-text-3">none at goal yet</Text>}
              </Text>
            </Box>
          ))}
        </Box>
      </Card>
    </Box>
  );
}
