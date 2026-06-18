"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import {
  Clock, TrendingUp, CheckCircle2, AlertTriangle,
  Download, Plus, ArrowUpDown,
} from "lucide-react";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api-client";

const DEPT_COLORS = {
  Engineering: { hex: "#10b981", bar: "bg-emerald-500", text: "text-emerald-600", border: "border-emerald-500" },
  Sales:       { hex: "#3b82f6", bar: "bg-blue-500",    text: "text-blue-600",   border: "border-blue-500"   },
  Operations:  { hex: "#f59e0b", bar: "bg-amber-500",   text: "text-amber-600",  border: "border-amber-500"  },
  HR:          { hex: "#ec4899", bar: "bg-pink-500",    text: "text-pink-600",   border: "border-pink-500"   },
};
const DEFAULT_COLOR = { hex: "#8b5cf6", bar: "bg-violet-500", text: "text-violet-600", border: "border-violet-500" };

const AVATAR_COLORS = [
  "bg-amber-500","bg-emerald-500","bg-violet-500","bg-orange-500",
  "bg-blue-500","bg-teal-500","bg-pink-500","bg-cyan-500",
  "bg-rose-500","bg-indigo-500","bg-lime-600","bg-sky-500",
];

const STATUS_CFG = {
  "On Track": { cls: "bg-emerald-100 text-emerald-700 border-0",   bar: "bg-emerald-500" },
  "Close":    { cls: "bg-amber-100 text-amber-700 border-0",       bar: "bg-amber-500"   },
  "Behind":   { cls: "bg-red-100 text-red-600 border-0",           bar: "bg-red-500"     },
};

const initials = (name) => name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

function LoadingSkeleton() {
  return (
    <Box className="space-y-6">
      <Box className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
      </Box>
      <Box className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
      </Box>
      <Box className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </Box>
      <Skeleton className="h-96 rounded-xl" />
    </Box>
  );
}

export function AdminLearningHoursContent() {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [sortKey, setSortKey] = useState("thisMonth");
  const [sortDir, setSortDir] = useState("desc");

  useEffect(() => {
    if (!token) return;
    apiClient("/api/admin/learning-hours", { token })
      .then(setData)
      .catch((e) => setError(e.message));
  }, [token]);

  if (error) return <Card className="p-8 text-center"><Text as="p" className="text-red-500 text-sm">{error}</Text></Card>;
  if (!data) return <LoadingSkeleton />;

  const { stats, departments = [], weeklyTrend = [], learners = [] } = data;

  const sorted = [...learners].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    return (a[sortKey] > b[sortKey] ? 1 : -1) * dir;
  });

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const deptNames = [...new Set(learners.map((l) => l.dept).filter(Boolean))].sort();
  const deptBarData = departments.map((d) => ({ name: d.dept, hours: d.totalHours, fill: (DEPT_COLORS[d.dept] || DEFAULT_COLOR).hex }));
  const maxDeptHours = Math.max(...departments.map((d) => d.totalHours), 1);

  const statCards = [
    { icon: Clock,         value: `${stats.totalHours}h`, label: "Total Hours This Month", sub: `Across ${learners.length} learners`,  subColor: "text-emerald-600", iconBg: "bg-blue-100",    iconColor: "text-blue-600",    circle: "bg-blue-50"    },
    { icon: TrendingUp,    value: `${stats.avgPerLearner}h`, label: "Avg. Per Learner",    sub: "Monthly average",                      subColor: "text-emerald-600", iconBg: "bg-emerald-100", iconColor: "text-emerald-600", circle: "bg-emerald-50" },
    { icon: CheckCircle2,  value: stats.onTrack,          label: "On Track",               sub: "Met monthly goal",                     subColor: "text-emerald-600", iconBg: "bg-orange-100",  iconColor: "text-orange-600",  circle: "bg-orange-50"  },
    { icon: AlertTriangle, value: stats.behindGoal,       label: "Behind Goal",            sub: "Needs attention",                      subColor: "text-red-500",     iconBg: "bg-pink-100",    iconColor: "text-pink-600",    circle: "bg-pink-50"    },
  ];

  return (
    <Box className="space-y-7">

      {/* Stat Cards */}
      <Box className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <Card key={s.label} className="relative overflow-hidden p-5">
            <Box className="flex items-start gap-3">
              <Box className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${s.iconBg}`}>
                <s.icon className={`h-5 w-5 ${s.iconColor}`} />
              </Box>
              <Box>
                <Text as="h2" className="text-3xl font-bold leading-tight">{s.value}</Text>
                <Text as="p" className="text-sm text-muted-foreground">{s.label}</Text>
                <Text as="p" className={`text-xs font-medium mt-0.5 ${s.subColor}`}>{s.sub}</Text>
              </Box>
            </Box>
            <Box className={`absolute -right-5 -top-5 w-24 h-24 rounded-full opacity-60 ${s.circle}`} />
          </Card>
        ))}
      </Box>

      {/* Department Breakdown */}
      <Box>
        <Text as="h2" className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">Department Breakdown</Text>
        <Box className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {departments.map((d) => {
            const cfg = DEPT_COLORS[d.dept] || DEFAULT_COLOR;
            const pct = Math.round((d.totalHours / (maxDeptHours * 1.2)) * 100);
            return (
              <Card key={d.dept} className={`border-l-4 ${cfg.border}`}>
                <CardContent className="p-4 space-y-2">
                  <Box className="flex items-center justify-between">
                    <Text as="p" className={`text-sm font-bold ${cfg.text}`}>{d.dept}</Text>
                    <Text as="span" className="text-xs text-muted-foreground">{d.learners} learners</Text>
                  </Box>
                  <Text as="h3" className="text-2xl font-extrabold leading-none">{d.totalHours}h</Text>
                  <Text as="p" className="text-xs text-muted-foreground">
                    Avg <Text as="span" className="font-bold text-foreground">{d.avgHours}h</Text> · On track{" "}
                    <Text as="span" className="font-bold text-foreground">{d.onTrack}/{d.learners}</Text>
                  </Text>
                  <Box className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <Box className={`h-full rounded-full ${cfg.bar}`} style={{ width: `${pct}%` }} />
                  </Box>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      </Box>

      {/* Charts */}
      <Box className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <Text as="h3" className="text-sm font-bold">Weekly Trend</Text>
          <Text as="p" className="text-xs text-muted-foreground mb-4">Learning hours by department</Text>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={weeklyTrend} margin={{ top: 4, right: 12, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}h`} />
              <Tooltip formatter={(v) => `${v}h`} />
              <Legend iconType="plainline" iconSize={20} wrapperStyle={{ fontSize: 11 }} />
              {deptNames.map((dept) => (
                <Line key={dept} type="monotone" dataKey={dept}
                  stroke={(DEPT_COLORS[dept] || DEFAULT_COLOR).hex}
                  strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 5 }} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <Text as="h3" className="text-sm font-bold">Department Totals</Text>
          <Text as="p" className="text-xs text-muted-foreground mb-4">Cumulative hours this month</Text>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={deptBarData} margin={{ top: 4, right: 12, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}h`} />
              <Tooltip formatter={(v) => `${v}h`} />
              <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                {deptBarData.map((entry, i) => <Cell key={`cell-${i}`} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </Box>

      {/* Individual Learner Table */}
      <Card className="overflow-hidden">
        <Box className="flex items-center justify-between px-6 py-4 border-b">
          <Box>
            <Text as="h3" className="text-base font-bold">Individual Learner Hours</Text>
            <Text as="p" className="text-xs text-muted-foreground">Click column headers to sort</Text>
          </Box>
          <Button className="h-9 bg-blue-500 hover:bg-blue-600 text-white gap-2 px-4 text-sm">
            <Download className="h-3.5 w-3.5" />Export CSV
          </Button>
        </Box>

        <Box className="overflow-x-auto">
          <Box className="min-w-[900px]">
            {/* Header */}
            <Box className="grid grid-cols-[40px_1fr_130px_110px_110px_80px_160px_100px_110px_100px] gap-0 px-5 py-2.5 border-b bg-muted/30">
              {[
                { key: null,         label: "#"          },
                { key: null,         label: "LEARNER"    },
                { key: "dept",       label: "DEPARTMENT" },
                { key: "thisMonth",  label: "THIS MONTH" },
                { key: "lastMonth",  label: "LAST MONTH" },
                { key: "goal",       label: "GOAL"       },
                { key: "progressPct",label: "PROGRESS"   },
                { key: "allTime",    label: "ALL TIME"   },
                { key: "status",     label: "STATUS"     },
                { key: null,         label: "ACTION"     },
              ].map(({ key, label }) => (
                <Box key={label} className={cn("flex items-center gap-1", key && "cursor-pointer hover:text-foreground")} onClick={() => key && toggleSort(key)}>
                  <Text as="span" className={cn("text-[10px] font-bold uppercase tracking-widest", sortKey === key ? "text-blue-600" : "text-muted-foreground")}>
                    {label}
                  </Text>
                  {key && <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />}
                </Box>
              ))}
            </Box>

            {/* Rows */}
            {sorted.map((l, idx) => {
              const avatarColor = AVATAR_COLORS[l.id % AVATAR_COLORS.length];
              const statusCfg = STATUS_CFG[l.status] || STATUS_CFG["Behind"];
              const progressBar = l.progressPct >= 100 ? "bg-emerald-500" : l.progressPct >= 60 ? "bg-amber-500" : "bg-red-500";
              const isUp = l.thisMonth >= l.lastMonth;
              return (
                <Box key={l.id} className="grid grid-cols-[40px_1fr_130px_110px_110px_80px_160px_100px_110px_100px] gap-0 items-center px-5 py-3 border-b last:border-b-0 hover:bg-muted/20 transition-colors">
                  <Text as="span" className="text-sm font-medium text-muted-foreground">{idx + 1}</Text>
                  <Box className="flex items-center gap-2.5">
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarFallback className={`text-xs font-bold text-white ${avatarColor}`}>{initials(l.name)}</AvatarFallback>
                    </Avatar>
                    <Box className="min-w-0">
                      <Text as="span" className="text-sm font-semibold">{l.name}</Text>
                      {l.job_role && <Text as="p" className="text-[11px] text-muted-foreground leading-tight">{l.job_role}</Text>}
                    </Box>
                  </Box>
                  <Box className="min-w-0">
                    <Text as="p" className="text-sm text-muted-foreground">{l.dept}</Text>
                    {l.location && <Text as="p" className="text-[11px] text-muted-foreground/70">{l.location}</Text>}
                  </Box>
                  <Box className="flex items-center gap-1">
                    <Text as="span" className="text-sm font-bold text-blue-600">{l.thisMonth}h</Text>
                    <Text as="span" className={`text-[10px] font-medium ${isUp ? "text-emerald-500" : "text-red-400"}`}>{isUp ? "↑" : "↓"}</Text>
                  </Box>
                  <Text as="span" className="text-sm text-muted-foreground">{l.lastMonth}h</Text>
                  <Text as="span" className="text-sm text-muted-foreground">{l.goal}h</Text>
                  <Box className="flex items-center gap-2">
                    <Box className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <Box className={`h-full rounded-full ${progressBar}`} style={{ width: `${Math.min(l.progressPct, 100)}%` }} />
                    </Box>
                    <Text as="span" className="text-xs font-semibold w-9 text-right">{l.progressPct}%</Text>
                  </Box>
                  <Text as="span" className="text-sm font-medium">{l.allTime}h</Text>
                  <Badge className={`text-[11px] font-semibold w-fit ${statusCfg.cls}`}>{l.status}</Badge>
                  <Button variant="outline" size="sm" className="h-7 text-xs px-2.5">+ Credit</Button>
                </Box>
              );
            })}
          </Box>
        </Box>
      </Card>
    </Box>
  );
}
