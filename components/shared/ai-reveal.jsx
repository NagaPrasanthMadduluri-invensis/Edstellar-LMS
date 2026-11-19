"use client";

import { useRef, useState } from "react";
import { Sparkles, AlertCircle } from "lucide-react";

import Box from "@/components/ui/box";
import Text from "@/components/ui/text";
import { AiAnalyzing } from "./ai-analyzing";

/**
 * The AI entry point used everywhere AI is offered outside the dedicated page
 * (owner request 2026-11-19): a COMPACT, full-spectrum button. Clicking it plays
 * the "analyzing the whole data" animation (a real minimum so it is always felt,
 * even on a cached result) and then reveals the briefing/recommendation.
 *
 * Putting generation behind a deliberate click also stops the paid model being
 * called on every dashboard load.
 *
 * Props:
 *   title/description/cta/icon — the idle trigger's wording
 *   stages      — the lines the animation cycles (lib/ai-visuals)
 *   generate    — async () => result (throws on failure); the first reveal
 *   regenerate  — async () => result; the in-panel "regenerate" (defaults to generate)
 *   children    — (result, { regenerate }) => node, rendered once done
 */
const MIN_MS = 2600;
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

export function AiReveal({
  title,
  description,
  cta = "Generate",
  icon: Icon = Sparkles,
  stages,
  generate,
  regenerate,
  children,
}) {
  const [phase, setPhase] = useState("idle"); // idle | analyzing | done | error
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const runningRef = useRef(false);

  async function invoke(fn) {
    if (runningRef.current) return;
    runningRef.current = true;
    setErrorMsg(null);
    setPhase("analyzing");
    try {
      const [res] = await Promise.all([fn(), delay(MIN_MS)]);
      setResult(res);
      setPhase("done");
    } catch (e) {
      setErrorMsg(
        e?.message ||
          "Could not complete the analysis just now. Please try again in a moment.",
      );
      setPhase("error");
    } finally {
      runningRef.current = false;
    }
  }

  const doRegenerate = () => invoke(regenerate ?? generate);

  if (phase === "analyzing") return <AiAnalyzing stages={stages} />;

  if (phase === "error") {
    return (
      <Box className="ai-rise-in rounded-xl border border-danger/30 bg-danger/5 p-6 text-center">
        <AlertCircle className="mx-auto mb-2 h-6 w-6 text-danger" />
        <Text as="p" className="mx-auto max-w-md text-sm text-danger">{errorMsg}</Text>
        <button
          type="button"
          onClick={() => invoke(generate)}
          className="ai-trigger mt-3 inline-flex cursor-pointer items-center gap-2 rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
        >
          <Sparkles className="h-4 w-4" />
          Try again
        </button>
      </Box>
    );
  }

  if (phase === "done" && result != null) {
    return (
      <Box className="ai-rise-in">
        {children(result, { regenerate: doRegenerate })}
      </Box>
    );
  }

  // idle — the compact trigger
  return (
    <Box className="relative overflow-hidden rounded-xl border border-line glass">
      <Box className="ai-spectrum absolute inset-x-0 top-0 h-[3px]" />
      <Box className="flex flex-wrap items-center gap-3 p-4">
        <Box className="ai-spectrum flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
          <Icon className="h-5 w-5 text-white" />
        </Box>
        <Box className="min-w-0 flex-1">
          <Box className="flex items-center gap-2">
            <Text as="h3" className="text-[15px] font-semibold text-ink">{title}</Text>
            <Text as="span" className="ai-spectrum rounded-full px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-white">
              AI
            </Text>
          </Box>
          {description && (
            <Text as="p" className="mt-0.5 text-xs text-text-2">{description}</Text>
          )}
        </Box>
        <button
          type="button"
          onClick={() => invoke(generate)}
          aria-label={cta}
          className="ai-trigger inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
        >
          <Sparkles className="h-4 w-4" />
          {cta}
        </button>
      </Box>
    </Box>
  );
}
