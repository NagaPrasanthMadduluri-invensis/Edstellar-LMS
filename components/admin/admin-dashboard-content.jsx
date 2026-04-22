"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import {
  Users, Award, CheckCircle2, Percent,
  ChevronRight, Clock, BookOpen,
} from "lucide-react";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { fetchAdminDashboard } from "@/services/api/admin/admin-api";
import { apiClient } from "@/lib/api-client";

const STATUS_COLORS = {
  "Completed":   "hsl(142 71% 45%)",
  "In Progress": "hsl(221 83% 53%)",
  "Not Started": "hsl(220 9% 65%)",
  "Failed":      "hsl(0 72% 51%)",
};

const pieConfig = {
  Completed:    { label: "Completed",   color: "hsl(142 71% 45%)" },
  "In Progress":{ label: "In Progress", color: "hsl(221 83% 53%)" },
  "Not Started":{ label: "Not Started", color: "hsl(220 9% 65%)"  },
  Failed:       { label: "Failed",      color: "hsl(0 72% 51%)"   },
};

const barConfig = {
  count: { label: "Learners", color: "hsl(262 80% 60%)" },
};

const DEPT_COLORS = [
  "bg-indigo-500", "bg-violet-500", "bg-emerald-500", "bg-amber-500",
  "bg-blue-500",   "bg-pink-500",   "bg-cyan-500",   "bg-orange-500",
  "bg-teal-500",   "bg-rose-500",
];

function DashboardSkeleton() {
  return (
    <Box className="space-y-5">
      <Box className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </Box>
      <Box className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </Box>
      <Skeleton className="h-64 rounded-xl" />
      <Box className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </Box>
    </Box>
  );
}

export function AdminDashboardContent() {
  const { token } = useAuth();
  const [dash, setDash] = useState(null);
  const [reports, setReports] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      fetchAdminDashboard({ token }),
      apiClient("/api/admin/reports", { token }),
    ])
      .then(([d, r]) => { setDash(d); setReports(r); })
      .catch((e) => setError(e.message));
  }, [token]);

  if (error) return (
    <Card className="p-8 text-center">
      <Text as="p" className="text-red-500 text-sm">{error}</Text>
    </Card>
  );
  if (!dash || !reports) return <DashboardSkeleton />;

  const { recentUsers = [], recentAttempts = [] } = dash;
  const { stats, statusBreakdown = [], scoreBins = [], deptCompletion = [] } = reports;

  const statCards = [
    { label: "Total Learners",  value: stats.total,       icon: Users,         color: "bg-violet-100 text-violet-600" },
    { label: "Completion Rate", value: `${stats.compRate}%`, icon: CheckCircle2, color: "bg-emerald-100 text-emerald-600" },
    { label: "Avg Score",       value: `${stats.avgScore ?? 0}%`, icon: Award,   color: "bg-amber-100 text-amber-600" },
    { label: "Pass Rate",       value: `${stats.passRate  ?? 0}%`, icon: Percent, color: "bg-blue-100 text-blue-600" },
  ];

  const pieData = statusBreakdown.filter((d) => d.value > 0);

  return (
    <Box className="space-y-5">

      {/* ── Stat Cards ── */}
      <Box className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((s) => (
          <Card key={s.label} className="p-4 hover:shadow-md transition-shadow">
            <Box className="flex items-start gap-3">
              <Box className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${s.color}`}>
                <s.icon className="h-5 w-5" />
              </Box>
              <Box>
                <Text as="h2" className="text-2xl font-bold leading-none">{s.value}</Text>
                <Text as="span" className="text-[11px] text-muted-foreground">{s.label}</Text>
              </Box>
            </Box>
          </Card>
        ))}
      </Box>

      {/* ── In-progress / breakdown mini stats ── */}
      <Box className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Completed",   value: stats.completed,   color: "text-emerald-600 bg-emerald-50" },
          { label: "In Progress", value: stats.inProgress,  color: "text-blue-600 bg-blue-50" },
          { label: "Not Started", value: stats.notStarted,  color: "text-gray-600 bg-gray-50" },
          { label: "Failed",      value: stats.failed,      color: "text-red-600 bg-red-50" },
        ].map((s) => (
          <Card key={s.label} className={`p-3 ${s.color}`}>
            <Text as="h3" className="text-xl font-bold leading-none">{s.value}</Text>
            <Text as="span" className="text-xs opacity-80">{s.label}</Text>
          </Card>
        ))}
      </Box>

      {/* ── Charts Row ── */}
      <Box className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Completion Status PieChart */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-semibold">Completion Status</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            {pieData.length === 0 ? (
              <Box className="flex items-center justify-center h-[200px]">
                <Text as="p" className="text-sm text-muted-foreground">No learner data yet.</Text>
              </Box>
            ) : (
              <>
                <ChartContainer config={pieConfig} className="h-[200px] w-full">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      strokeWidth={2}
                    >
                      {pieData.map((entry) => (
                        <Cell key={entry.status} fill={STATUS_COLORS[entry.status]} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent nameKey="status" hideLabel />} />
                  </PieChart>
                </ChartContainer>
                <Box className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 justify-center">
                  {statusBreakdown.map((s) => (
                    <Box key={s.status} className="flex items-center gap-1.5">
                      <Box className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLORS[s.status] }} />
                      <Text as="span" className="text-xs text-muted-foreground">
                        {s.status}: <Text as="span" className="font-semibold text-foreground">{s.value}</Text>
                      </Text>
                    </Box>
                  ))}
                </Box>
              </>
            )}
          </CardContent>
        </Card>

        {/* Score Distribution BarChart */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-semibold">Score Distribution</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            {scoreBins.every((b) => b.count === 0) ? (
              <Box className="flex items-center justify-center h-[200px]">
                <Text as="p" className="text-sm text-muted-foreground">No assessment attempts yet.</Text>
              </Box>
            ) : (
              <ChartContainer config={barConfig} className="h-[220px] w-full">
                <BarChart data={scoreBins} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                  <XAxis dataKey="range" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="hsl(262 80% 60%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* ── Department Progress ── */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-5 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold">Department Progress</CardTitle>
          <Link href="/admin/departments" className="text-xs text-indigo-500 font-medium hover:underline flex items-center gap-0.5">
            View All <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </CardHeader>
        <CardContent className="px-5 pb-4">
          {deptCompletion.length === 0 ? (
            <Box className="py-6 text-center">
              <Text as="p" className="text-sm text-muted-foreground">No department data yet.</Text>
            </Box>
          ) : (
            <Box className="space-y-3">
              {deptCompletion.map((d, idx) => (
                <Box key={d.dept}>
                  <Box className="flex items-center justify-between mb-1.5">
                    <Text as="span" className="text-sm font-medium">{d.dept}</Text>
                    <Box className="flex items-center gap-2">
                      <Text as="span" className="text-xs text-muted-foreground">{d.completed}/{d.total}</Text>
                      <Text as="span" className="text-xs font-semibold text-indigo-600">{d.pct}%</Text>
                    </Box>
                  </Box>
                  <Box className="h-2 bg-muted rounded-full overflow-hidden">
                    <Box
                      className={`h-full rounded-full transition-all ${DEPT_COLORS[idx % DEPT_COLORS.length]}`}
                      style={{ width: `${d.pct}%` }}
                    />
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* ── Recent Activity ── */}
      <Box className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Recent Learners */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between py-3 px-5">
            <CardTitle className="text-sm font-semibold">Recent Learners</CardTitle>
            <Link href="/admin/users" className="text-xs text-indigo-500 font-medium hover:underline flex items-center gap-0.5">
              View All <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="px-5 pb-4 pt-0">
            {recentUsers.length === 0 ? (
              <Box className="py-6 text-center">
                <Text as="p" className="text-sm text-muted-foreground">No learners yet.</Text>
              </Box>
            ) : (
              <Box className="divide-y">
                {recentUsers.map((u) => {
                  const initials = `${(u.first_name || "")[0] || ""}${(u.last_name || "")[0] || ""}`.toUpperCase();
                  return (
                    <Box key={u.id} className="flex items-center gap-3 py-2.5">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="bg-indigo-100 text-indigo-600 text-xs font-bold">{initials}</AvatarFallback>
                      </Avatar>
                      <Box className="flex-1 min-w-0">
                        <Text as="p" className="text-sm font-semibold">{u.first_name} {u.last_name}</Text>
                        <Text as="span" className="text-[11px] text-muted-foreground">{u.email}</Text>
                      </Box>
                      <Box className="flex items-center gap-1 shrink-0">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <Text as="span" className="text-[10px] text-muted-foreground">
                          {new Date(u.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </Text>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Recent Assessment Attempts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between py-3 px-5">
            <CardTitle className="text-sm font-semibold">Recent Assessment Attempts</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-5 pb-4 pt-0">
            {recentAttempts.length === 0 ? (
              <Box className="py-6 text-center">
                <Text as="p" className="text-sm text-muted-foreground">No attempts yet.</Text>
              </Box>
            ) : (
              <Box className="divide-y">
                {recentAttempts.map((a) => (
                  <Box key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                    <Box className="flex-1 min-w-0">
                      <Text as="p" className="text-sm font-semibold truncate">{a.first_name} {a.last_name}</Text>
                      <Text as="span" className="text-[11px] text-muted-foreground truncate block">
                        {a.assessment_title} · {a.course_name}
                      </Text>
                    </Box>
                    <Box className="flex items-center gap-2 shrink-0">
                      <Badge variant="secondary" className={`text-[10px] ${a.is_passed ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                        {a.is_passed ? "Passed" : "Failed"}
                      </Badge>
                      <Text as="span" className="text-sm font-bold">{a.percentage}%</Text>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>

    </Box>
  );
}
