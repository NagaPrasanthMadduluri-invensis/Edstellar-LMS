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
import Box from "@/components/ui/box";
import Text from "@/components/ui/text";
import { AiReveal } from "@/components/shared/ai-reveal";
import { ApiError } from "@/lib/api-client";
import { BRAND } from "@/lib/brand";
import { LEARNER_STAGES } from "@/lib/ai-visuals";
import {
  fetchLearnerInsights,
  refreshLearnerInsights,
} from "@/services/api/learner/ai-insights-api";

/**
 * "Your learning coach" — real, model-backed recommendations for the learner
 * (BACKEND_STRUCTURE §10.54). It is reached through a compact, full-spectrum AI
 * button (`AiReveal`, owner request 2026-11-19): clicking plays the "analyzing"
 * animation, then reveals the guidance. Gating it behind a click also means the
 * paid model is not called on every dashboard load. The whole thing renders
 * nothing when the feature is off for the deployment.
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
        Your skill profile · from your completed courses
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

/** The revealed coach panel — what the AI is showing is labelled up top. */
function CoachView({ data, onRegenerate }) {
  const payload = data.insight?.payload ?? null;
  const skillRadar = data.charts?.skillRadar ?? [];
  const generatedAt = data.insight?.generatedAt;

  return (
    <Card className="gap-0 overflow-hidden p-0 border-0 ai-border">
      <Box className="flex flex-wrap items-center justify-between gap-2 border-b border-line p-4">
        <Box className="flex items-center gap-2.5">
          <Box className="ai-spectrum flex h-8 w-8 items-center justify-center rounded-lg">
            <Sparkles className="h-4 w-4 text-white" />
          </Box>
          <Box>
            <Box className="flex items-center gap-2">
              <Text as="h3" className="text-base font-semibold text-ink">Your learning coach</Text>
              <Text as="span" className="ai-spectrum rounded-full px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-white">
                AI
              </Text>
            </Box>
            <Text as="p" className="text-xs text-muted-foreground">
              What to do next, chosen by AI from your courses, assessments and skills
              {generatedAt ? ` · ${relativeTime(generatedAt)}` : ""}
            </Text>
          </Box>
        </Box>
        <button
          type="button"
          onClick={onRegenerate}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-xs font-medium text-text-2 transition hover:bg-surface-2"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Regenerate
        </button>
      </Box>

      <Box className="p-4">
        {skillRadar.length >= 3 && <SkillRadar data={skillRadar} />}

        {!payload ? (
          <Text as="p" className="py-2 text-sm text-text-2">
            No suggestions came back this time. Try regenerating in a moment.
          </Text>
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

export function DashboardAiInsights() {
  const [meta, setMeta] = useState(null); // { enabled, insight, charts }

  useEffect(() => {
    let cancelled = false;
    fetchLearnerInsights()
      .then((d) => { if (!cancelled) setMeta(d); })
      // Silent: one panel failing must not put an error across the dashboard.
      .catch(() => { if (!cancelled) setMeta({ enabled: false }); });
    return () => { cancelled = true; };
  }, []);

  // Loading, or feature off: render nothing (a widget is a prompt, not furniture).
  if (!meta || !meta.enabled) return null;

  const cached = meta.insight?.payload
    ? { insight: meta.insight, charts: meta.charts }
    : null;

  const runRefresh = async () => {
    const d = await refreshLearnerInsights();
    if (d?.error === "generation_failed") {
      throw new Error("Could not generate suggestions just now. Please try again in a moment.");
    }
    return { insight: d.insight, charts: d.charts };
  };

  const generate = async () => {
    if (cached) return cached; // already generated: reveal it (free), no model call
    try {
      return await runRefresh();
    } catch (e) {
      throw new Error(
        e instanceof ApiError && e.status === 429
          ? "You have refreshed a few times recently. Try again a little later."
          : e?.message || "Could not generate just now. Please try again.",
      );
    }
  };

  const regenerate = async () => {
    try {
      return await runRefresh();
    } catch (e) {
      throw new Error(
        e instanceof ApiError && e.status === 429
          ? "You have refreshed a few times recently. Try again a little later."
          : e?.message || "Could not refresh just now. Please try again.",
      );
    }
  };

  return (
    <AiReveal
      title="Your learning coach"
      description="AI reads your courses, assessments and skills, then tells you what to do next."
      cta={cached ? "Show my insights" : "Analyze my learning"}
      icon={Sparkles}
      stages={LEARNER_STAGES}
      generate={generate}
      regenerate={regenerate}
    >
      {(data, { regenerate: onRegenerate }) => (
        <CoachView data={data} onRegenerate={onRegenerate} />
      )}
    </AiReveal>
  );
}
