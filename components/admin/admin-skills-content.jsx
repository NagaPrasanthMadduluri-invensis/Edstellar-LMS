"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import { Award, GraduationCap, Layers, Sparkles, TrendingUp, Users } from "lucide-react";

import { Card } from "@/components/ui/card";
import Box from "@/components/ui/box";
import Text from "@/components/ui/text";
import { Skeleton } from "@/components/ui/skeleton";
import { StatTile } from "@/components/admin/insights/kpi-strip";
import { fetchSkillsAnalytics } from "@/services/api/admin/admin-api";
import { BRAND, HAIRLINE, metricTone, WARM_SERIES, warmSeriesColor } from "@/lib/brand";
import { cn } from "@/lib/utils";

/**
 * Skills and competencies (admin, `view_reports`). Every figure comes from the
 * people's gained skills (`user_skills`), the same rows each learner sees as
 * "My skills", so this page and theirs cannot disagree. Warm chart ramp, as on
 * Analytics (screens rule 10.3.1.28): several charts share one scroll.
 */

// Levels read as one rising scale: light to deep.
const LEVELS = [
  { key: "beginner", label: "Beginner", color: WARM_SERIES[2] },
  { key: "intermediate", label: "Intermediate", color: WARM_SERIES[3] },
  { key: "advanced", label: "Advanced", color: WARM_SERIES[0] },
];

const AXIS = { fontSize: 11, fill: BRAND.text2 };

function monthLabel(ym) {
  const [y, m] = String(ym).split("-").map(Number);
  if (!y || !m) return ym;
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", { month: "short", year: "2-digit", timeZone: "UTC" });
}

function Panel({ icon: Icon, title, description, children, right }) {
  return (
    <Card className="gap-0 p-5">
      <Box className="mb-1 flex items-start justify-between gap-3">
        <Box className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-accent-blue" />}
          <Text as="h3" className="text-base font-semibold">{title}</Text>
        </Box>
        {right}
      </Box>
      {description && <Text as="p" className="mb-3 text-xs text-text-2">{description}</Text>}
      {children}
    </Card>
  );
}

/** Hover card for the per-skill chart: the people count first, then levels. */
function SkillTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const s = payload[0].payload;
  return (
    <Box className="rounded-md border border-line bg-white px-3 py-2 text-xs shadow-sm">
      <Text as="p" className="font-semibold text-ink">{s.name}</Text>
      <Text as="p" className="text-text-3">{s.domain}</Text>
      <Text as="p" className="mt-1 text-[13px] font-bold text-ink">
        {s.people} {s.people === 1 ? "person holds" : "people hold"} this skill
      </Text>
      {LEVELS.map((l) => (
        <Text key={l.key} as="p" className="text-text-2">
          <Box as="span" className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle" style={{ backgroundColor: l.color }} />
          {l.label}: {s[l.key]}
        </Text>
      ))}
      <Text as="p" className="mt-1 text-text-3">Taught by {s.coursesTagged} course{s.coursesTagged === 1 ? "" : "s"} · click for names</Text>
    </Box>
  );
}

function CountTooltip({ active, payload, label, unit = "" }) {
  if (!active || !payload?.length) return null;
  return (
    <Box className="rounded-md border border-line bg-white px-3 py-2 text-xs shadow-sm">
      <Text as="p" className="mb-1 font-semibold text-ink">{monthLabel(label)}</Text>
      {payload.map((p) => (
        <Text key={p.dataKey} as="p" className="text-text-2">
          <Box as="span" className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle" style={{ backgroundColor: p.color }} />
          {p.name}: <Box as="strong" className="text-ink">{p.value}</Box>{unit}
        </Text>
      ))}
    </Box>
  );
}

export function AdminSkillsContent() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetchSkillsAnalytics()
      .then(setData)
      .catch((e) => setError(e?.message || "Could not load skills."));
  }, []);

  const bySkill = useMemo(
    () =>
      (data?.skills ?? []).map((s) => ({
        skillId: s.skillId,
        name: s.name,
        domain: s.domain,
        people: s.people,
        coursesTagged: s.coursesTagged,
        ...s.levels,
      })),
    [data],
  );

  if (error) {
    return (
      <Card className="p-5">
        <Text as="p" className="text-sm text-error">{error}</Text>
      </Card>
    );
  }
  if (!data) {
    return (
      <Box className="space-y-4">
        <Skeleton className="h-[90px] w-full" />
        <Skeleton className="h-[360px] w-full" />
        <Box className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-[280px]" />
          <Skeleton className="h-[280px]" />
        </Box>
      </Box>
    );
  }

  const k = data.kpis;
  const selectedSkill = data.skills.find((s) => s.skillId === selected) ?? null;
  const chartHeight = Math.max(160, bySkill.length * 32 + 60);
  const hasTrend = data.trend.some((t) => t.earned > 0 || t.holders > 0);

  return (
    <Box className="space-y-5">
      {/* KPIs */}
      <Box className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatTile label="People with skills" value={`${k.peopleWithSkills}`} hint={`of ${k.activeLearners} active learners`} icon={Users} tone={metricTone(k.peopleWithSkills, { zeroIsBad: true })} />
        <StatTile label="Skill coverage" value={k.coveragePct === null ? "—" : `${k.coveragePct}%`} hint="Learners holding at least one" icon={TrendingUp} tone={metricTone(k.coveragePct)} />
        <StatTile label="Skills held" value={`${k.skillsHeld}`} hint="Distinct skills in the org" icon={GraduationCap} />
        <StatTile label="Skill awards" value={`${k.totalAwards}`} hint="Person and skill pairs" icon={Award} />
        <StatTile label="Avg per person" value={k.avgPerPerson === null ? "—" : `${k.avgPerPerson}`} hint="Among people with skills" icon={Layers} />
        <StatTile label="Earned this month" value={`${k.earnedThisMonth}`} hint="New skill awards" icon={Sparkles} />
      </Box>

      {/* Per skill, stacked by level, with the people count on hover */}
      <Panel
        icon={GraduationCap}
        title="People per skill"
        description="Each bar is one skill: how many people hold it, split by level. Hover for the count; click a bar to see who."
      >
        {bySkill.length === 0 ? (
          <EmptySkills />
        ) : (
          <Box className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
            <Box className="min-w-0">
            <Box style={{ height: chartHeight }} className="w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bySkill} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }} maxBarSize={22}>
                  <CartesianGrid stroke={HAIRLINE} horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={150} tick={AXIS} axisLine={false} tickLine={false} />
                  <Tooltip content={<SkillTooltip />} cursor={{ fill: BRAND.surface3 }} />
                  {LEVELS.map((l, i) => (
                    <Bar
                      key={l.key}
                      dataKey={l.key}
                      name={l.label}
                      stackId="lvl"
                      fill={l.color}
                      radius={i === LEVELS.length - 1 ? [0, 3, 3, 0] : 0}
                      cursor="pointer"
                      onClick={(d) => setSelected(d?.skillId ?? d?.payload?.skillId ?? null)}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </Box>
            {/* Our own legend: Recharts 3 sorts its legend alphabetically, and
                levels must read as a rising scale. */}
            <Box className="mt-1 flex flex-wrap justify-center gap-4">
              {LEVELS.map((l) => (
                <Text key={l.key} as="span" className="inline-flex items-center gap-1.5 text-[11px] text-text-2">
                  <Box as="span" className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: l.color }} />
                  {l.label}
                </Text>
              ))}
            </Box>
            </Box>
            <SkillHolders skill={selectedSkill} />
          </Box>
        )}
      </Panel>

      {/* Line charts */}
      <Box className="grid gap-5 lg:grid-cols-2">
        <Panel
          icon={TrendingUp}
          title="Skills growth"
          description="Per month: skill awards made, people who gained a skill, and everyone holding at least one by the month's end."
        >
          {hasTrend ? (
            <Box className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.trend} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
                  <CartesianGrid stroke={HAIRLINE} vertical={false} />
                  <XAxis dataKey="month" tickFormatter={monthLabel} tick={AXIS} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} />
                  <Tooltip content={<CountTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="holders" name="People holding skills" stroke={WARM_SERIES[0]} strokeWidth={2.5} dot={{ r: 2.5 }} />
                  <Line type="monotone" dataKey="learners" name="People who gained one" stroke={WARM_SERIES[1]} strokeWidth={2} dot={{ r: 2.5 }} />
                  <Line type="monotone" dataKey="earned" name="Skill awards" stroke={WARM_SERIES[4]} strokeWidth={2} strokeDasharray="4 3" dot={{ r: 2.5 }} />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          ) : (
            <Text as="p" className="py-10 text-center text-sm text-text-3">No skills earned in the last 12 months yet.</Text>
          )}
        </Panel>

        <Panel
          icon={Layers}
          title="Skills earned by area"
          description="Skill awards per month in each skill area, so you can see which kinds of capability are growing."
        >
          {hasTrend && data.trendByDomain.domains.length > 0 ? (
            <Box className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.trendByDomain.series} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
                  <CartesianGrid stroke={HAIRLINE} vertical={false} />
                  <XAxis dataKey="month" tickFormatter={monthLabel} tick={AXIS} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} />
                  <Tooltip content={<CountTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {data.trendByDomain.domains.map((d, i) => (
                    <Line key={d} type="monotone" dataKey={d} name={d} stroke={warmSeriesColor(i)} strokeWidth={2} dot={{ r: 2 }} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </Box>
          ) : (
            <Text as="p" className="py-10 text-center text-sm text-text-3">No skills earned in the last 12 months yet.</Text>
          )}
        </Panel>
      </Box>

      <Box className="grid gap-5 lg:grid-cols-2">
        {/* Departments */}
        <Panel
          icon={Users}
          title="Coverage by department"
          description="Of each department's active learners, how many hold at least one skill. Hover for counts."
        >
          {data.departments.length === 0 ? (
            <Text as="p" className="py-6 text-center text-sm text-text-3">No learners yet.</Text>
          ) : (
            <Box style={{ height: Math.max(200, data.departments.length * 30 + 40) }} className="w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.departments} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }} maxBarSize={22}>
                  <CartesianGrid stroke={HAIRLINE} horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} unit="%" tick={AXIS} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="department" width={130} tick={AXIS} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: BRAND.surface3 }}
                    content={({ active, payload }) =>
                      active && payload?.length ? (
                        <Box className="rounded-md border border-line bg-white px-3 py-2 text-xs shadow-sm">
                          <Text as="p" className="font-semibold text-ink">{payload[0].payload.department}</Text>
                          <Text as="p" className="text-text-2">
                            {payload[0].payload.withSkills} of {payload[0].payload.headcount} people hold a skill ({payload[0].payload.coveragePct}%)
                          </Text>
                          <Text as="p" className="text-text-3">{payload[0].payload.skillsHeld} skill awards in total</Text>
                        </Box>
                      ) : null
                    }
                  />
                  <Bar dataKey="coveragePct" name="Coverage" fill={WARM_SERIES[3]} radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          )}
        </Panel>

        {/* Courses that teach no skill */}
        <Panel
          icon={GraduationCap}
          title="Courses that teach no skill yet"
          description="Completing these grows nobody's skills. Open a course and add its skills on the Skills tab; people who already finished it gain them at once."
        >
          {data.untaggedCourses.length === 0 ? (
            <Text as="p" className="py-6 text-center text-sm text-text-3">Every live course teaches at least one skill.</Text>
          ) : (
            <Box as="ul" className="divide-y divide-border">
              {data.untaggedCourses.map((c) => (
                <Box as="li" key={c.id} className="flex items-center justify-between gap-3 py-2">
                  <Link href={`/admin/courses/${c.id}`} className="truncate text-[13px] font-medium text-accent-blue hover:underline">
                    {c.name}
                  </Link>
                  <Text as="span" className="shrink-0 text-xs text-text-3">
                    {c.learners} learner{c.learners === 1 ? "" : "s"}
                  </Text>
                </Box>
              ))}
            </Box>
          )}
        </Panel>
      </Box>
    </Box>
  );
}

function SkillHolders({ skill }) {
  if (!skill) {
    return (
      <Box className="flex items-center justify-center rounded-lg border border-dashed border-line p-4 text-center">
        <Text as="p" className="text-xs text-text-3">Click a skill&apos;s bar to see who holds it.</Text>
      </Box>
    );
  }
  return (
    <Box className="rounded-lg border border-line bg-surface-2 p-3">
      <Text as="p" className="text-sm font-semibold text-ink">{skill.name}</Text>
      <Text as="p" className="mb-2 text-xs text-text-3">
        {skill.domain} · {skill.people} {skill.people === 1 ? "person" : "people"}
      </Text>
      {skill.holders.length === 0 ? (
        <Text as="p" className="text-xs text-text-3">Nobody holds it yet. It is taught by {skill.coursesTagged} course{skill.coursesTagged === 1 ? "" : "s"}.</Text>
      ) : (
        <Box as="ul" className="max-h-72 space-y-1.5 overflow-y-auto">
          {skill.holders.map((h) => {
            const lvl = LEVELS.find((l) => l.key === h.level);
            return (
              <Box as="li" key={h.userId} className="flex items-center justify-between gap-2 text-xs">
                <Box className="min-w-0">
                  <Text as="span" className="block truncate font-medium text-ink">{h.name}</Text>
                  <Text as="span" className="block truncate text-text-3">{[h.jobRole, h.department].filter(Boolean).join(" · ")}</Text>
                </Box>
                <Text as="span" className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold text-white")} style={{ backgroundColor: lvl?.color ?? BRAND.text3 }}>
                  {lvl?.label ?? h.level}
                </Text>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}

function EmptySkills() {
  return (
    <Text as="p" className="py-6 text-sm text-text-2">
      No skills are tracked yet. Open a{" "}
      <Link href="/admin/courses" className="font-semibold text-accent-blue hover:underline">course</Link>{" "}
      and add the skills it teaches on its Skills tab. People gain them when they complete it, and anyone who already has gains them straight away.
    </Text>
  );
}
