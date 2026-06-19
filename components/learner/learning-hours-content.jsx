"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ResponsiveContainer, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell,
} from "recharts";
import {
  Clock, TrendingUp, TrendingDown, Target, Trophy,
  ArrowUp, ArrowDown, Minus, Lightbulb,
} from "lucide-react";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

/* ── dept color palette ── */
const DEPT_COLORS = {
  Sales:       "#3b82f6",
  Engineering: "#06b6d4",
  Operations:  "#f59e0b",
  HR:          "#ec4899",
};
function deptColor(dept) {
  return DEPT_COLORS[dept] || "#6b7280";
}

/* ── status badge ── */
const STATUS_CFG = {
  "On Track": { cls: "bg-emerald-50 text-emerald-600 border-emerald-200" },
  "Close":    { cls: "bg-amber-50  text-amber-600  border-amber-200"    },
  "Behind":   { cls: "bg-red-50    text-red-600    border-red-200"      },
  "Goal Reached!": { cls: "bg-emerald-50 text-emerald-700 border-emerald-300" },
  "Almost There":  { cls: "bg-amber-50  text-amber-700  border-amber-300"    },
  "On Track":      { cls: "bg-blue-50   text-blue-700   border-blue-300"     },
  "Behind":        { cls: "bg-red-50    text-red-600    border-red-200"      },
};

/* ── medal helpers ── */
function Medal({ rank }) {
  if (rank === 1) return <Text as="span" className="text-base">🥇</Text>;
  if (rank === 2) return <Text as="span" className="text-base">🥈</Text>;
  if (rank === 3) return <Text as="span" className="text-base">🥉</Text>;
  return <Text as="span" className="text-xs text-muted-foreground font-semibold">{rank}</Text>;
}

/* ── Skeleton ── */
function LHSkeleton() {
  return (
    <Box className="space-y-4">
      <Box className="grid grid-cols-3 lg:grid-cols-6 gap-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</Box>
      <Box className="grid grid-cols-1 lg:grid-cols-2 gap-4"><Skeleton className="h-56 rounded-xl" /><Skeleton className="h-56 rounded-xl" /></Box>
      <Box className="grid grid-cols-1 lg:grid-cols-2 gap-4"><Skeleton className="h-52 rounded-xl" /><Skeleton className="h-52 rounded-xl" /></Box>
      <Skeleton className="h-64 rounded-xl" />
      <Box className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</Box>
    </Box>
  );
}

export function LearningHoursContent() {
  const { user, token } = useAuth();
  const [data, setData]   = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token || !user) return;
    fetch("/api/learner/learning-hours", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => { if (d.message) throw new Error(d.message); setData(d); })
      .catch((e) => setError(e.message));
  }, [token, user]);

  if (error) return (
    <Card className="p-8 text-center">
      <Text as="p" className="text-red-500 text-sm">{error}</Text>
      <Button size="sm" variant="outline" className="mt-3" onClick={() => window.location.reload()}>Retry</Button>
    </Card>
  );
  if (!data) return <LHSkeleton />;

  const { summary, weeklyTrend, depts, modeBreakdown, deptPeers, orgOverview } = data;
  const s = summary;

  /* ── 6 stat cards ── */
  const statCards = [
    {
      icon: Clock, iconBg: "bg-blue-100", iconColor: "text-blue-600", circleBg: "bg-blue-50",
      value: `${s.thisMonth}h`, label: "This Month", sub: `Goal: ${s.goal}h`,
    },
    {
      icon: s.diff >= 0 ? TrendingUp : TrendingDown,
      iconBg: s.diff >= 0 ? "bg-emerald-100" : "bg-amber-100",
      iconColor: s.diff >= 0 ? "text-emerald-600" : "text-amber-600",
      circleBg: s.diff >= 0 ? "bg-emerald-50" : "bg-amber-50",
      value: `${s.lastMonth}h`, label: "Last Month",
      sub: s.diff > 0 ? `+${s.diff}h more` : s.diff < 0 ? `${s.diff}h less` : "Same as now",
    },
    {
      icon: TrendingUp, iconBg: "bg-indigo-100", iconColor: "text-indigo-600", circleBg: "bg-indigo-50",
      value: `${s.allTime}h`, label: "All-Time Total", sub: "Cumulative",
    },
    {
      icon: Target, iconBg: "bg-orange-100", iconColor: "text-orange-500", circleBg: "bg-orange-50",
      value: `${s.goalPct}%`, label: "Monthly Goal",
      sub: s.remaining > 0 ? `${s.remaining}h remaining` : "Goal reached!",
    },
    {
      icon: Trophy, iconBg: "bg-amber-100", iconColor: "text-amber-600", circleBg: "bg-amber-50",
      value: `#${s.deptRank}`, label: "Dept Rank",
      sub: `${s.dept} · ${s.deptTotal} learners`,
    },
    {
      icon: s.gapToFirst > 0 ? ArrowUp : Trophy,
      iconBg: "bg-pink-100", iconColor: "text-pink-600", circleBg: "bg-pink-50",
      value: `${s.gapToFirst}h`, label: s.gapToFirst > 0 ? "Gap to #1" : "You're #1!",
      sub: s.gapToFirst > 0 ? "Behind rank" : "Keep it up",
    },
  ];

  /* ── tips message ── */
  const sessionsNeeded = s.remaining > 0 ? Math.ceil(s.remaining / 0.4) : 0;

  /* ── goal bar status class ── */
  const barColor = s.goalPct >= 100 ? "#10b981" : s.goalPct >= 80 ? "#f59e0b" : s.goalPct >= 50 ? "#3b82f6" : "#ef4444";

  return (
    <Box className="space-y-4">

      {/* ── 6 stat cards ── */}
      <Box className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map((sc) => (
          <Card key={sc.label} className="relative overflow-hidden p-4">
            <Box className={cn("w-9 h-9 rounded-lg flex items-center justify-center mb-2", sc.iconBg)}>
              <sc.icon className={cn("h-4 w-4", sc.iconColor)} />
            </Box>
            <Text as="h2" className="text-2xl font-extrabold leading-none">{sc.value}</Text>
            <Text as="p" className="text-xs text-muted-foreground mt-0.5">{sc.label}</Text>
            <Text as="p" className="text-[10px] text-muted-foreground/70 mt-0.5">{sc.sub}</Text>
            <Box className={cn("absolute -right-4 -top-4 w-16 h-16 rounded-full opacity-40", sc.circleBg)} />
          </Card>
        ))}
      </Box>

      {/* ── Row 1: Monthly Goal Progress + Weekly Trend ── */}
      <Box className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Monthly Goal Progress */}
        <Card className="p-5">
          <Box className="flex items-center justify-between mb-4">
            <Box>
              <Text as="h3" className="text-base font-semibold">Monthly Goal Progress</Text>
              <Text as="p" className="text-xs text-muted-foreground mt-0.5">
                {s.thisMonth} of {s.goal}h target · June 2026
              </Text>
            </Box>
            <Badge variant="outline" className={cn("text-xs shrink-0", STATUS_CFG[s.statusLabel]?.cls || "bg-gray-50 text-gray-600")}>
              {s.statusLabel}
            </Badge>
          </Box>

          {/* Progress bar */}
          <Box className="mb-3">
            <Box className="h-3 bg-muted rounded-full overflow-hidden">
              <Box className="h-full rounded-full transition-all" style={{ width: `${s.goalPct}%`, background: barColor }} />
            </Box>
            <Box className="flex justify-between mt-1.5">
              <Text as="span" className="text-[10px] text-muted-foreground">0h</Text>
              <Text as="span" className="text-[10px] font-bold" style={{ color: barColor }}>{s.goalPct}% complete</Text>
              <Text as="span" className="text-[10px] text-muted-foreground">{s.goal}h</Text>
            </Box>
          </Box>

          {/* This month vs last month */}
          <Box className="flex items-center gap-4 py-4 px-4 bg-muted/30 rounded-xl mb-4">
            <Box className="flex-1 text-center">
              <Text as="h2" className="text-2xl font-extrabold text-blue-600">{s.thisMonth}h</Text>
              <Text as="p" className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mt-0.5">This Month</Text>
            </Box>
            <Box className="flex flex-col items-center text-muted-foreground">
              {s.diff > 0 ? <ArrowUp className="h-4 w-4 text-emerald-500" /> : s.diff < 0 ? <ArrowDown className="h-4 w-4 text-red-500" /> : <Minus className="h-4 w-4" />}
            </Box>
            <Box className="flex-1 text-center">
              <Text as="h2" className="text-2xl font-extrabold text-muted-foreground">{s.lastMonth}h</Text>
              <Text as="p" className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mt-0.5">Last Month</Text>
            </Box>
          </Box>

          {/* Tip */}
          {s.remaining > 0 && (
            <Box className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
              <Lightbulb className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
              <Text as="p" className="text-xs text-amber-700">
                You need <Text as="span" className="font-bold">{s.remaining}h more</Text> to reach your {s.goal}h monthly goal.
                That&apos;s about {sessionsNeeded} session{sessionsNeeded !== 1 ? "s" : ""} of ~0.4h each.
              </Text>
            </Box>
          )}
          {s.remaining === 0 && (
            <Box className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5">
              <Text as="span" className="text-emerald-600 text-xs font-medium">🎉 You&apos;ve hit your monthly goal! Outstanding work.</Text>
            </Box>
          )}
        </Card>

        {/* Weekly Trend */}
        <Card className="p-5">
          <Box className="flex items-center justify-between mb-4">
            <Text as="h3" className="text-base font-semibold">Weekly Trend</Text>
            <Text as="p" className="text-xs text-muted-foreground">Your department · June 2026</Text>
          </Box>
          <ResponsiveContainer width="100%" height={190}>
            <LineChart data={weeklyTrend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="week" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} unit="h" />
              <Tooltip formatter={(v) => `${v}h`} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              {depts.map((dept) => (
                <Line
                  key={dept}
                  type="monotone"
                  dataKey={dept}
                  stroke={deptColor(dept)}
                  strokeWidth={dept === summary.dept ? 2.5 : 1.5}
                  dot={{ r: dept === summary.dept ? 4 : 2 }}
                  strokeOpacity={dept === summary.dept ? 1 : 0.5}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </Box>

      {/* ── Section: Hours by Training Mode ── */}
      <Box>
        <Text as="p" className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground mb-3">
          Your Hours by Training Mode
        </Text>
        <Box className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Breakdown by Delivery Format */}
          <Card className="p-5">
            <Box className="flex items-center justify-between mb-4">
              <Text as="h3" className="text-base font-semibold">Breakdown by Delivery Format</Text>
              <Text as="p" className="text-xs text-muted-foreground">This month · {s.thisMonth}h total</Text>
            </Box>

            {modeBreakdown.length === 0 ? (
              <Box className="py-8 text-center">
                <Text as="p" className="text-sm text-muted-foreground">No learning hours recorded this month.</Text>
              </Box>
            ) : (
              <Box className="space-y-3">
                {modeBreakdown.map((m) => (
                  <Box key={m.mode} className="flex items-center gap-3">
                    <Box className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: m.color }} />
                    <Text as="p" className="text-xs text-muted-foreground w-36 shrink-0">{m.mode}</Text>
                    <Box className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <Box className="h-full rounded-full" style={{ width: `${m.pct}%`, background: m.color }} />
                    </Box>
                    <Text as="span" className="text-[11px] text-muted-foreground w-6 text-right shrink-0">{m.pct}%</Text>
                    <Text as="span" className="text-[11px] font-bold w-7 text-right shrink-0">{m.hours}h</Text>
                  </Box>
                ))}
              </Box>
            )}
          </Card>

          {/* Mode Distribution donut */}
          <Card className="p-5">
            <Box className="flex items-center justify-between mb-2">
              <Text as="h3" className="text-base font-semibold">Mode Distribution</Text>
              <Text as="p" className="text-xs text-muted-foreground">How you learn · at a glance</Text>
            </Box>

            {modeBreakdown.length === 0 ? (
              <Box className="py-8 text-center">
                <Text as="p" className="text-sm text-muted-foreground">No data yet.</Text>
              </Box>
            ) : (
              <Box className="flex items-center gap-4">
                <Box className="relative shrink-0" style={{ width: 160, height: 160 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={modeBreakdown}
                        dataKey="hours"
                        nameKey="mode"
                        cx="50%" cy="50%"
                        innerRadius={48} outerRadius={70}
                        paddingAngle={2}
                      >
                        {modeBreakdown.map((m) => (
                          <Cell key={m.mode} fill={m.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  {/* center label */}
                  <Box className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <Text as="p" className="text-lg font-extrabold leading-none">{s.thisMonth}h</Text>
                    <Text as="p" className="text-[9px] text-muted-foreground uppercase tracking-wide mt-0.5">TOTAL</Text>
                  </Box>
                </Box>

                <Box className="space-y-2 flex-1">
                  {modeBreakdown.map((m) => (
                    <Box key={m.mode} className="flex items-center gap-2">
                      <Box className="w-2 h-2 rounded-full shrink-0" style={{ background: m.color }} />
                      <Text as="p" className="text-[11px] text-muted-foreground flex-1 truncate">{m.mode.split(" – ")[0]}</Text>
                      <Text as="span" className="text-[11px] font-bold shrink-0">{m.hours}h</Text>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
          </Card>
        </Box>
      </Box>

      {/* ── Dept Peers table ── */}
      <Card className="p-5">
        <Box className="flex items-center justify-between mb-1">
          <Box>
            <Text as="h3" className="text-base font-semibold">Your Department — {s.dept}</Text>
            <Text as="p" className="text-xs text-muted-foreground mt-0.5">Peer ranking by learning hours this month</Text>
          </Box>
          <Badge variant="outline" className="text-xs border-indigo-200 text-indigo-600 bg-indigo-50 shrink-0">
            #{s.deptRank} of {s.deptTotal}
          </Badge>
        </Box>

        <Box className="overflow-x-auto -mx-5 mt-4">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b">
                <th className="text-left font-semibold text-muted-foreground py-2 pl-5 pr-3 w-8">#</th>
                <th className="text-left font-semibold text-muted-foreground py-2 px-3">LEARNER</th>
                <th className="text-right font-semibold text-muted-foreground py-2 px-3">THIS MONTH</th>
                <th className="text-right font-semibold text-muted-foreground py-2 px-3">LAST MONTH</th>
                <th className="text-left font-semibold text-muted-foreground py-2 px-3 w-36">GOAL PROGRESS</th>
                <th className="text-right font-semibold text-muted-foreground py-2 px-3">ALL TIME</th>
                <th className="text-left font-semibold text-muted-foreground py-2 pl-3 pr-5">STATUS</th>
              </tr>
            </thead>
            <tbody>
              {deptPeers.map((peer, i) => {
                const scfg = STATUS_CFG[peer.status] || {};
                const barCol = peer.goalPct >= 100 ? "#10b981" : peer.goalPct >= 60 ? "#f59e0b" : "#ef4444";
                return (
                  <tr key={peer.id} className={cn("border-b last:border-0", peer.isYou && "bg-blue-50/60")}>
                    <td className="py-3 pl-5 pr-3 w-8">
                      <Medal rank={i + 1} />
                    </td>
                    <td className="py-3 px-3">
                      <Box className="flex items-center gap-2">
                        <Avatar className="h-7 w-7 shrink-0">
                          <AvatarFallback className="text-[10px] bg-indigo-100 text-indigo-700">
                            {peer.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <Box>
                          <Box className="flex items-center gap-1.5">
                            <Text as="p" className="font-semibold">{peer.name}</Text>
                            {peer.isYou && (
                              <Badge className="text-[9px] px-1.5 py-0 bg-blue-500 text-white border-0">You</Badge>
                            )}
                          </Box>
                          <Text as="p" className="text-muted-foreground">{peer.dept}</Text>
                        </Box>
                      </Box>
                    </td>
                    <td className="py-3 px-3 text-right font-bold">{peer.thisMonth}h</td>
                    <td className="py-3 px-3 text-right text-muted-foreground">{peer.lastMonth}h</td>
                    <td className="py-3 px-3">
                      <Box className="flex items-center gap-2">
                        <Box className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <Box className="h-full rounded-full" style={{ width: `${peer.goalPct}%`, background: barCol }} />
                        </Box>
                        <Text as="span" className="text-[11px] font-semibold w-8 text-right shrink-0">{peer.goalPct}%</Text>
                      </Box>
                    </td>
                    <td className="py-3 px-3 text-right text-muted-foreground">{peer.allTime}h</td>
                    <td className="py-3 pl-3 pr-5">
                      <Badge variant="outline" className={cn("text-[10px]", scfg.cls)}>{peer.status}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Box>
      </Card>

      {/* ── Org Overview ── */}
      <Box>
        <Box className="flex items-center justify-between mb-3">
          <Text as="h3" className="text-base font-semibold">Organisation Overview</Text>
          <Text as="p" className="text-xs text-muted-foreground">Learning hours by department this month</Text>
        </Box>
        <Box className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {orgOverview.map((d) => {
            const col = deptColor(d.dept);
            return (
              <Card key={d.dept} className={cn("p-4 relative overflow-hidden border-l-4")} style={{ borderLeftColor: col }}>
                <Box className="flex items-center gap-2 mb-2">
                  <Text as="h4" className="text-sm font-bold" style={{ color: col }}>{d.dept}</Text>
                  {d.isYourDept && (
                    <Badge className="text-[9px] px-1.5 py-0 border-0" style={{ background: col + "22", color: col }}>Your dept</Badge>
                  )}
                </Box>
                <Text as="h2" className="text-2xl font-extrabold">{d.totalHours}h</Text>
                <Text as="p" className="text-[11px] text-muted-foreground mt-0.5">
                  Avg {d.avgHours}h · {d.onTrack}/{d.total} on track
                </Text>
                <Box className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
                  <Box
                    className="h-full rounded-full"
                    style={{
                      width: `${d.total > 0 ? Math.round((d.onTrack / d.total) * 100) : 0}%`,
                      background: col,
                    }}
                  />
                </Box>
              </Card>
            );
          })}
        </Box>
      </Box>

    </Box>
  );
}
