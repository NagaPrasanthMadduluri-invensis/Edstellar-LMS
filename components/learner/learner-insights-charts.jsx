"use client";

import { useEffect, useState } from "react";
import {
  Award,
  BarChart3,
  BookOpen,
  GraduationCap,
  Layers,
  Target,
  Trophy,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card } from "@/components/ui/card";
import Box from "@/components/ui/box";
import Text from "@/components/ui/text";
import { BRAND, HAIRLINE, SEQUENTIAL, STATUS_RAMP } from "@/lib/brand";
import { fetchLearnerCharts } from "@/services/api/learner/ai-insights-api";

/**
 * The learner's AI Insights CHARTS — a lot of graphs, many types, over the
 * learner's own real figures (owner request 2026-11-19). These are NOT model
 * output: every number is reused server-side from the canonical services
 * (competencies, My Courses, the leaderboard, badges — BACKEND_STRUCTURE §10.54),
 * so a chart cannot disagree with the screen that shows the same figure, and the
 * section shows whether or not the AI model is enabled.
 *
 * Each card says in one line exactly WHAT it is showing (§10.3.1.41), under a
 * header that marks the whole section as real data the AI reasons about — not AI
 * prose.
 */

const TITLE_CASE = (s) =>
  String(s || "").replace(/\b\w/g, (c) => c.toUpperCase());

const TOOLTIP_STYLE = { fontSize: 12, borderRadius: 8, border: `1px solid ${HAIRLINE}` };

/** A compact real-data figure tile for the strip at the top. */
function StatTile({ icon: Icon, label, value, sub, tone = "accent" }) {
  const tile =
    tone === "success"
      ? "tile-success"
      : tone === "warning"
        ? "tile-warning"
        : tone === "rust"
          ? "tile-rust"
          : "tile-accent";
  return (
    <Box className="rounded-lg border border-line bg-surface-2 p-3">
      <Box className="flex items-center gap-2">
        <Box className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${tile}`}>
          <Icon className="h-3.5 w-3.5" />
        </Box>
        <Text as="p" className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-text-3">
          {label}
        </Text>
      </Box>
      <Text as="p" className="mt-1.5 font-mono text-2xl font-extrabold leading-none text-ink">
        {value}
      </Text>
      {sub && <Text as="p" className="mt-1 text-[11px] text-text-3">{sub}</Text>}
    </Box>
  );
}

/** A chart card: heading + one-line description of what it shows, then the chart. */
function ChartCard({ icon: Icon, title, description, children, empty, isEmpty }) {
  return (
    <Card className="gap-0 p-5">
      <Box className="mb-1 flex items-center gap-2">
        <Icon className="h-4 w-4 text-accent-blue" />
        <Text as="h3" className="text-base font-semibold">{title}</Text>
      </Box>
      <Text as="p" className="mb-3 text-xs text-text-2">{description}</Text>
      {isEmpty ? (
        <Text as="p" className="py-6 text-center text-sm text-muted-foreground">{empty}</Text>
      ) : (
        children
      )}
    </Card>
  );
}

export function LearnerInsightsCharts() {
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchLearnerCharts()
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, []);

  if (failed) return null;
  if (!data) return <Box className="h-72 animate-pulse rounded-xl bg-surface-2" />;

  const totals = data.totals ?? {};
  const points = data.points ?? {};
  const badges = data.badges ?? { earned: 0, total: 0, byTier: [], recent: [] };

  const skillRadar = Array.isArray(data.skillRadar) ? data.skillRadar : [];
  const skillDomains = Array.isArray(data.skillDomains) ? data.skillDomains : [];
  const competencyLevels = (Array.isArray(data.competencyLevels) ? data.competencyLevels : [])
    .map((l) => ({ level: TITLE_CASE(l.level), count: l.count }));
  const courseStatus = (Array.isArray(data.courseStatus) ? data.courseStatus : [])
    .filter((s) => s.value > 0);
  const categoryProgress = Array.isArray(data.categoryProgress) ? data.categoryProgress : [];

  const badgePct = badges.total ? Math.round((badges.earned / badges.total) * 100) : 0;
  const completionPct = points.completionPct ?? 0;

  return (
    <Box className="space-y-4">
      {/* What this whole section is — real data, not AI-written */}
      <Box className="ai-border overflow-hidden rounded-xl glass">
        <Box className="flex items-center gap-2.5 p-4">
          <Box className="ai-spectrum flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
            <BarChart3 className="h-4 w-4 text-white" />
          </Box>
          <Box>
            <Text as="h2" className="text-[15px] font-semibold text-ink">Your learning, visualised</Text>
            <Text as="p" className="text-xs text-text-2">
              Your real figures, drawn straight from your courses, assessments, skills, badges
              and certificates. The AI coach above reads these same numbers to write your guidance.
            </Text>
          </Box>
        </Box>
      </Box>

      {/* KPI strip */}
      <Box className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile icon={BookOpen} label="Completed" value={totals.completed ?? 0}
          sub={`of ${totals.assigned ?? 0} assigned`} tone="success" />
        <StatTile icon={Layers} label="In progress" value={totals.inProgress ?? 0} tone="accent" />
        <StatTile icon={GraduationCap} label="Skills gained" value={totals.skills ?? 0} tone="accent" />
        <StatTile icon={Award} label="Badges" value={totals.badgesEarned ?? 0}
          sub={`of ${badges.total ?? 0}`} tone="warning" />
        <StatTile icon={Trophy} label="Certificates" value={totals.certificates ?? 0} tone="success" />
        <StatTile icon={Target} label="Points" value={points.points ?? 0}
          sub={points.rankLabel ?? "Not ranked"} tone="rust" />
      </Box>

      <Box className="grid gap-4 lg:grid-cols-2">
        {/* Skill proficiency radar */}
        <ChartCard
          icon={Target}
          title="Skill proficiency"
          description="Your average competency level in each skill domain, built from the courses you have completed."
          isEmpty={skillRadar.length < 3}
          empty="Complete a few skill-tagged courses to map your skill profile here."
        >
          <Box className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={skillRadar} outerRadius="72%">
                <PolarGrid stroke={BRAND.line} />
                <PolarAngleAxis dataKey="axis" tick={{ fontSize: 10, fill: BRAND.text2 }} />
                <Radar dataKey="value" stroke={BRAND.accent} fill={BRAND.accent} fillOpacity={0.3} isAnimationActive={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v}%`, "Proficiency"]} />
              </RadarChart>
            </ResponsiveContainer>
          </Box>
        </ChartCard>

        {/* Course status donut */}
        <ChartCard
          icon={BookOpen}
          title="Course status"
          description="How your assigned courses split across completed, in progress, not started and failed."
          isEmpty={courseStatus.length === 0}
          empty="No courses assigned yet."
        >
          <Box className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={courseStatus} dataKey="value" nameKey="status" innerRadius="52%" outerRadius="80%"
                  paddingAngle={2} isAnimationActive={false}>
                  {courseStatus.map((s, i) => (
                    <Cell key={i} fill={STATUS_RAMP[i % STATUS_RAMP.length]} />
                  ))}
                </Pie>
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
          </Box>
        </ChartCard>

        {/* Competency levels */}
        <ChartCard
          icon={GraduationCap}
          title="Competency levels"
          description="How many of your skills sit at each proficiency level."
          isEmpty={competencyLevels.every((l) => l.count === 0)}
          empty="No competencies recorded yet."
        >
          <Box className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={competencyLevels} margin={{ top: 8, left: -16 }}>
                <XAxis dataKey="level" tick={{ fontSize: 11, fill: BRAND.text2 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: BRAND.text2 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: BRAND.surface3 }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                  {competencyLevels.map((_, i) => (
                    <Cell key={i} fill={SEQUENTIAL[(i + 1) % SEQUENTIAL.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </ChartCard>

        {/* Skills by domain — horizontal bars */}
        <ChartCard
          icon={Layers}
          title="Skills by domain"
          description="How many distinct skills you have gained in each domain."
          isEmpty={skillDomains.length === 0}
          empty="No skills recorded yet."
        >
          <Box className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={skillDomains} layout="vertical" margin={{ left: 8 }}>
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: BRAND.text2 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="domain" width={110} tick={{ fontSize: 11, fill: BRAND.text2 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: BRAND.surface3 }} formatter={(v) => [v, "Skills"]} />
                <Bar dataKey="count" fill={BRAND.accent} radius={[0, 4, 4, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </ChartCard>
      </Box>

      {/* Progress by category — stacked */}
      <ChartCard
        icon={BarChart3}
        title="Progress by category"
        description="Your courses in each category, stacked by completed, in progress and not started."
        isEmpty={categoryProgress.length === 0}
        empty="No courses assigned yet."
      >
        <Box className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categoryProgress} margin={{ top: 8, left: -16 }}>
              <XAxis dataKey="category" tick={{ fontSize: 10, fill: BRAND.text2 }} axisLine={false} tickLine={false} interval={0} angle={-12} textAnchor="end" height={48} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: BRAND.text2 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: BRAND.surface3 }} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="completed" name="Completed" stackId="s" fill={BRAND.success} isAnimationActive={false} />
              <Bar dataKey="inProgress" name="In progress" stackId="s" fill={BRAND.accent} isAnimationActive={false} />
              <Bar dataKey="notStarted" name="Not started" stackId="s" fill={BRAND.text3} radius={[3, 3, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </ChartCard>

      <Box className="grid gap-4 lg:grid-cols-2">
        {/* Badges earned — radial gauge + recent */}
        <ChartCard
          icon={Award}
          title="Badges earned"
          description="How far through the badge set you are, and the ones you earned most recently."
          isEmpty={(badges.total ?? 0) === 0}
          empty="No badges available yet."
        >
          <Box className="grid items-center gap-3 sm:grid-cols-[150px_1fr]">
            <Box className="relative flex items-center justify-center">
              <Box className="h-[150px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart innerRadius="70%" outerRadius="100%" startAngle={90} endAngle={-270}
                    data={[{ value: badgePct, fill: BRAND.warning }]}>
                    <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                    <RadialBar dataKey="value" cornerRadius={8} background isAnimationActive={false} />
                  </RadialBarChart>
                </ResponsiveContainer>
              </Box>
              <Box className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <Text as="p" className="font-mono text-2xl font-extrabold leading-none text-ink">
                  {badges.earned}<Text as="span" className="text-sm text-text-3">/{badges.total}</Text>
                </Text>
                <Text as="p" className="font-mono text-[9px] uppercase tracking-[0.12em] text-text-3">Earned</Text>
              </Box>
            </Box>
            <Box className="space-y-1.5">
              {(badges.recent ?? []).length === 0 ? (
                <Text as="p" className="text-sm text-text-2">None earned yet — keep going.</Text>
              ) : (
                (badges.recent ?? []).map((b, i) => (
                  <Box key={i} className="flex items-center gap-2 rounded-md border border-line bg-surface-2 px-2 py-1.5">
                    <Award className="h-3.5 w-3.5 shrink-0 text-warning" />
                    <Text as="span" className="truncate text-[12.5px] text-ink">{b.label}</Text>
                  </Box>
                ))
              )}
            </Box>
          </Box>
        </ChartCard>

        {/* Completion rate gauge + points */}
        <ChartCard
          icon={Trophy}
          title="Completion & points"
          description="Your overall course-completion rate, with points earned and your leaderboard rank."
          isEmpty={false}
        >
          <Box className="grid items-center gap-3 sm:grid-cols-[150px_1fr]">
            <Box className="relative flex items-center justify-center">
              <Box className="h-[150px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart innerRadius="70%" outerRadius="100%" startAngle={90} endAngle={-270}
                    data={[{ value: completionPct, fill: BRAND.success }]}>
                    <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                    <RadialBar dataKey="value" cornerRadius={8} background isAnimationActive={false} />
                  </RadialBarChart>
                </ResponsiveContainer>
              </Box>
              <Box className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <Text as="p" className="font-mono text-2xl font-extrabold leading-none text-ink">{completionPct}%</Text>
                <Text as="p" className="font-mono text-[9px] uppercase tracking-[0.12em] text-text-3">Complete</Text>
              </Box>
            </Box>
            <Box className="space-y-2">
              <Box className="rounded-lg border border-line bg-surface-2 p-2.5">
                <Text as="p" className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-text-3">Points earned</Text>
                <Text as="p" className="font-mono text-xl font-extrabold text-ink">{points.points ?? 0}</Text>
              </Box>
              <Box className="rounded-lg border border-line bg-surface-2 p-2.5">
                <Text as="p" className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-text-3">This month</Text>
                <Text as="p" className="font-mono text-xl font-extrabold text-ink">
                  {points.monthPoints ?? 0}
                  {points.rankLabel && (
                    <Text as="span" className="ml-2 text-xs font-medium text-text-3">{points.rankLabel}</Text>
                  )}
                </Text>
              </Box>
            </Box>
          </Box>
        </ChartCard>
      </Box>
    </Box>
  );
}
