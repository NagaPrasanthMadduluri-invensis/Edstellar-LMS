"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, AlertCircle, X } from "lucide-react";

import Box from "@/components/ui/box";
import Text from "@/components/ui/text";
import { AiAnalyzing } from "./ai-analyzing";

/**
 * The AI entry point (owner request 2026-11-19, refined 2026-11-20): a COMPACT,
 * frosted card that sits in a grid. Clicking it opens a FULLSCREEN overlay — the
 * "analyzing the whole picture" animation (a real minimum so it is always felt,
 * even on a cached result), then the briefing/recommendation in a large, calm
 * modal. The idle card never fills the page; the result is what earns the room.
 *
 * Gating generation behind a deliberate click also stops the paid model being
 * called on every dashboard load.
 *
 * Props:
 *   title/description/cta/icon — the idle card's wording
 *   stages      — the lines the animation cycles (lib/ai-visuals)
 *   generate    — async () => result (throws on failure); the first reveal
 *   regenerate  — async () => result; the in-panel "regenerate" (defaults to generate)
 *   children    — (result, { regenerate }) => node, rendered in the overlay when done
 */
const MIN_MS = 2600;
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

/** A fullscreen, frosted overlay. The result is shown here, never inline. */
function Overlay({ children, onClose, center = false }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <Box
      className={`fixed inset-0 z-[60] flex justify-center overflow-y-auto bg-ink/45 p-3 backdrop-blur-md sm:p-6 ${
        center ? "items-center" : "items-start"
      }`}
      onClick={onClose}
    >
      <Box
        className="ai-rise-in relative w-full max-w-4xl"
        onClick={(e) => e.stopPropagation()}
      >
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute -top-2 right-0 z-10 inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white/90 text-text-2 shadow transition hover:bg-white hover:text-ink sm:-right-2"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {children}
      </Box>
    </Box>
  );
}

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
          "We could not complete the analysis just now. Please try again in a moment.",
      );
      setPhase("error");
    } finally {
      runningRef.current = false;
    }
  }

  const doRegenerate = () => invoke(regenerate ?? generate);
  const close = () => setPhase("idle");

  if (phase === "analyzing") {
    return (
      <Overlay center>
        <AiAnalyzing stages={stages} />
      </Overlay>
    );
  }

  if (phase === "error") {
    return (
      <Overlay center onClose={close}>
        <Box className="ai-card rounded-2xl border border-danger/30 bg-white/80 p-8 text-center backdrop-blur">
          <AlertCircle className="mx-auto mb-2 h-6 w-6 text-danger" />
          <Text as="p" className="mx-auto max-w-md text-sm text-danger">{errorMsg}</Text>
          <button
            type="button"
            onClick={() => invoke(generate)}
            className="ai-trigger mt-4 inline-flex cursor-pointer items-center gap-2 rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
          >
            <Sparkles className="h-4 w-4" />
            Try again
          </button>
        </Box>
      </Overlay>
    );
  }

  if (phase === "done" && result != null) {
    return (
      <Overlay onClose={close}>
        {children(result, { regenerate: doRegenerate })}
      </Overlay>
    );
  }

  // idle — the compact card that lives in the grid
  return (
    <Box className="ai-card ai-border group flex h-full flex-col rounded-2xl glass p-5">
      <Box className="ai-soft mb-3 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-sm">
        <Icon className="h-5 w-5 text-white" />
      </Box>
      <Box className="flex items-center gap-2">
        <Text as="h3" className="text-[15px] font-semibold text-ink">{title}</Text>
        <Text as="span" className="ai-soft rounded-full px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-white">
          AI
        </Text>
      </Box>
      {description && (
        <Text as="p" className="mt-1.5 flex-1 text-[12.5px] leading-relaxed text-text-2">{description}</Text>
      )}
      <button
        type="button"
        onClick={() => invoke(generate)}
        aria-label={cta}
        className="ai-trigger mt-4 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-navy px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
      >
        <Sparkles className="h-4 w-4" />
        {cta}
      </button>
    </Box>
  );
}
