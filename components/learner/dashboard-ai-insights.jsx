"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Sparkles, RefreshCw, Trophy, Play, ClipboardCheck,
  MessageSquare, BookOpen, ArrowRight, Lightbulb,
} from "lucide-react";
import {
  PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer,
} from "recharts";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Box from "@/components/ui/box";
import Text from "@/components/ui/text";
import { ApiError } from "@/lib/api-client";
import { BRAND } from "@/lib/brand";
import {
  fetchLearnerInsights,
  refreshLearnerInsights,
} from "@/services/api/learner/ai-insights-api";

/**
 * "Your learning coach" — real, model-backed recommendations for the learner
 * (BACKEND_STRUCTURE §10.54). This is NOT the reference mock's fabricated
 * "AI Insights" (which §10.3.1.21 rightly refused): every line here is generated
 * server-side from the learner's own anonymised learning context, stored, and
 * read back. When the feature is switched off the whole panel renders nothing,
 * so an un-enabled deployment sees no empty furniture.
 */

const ACTION_ICON = {
  resume_course: Play,
  complete_assessment: ClipboardCheck,
  give_feedback: MessageSquare,
  start_course: BookOpen,
  other: ArrowRight,
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
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

/** A spider/radar of competency proficiency per skill domain, from REAL data. */
function SkillRadar({ data }) {
  return (
    <Box className="mb-4 rounded-lg border border-line bg-surface-2 p-3">
      <Text as="p" className="mb-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-text-3">
        Your skill profile
      </Text>
      <Box className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="72%">
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

export function DashboardAiInsights() {
  const [state, setState] = useState(null); // { enabled, insight }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchLearnerInsights()
      .then((d) => { if (!cancelled) setState(d); })
      // Silent: one panel failing must not put an error across the dashboard.
      .catch(() => { if (!cancelled) setState({ enabled: false, insight: null }); });
    return () => { cancelled = true; };
  }, []);

  async function regenerate() {
    setBusy(true);
    setError(null);
    try {
      const d = await refreshLearnerInsights();
      if (d?.error === "generation_failed") {
        setError("Could not generate suggestions just now. Please try again in a moment.");
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

  // Loading, or feature off: render nothing (a widget is a prompt, not furniture).
  if (!state || !state.enabled) return null;

  const payload = state.insight?.payload ?? null;
  const skillRadar = state.charts?.skillRadar ?? [];

  return (
    <Card className="gap-0 overflow-hidden p-0">
      <Box className="h-[3px] w-full bg-accent-blue" />
      <Box className="flex flex-wrap items-center justify-between gap-2 border-b border-line p-4">
        <Box className="flex items-center gap-2.5">
          <Box className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-tint">
            <Sparkles className="h-4 w-4 text-accent-blue" />
          </Box>
          <Box>
            <Box className="flex items-center gap-2">
              <Text as="h3" className="text-base font-semibold text-ink">Your learning coach</Text>
              <Text as="span" className="rounded-full bg-accent-tint px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-accent-blue">
                AI
              </Text>
            </Box>
            <Text as="p" className="text-xs text-muted-foreground">
              Suggestions from AI, based on your learning data
              {state.insight?.generatedAt ? ` · updated ${relativeTime(state.insight.generatedAt)}` : ""}
            </Text>
          </Box>
        </Box>
        {payload && (
          <Button
            size="sm"
            variant="outline"
            className="cursor-pointer gap-1.5 text-xs"
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

        {skillRadar.length >= 3 && <SkillRadar data={skillRadar} />}

        {!payload ? (
          <Box className="flex flex-col items-start gap-3 py-2">
            <Text as="p" className="text-sm text-text-2">
              Get personalised suggestions on what to do next, drawn from your courses,
              assessments and goals.
            </Text>
            <Button size="sm" className="gap-1.5 bg-accent-blue text-white hover:brightness-110" onClick={regenerate} disabled={busy}>
              <Sparkles className="h-3.5 w-3.5" />
              {busy ? "Generating" : "Generate my insights"}
            </Button>
          </Box>
        ) : (
          <Box className="space-y-4">
            {payload.summary && (
              <Text as="p" className="text-[13px] leading-relaxed text-ink">{payload.summary}</Text>
            )}

            {Array.isArray(payload.priorities) && payload.priorities.length > 0 && (
              <Box className="space-y-2">
                <Text as="p" className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-text-3">
                  What to focus on
                </Text>
                {payload.priorities.slice(0, 5).map((p, i) => {
                  const Icon = ACTION_ICON[p.action] ?? ACTION_ICON.other;
                  return (
                    <Box key={i} className="flex items-start gap-3 rounded-lg border border-line bg-surface-2 p-2.5">
                      <Box className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white">
                        <Icon className="h-3.5 w-3.5 text-accent-blue" />
                      </Box>
                      <Box className="min-w-0 flex-1">
                        <Text as="p" className="text-[13px] font-semibold text-ink">{p.title}</Text>
                        {p.detail && <Text as="p" className="mt-0.5 text-xs text-text-2">{p.detail}</Text>}
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            )}

            {payload.nextMilestone && (
              <Box className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 p-3">
                <Trophy className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                <Box className="min-w-0">
                  <Text as="p" className="text-[13px] font-bold text-ink">{payload.nextMilestone.title}</Text>
                  {payload.nextMilestone.detail && (
                    <Text as="p" className="mt-0.5 text-xs text-text-2">{payload.nextMilestone.detail}</Text>
                  )}
                </Box>
              </Box>
            )}

            {Array.isArray(payload.recommendedCourses) && payload.recommendedCourses.length > 0 && (
              <Box className="space-y-2">
                <Box className="flex items-center justify-between gap-2">
                  <Text as="p" className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-text-3">
                    Recommended for you
                  </Text>
                  <Link href="/catalogue" className="shrink-0 text-[11px] font-bold text-accent-blue hover:underline">
                    Browse catalogue →
                  </Link>
                </Box>
                {payload.recommendedCourses.slice(0, 4).map((c, i) => (
                  <Box key={i} className="flex items-start gap-3 rounded-lg border border-line p-2.5">
                    <BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0 text-text-3" />
                    <Box className="min-w-0 flex-1">
                      <Text as="p" className="text-[13px] font-semibold text-ink">{c.name}</Text>
                      {c.reason && <Text as="p" className="mt-0.5 text-xs text-text-2">{c.reason}</Text>}
                    </Box>
                  </Box>
                ))}
              </Box>
            )}

            {payload.motivation && (
              <Box className="flex items-start gap-2 border-t border-line pt-3">
                <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-blue" />
                <Text as="p" className="text-xs font-medium text-text-2">{payload.motivation}</Text>
              </Box>
            )}
          </Box>
        )}
      </Box>
    </Card>
  );
}
