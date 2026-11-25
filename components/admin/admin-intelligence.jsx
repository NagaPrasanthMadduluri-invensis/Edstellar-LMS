"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity, AlertTriangle, Award, BarChart3, BookOpen, CheckCircle2, Gauge,
  GraduationCap, HeartPulse, Target, TrendingUp, UserX, Users,
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, PolarAngleAxis,
  PolarGrid, Radar, RadarChart, RadialBar, RadialBarChart, ResponsiveContainer,
  Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis,
} from "recharts";

import { Card } from "@/components/ui/card";
import Box from "@/components/ui/box";
import Text from "@/components/ui/text";
import { BRAND, HAIRLINE, STATUS_RAMP } from "@/lib/brand";
import { fetchAdminIntelligence } from "@/services/api/admin/ai-insights-api";
import { usePermissions } from "@/hooks/use-permissions";

/**
 * The real-data Learning Intelligence sections (BACKEND_STRUCTURE §10.56):
 * headline KPIs, a Learning Health gauge, course-status split, completion and
 * assessment gauges, Risk Radar, inactivity, Course Effectiveness (table +
 * scatter) and Organisational Skill Intelligence. Deterministic and accurate —
 * the AI briefing above narrates these; this is the numbers. Each section has an
 * honest empty state, and each says in one line what it shows.
 */
function riskColor(v) {
  if (v >= 60) return BRAND.danger;
  if (v >= 35) return BRAND.warning;
  return BRAND.success;
}

function scoreColor(v) {
  if (v >= 75) return BRAND.success;
  if (v >= 50) return BRAND.warning;
  return BRAND.danger;
}

const TOOLTIP_STYLE = { fontSize: 12, borderRadius: 8, border: `1px solid ${HAIRLINE}` };

/** A compact real-data KPI tile. */
function StatTile({ icon: Icon, label, value, sub, tone = "accent" }) {
  const tile =
    tone === "success" ? "tile-success"
      : tone === "warning" ? "tile-warning"
        : tone === "rust" ? "tile-rust" : "tile-accent";
  return (
    <Box className="rounded-lg border border-line bg-surface-2 p-3">
      <Box className="flex items-center gap-2">
        <Box className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${tile}`}>
          <Icon className="h-3.5 w-3.5" />
        </Box>
        <Text as="p" className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-text-3">{label}</Text>
      </Box>
      <Text as="p" className="mt-1.5 font-mono text-2xl font-extrabold leading-none text-ink">{value}</Text>
      {sub && <Text as="p" className="mt-1 text-[11px] text-text-3">{sub}</Text>}
    </Box>
  );
}

/** A labelled radial gauge, 0-100, coloured by the metric band. */
function Gauge100({ value, label }) {
  const v = Math.max(0, Math.min(100, Math.round(value ?? 0)));
  return (
    <Box className="relative flex items-center justify-center">
      <Box className="h-[150px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart innerRadius="70%" outerRadius="100%" startAngle={90} endAngle={-270}
            data={[{ value: v, fill: scoreColor(v) }]}>
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar dataKey="value" cornerRadius={8} background isAnimationActive={false} />
          </RadialBarChart>
        </ResponsiveContainer>
      </Box>
      <Box className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <Text as="p" className="font-mono text-2xl font-extrabold leading-none" style={{ color: scoreColor(v) }}>{v}%</Text>
        <Text as="p" className="font-mono text-[9px] uppercase tracking-[0.12em] text-text-3">{label}</Text>
      </Box>
    </Box>
  );
}

export function AdminIntelligence() {
  const { can } = usePermissions();
  const canView = can("view_reports");
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!canView) return;
    let cancelled = false;
    fetchAdminIntelligence()
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [canView]);

  if (!canView || failed) return null;
  if (!data) return <Box className="h-72 animate-pulse rounded-xl bg-surface-2" />;

  const radar = data.riskRadar ?? { score: 0, dimensions: [] };
  const inact = data.inactivity ?? { inactive: 0, total: 0, days: 30 };
  const effectiveness = data.courseEffectiveness ?? [];
  const needing = data.coursesNeedingAttention ?? [];
  const skills = data.skillIntelligence ?? { tagged: false, domains: [] };
  const depts = data.departments ?? [];
  const health = data.healthScore ?? { score: 0, dimensions: [] };
  const headline = data.headline ?? {};
  const engagement = data.engagement ?? {};
  const status = (data.statusBreakdown ?? []).filter((s) => s.value > 0);
  const scatter = effectiveness.filter((c) => c.avgScore !== null && c.avgScore !== undefined);

  return (
    <Box className="space-y-4">
      {/* What this whole section is */}
      <Box className="ai-border overflow-hidden rounded-xl glass">
        <Box className="flex items-center gap-2.5 p-4">
          <Box className="ai-soft flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
            <Target className="h-4 w-4 text-white" />
          </Box>
          <Box>
            <Text as="h2" className="text-[15px] font-semibold text-ink">Learning Intelligence</Text>
            <Text as="p" className="text-xs text-text-2">
              Computed directly from your organisation&apos;s real data — not AI-written. The
              AI briefing above reads these numbers and tells you what to do about them.
            </Text>
          </Box>
        </Box>
      </Box>

      {/* Headline KPIs */}
      <Box className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile icon={Users} label="Learners" value={headline.totalLearners ?? 0}
          sub={`${headline.activeLearners ?? 0} active`} tone="accent" />
        <StatTile icon={CheckCircle2} label="Completion" value={`${headline.completionRate ?? 0}%`} tone="success" />
        <StatTile icon={Gauge} label="Pass rate" value={`${engagement.passRate ?? 0}%`} tone="success" />
        <StatTile icon={TrendingUp} label="Avg score"
          value={engagement.avgScore === null || engagement.avgScore === undefined ? "—" : `${engagement.avgScore}%`} tone="accent" />
        <StatTile icon={Award} label="Certificates" value={engagement.certificatesIssued ?? 0} tone="warning" />
        <StatTile icon={BookOpen} label="Active courses" value={engagement.activeCourses ?? 0} tone="rust" />
      </Box>

      {/* Learning Health Score — gauge + radar */}
      <Card className="gap-0 p-5">
        <Box className="mb-1 flex items-center gap-2">
          <HeartPulse className="h-4 w-4 text-accent-blue" />
          <Text as="h3" className="text-base font-semibold">Learning Health Score</Text>
        </Box>
        <Text as="p" className="mb-3 text-xs text-text-2">
          A single 0&ndash;100 reading of your organisation&apos;s learning health, averaged over
          completion, assessment pass rate, participation and certification.
        </Text>
        <Box className="grid items-center gap-4 sm:grid-cols-[150px_1fr]">
          <Box className="text-center">
            <Text as="p" className="font-mono text-4xl font-extrabold leading-none" style={{ color: scoreColor(health.score) }}>
              {health.score}
            </Text>
            <Text as="p" className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.1em] text-text-3">
              Overall health
            </Text>
          </Box>
          <Box className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={health.dimensions} outerRadius="72%">
                <PolarGrid stroke={BRAND.line} />
                <PolarAngleAxis dataKey="axis" tick={{ fontSize: 10, fill: BRAND.text2 }} />
                <Radar dataKey="value" stroke={BRAND.accent} fill={BRAND.accent} fillOpacity={0.25} isAnimationActive={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v}%`, "Score"]} />
              </RadarChart>
            </ResponsiveContainer>
          </Box>
        </Box>
      </Card>

      <Box className="grid gap-4 lg:grid-cols-2">
        {/* Course status donut */}
        <Card className="gap-0 p-5">
          <Box className="mb-1 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-accent-blue" />
            <Text as="h3" className="text-base font-semibold">Course status</Text>
          </Box>
          <Text as="p" className="mb-3 text-xs text-text-2">
            Every learner-course across the organisation, split by completed, in progress,
            not started and failed.
          </Text>
          {status.length === 0 ? (
            <Text as="p" className="py-6 text-center text-sm text-muted-foreground">No enrolments yet.</Text>
          ) : (
            <Box className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={status} dataKey="value" nameKey="status" innerRadius="52%" outerRadius="80%"
                    paddingAngle={2} isAnimationActive={false}>
                    {status.map((s, i) => <Cell key={i} fill={STATUS_RAMP[i % STATUS_RAMP.length]} />)}
                  </Pie>
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          )}
        </Card>

        {/* Completion & assessment gauges */}
        <Card className="gap-0 p-5">
          <Box className="mb-1 flex items-center gap-2">
            <Gauge className="h-4 w-4 text-accent-blue" />
            <Text as="h3" className="text-base font-semibold">Completion &amp; assessment</Text>
          </Box>
          <Text as="p" className="mb-3 text-xs text-text-2">
            The share of assigned courses completed, and the share of assessment attempts
            that passed.
          </Text>
          <Box className="grid grid-cols-2 gap-2">
            <Gauge100 value={headline.completionRate} label="Completion" />
            <Gauge100 value={engagement.passRate} label="Pass rate" />
          </Box>
        </Card>
      </Box>

      {/* Risk Radar */}
      <Card className="gap-0 p-5">
        <Box className="mb-1 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-accent-blue" />
          <Text as="h3" className="text-base font-semibold">Learning Risk Radar</Text>
        </Box>
        <Text as="p" className="mb-3 text-xs text-text-2">
          Five risk signals scored 0–100 (0 is best): overdue load, inactivity, low
          completion, assessment risk and course quality — higher means more to worry about.
        </Text>
        <Box className="grid items-center gap-4 sm:grid-cols-[150px_1fr]">
          <Box className="text-center">
            <Text as="p" className="font-mono text-4xl font-extrabold leading-none" style={{ color: riskColor(radar.score) }}>
              {radar.score}
            </Text>
            <Text as="p" className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.1em] text-text-3">
              Overall risk (0 best)
            </Text>
          </Box>
          <Box className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radar.dimensions} outerRadius="72%">
                <PolarGrid stroke={BRAND.line} />
                <PolarAngleAxis dataKey="axis" tick={{ fontSize: 10, fill: BRAND.text2 }} />
                <Radar dataKey="value" stroke={BRAND.danger} fill={BRAND.danger} fillOpacity={0.25} isAnimationActive={false} />
              </RadarChart>
            </ResponsiveContainer>
          </Box>
        </Box>
      </Card>

      <Box className="grid gap-4 lg:grid-cols-2">
        {/* Inactivity */}
        <Card className="gap-0 p-5">
          <Box className="mb-2 flex items-center gap-2">
            <UserX className="h-4 w-4 text-warning" />
            <Text as="h3" className="text-base font-semibold">Inactive learners</Text>
          </Box>
          <Box className="flex items-baseline gap-2">
            <Text as="p" className="font-mono text-3xl font-extrabold text-ink">{inact.inactive}</Text>
            <Text as="span" className="text-sm text-text-2">of {inact.total} active learners</Text>
          </Box>
          <Text as="p" className="mt-1 text-xs text-text-3">
            No lesson completion or assessment in the last {inact.days} days.
          </Text>
        </Card>

        {/* Skill intelligence */}
        <Card className="gap-0 p-5">
          <Box className="mb-1 flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-accent-blue" />
            <Text as="h3" className="text-base font-semibold">Skill intelligence</Text>
          </Box>
          <Text as="p" className="mb-2 text-xs text-text-2">
            Competency coverage per skill domain — how many learners hold it and their
            average level — built as learners complete skill-tagged courses.
          </Text>
          {skills.domains.length === 0 ? (
            <Text as="p" className="text-sm text-muted-foreground">
              No competencies recorded yet. Tag the skills a course imparts on its{" "}
              <Link href="/admin/courses" className="font-semibold text-accent-blue hover:underline">
                course page
              </Link>{" "}
              (Skills tab); they build as learners complete those courses.
            </Text>
          ) : (
            <Box className="space-y-2">
              {skills.domains.slice(0, 6).map((d) => (
                <Box key={d.domain}>
                  <Box className="flex items-baseline justify-between text-[12.5px]">
                    <Text as="span" className="text-ink">{d.domain}</Text>
                    <Text as="span" className="text-text-2">{d.learners} learner{d.learners === 1 ? "" : "s"} · {d.avgLevelPct}%</Text>
                  </Box>
                  <Box className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-3">
                    <Box className="h-full rounded-full" style={{ width: `${d.avgLevelPct}%`, backgroundColor: BRAND.accent }} />
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </Card>
      </Box>

      {/* Course effectiveness scatter — content done vs score, sized by enrolment */}
      {scatter.length > 0 && (
        <Card className="gap-0 p-5">
          <Box className="mb-1 flex items-center gap-2">
            <Activity className="h-4 w-4 text-accent-blue" />
            <Text as="h3" className="text-base font-semibold">Effectiveness map</Text>
          </Box>
          <Text as="p" className="mb-3 text-xs text-text-2">
            Each bubble is a course: how much of its content learners have worked through
            (across) against their average passing score (up), sized by how many are enrolled.
            Top-right is working well; bottom-left needs attention.
          </Text>
          <Box className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 8, right: 16, bottom: 20, left: -8 }}>
                <CartesianGrid stroke={HAIRLINE} />
                <XAxis type="number" dataKey="contentCompletionPct" name="Content done" unit="%"
                  domain={[0, 100]} tick={{ fontSize: 11, fill: BRAND.text2 }} axisLine={false} tickLine={false}>
                </XAxis>
                <YAxis type="number" dataKey="avgScore" name="Avg score" unit="%"
                  domain={[0, 100]} tick={{ fontSize: 11, fill: BRAND.text2 }} axisLine={false} tickLine={false} />
                <ZAxis type="number" dataKey="enrolled" range={[50, 500]} name="Enrolled" />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ strokeDasharray: "3 3" }}
                  formatter={(v, n) => [n === "Enrolled" ? v : `${v}%`, n]}
                  labelFormatter={() => ""} />
                <Scatter data={scatter} fill={BRAND.accent} fillOpacity={0.6} isAnimationActive={false} />
              </ScatterChart>
            </ResponsiveContainer>
          </Box>
        </Card>
      )}

      {/* Course effectiveness */}
      <Card className="gap-0 p-5">
        <Box className="mb-1 flex items-center gap-2">
          <Target className="h-4 w-4 text-accent-blue" />
          <Text as="h3" className="text-base font-semibold">Course effectiveness</Text>
        </Box>
        <Text as="p" className="mb-3 text-xs text-text-2">
          Per enrolled course: how much of the content learners have worked through,
          their average passing score, and flags where a course may need attention.
        </Text>
        {effectiveness.length === 0 ? (
          <Text as="p" className="text-sm text-muted-foreground">No enrolled courses to measure yet.</Text>
        ) : (
          <Box className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="border-b border-line text-left text-text-3">
                  <th className="py-1.5 pr-3 font-semibold">Course</th>
                  <th className="px-2 font-semibold">Enrolled</th>
                  <th className="px-2 font-semibold">Content done</th>
                  <th className="px-2 font-semibold">Avg score</th>
                  <th className="pl-2 font-semibold">Flags</th>
                </tr>
              </thead>
              <tbody>
                {effectiveness.slice(0, 15).map((c, i) => (
                  <tr key={i} className="border-b border-line/60">
                    <td className="py-1.5 pr-3 font-medium text-ink">{c.name}</td>
                    <td className="px-2 text-text-2">{c.enrolled}</td>
                    <td className="px-2 text-text-2">{c.contentCompletionPct}%</td>
                    <td className="px-2 text-text-2">{c.avgScore === null ? "—" : `${c.avgScore}%`}</td>
                    <td className="pl-2">
                      {c.flags.length === 0 ? (
                        <Text as="span" className="text-success">ok</Text>
                      ) : (
                        <Box className="flex flex-wrap gap-1">
                          {c.flags.map((f) => (
                            <Text as="span" key={f} className="rounded-full bg-warning/15 px-1.5 py-0.5 text-[10px] font-semibold text-warning">{f}</Text>
                          ))}
                        </Box>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        )}
        {needing.length > 0 && (
          <Text as="p" className="mt-3 text-xs text-text-2">
            {needing.length} course{needing.length === 1 ? "" : "s"} flagged for attention.
          </Text>
        )}
      </Card>

      {/* Department benchmarks */}
      {depts.length > 0 && (
        <Card className="gap-0 p-5">
          <Text as="h3" className="text-base font-semibold">Department completion</Text>
          <Text as="p" className="mb-3 text-xs text-text-2">
            Average course completion by department (small departments are grouped to
            protect privacy).
          </Text>
          <Box className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={depts} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid horizontal={false} stroke={HAIRLINE} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: BRAND.text2 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="dept" width={110} tick={{ fontSize: 11, fill: BRAND.text2 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => [`${v}%`, "Completion"]} contentStyle={{ fontSize: 12 }} />
                <Bar dataKey="completionPct" fill={BRAND.accent} radius={[0, 3, 3, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Card>
      )}
    </Box>
  );
}
