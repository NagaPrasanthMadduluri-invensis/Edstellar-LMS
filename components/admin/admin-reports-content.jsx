"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  PieChart, Pie, Cell,
} from "recharts";
import { Download, Percent, Award, CheckCircle, Users } from "lucide-react";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api-client";

const SCORE_COLORS = [
  "hsl(0 72% 51%)",
  "hsl(38 92% 50%)",
  "hsl(221 83% 53%)",
  "hsl(142 71% 45%)",
  "hsl(262 80% 60%)",
];

const STATUS_COLORS = [
  "hsl(142 71% 45%)",
  "hsl(221 83% 53%)",
  "hsl(215 16% 47%)",
  "hsl(0 72% 51%)",
];

export function AdminReportsContent() {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) return;
    apiClient("/api/admin/reports", { token })
      .then(setData)
      .catch((e) => setError(e.message));
  }, [token]);

  const [exporting, setExporting] = useState(false);

  const exportReport = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/admin/export", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Edstellar_LMS_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    } finally {
      setExporting(false);
    }
  };

  if (error) return <Card className="p-6 text-center"><Text as="p" className="text-red-500 text-sm">{error}</Text></Card>;
  if (!data) return (
    <Box className="space-y-4">
      <Box className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </Box>
      <Box className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </Box>
    </Box>
  );

  const { stats, statusBreakdown, scoreBins, deptCompletion, topScorers } = data;

  const statCards = [
    { label: "Completion Rate", value: `${stats.compRate}%`, icon: Percent, color: "bg-blue-100 text-blue-600" },
    { label: "Avg. Score", value: `${stats.avgScore}%`, icon: Award, color: "bg-emerald-100 text-emerald-600" },
    { label: "Pass Rate", value: `${stats.passRate}%`, icon: CheckCircle, color: "bg-amber-100 text-amber-600" },
    { label: "Total Enrolled", value: stats.total, icon: Users, color: "bg-violet-100 text-violet-600" },
  ];

  const deptChartConfig = Object.fromEntries(
    deptCompletion.map((d) => [d.dept, { label: d.dept, color: "hsl(221 83% 53%)" }])
  );

  const scoreChartConfig = {
    count: { label: "Learners" },
  };

  const statusChartConfig = Object.fromEntries(
    statusBreakdown.map((s, i) => [s.status, { label: s.status, color: STATUS_COLORS[i] }])
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

      {/* ── Charts Row ── */}
      <Box className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Completion Status Pie */}
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

        {/* Score Distribution Bar */}
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

      {/* ── Dept Completion Bar ── */}
      {deptCompletion.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-semibold">Departmental Completion</CardTitle>
            <Text as="p" className="text-[11px] text-muted-foreground">Completion % by department</Text>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <ChartContainer config={deptChartConfig} className="h-[200px]">
              <BarChart data={deptCompletion} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="dept" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <ChartTooltip content={<ChartTooltipContent formatter={(v) => `${v}%`} />} />
                <Bar dataKey="pct" name="Completion %" fill="hsl(221 83% 53%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* ── Top Scorers + Export ── */}
      <Box className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-semibold">Top Scorers</CardTitle>
            <Text as="p" className="text-[11px] text-muted-foreground">Highest assessment scores</Text>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            {topScorers.length === 0 ? (
              <Text as="p" className="text-sm text-muted-foreground py-4 text-center">No assessment attempts yet.</Text>
            ) : (
              <Box className="divide-y">
                {topScorers.map((s, i) => (
                  <Box key={s.id} className="flex items-center gap-3 py-2.5">
                    <Text as="span" className="w-5 text-xs font-bold text-muted-foreground">{i + 1}</Text>
                    <Box className="flex-1 min-w-0">
                      <Text as="p" className="text-sm font-semibold truncate">{s.name}</Text>
                      <Text as="span" className="text-[10px] text-muted-foreground">{s.department || "—"}</Text>
                    </Box>
                    <Badge
                      variant="secondary"
                      className={`text-xs font-bold px-2 ${
                        s.score >= 90 ? "bg-emerald-100 text-emerald-700" :
                        s.score >= 70 ? "bg-blue-100 text-blue-700" :
                        "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {s.score}%
                    </Badge>
                  </Box>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-semibold">Export Report</CardTitle>
            <Text as="p" className="text-[11px] text-muted-foreground">Download full 4-sheet Excel report</Text>
          </CardHeader>
          <CardContent className="px-5 pb-4 space-y-4">
            <Box className="grid grid-cols-3 gap-2">
              {[
                { label: "Total Enrolled", val: stats.total, color: "text-indigo-600" },
                { label: "Certified", val: stats.completed, color: "text-emerald-600" },
                { label: "Pending", val: stats.total - stats.completed, color: "text-amber-600" },
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
              {exporting ? "Generating..." : "Export Excel Report"}
            </Button>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
