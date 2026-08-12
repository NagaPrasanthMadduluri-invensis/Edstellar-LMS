"use client";

import { SERVER_URL } from "@/lib/api-client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell,
  PieChart, Pie,
} from "recharts";
import { Download, Percent, Award, CheckCircle, Users } from "lucide-react";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api-client";
import { STATUS_RAMP, SEQUENTIAL, seriesColor } from "@/lib/brand";

const STATUS_COLORS = STATUS_RAMP;

const SCORE_COLORS = SEQUENTIAL;

/* Departments share one shape; colour comes from the brand ramp by position. */
const DEPT_PALETTE = Array.from({ length: 8 }, (_, i) => ({
  text: "text-navy",
  bar: "bg-navy",
  hex: seriesColor(i),
}));

export function AdminReportsContent() {
  const { user } = useAuth();
  const [data, setData]         = useState(null);
  const [error, setError]       = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!user) return;
    apiClient("/api/admin/reports")
      .then(setData)
      .catch((e) => setError(e.message));
  }, [user]);

  const exportReport = async () => {
    setExporting(true);
    try {
      const res = await fetch(`${SERVER_URL}/api/admin/export`, { credentials: "include" });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `Edstellar_LMS_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    } finally {
      setExporting(false);
    }
  };

  if (error) return (
    <Card className="p-6 text-center">
      <Text as="p" className="text-error text-sm">{error}</Text>
    </Card>
  );

  if (!data) return (
    <Box className="space-y-4">
      <Box className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </Box>
      <Box className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </Box>
      <Box className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </Box>
      <Skeleton className="h-64 rounded-xl" />
    </Box>
  );

  const { stats, statusBreakdown, scoreBins, deptCompletion, topScorers, needsAttention = [] } = data;

  const statCards = [
    { label: "Completion Rate", value: `${stats.compRate}%`, icon: Percent,      color: "bg-paper-cream text-navy"     },
    { label: "Avg. Score",      value: `${stats.avgScore}%`, icon: Award,        color: "bg-paper-cream text-navy"},
    { label: "Pass Rate",       value: `${stats.passRate}%`, icon: CheckCircle,  color: "bg-paper-cream text-ink/70"   },
    { label: "Total Enrolled",  value: stats.total,          icon: Users,        color: "bg-paper-cream text-navy" },
  ];

  const statusChartConfig = Object.fromEntries(
    statusBreakdown.map((s, i) => [s.status, { label: s.status, color: STATUS_COLORS[i] }])
  );

  const scoreChartConfig = { count: { label: "Learners" } };

  const totalHours = deptCompletion.reduce((sum, d) => sum + (d.hours_learning ?? 0), 0);
  const hoursChartConfig = Object.fromEntries(
    deptCompletion.map((d, i) => [d.dept, { label: d.dept, color: DEPT_PALETTE[i % DEPT_PALETTE.length].hex }])
  );

  return (
    <Box className="space-y-5">

      {/* ── Stat Cards ── */}
      <Box className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((s) => (
          <Card key={s.label} className="p-4 hover:shadow-md transition-shadow">
            <Box className="flex items-start gap-3">
              <Box className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${s.color}`}>
                <s.icon className="h-4 w-4" />
              </Box>
              <Box>
                <Text as="h2" className="text-2xl font-bold leading-none">{s.value}</Text>
                <Text as="span" className="text-[11px] text-muted-foreground">{s.label}</Text>
              </Box>
            </Box>
          </Card>
        ))}
      </Box>

      {/* ── Completion Status + Score Distribution ── */}
      <Box className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-semibold">Completion Status</CardTitle>
            <Text as="p" className="text-[11px] text-muted-foreground">Overall distribution</Text>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <ChartContainer config={statusChartConfig} className="h-[200px]">
              <PieChart>
                <Pie
                  data={statusBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                  nameKey="status"
                >
                  {statusBreakdown.map((entry, i) => (
                    <Cell key={entry.status} fill={STATUS_COLORS[i]} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <ChartLegend content={<ChartLegendContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-semibold">Score Distribution</CardTitle>
            <Text as="p" className="text-[11px] text-muted-foreground">Assessment performance</Text>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <ChartContainer config={scoreChartConfig} className="h-[200px]">
              <BarChart data={scoreBins} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="range" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {scoreBins.map((entry, i) => (
                    <Cell key={entry.range} fill={SCORE_COLORS[i]} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </Box>

      {/* ── Department Completion (list) + Top Scorers & Needs Attention ── */}
      <Box className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Department Completion — list design */}
        <Card>
          <CardHeader className="pb-3 pt-4 px-5">
            <CardTitle className="text-sm font-semibold">Department Completion</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {deptCompletion.length === 0 ? (
              <Text as="p" className="text-sm text-muted-foreground text-center py-6">No department data yet.</Text>
            ) : (
              <Box className="space-y-4">
                {deptCompletion.map((d, idx) => {
                  const { text, bar } = DEPT_PALETTE[idx % DEPT_PALETTE.length];
                  return (
                    <Box key={d.dept}>
                      <Box className="flex items-center justify-between mb-1.5">
                        <Text as="span" className={`text-sm font-bold ${text}`}>{d.dept}</Text>
                        <Box className="flex items-center gap-2 text-xs">
                          <Text as="span" className="text-muted-foreground">{d.completed}/{d.total}</Text>
                          <Text as="span" className={`font-bold ${text}`}>{d.pct}%</Text>
                          {d.avg_score != null && (
                            <Text as="span" className="text-muted-foreground">Avg: {d.avg_score}%</Text>
                          )}
                        </Box>
                      </Box>
                      <Box className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <Box
                          className={`h-full rounded-full transition-all ${bar}`}
                          style={{ width: `${d.pct}%` }}
                        />
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Top Scorers & Needs Attention */}
        <Card>
          <CardHeader className="pb-3 pt-4 px-5">
            <CardTitle className="text-sm font-semibold">Top Scorers &amp; Needs Attention</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-4">

            {/* TOP 5 */}
            <Box>
              <Text as="p" className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
                Top 5
              </Text>
              {topScorers.length === 0 ? (
                <Text as="p" className="text-xs text-muted-foreground py-2">No assessment attempts yet.</Text>
              ) : (
                <Box className="divide-y">
                  {topScorers.map((s, i) => (
                    <Box key={s.id} className="flex items-center gap-3 py-2.5">
                      <Text as="span" className="w-4 text-xs font-bold text-muted-foreground shrink-0">{i + 1}</Text>
                      <Box className="flex-1 min-w-0">
                        <Text as="p" className="text-sm font-medium truncate">{s.name}</Text>
                        {s.job_role && <Text as="p" className="text-[11px] text-muted-foreground truncate">{s.job_role}</Text>}
                      </Box>
                      <Box className="text-right shrink-0">
                        <Text as="p" className="text-xs text-muted-foreground">{s.department || "—"}</Text>
                        {s.location && <Text as="p" className="text-[11px] text-muted-foreground/70">{s.location}</Text>}
                      </Box>
                      <Text as="span" className="text-sm font-bold text-navy shrink-0 w-9 text-right">
                        {s.score}%
                      </Text>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>

            {/* NOT STARTED */}
            <Box>
              <Text as="p" className="text-[10px] font-bold text-error uppercase tracking-widest mb-2">
                Not Started
              </Text>
              {needsAttention.length === 0 ? (
                <Text as="p" className="text-xs text-muted-foreground py-1">All learners have begun their courses.</Text>
              ) : (
                <Box className="divide-y">
                  {needsAttention.slice(0, 5).map((u) => (
                    <Box key={u.id} className="flex items-center justify-between py-2">
                      <Box>
                        <Text as="p" className="text-sm font-medium">{u.name}</Text>
                        {u.job_role && <Text as="p" className="text-[11px] text-muted-foreground">{u.job_role}</Text>}
                      </Box>
                      <Box className="text-right">
                        <Text as="p" className="text-xs text-muted-foreground">{u.department || "—"}</Text>
                        {u.location && <Text as="p" className="text-[11px] text-muted-foreground/70">{u.location}</Text>}
                      </Box>
                    </Box>
                  ))}
                  {needsAttention.length > 5 && (
                    <Text as="p" className="text-xs text-muted-foreground pt-2">
                      +{needsAttention.length - 5} more
                    </Text>
                  )}
                </Box>
              )}
            </Box>

          </CardContent>
        </Card>
      </Box>

      {/* ── Learning Hours by Department ── */}
      {deptCompletion.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-4 px-5 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Learning Hours by Department</CardTitle>
            <Text as="span" className="text-xs text-muted-foreground">
              This month — {totalHours.toFixed(1)}h total
            </Text>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <ChartContainer config={hoursChartConfig} className="h-[220px] w-full">
              <BarChart
                data={deptCompletion}
                margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                <XAxis dataKey="dept" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}h`}
                />
                <ChartTooltip
                  content={<ChartTooltipContent formatter={(v) => [`${v}h`, "Hours"]} />}
                />
                <Bar dataKey="hours_learning" radius={[4, 4, 0, 0]} maxBarSize={60}>
                  {deptCompletion.map((d, i) => (
                    <Cell key={d.dept} fill={DEPT_PALETTE[i % DEPT_PALETTE.length].hex} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* ── Export Report ── */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-5">
          <CardTitle className="text-sm font-semibold">Export Report</CardTitle>
          <Text as="p" className="text-[11px] text-muted-foreground">Download full 4-sheet Excel report</Text>
        </CardHeader>
        <CardContent className="px-5 pb-4 space-y-4">
          <Box className="grid grid-cols-3 gap-2">
            {[
              { label: "Total Enrolled", val: stats.total,                       color: "text-navy"  },
              { label: "Certified",      val: stats.completed,                   color: "text-navy" },
              { label: "Pending",        val: stats.total - stats.completed,     color: "text-ink/70"   },
            ].map((s) => (
              <Box key={s.label} className="bg-muted/40 rounded-lg p-3 text-center">
                <Text as="p" className={`text-xl font-bold ${s.color}`}>{s.val}</Text>
                <Text as="p" className="text-[10px] text-muted-foreground mt-0.5">{s.label}</Text>
              </Box>
            ))}
          </Box>
          <Text as="p" className="text-xs text-muted-foreground">
            Generate a full Excel report with learner progress, department analytics, leaderboard, and assignment tracker.
          </Text>
          <Button size="sm" onClick={exportReport} disabled={exporting} variant="outline" className="w-full">
            <Download className="h-3.5 w-3.5 mr-2" />
            {exporting ? "Generating…" : "Export Excel Report"}
          </Button>
        </CardContent>
      </Card>

    </Box>
  );
}
