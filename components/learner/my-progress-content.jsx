"use client";

import { apiClient } from "@/lib/api-client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Layers, CheckCircle2, TrendingUp, Award, Star, Clock,
  Target, Play, ClipboardCheck, Bookmark, Package,
} from "lucide-react";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

/* ── Status config ── */
const STATUS_CFG = {
  "not started": { label: "not started", cls: "bg-paper-warm text-ink/60 border-border" },
  "in progress":  { label: "in progress",  cls: "bg-paper-cream text-ink border-navy/25" },
  "completed":    { label: "completed",    cls: "bg-navy text-paper border-navy" },
  "failed":       { label: "failed",       cls: "bg-error/10 text-error border-error/30" },
};

const TYPE_CFG = {
  VIDEO: { label: "VIDEO", cls: "bg-paper-cream text-navy" },
  SCORM: { label: "SCORM", cls: "bg-paper-cream text-navy" },
};

const TIMELINE_CFG = {
  lesson:     { icon: Play,           bg: "bg-paper-cream",   color: "text-navy",   border: "border-navy/20"  },
  assessment: { icon: ClipboardCheck, bg: "bg-paper-cream",    color: "text-navy",    border: "border-navy/20"   },
  assignment: { icon: Bookmark,       bg: "bg-paper-cream",    color: "text-ink/60",    border: "border-border"   },
  scorm:      { icon: Package,        bg: "bg-paper-cream",   color: "text-ink/70",   border: "border-border"  },
};

/* ── Skeleton ── */
function ProgressSkeleton() {
  return (
    <Box className="space-y-4">
      <Box className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </Box>
      <Box className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </Box>
      <Box className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-52 rounded-xl" />
        <Skeleton className="h-52 rounded-xl" />
      </Box>
      <Skeleton className="h-64 rounded-xl" />
    </Box>
  );
}

/* ── Stat card ── */
function StatCard({ icon: Icon, iconBg, iconColor, circleBg, value, label }) {
  return (
    <Card className="relative overflow-hidden p-4 flex flex-col gap-1">
      <Box className={cn("w-9 h-9 rounded-lg flex items-center justify-center mb-1", iconBg)}>
        <Icon className={cn("h-4 w-4", iconColor)} />
      </Box>
      <Text as="h2" className="text-2xl font-extrabold leading-none">{value ?? "—"}</Text>
      <Text as="p" className="text-xs text-muted-foreground">{label}</Text>
      <Box className={cn("absolute -right-4 -top-4 w-16 h-16 rounded-full opacity-40", circleBg)} />
    </Card>
  );
}

/* ── Progress bar mini ── */
function MiniBar({ value, className }) {
  return (
    <Box className="flex items-center gap-2 min-w-0">
      <Box className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <Box
          className={cn("h-full rounded-full", className)}
          style={{ width: `${value}%` }}
        />
      </Box>
      <Text as="span" className="text-xs font-semibold shrink-0 w-8 text-right">{value}%</Text>
    </Box>
  );
}

/* ── Score value ── */
function ScoreCell({ score, passed }) {
  if (score === null) return <Text as="span" className="text-muted-foreground/50">—</Text>;
  const cls = passed === false ? "text-error" : passed === true ? "text-navy" : "text-ink/70";
  return <Text as="span" className={cn("font-bold", cls)}>{score}%</Text>;
}

/* ── Main component ── */
export function MyProgressContent() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return;
    apiClient("/api/learner/progress")
      .then(setData)
      .catch((e) => setError(e.message));
  }, [user]);

  if (error) return (
    <Card className="p-8 text-center">
      <Text as="p" className="text-error text-sm">{error}</Text>
      <Button size="sm" variant="outline" className="mt-3" onClick={() => window.location.reload()}>Retry</Button>
    </Card>
  );
  if (!data) return <ProgressSkeleton />;

  const { summary, courseHistory, assessmentPerformance, learningHours, skills, timeline } = data;

  const statCards = [
    { icon: Layers,    iconBg: "bg-paper-cream",    iconColor: "text-navy",    circleBg: "bg-paper-cream",    value: summary.assigned,        label: "Courses Assigned"  },
    { icon: CheckCircle2, iconBg: "bg-paper-cream", iconColor: "text-navy", circleBg: "bg-paper-cream", value: summary.completed,    label: "Completed"         },
    { icon: TrendingUp,iconBg: "bg-paper-cream",   iconColor: "text-navy",   circleBg: "bg-paper-cream",   value: `${summary.completionRate}%`, label: "Completion Rate" },
    { icon: Award,     iconBg: "bg-paper-cream",  iconColor: "text-ink/70",  circleBg: "bg-paper-cream",  value: summary.avgScore !== null ? `${summary.avgScore}%` : "—", label: "Avg Score" },
    { icon: Star,      iconBg: "bg-paper-cream",   iconColor: "text-ink/70",   circleBg: "bg-paper-cream",   value: summary.bestScore !== null ? `${summary.bestScore}%` : "—", label: "Best Score" },
    { icon: Clock,     iconBg: "bg-paper-cream",    iconColor: "text-navy",    circleBg: "bg-paper-cream",    value: `${summary.allTimeHours}h`, label: "All-Time Hours" },
  ];

  const diffPositive = learningHours.diff > 0;
  const diffNeutral  = learningHours.diff === 0;

  return (
    <Box className="space-y-4">

      {/* ── 6 stat cards ── */}
      <Box className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map((s) => <StatCard key={s.label} {...s} />)}
      </Box>

      {/* ── Row 1: Course History + Skills ── */}
      <Box className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Course History */}
        <Card className="p-5">
          <Box className="mb-4">
            <Text as="h3" className="text-base font-semibold">Course History</Text>
            <Text as="p" className="text-xs text-muted-foreground mt-0.5">Your record per course — scores, time, outcome</Text>
          </Box>

          {courseHistory.length === 0 ? (
            <Box className="py-8 text-center">
              <Text as="p" className="text-sm text-muted-foreground">No courses assigned yet.</Text>
            </Box>
          ) : (
            <Box className="overflow-x-auto -mx-5">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left font-semibold text-muted-foreground py-2 pl-5 pr-3">COURSE</th>
                    <th className="text-left font-semibold text-muted-foreground py-2 px-3">TYPE</th>
                    <th className="text-left font-semibold text-muted-foreground py-2 px-3">STATUS</th>
                    <th className="text-left font-semibold text-muted-foreground py-2 px-3 w-36">PROGRESS</th>
                    <th className="text-left font-semibold text-muted-foreground py-2 px-3">SCORE</th>
                    <th className="text-left font-semibold text-muted-foreground py-2 pl-3 pr-5">TIME SPENT</th>
                  </tr>
                </thead>
                <tbody>
                  {courseHistory.map((c, i) => {
                    const scfg  = STATUS_CFG[c.status] || STATUS_CFG["not started"];
                    const tcfg  = TYPE_CFG[c.type] || TYPE_CFG.VIDEO;
                    const barCls = c.status === "failed" ? "bg-error"
                      : c.status === "completed" ? "bg-navy"
                      : "bg-navy";
                    return (
                      <tr key={c.id} className={cn("border-b last:border-0", i % 2 === 1 && "bg-muted/20")}>
                        <td className="py-3 pl-5 pr-3 font-medium text-foreground max-w-[160px]">{c.name}</td>
                        <td className="py-3 px-3">
                          <Badge className={cn("text-[10px] border-0 font-bold", tcfg.cls)}>{tcfg.label}</Badge>
                        </td>
                        <td className="py-3 px-3">
                          <Badge variant="outline" className={cn("text-[10px]", scfg.cls)}>{scfg.label}</Badge>
                        </td>
                        <td className="py-3 px-3 w-36">
                          <MiniBar value={c.progress} className={barCls} />
                        </td>
                        <td className="py-3 px-3">
                          <ScoreCell score={c.score} passed={c.hasPassed} />
                        </td>
                        <td className="py-3 pl-3 pr-5 text-muted-foreground">
                          {c.timeSpent ?? <Text as="span" className="text-muted-foreground/50">—</Text>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Box>
          )}
        </Card>

        {/* Skills & Competencies */}
        <Card className="p-5">
          <Box className="flex items-center justify-between mb-4">
            <Text as="h3" className="text-base font-semibold">Skills &amp; Competencies</Text>
            <Text as="p" className="text-xs text-muted-foreground">Earned through completed courses</Text>
          </Box>

          {skills.length === 0 ? (
            <Box className="flex flex-col items-center justify-center py-12 gap-3">
              <Box className="w-14 h-14 rounded-full bg-error/10 flex items-center justify-center">
                <Target className="h-7 w-7 text-error" />
              </Box>
              <Text as="p" className="text-sm text-muted-foreground">Complete a course to unlock skills</Text>
            </Box>
          ) : (
            <Box className="flex flex-wrap gap-2 mt-2">
              {skills.map((s) => (
                <Badge key={s} variant="secondary" className="text-sm px-3 py-1 bg-paper-cream text-navy border-navy/20 border">
                  {s}
                </Badge>
              ))}
              <Text as="p" className="text-xs text-muted-foreground w-full mt-3">
                {skills.length} skill{skills.length !== 1 ? "s" : ""} earned from {summary.completed} completed course{summary.completed !== 1 ? "s" : ""}
              </Text>
            </Box>
          )}
        </Card>
      </Box>

      {/* ── Row 2: Assessment Performance + Learning Hours ── */}
      <Box className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Assessment Performance */}
        <Card className="p-5">
          <Box className="flex items-center justify-between mb-5">
            <Text as="h3" className="text-base font-semibold">Assessment Performance</Text>
            <Text as="p" className="text-xs text-muted-foreground">Your scores across all assessments taken</Text>
          </Box>

          {assessmentPerformance.attempts.length === 0 ? (
            <Box className="py-8 text-center">
              <ClipboardCheck className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
              <Text as="p" className="text-sm text-muted-foreground">No assessments taken yet</Text>
            </Box>
          ) : (
            <Box className="space-y-4">
              {/* 3 big numbers */}
              <Box className="grid grid-cols-3 gap-4 pb-4 border-b">
                {[
                  { val: assessmentPerformance.avgScore,  label: "AVG SCORE",  cls: assessmentPerformance.avgScore  !== null && assessmentPerformance.avgScore  < 50 ? "text-error" : "text-navy" },
                  { val: assessmentPerformance.bestScore, label: "BEST SCORE", cls: "text-navy" },
                  { val: assessmentPerformance.passRate,  label: "PASS RATE",  cls: assessmentPerformance.passRate !== null && assessmentPerformance.passRate  < 50 ? "text-error" : "text-navy" },
                ].map(({ val, label, cls }) => (
                  <Box key={label} className="text-center">
                    <Text as="h2" className={cn("text-3xl font-extrabold", cls)}>{val !== null ? `${val}%` : "—"}</Text>
                    <Text as="p" className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase mt-1">{label}</Text>
                  </Box>
                ))}
              </Box>

              {/* Per-assessment rows */}
              <Box className="space-y-3">
                {assessmentPerformance.attempts.map((a) => (
                  <Box key={`${a.courseName}::${a.assessmentTitle}`} className="flex items-center gap-3">
                    <Text as="p" className="text-xs text-muted-foreground flex-1 truncate min-w-0">{a.courseName}</Text>
                    <Box className="w-20">
                      <Box className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <Box
                          className={cn("h-full rounded-full", a.passed ? "bg-navy" : "bg-error")}
                          style={{ width: `${a.score}%` }}
                        />
                      </Box>
                    </Box>
                    <Text as="span" className={cn("text-xs font-bold w-8 text-right shrink-0", a.passed ? "text-navy" : "text-error")}>{a.score}%</Text>
                    <Badge variant="outline" className={cn("text-[10px] shrink-0", a.passed ? "bg-paper-cream text-navy border-navy/20" : "bg-error/10 text-error border-error/30")}>
                      {a.passed ? "Pass" : "Fail"}
                    </Badge>
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </Card>

        {/* Learning Hours Trend */}
        <Card className="p-5">
          <Box className="flex items-center justify-between mb-5">
            <Text as="h3" className="text-base font-semibold">Learning Hours Trend</Text>
            <Text as="p" className="text-xs text-muted-foreground">Month-on-month investment</Text>
          </Box>

          {/* 3 big numbers */}
          <Box className="grid grid-cols-3 gap-4 mb-5">
            {[
              { val: `${learningHours.thisMonth}h`, label: "THIS MONTH", cls: "text-navy" },
              { val: `${learningHours.lastMonth}h`, label: "LAST MONTH", cls: "text-navy" },
              { val: `${learningHours.allTime}h`,   label: "ALL TIME",   cls: "text-navy" },
            ].map(({ val, label, cls }) => (
              <Box key={label} className="text-center">
                <Text as="h2" className={cn("text-3xl font-extrabold", cls)}>{val}</Text>
                <Text as="p" className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase mt-1">{label}</Text>
              </Box>
            ))}
          </Box>

          {/* Insight banner */}
          <Box className={cn(
            "rounded-lg px-4 py-3 text-xs font-medium mb-4",
            diffPositive ? "bg-paper-cream text-navy border border-navy/20"
              : diffNeutral ? "bg-paper-warm text-ink/70 border border-border"
              : "bg-paper-cream text-ink/70 border border-border"
          )}>
            {diffPositive
              ? `↑${learningHours.diff}h more than last month — great momentum, keep it up!`
              : diffNeutral
              ? "Same hours as last month — try to push a bit more this month!"
              : `↓${Math.abs(learningHours.diff)}h less than last month — let's pick up the pace!`}
          </Box>

          {/* Monthly goal bar */}
          <Box>
            <Box className="flex items-center justify-between mb-1.5">
              <Text as="p" className="text-xs text-muted-foreground">Monthly goal: {learningHours.goal}h</Text>
              <Text as="p" className={cn("text-xs font-bold", learningHours.goalPct >= 100 ? "text-navy" : "text-ink/70")}>
                {learningHours.goalPct}% achieved
              </Text>
            </Box>
            <Box className="h-2.5 bg-muted rounded-full overflow-hidden">
              <Box
                className="h-full rounded-full transition-all"
                style={{
                  width: `${learningHours.goalPct}%`,
                  background: learningHours.goalPct >= 100 ? "#0A1628" : "#14233D",
                }}
              />
            </Box>
          </Box>
        </Card>
      </Box>

      {/* ── Learning Activity Timeline ── */}
      <Card className="p-5">
        <Box className="flex items-center justify-between mb-5">
          <Text as="h3" className="text-base font-semibold">Learning Activity Timeline</Text>
          <Text as="p" className="text-xs text-muted-foreground">Your complete history across all courses</Text>
        </Box>

        {timeline.length === 0 ? (
          <Box className="py-8 text-center">
            <Text as="p" className="text-sm text-muted-foreground">No activity yet. Start a course!</Text>
          </Box>
        ) : (
          <Box className="relative">
            {/* vertical line */}
            <Box className="absolute left-4 top-0 bottom-0 w-px bg-border" />

            <Box className="space-y-0">
              {timeline.map((item, i) => {
                const cfg  = TIMELINE_CFG[item.type] || TIMELINE_CFG.assignment;
                const Icon = cfg.icon;
                const isLast = i === timeline.length - 1;
                return (
                  <Box key={i} className={cn("flex items-start gap-4 pb-5 pl-0", isLast && "pb-0")}>
                    {/* icon dot on the line */}
                    <Box className={cn("w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 z-10 bg-white", cfg.border)}>
                      <Icon className={cn("h-3.5 w-3.5", cfg.color)} />
                    </Box>
                    <Box className="flex-1 pt-1 min-w-0">
                      <Text as="p" className="text-sm font-semibold leading-snug">{item.title}</Text>
                      <Text as="p" className="text-xs text-muted-foreground mt-0.5">{item.timeLabel}</Text>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Box>
        )}
      </Card>
    </Box>
  );
}
