"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, UserX, Target, GraduationCap } from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, PolarAngleAxis, PolarGrid, Radar, RadarChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

import { Card } from "@/components/ui/card";
import Box from "@/components/ui/box";
import Text from "@/components/ui/text";
import { BRAND, HAIRLINE } from "@/lib/brand";
import { fetchAdminIntelligence } from "@/services/api/admin/ai-insights-api";

/**
 * The real-data Learning Intelligence sections (BACKEND_STRUCTURE §10.56): Risk
 * Radar, inactivity, Course Effectiveness, and Organisational Skill Intelligence.
 * Deterministic and accurate — the AI briefing above narrates these; this is the
 * numbers. Each section has an honest empty state.
 */
function riskColor(v) {
  if (v >= 60) return BRAND.danger;
  if (v >= 35) return BRAND.warning;
  return BRAND.success;
}

export function AdminIntelligence() {
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchAdminIntelligence()
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, []);

  if (failed) return null;
  if (!data) return <Box className="h-72 animate-pulse rounded-xl bg-surface-2" />;

  const radar = data.riskRadar ?? { score: 0, dimensions: [] };
  const inact = data.inactivity ?? { inactive: 0, total: 0, days: 30 };
  const effectiveness = data.courseEffectiveness ?? [];
  const needing = data.coursesNeedingAttention ?? [];
  const skills = data.skillIntelligence ?? { tagged: false, domains: [] };
  const depts = data.departments ?? [];

  return (
    <Box className="space-y-4">
      {/* Risk Radar */}
      <Card className="gap-0 p-5">
        <Box className="mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-accent-blue" />
          <Text as="h3" className="text-base font-semibold">Learning Risk Radar</Text>
        </Box>
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
          <Box className="mb-2 flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-accent-blue" />
            <Text as="h3" className="text-base font-semibold">Skill intelligence</Text>
          </Box>
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

      {/* Course effectiveness */}
      <Card className="gap-0 p-5">
        <Box className="mb-3 flex items-center gap-2">
          <Target className="h-4 w-4 text-accent-blue" />
          <Text as="h3" className="text-base font-semibold">Course effectiveness</Text>
        </Box>
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
          <Text as="h3" className="mb-3 text-base font-semibold">Department completion</Text>
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
