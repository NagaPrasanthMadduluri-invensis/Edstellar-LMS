"use client";

import { useEffect, useState } from "react";
import {
  Sparkles, RefreshCw, TrendingUp, AlertTriangle, Lightbulb, PartyPopper,
} from "lucide-react";
import {
  PolarAngleAxis, PolarGrid, Radar, RadarChart,
  RadialBar, RadialBarChart, ResponsiveContainer,
} from "recharts";

import { Button } from "@/components/ui/button";
import Box from "@/components/ui/box";
import Text from "@/components/ui/text";
import { ApiError } from "@/lib/api-client";
import { BRAND } from "@/lib/brand";
import {
  fetchAdminInsights,
  refreshAdminInsights,
} from "@/services/api/admin/ai-insights-api";

/**
 * "AI briefing" for the admin dashboard (BACKEND_STRUCTURE §10.54). A real,
 * model-backed synthesis of the organisation's learning health, built
 * server-side from org aggregates (no individual is named). It sits under the
 * deterministic Key Insights panel: those restate the numbers, this reasons
 * about what to do. Renders nothing when the feature is off for the deployment.
 */

const SEVERITY = {
  high: "chip-danger",
  medium: "chip-warning",
  low: "bg-surface-3 text-text-3",
};

function relativeTime(iso) {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

function scoreColor(score) {
  if (score >= 75) return BRAND.success;
  if (score >= 50) return BRAND.warning;
  return BRAND.danger;
}

/**
 * Learning Health Score — a radial gauge + a 4-axis radar, both from REAL data
 * (the org's completion, assessment, participation and certification rates). The
 * model narrates it; it does not invent these coordinates (BACKEND_STRUCTURE §10.54).
 */
function HealthScore({ health }) {
  const colour = scoreColor(health.score);
  return (
    <Box className="mb-4 grid gap-3 rounded-lg border border-line bg-surface-2 p-3 sm:grid-cols-[180px_1fr]">
      <Box className="relative flex flex-col items-center justify-center">
        <Box className="h-[150px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              innerRadius="72%"
              outerRadius="100%"
              data={[{ value: health.score, fill: colour }]}
              startAngle={90}
              endAngle={-270}
            >
              <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
              <RadialBar dataKey="value" cornerRadius={8} background isAnimationActive={false} />
            </RadialBarChart>
          </ResponsiveContainer>
        </Box>
        <Box className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <Text as="p" className="font-mono text-3xl font-extrabold leading-none" style={{ color: colour }}>
            {health.score}
          </Text>
          <Text as="p" className="font-mono text-[9px] uppercase tracking-[0.12em] text-text-3">
            Health score
          </Text>
        </Box>
      </Box>
      <Box className="h-[180px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={health.dimensions} outerRadius="72%">
            <PolarGrid stroke={BRAND.line} />
            <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11, fill: BRAND.text2 }} />
            <Radar
              dataKey="value"
              stroke={BRAND.accent}
              fill={BRAND.accent}
              fillOpacity={0.3}
              isAnimationActive={false}
            />
          </RadarChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );
}

function Group({ icon: Icon, title, items, render }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <Box className="space-y-2">
      <Box className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-accent-blue" />
        <Text as="p" className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-text-3">
          {title}
        </Text>
      </Box>
      <Box className="space-y-2">{items.map(render)}</Box>
    </Box>
  );
}

function Item({ title, detail, trailing }) {
  return (
    <Box className="rounded-lg border border-line bg-surface-2 p-2.5">
      <Box className="flex items-start justify-between gap-2">
        <Text as="p" className="text-[13px] font-semibold text-ink">{title}</Text>
        {trailing}
      </Box>
      {detail && <Text as="p" className="mt-0.5 text-xs text-text-2">{detail}</Text>}
    </Box>
  );
}

export function AdminDashboardAiInsights() {
  const [state, setState] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchAdminInsights()
      .then((d) => { if (!cancelled) setState(d); })
      .catch(() => { if (!cancelled) setState({ enabled: false, insight: null }); });
    return () => { cancelled = true; };
  }, []);

  async function regenerate() {
    setBusy(true);
    setError(null);
    try {
      const d = await refreshAdminInsights();
      if (d?.error === "generation_failed") {
        setError("Could not generate the briefing just now. Please try again in a moment.");
      } else {
        setState({ enabled: d.enabled, insight: d.insight, charts: d.charts });
      }
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 429
          ? "You have refreshed a few times recently. Try again a little later."
          : "Could not refresh just now. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (!state || !state.enabled) return null;

  const payload = state.insight?.payload ?? null;
  const health = state.charts?.healthScore ?? null;

  return (
    <Box className="border border-line glass">
      <Box className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
        <Box className="flex items-center gap-2.5">
          <Box className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-tint">
            <Sparkles className="h-4 w-4 text-accent-blue" />
          </Box>
          <Box>
            <Box className="flex items-center gap-2">
              <Text as="h3" className="text-[13px] font-bold text-ink">AI briefing</Text>
              <Text as="span" className="rounded-full bg-accent-tint px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-accent-blue">
                AI
              </Text>
            </Box>
            <Text as="p" className="text-[11px] text-text-3">
              Generated from your organisation&apos;s learning data
              {state.insight?.generatedAt ? ` · updated ${relativeTime(state.insight.generatedAt)}` : ""}
            </Text>
          </Box>
        </Box>
        {payload && (
          <Button
            size="sm"
            variant="outline"
            className="h-8 cursor-pointer gap-1.5 text-xs"
            onClick={regenerate}
            disabled={busy}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} />
            {busy ? "Refreshing" : "Refresh"}
          </Button>
        )}
      </Box>

      <Box className="p-4">
        {error && (
          <Text as="p" className="mb-3 rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">
            {error}
          </Text>
        )}

        {health && <HealthScore health={health} />}

        {!payload ? (
          <Box className="flex flex-col items-start gap-3 py-2">
            <Text as="p" className="text-sm text-text-2">
              Get an AI reading of where your organisation stands, what needs attention,
              and what to do next, drawn from completion, feedback and department data.
            </Text>
            <Button size="sm" className="gap-1.5 bg-accent-blue text-white hover:brightness-110" onClick={regenerate} disabled={busy}>
              <Sparkles className="h-3.5 w-3.5" />
              {busy ? "Generating" : "Generate briefing"}
            </Button>
          </Box>
        ) : (
          <Box className="space-y-4">
            {payload.summary && (
              <Text as="p" className="text-[13px] leading-relaxed text-ink">{payload.summary}</Text>
            )}

            <Box className="grid gap-4 lg:grid-cols-2">
              <Group
                icon={AlertTriangle}
                title="Needs attention"
                items={payload.risks}
                render={(r, i) => (
                  <Item
                    key={i}
                    title={r.title}
                    detail={r.detail}
                    trailing={
                      r.severity && (
                        <Text as="span" className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${SEVERITY[r.severity] ?? SEVERITY.low}`}>
                          {r.severity}
                        </Text>
                      )
                    }
                  />
                )}
              />
              <Group
                icon={Lightbulb}
                title="Recommended actions"
                items={payload.recommendations}
                render={(r, i) => <Item key={i} title={r.title} detail={r.detail} />}
              />
              <Group
                icon={TrendingUp}
                title="Patterns"
                items={payload.patterns}
                render={(p, i) => <Item key={i} title={p.title} detail={p.detail} />}
              />
              <Group
                icon={PartyPopper}
                title="Wins"
                items={payload.wins}
                render={(w, i) => <Item key={i} title={w.title} detail={w.detail} />}
              />
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}
