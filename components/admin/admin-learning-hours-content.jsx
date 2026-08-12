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
import { seriesColor } from "@/lib/brand";

/* Department styling: one shared shape, colour by series position. */
const DEPT_STYLE = { bar: "bg-navy", text: "text-navy", border: "border-navy/20" };
let deptOrder = [];
function deptCfg(dept) {
  if (!deptOrder.includes(dept)) deptOrder = [...deptOrder, dept];
  return { ...DEPT_STYLE, hex: seriesColor(deptOrder.indexOf(dept)) };
}

const AVATAR_COLORS = [
  "bg-navy","bg-navy","bg-navy","bg-navy",
  "bg-navy","bg-navy","bg-navy","bg-navy",
  "bg-error","bg-navy","bg-navy","bg-navy",
];

const STATUS_CFG = {
  "On Track": { cls: "bg-navy text-paper border-navy",   bar: "bg-navy" },
  "Close":    { cls: "bg-paper-cream text-ink border-navy/25",       bar: "bg-navy"   },
  "Behind":   { cls: "bg-paper-warm text-ink/60 border-border",           bar: "bg-error"     },
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
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [sortKey, setSortKey] = useState("thisMonth");
  const [sortDir, setSortDir] = useState("desc");

  useEffect(() => {
    if (!user) return;
    apiClient("/api/admin/learning-hours")
      .then(setData)
      .catch((e) => setError(e.message));
  }, [user]);

  if (error) return <Card className="p-8 text-center"><Text as="p" className="text-error text-sm">{error}</Text></Card>;
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
  const deptBarData = departments.map((d) => ({ name: d.dept, hours: d.totalHours, fill: deptCfg(d.dept).hex }));
  const maxDeptHours = Math.max(...departments.map((d) => d.totalHours), 1);

  const statCards = [
    { icon: Clock,         value: `${stats.totalHours}h`, label: "Total Hours This Month", sub: `Across ${learners.length} learners`,  subColor: "text-navy", iconBg: "bg-paper-cream",    iconColor: "text-navy",    circle: "bg-paper-cream"    },
    { icon: TrendingUp,    value: `${stats.avgPerLearner}h`, label: "Avg. Per Learner",    sub: "Monthly average",                      subColor: "text-navy", iconBg: "bg-paper-cream", iconColor: "text-navy", circle: "bg-paper-cream" },
    { icon: CheckCircle2,  value: stats.onTrack,          label: "On Track",               sub: "Met monthly goal",                     subColor: "text-navy", iconBg: "bg-paper-cream",  iconColor: "text-ink/70",  circle: "bg-paper-cream"  },
    { icon: AlertTriangle, value: stats.behindGoal,       label: "Behind Goal",            sub: "Needs attention",                      subColor: "text-error",     iconBg: "bg-paper-cream",    iconColor: "text-navy",    circle: "bg-paper-cream"    },
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
            const cfg = deptCfg(d.dept);
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
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(10,22,40,0.12)" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}h`} />
              <Tooltip formatter={(v) => `${v}h`} />
              <Legend iconType="plainline" iconSize={20} wrapperStyle={{ fontSize: 11 }} />
              {deptNames.map((dept) => (
                <Line key={dept} type="monotone" dataKey={dept}
                  stroke={deptCfg(dept).hex}
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
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(10,22,40,0.12)" />
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
          <Button className="h-9 bg-navy hover:bg-navy-soft text-paper gap-2 px-4 text-sm">
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
                  <Text as="span" className={cn("text-[10px] font-bold uppercase tracking-widest", sortKey === key ? "text-navy" : "text-muted-foreground")}>
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
              const progressBar = l.progressPct >= 100 ? "bg-navy" : l.progressPct >= 60 ? "bg-navy" : "bg-error";
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
                    <Text as="span" className="text-sm font-bold text-navy">{l.thisMonth}h</Text>
                    <Text as="span" className={`text-[10px] font-medium ${isUp ? "text-navy" : "text-error"}`}>{isUp ? "↑" : "↓"}</Text>
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
