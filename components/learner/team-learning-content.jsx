"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users2, CheckCircle2, TrendingUp, Clock, Trophy,
  Hourglass, AlertTriangle, Download, Timer,
} from "lucide-react";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { cn } from "@/lib/utils";

/* ── Static data ── */
const TEAM_MEMBERS = [
  {
    id: 1,
    name: "Kartik Reddy",
    initials: "KR",
    color: "bg-navy",
    department: "Sales",
    status: "active",
    progress: 100,
    score: 88,
    passed: true,
    hours: 10.5,
    goal: 10,
    lastActive: "27 Apr 2025",
  },
  {
    id: 2,
    name: "Meena Joshi",
    initials: "MJ",
    color: "bg-navy",
    department: "Sales",
    status: "inactive",
    progress: 0,
    score: null,
    passed: null,
    hours: 0,
    goal: 10,
    lastActive: "14 Apr 2025",
  },
];

const MONTHLY_GOAL = 10;

function Avatar({ initials, color, size = "md" }) {
  const sz = size === "sm" ? "w-8 h-8 text-xs" : "w-9 h-9 text-sm";
  return (
    <Box className={cn("rounded-full flex items-center justify-center font-bold text-white shrink-0", sz, color)}>
      {initials}
    </Box>
  );
}

function StatCard({ icon: Icon, iconBg, value, label }) {
  return (
    <Card className="p-4 flex flex-col gap-2">
      <Box className={cn("w-9 h-9 rounded-xl flex items-center justify-center", iconBg)}>
        <Icon className="h-4 w-4" />
      </Box>
      <Box>
        <Text as="p" className="text-2xl font-bold leading-none">{value}</Text>
        <Text as="p" className="text-xs text-muted-foreground mt-1">{label}</Text>
      </Box>
    </Card>
  );
}

export function TeamLearningContent() {
  const [nudged, setNudged] = useState({});

  const totalSize       = TEAM_MEMBERS.length;
  const completed       = TEAM_MEMBERS.filter((m) => m.progress === 100).length;
  const inProgress      = TEAM_MEMBERS.filter((m) => m.progress > 0 && m.progress < 100).length;
  const notStarted      = TEAM_MEMBERS.filter((m) => m.progress === 0).length;
  const failed          = 0;
  const scoredMembers   = TEAM_MEMBERS.filter((m) => m.score !== null);
  const avgScore        = scoredMembers.length
    ? Math.round(scoredMembers.reduce((s, m) => s + m.score, 0) / scoredMembers.length)
    : 0;
  const totalHours      = TEAM_MEMBERS.reduce((s, m) => s + m.hours, 0);
  const avgHrs          = +(totalHours / totalSize).toFixed(1);
  const onTrack         = TEAM_MEMBERS.filter((m) => m.hours >= m.goal).length;
  const completionPct   = totalSize ? Math.round((completed / totalSize) * 100) : 0;
  const attention       = TEAM_MEMBERS.filter((m) => m.hours < m.goal);

  const STATUS_CFG = {
    active:   "bg-paper-cream text-navy",
    inactive: "bg-paper-cream text-ink/60",
  };

  return (
    <Box className="space-y-5">

      {/* ── Banner ── */}
      <Card className="p-5">
        <Box className="flex items-start justify-between gap-4 flex-wrap">
          <Box>
            <Text as="h2" className="text-lg font-bold">Your Team — {totalSize} direct reports</Text>
            <Box className="flex items-center gap-1.5 mt-1 flex-wrap text-sm text-muted-foreground">
              <Text as="span">
                <Text as="span" className={cn("font-semibold", completionPct > 0 ? "text-navy" : "text-ink/70")}>
                  {completionPct}%
                </Text>{" "}completion rate
              </Text>
              <Text as="span" className="text-muted-foreground/40">·</Text>
              <Text as="span">
                Avg score:{" "}
                <Text as="span" className="font-semibold text-foreground">{avgScore}%</Text>
              </Text>
              <Text as="span" className="text-muted-foreground/40">·</Text>
              <Text as="span">
                <Text as="span" className="font-semibold text-foreground">{onTrack}/{totalSize}</Text> on track for hours
              </Text>
            </Box>
          </Box>
          <Box className="flex items-center gap-2 flex-wrap">
            {attention.length > 0 && (
              <Badge className="bg-paper-cream text-ink/70 border border-border gap-1.5 px-3 py-1.5 text-xs font-medium">
                <AlertTriangle className="h-3.5 w-3.5" />
                {attention.length} needs attention
              </Badge>
            )}
            <Button variant="outline" size="sm" className="gap-1.5 h-9">
              <Download className="h-3.5 w-3.5" />
              Export Team Report
            </Button>
          </Box>
        </Box>
      </Card>

      {/* ── Stat cards ── */}
      <Box className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard icon={Users2}    iconBg="bg-paper-cream text-navy"    value={totalSize}           label="Team Size"      />
        <StatCard icon={CheckCircle2} iconBg="bg-paper-cream text-navy" value={completed}     label="Completed"      />
        <StatCard icon={TrendingUp} iconBg="bg-paper-cream text-navy" value={inProgress}        label="In Progress"    />
        <StatCard icon={Clock}     iconBg="bg-paper-cream text-ink/70"   value={notStarted}         label="Not Started"    />
        <StatCard icon={Trophy}    iconBg="bg-paper-cream text-navy" value={`${avgScore}%`}     label="Avg Score"      />
        <StatCard icon={Timer}     iconBg="bg-paper-cream text-navy"     value={`${avgHrs}h`}       label="Avg Hrs/Month"  />
      </Box>

      {/* ── Team Completion + Action Required ── */}
      <Box className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Team Completion */}
        <Card className="p-5">
          <Box className="flex items-center justify-between mb-4">
            <Text as="h3" className="text-base font-semibold">Team Completion</Text>
            <Text as="span" className="text-xs text-muted-foreground">Status distribution</Text>
          </Box>
          <Box className="flex items-center gap-8">
            <Box className="text-center shrink-0">
              <Text as="p" className={cn("text-4xl font-extrabold", completionPct > 0 ? "text-navy" : "text-ink/70")}>
                {completionPct}%
              </Text>
              <Text as="p" className="text-xs text-muted-foreground mt-1">done</Text>
            </Box>
            <Box className="space-y-2.5 flex-1">
              {[
                { dot: "bg-navy", label: "Completed",   count: completed   },
                { dot: "bg-navy",    label: "In Progress",  count: inProgress  },
                { dot: "bg-paper-cream",    label: "Not Started",  count: notStarted  },
                { dot: "bg-error",     label: "Failed",       count: failed      },
              ].map(({ dot, label, count }) => (
                <Box key={label} className="flex items-center justify-between">
                  <Box className="flex items-center gap-2">
                    <Box className={cn("w-2.5 h-2.5 rounded-full", dot)} />
                    <Text as="span" className="text-sm text-muted-foreground">{label}</Text>
                  </Box>
                  <Text as="span" className={cn("text-sm font-semibold", count > 0 ? "text-foreground" : "text-muted-foreground/50")}>
                    {count}
                  </Text>
                </Box>
              ))}
            </Box>
          </Box>
        </Card>

        {/* Action Required */}
        <Card className="p-5">
          <Box className="flex items-center justify-between mb-4">
            <Text as="h3" className="text-base font-semibold">Action Required</Text>
            <Text as="span" className="text-xs text-muted-foreground">{attention.length} item{attention.length !== 1 ? "s" : ""}</Text>
          </Box>
          {attention.length === 0 ? (
            <Box className="flex flex-col items-center justify-center py-6 gap-2">
              <CheckCircle2 className="h-8 w-8 text-navy" />
              <Text as="p" className="text-sm text-muted-foreground">All members are on track!</Text>
            </Box>
          ) : (
            <Box className="space-y-3">
              {attention.map((m) => (
                <Box key={m.id} className="flex items-center justify-between gap-3">
                  <Box className="flex items-center gap-2.5">
                    <Box className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <Hourglass className="h-3.5 w-3.5 text-muted-foreground" />
                    </Box>
                    <Text as="span" className="text-sm font-medium">
                      {m.name.split(" ")[0]} at {m.hours}h of {m.goal}h goal
                    </Text>
                  </Box>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-xs shrink-0"
                    disabled={nudged[m.id]}
                    onClick={() => setNudged((prev) => ({ ...prev, [m.id]: true }))}
                  >
                    {nudged[m.id] ? "Sent!" : "Nudge"}
                  </Button>
                </Box>
              ))}
            </Box>
          )}
        </Card>
      </Box>

      {/* ── Individual Progress table ── */}
      <Card className="p-5">
        <Box className="mb-4">
          <Text as="h3" className="text-base font-semibold">Individual Progress</Text>
          <Text as="p" className="text-xs text-muted-foreground mt-0.5">All courses · click name to view full profile</Text>
        </Box>

        {/* Table header */}
        <Box className="hidden md:grid grid-cols-[1fr_100px_160px_70px_80px_120px_110px] gap-3 px-2 pb-2 border-b">
          {["MEMBER","STATUS","COURSE PROGRESS","SCORE","PASS?","HOURS","LAST ACTIVE"].map((h) => (
            <Text key={h} as="span" className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{h}</Text>
          ))}
        </Box>

        {/* Rows */}
        <Box className="divide-y">
          {TEAM_MEMBERS.map((m) => (
            <Box
              key={m.id}
              className="grid grid-cols-1 md:grid-cols-[1fr_100px_160px_70px_80px_120px_110px] gap-3 py-4 px-2 items-center hover:bg-muted/30 transition-colors rounded-lg"
            >
              {/* Member */}
              <Box className="flex items-center gap-3">
                <Avatar initials={m.initials} color={m.color} />
                <Box>
                  <Text as="p" className="text-sm font-semibold text-navy cursor-pointer hover:underline">{m.name}</Text>
                  <Text as="p" className="text-xs text-muted-foreground">{m.department}</Text>
                </Box>
              </Box>

              {/* Status */}
              <Box>
                <Badge className={cn("text-[11px] border-0 font-medium", STATUS_CFG[m.status])}>
                  {m.status}
                </Badge>
              </Box>

              {/* Progress bar */}
              <Box className="flex items-center gap-2">
                <Box className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <Box
                    className={cn("h-full rounded-full transition-all", m.progress === 100 ? "bg-navy" : "bg-navy")}
                    style={{ width: `${m.progress}%` }}
                  />
                </Box>
                <Text as="span" className="text-xs font-semibold w-8 text-right">{m.progress}%</Text>
              </Box>

              {/* Score */}
              <Text as="span" className={cn("text-sm font-semibold", m.score !== null ? "text-foreground" : "text-muted-foreground/40")}>
                {m.score !== null ? `${m.score}%` : "—"}
              </Text>

              {/* Pass? */}
              <Box>
                {m.passed === true && (
                  <Box className="flex items-center gap-1 text-navy">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <Text as="span" className="text-xs font-semibold">Pass</Text>
                  </Box>
                )}
                {m.passed === null && (
                  <Text as="span" className="text-muted-foreground/40 text-sm">—</Text>
                )}
              </Box>

              {/* Hours */}
              <Box className="flex items-center gap-1.5">
                <Box className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                  <Box
                    className={cn(
                      "h-full rounded-full",
                      m.hours >= m.goal ? "bg-navy" : m.hours > 0 ? "bg-navy" : "bg-error/15"
                    )}
                    style={{ width: `${Math.min(100, (m.hours / m.goal) * 100)}%` }}
                  />
                </Box>
                <Text as="span" className={cn("text-xs font-semibold", m.hours >= m.goal ? "text-navy" : "text-error")}>
                  {m.hours}h
                </Text>
                <Text as="span" className="text-xs text-muted-foreground">/{m.goal}h</Text>
              </Box>

              {/* Last active */}
              <Text as="span" className="text-xs text-muted-foreground">{m.lastActive}</Text>
            </Box>
          ))}
        </Box>
      </Card>

      {/* ── Learning Hours ── */}
      <Card className="p-5">
        <Box className="flex items-center justify-between mb-5">
          <Text as="h3" className="text-base font-semibold">Learning Hours</Text>
          <Text as="span" className="text-xs text-navy font-medium">
            Monthly goal — {totalHours}h total this month
          </Text>
        </Box>
        <Box className="space-y-4">
          {TEAM_MEMBERS.map((m) => {
            const pct = Math.min(100, Math.round((m.hours / m.goal) * 100));
            return (
              <Box key={m.id} className="flex items-center gap-3">
                <Avatar initials={m.initials} color={m.color} size="sm" />
                <Text as="span" className="w-20 text-sm font-medium shrink-0">{m.name.split(" ")[0]}</Text>
                <Box className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <Box
                    className={cn(
                      "h-full rounded-full transition-all",
                      pct >= 100 ? "bg-navy" : pct > 0 ? "bg-navy" : "bg-muted-foreground/20"
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </Box>
                <Text as="span" className="text-xs font-semibold w-8 text-right">{pct}%</Text>
                <Text as="span" className={cn("text-xs font-semibold w-14 text-right", m.hours >= m.goal ? "text-navy" : "text-error")}>
                  {m.hours}h/{m.goal}h
                </Text>
              </Box>
            );
          })}
        </Box>
      </Card>

    </Box>
  );
}
