"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Trophy, Clock, TrendingUp, Users, Award } from "lucide-react";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api-client";

const AVATAR_COLORS = [
  "bg-navy","bg-navy","bg-navy","bg-navy",
  "bg-navy","bg-navy","bg-navy","bg-navy",
  "bg-error","bg-navy","bg-navy","bg-navy",
];

const BADGE_CFG = {
  Gold:          { cls: "bg-paper-cream text-ink/70 border-border",    label: "🥇 Gold"          },
  Silver:        { cls: "bg-paper-cream text-ink/70 border-border",       label: "🥈 Silver"        },
  Bronze:        { cls: "bg-paper-cream text-ink/70 border-border", label: "🥉 Bronze"        },
  "On Track":    { cls: "bg-navy text-paper border-navy",        label: "✓ On Track"       },
  "Rising Star": { cls: "bg-paper-cream text-navy border-0",              label: "↑ Rising Star"    },
  "Needs Push":  { cls: "bg-error/10 text-error border-0",                label: "! Needs Push"     },
};

const PODIUM_CFG = {
  0: { icon: "🥇", ring: "ring-navy",  bg: "bg-paper-cream",  podiumH: "h-24", order: "order-2" },
  1: { icon: "🥈", ring: "ring-ring",   bg: "bg-paper-warm",   podiumH: "h-16", order: "order-1" },
  2: { icon: "🥉", ring: "ring-navy", bg: "bg-paper-cream", podiumH: "h-12", order: "order-3" },
};

function getBadge(idx, score) {
  if (idx === 0) return "Gold";
  if (idx === 1) return "Silver";
  if (idx === 2) return "Bronze";
  if (score >= 75) return "On Track";
  if (score >= 50) return "Rising Star";
  return "Needs Push";
}

const initials = (name) => name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

function LoadingSkeleton() {
  return (
    <Box className="space-y-6">
      <Box className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
      </Box>
      <Skeleton className="h-64 rounded-xl" />
      <Skeleton className="h-96 rounded-xl" />
    </Box>
  );
}

export function AdminLeaderboardContent() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [filterDept, setFilterDept] = useState("All Departments");

  useEffect(() => {
    if (!user) return;
    apiClient("/api/admin/leaderboard")
      .then(setData)
      .catch((e) => setError(e.message));
  }, [user]);

  if (error) return <Card className="p-8 text-center"><Text as="p" className="text-error text-sm">{error}</Text></Card>;
  if (!data) return <LoadingSkeleton />;

  const { stats, learners = [] } = data;

  const depts = ["All Departments", ...new Set(learners.map((l) => l.dept).filter(Boolean))].sort((a, b) => a === "All Departments" ? -1 : b === "All Departments" ? 1 : a.localeCompare(b));

  const filtered = filterDept === "All Departments" ? learners : learners.filter((l) => l.dept === filterDept);
  const top3 = filtered.slice(0, 3);
  const topScore = filtered[0]?.score || 1;

  return (
    <Box className="space-y-7">

      {/* Filters */}
      <Box className="flex items-center gap-3 flex-wrap">
        <Select value={filterDept} onValueChange={setFilterDept}>
          <SelectTrigger className="h-10 w-[200px] bg-white text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {depts.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <Text as="p" className="text-sm text-muted-foreground">{filtered.length} learner{filtered.length !== 1 ? "s" : ""} ranked</Text>
      </Box>

      {/* Summary stat cards */}
      <Box className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Users,     value: stats.totalLearners, label: "Total Learners",     sub: "Across all departments", iconBg: "bg-paper-cream",    iconColor: "text-navy",    circle: "bg-paper-cream"    },
          { icon: Clock,     value: `${stats.avgHours}h`, label: "Avg Learning Hours", sub: "This month per learner", iconBg: "bg-paper-cream", iconColor: "text-navy", circle: "bg-paper-cream" },
          { icon: TrendingUp,value: `${stats.avgCompletion}%`, label: "Avg Completion", sub: "Course completion rate", iconBg: "bg-paper-cream",  iconColor: "text-ink/70",  circle: "bg-paper-cream"  },
          { icon: Award,     value: stats.topName?.split(" ")[0] || "—", label: "Top Performer", sub: stats.topDept || "", iconBg: "bg-paper-cream",   iconColor: "text-ink/70",   circle: "bg-paper-cream"   },
        ].map((s) => (
          <Card key={s.label} className="relative overflow-hidden p-5">
            <Box className="flex items-start gap-3">
              <Box className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${s.iconBg}`}>
                <s.icon className={`h-5 w-5 ${s.iconColor}`} />
              </Box>
              <Box>
                <Text as="h2" className="text-2xl font-bold leading-tight">{s.value}</Text>
                <Text as="p" className="text-sm text-muted-foreground">{s.label}</Text>
                <Text as="p" className="text-xs text-muted-foreground/70 mt-0.5">{s.sub}</Text>
              </Box>
            </Box>
            <Box className={`absolute -right-5 -top-5 w-24 h-24 rounded-full opacity-60 ${s.circle}`} />
          </Card>
        ))}
      </Box>

      {/* Podium */}
      {top3.length >= 3 && (
        <Card className="p-6">
          <Text as="h2" className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-6">Top Performers</Text>
          <Box className="flex items-end justify-center gap-6">
            {[top3[1], top3[0], top3[2]].map((l, displayIdx) => {
              const realIdx = displayIdx === 0 ? 1 : displayIdx === 1 ? 0 : 2;
              const m = PODIUM_CFG[realIdx];
              const avatarColor = AVATAR_COLORS[l.id % AVATAR_COLORS.length];
              return (
                <Box key={l.id} className={`flex flex-col items-center gap-3 ${m.order}`}>
                  <Text as="span" className="text-2xl">{m.icon}</Text>
                  <Avatar className={cn("ring-4", m.ring, realIdx === 0 ? "h-16 w-16" : "h-12 w-12")}>
                    <AvatarFallback className={`font-bold text-white ${avatarColor} ${realIdx === 0 ? "text-lg" : "text-sm"}`}>
                      {initials(l.name)}
                    </AvatarFallback>
                  </Avatar>
                  <Box className="text-center">
                    <Text as="p" className={`font-bold leading-tight ${realIdx === 0 ? "text-base" : "text-sm"}`}>{l.name}</Text>
                    <Text as="p" className="text-xs text-muted-foreground">{l.dept}</Text>
                    {l.job_role && <Text as="p" className="text-[10px] text-muted-foreground/70">{l.job_role}</Text>}
                    <Text as="p" className="text-lg font-extrabold text-navy mt-0.5">{l.score}</Text>
                    <Text as="p" className="text-[10px] text-muted-foreground uppercase tracking-wide">Score</Text>
                  </Box>
                  <Box className={cn("w-20 rounded-t-lg", m.podiumH, m.bg, "border border-border")} />
                </Box>
              );
            })}
          </Box>
        </Card>
      )}

      {/* Full Rankings Table */}
      <Card className="overflow-hidden">
        <Box className="px-6 py-4 border-b">
          <Text as="h3" className="text-base font-bold">Full Rankings</Text>
          <Text as="p" className="text-xs text-muted-foreground">Score = 60% course completion + 40% learning hours (normalised)</Text>
        </Box>

        <Box className="grid grid-cols-[48px_1fr_130px_110px_110px_160px_100px_110px] gap-0 px-5 py-2.5 border-b bg-muted/30">
          {["RANK","LEARNER","DEPARTMENT","THIS MONTH","ALL TIME","COMPLETION","SCORE","BADGE"].map((h) => (
            <Text key={h} as="span" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{h}</Text>
          ))}
        </Box>

        {filtered.map((l, idx) => {
          const badge = getBadge(idx, l.score);
          const badgeCfg = BADGE_CFG[badge];
          const avatarColor = AVATAR_COLORS[l.id % AVATAR_COLORS.length];
          const completionBar = l.completionPct >= 80 ? "bg-navy" : l.completionPct >= 50 ? "bg-navy" : "bg-error";
          const scoreWidth = Math.round((l.score / topScore) * 100);
          return (
            <Box
              key={l.id}
              className={cn(
                "grid grid-cols-[48px_1fr_130px_110px_110px_160px_100px_110px] gap-0 items-center px-5 py-3.5 border-b last:border-b-0 hover:bg-muted/20 transition-colors",
                idx < 3 && "bg-paper-cream"
              )}
            >
              <Box className="flex items-center justify-center">
                {idx < 3
                  ? <Text as="span" className="text-xl">{["🥇","🥈","🥉"][idx]}</Text>
                  : <Text as="span" className="text-sm font-bold text-muted-foreground">{idx + 1}</Text>}
              </Box>
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
              <Text as="span" className="text-sm font-bold text-navy">{l.thisMonth}h</Text>
              <Text as="span" className="text-sm font-medium">{l.allTime}h</Text>
              <Box className="flex items-center gap-2 pr-3">
                <Box className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <Box className={`h-full rounded-full ${completionBar}`} style={{ width: `${l.completionPct}%` }} />
                </Box>
                <Text as="span" className="text-xs font-semibold w-9 text-right">{l.completionPct}%</Text>
              </Box>
              <Box className="flex items-center gap-2">
                <Box className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <Box className="h-full rounded-full bg-navy" style={{ width: `${scoreWidth}%` }} />
                </Box>
                <Text as="span" className="text-xs font-bold w-8 text-right">{l.score}</Text>
              </Box>
              <Badge className={cn("text-[10px] font-semibold border w-fit whitespace-nowrap", badgeCfg.cls)}>
                {badgeCfg.label}
              </Badge>
            </Box>
          );
        })}
      </Card>
    </Box>
  );
}
