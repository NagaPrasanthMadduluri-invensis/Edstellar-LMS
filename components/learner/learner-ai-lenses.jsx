"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  RefreshCw, BookOpen, Target, CheckCircle2, CircleDot, ArrowRight,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import Box from "@/components/ui/box";
import Text from "@/components/ui/text";
import { AiReveal } from "@/components/shared/ai-reveal";
import { RichText } from "@/components/shared/ai-sections";
import { ApiError } from "@/lib/api-client";
import { LEARNER_STAGES } from "@/lib/ai-visuals";
import {
  fetchLearnerLens,
  refreshLearnerLens,
} from "@/services/api/learner/ai-insights-api";

/**
 * The learner's DEEPER AI options beyond the coach (owner request 2026-11-19):
 * "Best courses for you" and "Your skill gaps and a plan". Each is its own
 * full-spectrum AiReveal button → analyzing animation → result, backed by a
 * tenant-fenced server lens (BACKEND_STRUCTURE §10.54). Shown on the AI Insights
 * page beneath the coach, so the learner has multiple AI options in one place.
 */

function friendly(e) {
  return e instanceof ApiError && e.status === 429
    ? "You have generated insights a few times recently. Try again a little later."
    : e?.message || "Could not generate just now. Please try again.";
}

/** Shared shell: GET on mount to learn enabled + cache, then an AiReveal. */
function LensPanel({ lens, title, description, cta, icon, renderView }) {
  const [meta, setMeta] = useState(null); // { enabled, insight }

  useEffect(() => {
    let cancelled = false;
    fetchLearnerLens(lens)
      .then((d) => { if (!cancelled) setMeta(d); })
      .catch(() => { if (!cancelled) setMeta({ enabled: false }); });
    return () => { cancelled = true; };
  }, [lens]);

  if (!meta || !meta.enabled) return null;

  const cached = meta.insight?.payload ? { insight: meta.insight } : null;

  const runRefresh = async () => {
    const d = await refreshLearnerLens(lens);
    if (d?.error === "generation_failed") {
      throw new Error("Could not generate just now. Please try again in a moment.");
    }
    return { insight: d.insight };
  };

  const generate = async () => {
    if (cached) return cached;
    try { return await runRefresh(); } catch (e) { throw new Error(friendly(e)); }
  };
  const regenerate = async () => {
    try { return await runRefresh(); } catch (e) { throw new Error(friendly(e)); }
  };

  return (
    <AiReveal
      title={title}
      description={description}
      cta={cached ? "Show" : cta}
      icon={icon}
      stages={LEARNER_STAGES}
      generate={generate}
      regenerate={regenerate}
    >
      {(data, { regenerate: onRegenerate }) =>
        renderView(data.insight?.payload ?? null, onRegenerate)
      }
    </AiReveal>
  );
}

/** A reusable revealed-panel header with the spectrum stripe + Regenerate. */
function LensHeader({ icon: Icon, title, subtitle, onRegenerate }) {
  return (
    <>
      <Box className="flex flex-wrap items-center justify-between gap-2 border-b border-line p-4">
        <Box className="flex items-center gap-2.5">
          <Box className="ai-soft flex h-8 w-8 items-center justify-center rounded-lg">
            <Icon className="h-4 w-4 text-white" />
          </Box>
          <Box>
            <Box className="flex items-center gap-2">
              <Text as="h3" className="text-base font-semibold text-ink">{title}</Text>
              <Text as="span" className="ai-soft rounded-full px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-white">
                AI
              </Text>
            </Box>
            <Text as="p" className="text-xs text-muted-foreground">{subtitle}</Text>
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
    </>
  );
}

const FIT = {
  high: { label: "Strong fit", cls: "bg-success/15 text-success" },
  medium: { label: "Good fit", cls: "bg-accent-tint text-accent-blue" },
  low: { label: "Worth a look", cls: "bg-surface-3 text-text-3" },
};

/** "Best courses for you" — ranked, with why + skills gained. */
function CourseRecommendationsView(payload, onRegenerate) {
  const recs = Array.isArray(payload?.recommendations) ? payload.recommendations : [];
  return (
    <Card className="gap-0 overflow-hidden p-0 border-0 ai-border ai-card">
      <LensHeader
        icon={BookOpen}
        title="Best courses for you"
        subtitle="AI-ranked from your role, level and skill gaps"
        onRegenerate={onRegenerate}
      />
      <Box className="space-y-3 p-4">
        {payload?.intro && (
          <Text as="p" className="text-[13px] leading-relaxed text-ink"><RichText text={payload.intro} /></Text>
        )}
        {recs.length === 0 ? (
          <Text as="p" className="text-sm text-text-2">No course recommendations came back. Try regenerating.</Text>
        ) : (
          recs.map((r, i) => {
            const fit = FIT[r.fit] ?? FIT.medium;
            return (
              <Box key={i} className="rounded-lg ai-soft-tint p-3">
                <Box className="flex items-start justify-between gap-2">
                  <Text as="p" className="text-[13px] font-semibold text-ink">{r.name}</Text>
                  <Text as="span" className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${fit.cls}`}>
                    {fit.label}
                  </Text>
                </Box>
                {r.reason && <Text as="p" className="mt-1 text-xs text-text-2"><RichText text={r.reason} /></Text>}
                {Array.isArray(r.skillsGained) && r.skillsGained.length > 0 && (
                  <Box className="mt-2 flex flex-wrap gap-1">
                    {r.skillsGained.slice(0, 8).map((s, k) => (
                      <Text as="span" key={k} className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-text-2">
                        {s}
                      </Text>
                    ))}
                  </Box>
                )}
              </Box>
            );
          })
        )}
        <Link href="/catalogue" className="inline-flex items-center gap-1 text-[12px] font-bold text-accent-blue hover:underline">
          Browse the full catalogue <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </Box>
    </Card>
  );
}

/** "Your skill gaps and a plan" — strengths, gaps, an ordered path. */
function SkillPlanView(payload, onRegenerate) {
  const strengths = Array.isArray(payload?.strengths) ? payload.strengths : [];
  const gaps = Array.isArray(payload?.gaps) ? payload.gaps : [];
  const plan = Array.isArray(payload?.plan) ? payload.plan : [];
  return (
    <Card className="gap-0 overflow-hidden p-0 border-0 ai-border ai-card">
      <LensHeader
        icon={Target}
        title="Your skill gaps & plan"
        subtitle="AI reads your competencies and maps a path to close the gaps"
        onRegenerate={onRegenerate}
      />
      <Box className="space-y-4 p-4">
        {payload?.summary && (
          <Text as="p" className="text-[13px] leading-relaxed text-ink"><RichText text={payload.summary} /></Text>
        )}

        <Box className="grid gap-4 sm:grid-cols-2">
          {strengths.length > 0 && (
            <Box className="space-y-2">
              <Text as="p" className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-text-3">
                Your strengths
              </Text>
              {strengths.slice(0, 8).map((s, i) => (
                <Box key={i} className="flex items-center gap-2 rounded-lg ai-soft-tint p-2">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" />
                  <Text as="span" className="text-[12.5px] text-ink">{s.skill}</Text>
                  {s.level && (
                    <Text as="span" className="ml-auto text-[10px] font-semibold uppercase tracking-wide text-text-3">{s.level}</Text>
                  )}
                </Box>
              ))}
            </Box>
          )}
          {gaps.length > 0 && (
            <Box className="space-y-2">
              <Text as="p" className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-text-3">
                Gaps to close
              </Text>
              {gaps.slice(0, 8).map((g, i) => (
                <Box key={i} className="rounded-lg border border-warning/30 bg-warning/10 p-2">
                  <Box className="flex items-center gap-2">
                    <CircleDot className="h-3.5 w-3.5 shrink-0 text-warning" />
                    <Text as="span" className="text-[12.5px] font-semibold text-ink">{g.skill}</Text>
                  </Box>
                  {g.why && <Text as="p" className="mt-0.5 pl-5 text-xs text-text-2"><RichText text={g.why} /></Text>}
                </Box>
              ))}
            </Box>
          )}
        </Box>

        {plan.length > 0 && (
          <Box className="space-y-2">
            <Text as="p" className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-text-3">
              Your plan
            </Text>
            {plan.map((step, i) => (
              <Box key={i} className="flex items-start gap-3 rounded-lg ai-soft-tint p-2.5">
                <Box className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ai-soft text-[11px] font-bold text-white">
                  {step.step ?? i + 1}
                </Box>
                <Box className="min-w-0 flex-1">
                  <Text as="p" className="text-[13px] font-semibold text-ink">{step.title}</Text>
                  {step.detail && <Text as="p" className="mt-0.5 text-xs text-text-2"><RichText text={step.detail} /></Text>}
                  {step.courseName && (
                    <Text as="span" className="mt-1 inline-flex items-center gap-1 rounded-full bg-accent-tint px-2 py-0.5 text-[10px] font-semibold text-accent-blue">
                      <BookOpen className="h-3 w-3" /> {step.courseName}
                    </Text>
                  )}
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Card>
  );
}

export function CourseRecommendationsPanel() {
  return (
    <LensPanel
      lens="course_recommendations"
      title="Courses chosen for you"
      description="Our AI weighs the whole catalogue against your role, level and goals, and surfaces the courses that will take you furthest."
      cta="Find my best courses"
      icon={BookOpen}
      renderView={CourseRecommendationsView}
    />
  );
}

export function SkillPlanPanel() {
  return (
    <LensPanel
      lens="skill_plan"
      title="Your personal skill plan"
      description="Turn your strengths and gaps into a clear, step-by-step path to mastery, mapped to real courses."
      cta="Build my plan"
      icon={Target}
      renderView={SkillPlanView}
    />
  );
}
