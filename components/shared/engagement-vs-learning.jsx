"use client";

import { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

import { Card } from "@/components/ui/card";
import Box from "@/components/ui/box";
import Text from "@/components/ui/text";
import { BRAND, HAIRLINE } from "@/lib/brand";
import {
  fetchAdminEngagementTrend,
  fetchLearnerEngagementTrend,
} from "@/services/api/engagement-api";

/**
 * Engagement hours vs learning hours, over time (BACKEND_STRUCTURE §10.55).
 *
 * Two DIFFERENT measures on purpose: engagement is active time on the platform
 * (cursor moving, idle over 5 minutes excluded); learning hours is the §10.4
 * completion-credited time. Both series come from the server over identical
 * periods, so the bars cannot disagree with the Learning Hours page.
 */
const GRANULARITIES = [
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
  { key: "quarterly", label: "Quarterly" },
  { key: "yearly", label: "Yearly" },
];

export function EngagementVsLearning({ scope = "learner" }) {
  const [granularity, setGranularity] = useState("weekly");
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const fetcher = scope === "admin" ? fetchAdminEngagementTrend : fetchLearnerEngagementTrend;
    setData(null);
    fetcher(granularity)
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setData({ series: [], totals: { learningHours: 0, engagementHours: 0 } }); });
    return () => { cancelled = true; };
  }, [scope, granularity]);

  const series = data?.series ?? [];
  const totals = data?.totals ?? { learningHours: 0, engagementHours: 0 };
  const hasData = series.some((p) => p.learningHours > 0 || p.engagementHours > 0);
  const efficiency =
    totals.engagementHours > 0
      ? Math.round((totals.learningHours / totals.engagementHours) * 100)
      : null;
  const whose = scope === "admin" ? "Your organisation" : "You";

  return (
    <Card className="gap-0 p-5">
      <Box className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <Box className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-accent-blue" />
          <Text as="h3" className="text-base font-semibold">Engagement vs learning hours</Text>
        </Box>
        <Box className="flex gap-1">
          {GRANULARITIES.map((g) => (
            <button
              key={g.key}
              type="button"
              onClick={() => setGranularity(g.key)}
              className={`cursor-pointer rounded-md px-2 py-1 text-[11px] font-semibold transition-colors ${
                granularity === g.key
                  ? "bg-accent-blue text-white"
                  : "bg-surface-2 text-text-2 hover:bg-surface-3"
              }`}
            >
              {g.label}
            </button>
          ))}
        </Box>
      </Box>
      <Text as="p" className="mb-3 text-xs text-muted-foreground">
        Engagement is active time on the platform; learning hours is time that
        produced course progress. They measure different things.
      </Text>

      {!data ? (
        <Box className="h-64 animate-pulse rounded-lg bg-surface-2" />
      ) : !hasData ? (
        <Box className="flex h-40 flex-col items-center justify-center text-center">
          <Text as="p" className="text-sm text-muted-foreground">
            No activity recorded yet for this period.
          </Text>
        </Box>
      ) : (
        <>
          <Box className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series} barGap={4}>
                <CartesianGrid vertical={false} stroke={HAIRLINE} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: BRAND.text2 }} tickLine={false} axisLine={{ stroke: HAIRLINE }} />
                <YAxis tick={{ fontSize: 11, fill: BRAND.text2 }} tickLine={false} axisLine={false} width={28} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderColor: HAIRLINE, borderRadius: 8 }}
                  formatter={(v, name) => [`${v}h`, name]}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="engagementHours" name="Engagement" fill={BRAND.navy} radius={[3, 3, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="learningHours" name="Learning" fill={BRAND.accent} radius={[3, 3, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </Box>
          <Box className="mt-3 flex flex-wrap gap-4 border-t border-line pt-3">
            <Stat label="Engagement" value={`${totals.engagementHours}h`} color="text-navy" />
            <Stat label="Learning" value={`${totals.learningHours}h`} color="text-accent-blue" />
            {efficiency !== null && (
              <Text as="p" className="ml-auto self-center text-xs text-text-2">
                {whose} spent {totals.engagementHours}h engaged, of which{" "}
                <Text as="span" className="font-semibold text-ink">{efficiency}%</Text> went to learning.
              </Text>
            )}
          </Box>
        </>
      )}
    </Card>
  );
}

function Stat({ label, value, color }) {
  return (
    <Box>
      <Text as="p" className={`font-mono text-xl font-extrabold leading-none ${color}`}>{value}</Text>
      <Text as="p" className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.1em] text-text-3">{label}</Text>
    </Box>
  );
}
