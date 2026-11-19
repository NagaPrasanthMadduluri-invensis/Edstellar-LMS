"use client";

import { useEffect, useState } from "react";
import { Brain } from "lucide-react";

import Box from "@/components/ui/box";
import Text from "@/components/ui/text";

/**
 * The "AI is analyzing the whole picture" animation shown while an insight is
 * generated (owner request 2026-11-19). Full Spectra spectrum (lib/ai-visuals),
 * design-heavy on purpose: pulsing rings and a rotating spectrum core over a
 * row of shimmering data bars, with staged status lines that advance as it goes.
 * All motion is neutralised under prefers-reduced-motion, where it reads as a
 * static "Analyzing…" card.
 */
const DEFAULT_STAGES = ["Reading the data", "Finding patterns", "Writing insights"];

export function AiAnalyzing({ stages = DEFAULT_STAGES }) {
  const [i, setI] = useState(0);

  useEffect(() => {
    const id = setInterval(
      () => setI((n) => Math.min(n + 1, stages.length - 1)),
      900,
    );
    return () => clearInterval(id);
  }, [stages.length]);

  return (
    <Box className="ai-rise-in relative flex flex-col items-center justify-center overflow-hidden rounded-xl border border-line glass px-6 py-10 text-center">
      <Box className="ai-spectrum-animated absolute inset-x-0 top-0 h-[3px]" />

      {/* The core: two expanding rings, a rotating spectrum ring, a still centre */}
      <Box className="relative mb-6 flex h-28 w-28 items-center justify-center">
        <Box className="ai-ring ai-spectrum absolute h-16 w-16 rounded-full opacity-30" />
        <Box
          className="ai-ring ai-spectrum absolute h-16 w-16 rounded-full opacity-30"
          style={{ animationDelay: "1.1s" }}
        />
        <Box
          className="ai-core-spin ai-conic absolute h-24 w-24 rounded-full opacity-90"
          style={{
            WebkitMask: "radial-gradient(farthest-side, transparent 58%, #000 60%)",
            mask: "radial-gradient(farthest-side, transparent 58%, #000 60%)",
          }}
        />
        <Box className="relative flex h-14 w-14 items-center justify-center rounded-full bg-white shadow">
          <Brain className="h-7 w-7 text-accent-blue" />
        </Box>
      </Box>

      {/* A row of data bars, shimmering out of sync — "reading the whole data" */}
      <Box className="mb-5 flex h-10 items-end gap-1" aria-hidden="true">
        {Array.from({ length: 18 }).map((_, k) => (
          <Box
            key={k}
            className="ai-bar ai-spectrum w-1.5 rounded-full"
            style={{
              height: `${28 + ((k * 41) % 72)}%`,
              animationDelay: `${(k % 9) * 0.11}s`,
            }}
          />
        ))}
      </Box>

      <Text as="p" className="ai-gradient-text text-sm font-bold" aria-live="polite">
        {stages[i]}…
      </Text>
      <Text as="p" className="mt-1 text-[11px] text-text-3">
        Reading the whole picture to give you something useful
      </Text>

      {/* A sweeping progress line */}
      <Box className="relative mt-4 h-1 w-48 overflow-hidden rounded-full bg-surface-3">
        <Box className="ai-sweep ai-spectrum absolute h-full w-1/3 rounded-full" />
      </Box>
    </Box>
  );
}
