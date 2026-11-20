"use client";

import Box from "@/components/ui/box";
import Text from "@/components/ui/text";

/**
 * Render **double-asterisk** spans as real inline bold.
 *
 * The AI prompts (`server/.../ai-insights/ai-narrative.ts`) wrap the words that
 * carry the meaning — key numbers, course / skill / department names — in `**`,
 * so the explanation reads with emphasis exactly where it helps. `Box as="strong"`
 * is used rather than `Text as="strong"` because `Text` has no `strong` mapping
 * and would silently fall back to a block `<p>`.
 */
export function RichText({ text }) {
  if (text === null || text === undefined) return null;
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    const match = /^\*\*([^*]+)\*\*$/.exec(part);
    if (match) {
      return (
        <Box as="strong" key={i} className="font-semibold text-ink">
          {match[1]}
        </Box>
      );
    }
    return part;
  });
}

/**
 * Per-section tone (owner request 2026-11-20): the BORDER carries the meaning
 * over a faint frosted tint — red for real danger, green for good news, amber to
 * watch, cool violet for neutral — so a reader gets the gist at a glance without
 * a loud fill. The tone is chosen by the model (ai-narrative.ts).
 */
const TONE = {
  critical: { card: "ai-tone-critical", bar: "bg-danger", num: "text-danger" },
  warning: { card: "ai-tone-warning", bar: "bg-warning", num: "text-warning" },
  positive: { card: "ai-tone-positive", bar: "bg-success", num: "text-success" },
  neutral: { card: "ai-tone-neutral", bar: "ai-soft", num: "text-accent-blue" },
};

/**
 * The clearly-structured AI explanation (owner request 2026-11-19): each section
 * is a heading, a short description and an ordered list of points, with inline
 * bold and a semantic border tone. One renderer for the learner coach and the
 * admin briefing. Renders nothing when there are no sections (an older cached
 * insight simply shows the existing cards beneath it).
 */
export function AiSections({ sections }) {
  const list = Array.isArray(sections)
    ? sections.filter((s) => s && typeof s.heading === "string" && s.heading.trim())
    : [];
  if (list.length === 0) return null;

  return (
    <Box className="space-y-3">
      {list.map((section, i) => {
        const tone = TONE[section.tone] ?? TONE.neutral;
        return (
          <Box key={i} className={`rounded-xl p-4 backdrop-blur-sm ${tone.card}`}>
            <Box className="mb-1.5 flex items-center gap-2">
              <Box className={`h-4 w-1 shrink-0 rounded-full ${tone.bar}`} />
              <Text as="h4" className="text-[13.5px] font-semibold text-ink">
                <RichText text={section.heading} />
              </Text>
            </Box>

            {section.body && (
              <Text as="p" className="mb-2.5 text-xs leading-relaxed text-text-2">
                <RichText text={section.body} />
              </Text>
            )}

            {Array.isArray(section.points) && section.points.length > 0 && (
              <Box as="ol" className="space-y-1.5">
                {section.points.map((point, k) => (
                  <Box as="li" key={k} className="flex gap-2">
                    <Box
                      as="span"
                      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white/70 font-mono text-[9px] font-bold ${tone.num}`}
                    >
                      {k + 1}
                    </Box>
                    <Text as="p" className="text-[12.5px] leading-relaxed text-ink">
                      <RichText text={point} />
                    </Text>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
