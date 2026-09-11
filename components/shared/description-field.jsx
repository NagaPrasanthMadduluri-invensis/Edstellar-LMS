"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Box from "@/components/ui/box";
import Text from "@/components/ui/text";
import { cn } from "@/lib/utils";
import { DESCRIPTION_MAX_LENGTH } from "@/lib/content-limits";

/**
 * The description field, wherever one is edited.
 *
 * One component rather than a `maxLength` typed into nine dialogs, because the
 * limit has to be the same number everywhere — a course, a module, a lesson,
 * an assessment and a session all have the same cap, and an admin should never
 * have to find out which form is stricter by being refused.
 *
 * It also puts the limit on screen. The API enforces 450 characters and
 * answers a longer one with a 422; without a counter the admin only learns
 * that after writing the paragraph and pressing Save, which is exactly the
 * kind of feedback that arrives too late to be useful. `maxLength` stops the
 * typing, the counter says why, and the API is still what enforces it.
 *
 * Why 450: a description is a summary shown on a card, and every list clamps
 * it to two lines. Text past that is written and never read.
 *
 * @param {string}   value
 * @param {Function} onChange  receives the STRING, not the event
 * @param {number}   [rows]
 */
export function DescriptionField({
  id,
  label = "Description",
  value,
  onChange,
  rows = 3,
  placeholder = "Brief description…",
  disabled = false,
  className,
  labelClassName = "text-sm font-medium text-ink/80",
  hint,
}) {
  const text = value || "";
  const atLimit = text.length >= DESCRIPTION_MAX_LENGTH;

  return (
    <Box className="space-y-1.5">
      <Label htmlFor={id} className={labelClassName}>{label}</Label>
      <Textarea
        id={id}
        rows={rows}
        placeholder={placeholder}
        value={text}
        disabled={disabled}
        // The browser stops at the cap, including on paste, so the admin
        // cannot write past it and then be refused.
        maxLength={DESCRIPTION_MAX_LENGTH}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "bg-paper-warm border-border placeholder:text-ink/35 focus-visible:ring-2 focus-visible:ring-navy/20 focus-visible:border-navy/20 resize-none transition-colors",
          className,
        )}
      />
      {/* `min-w-0` on the hint is load-bearing: a flex child defaults to
          `min-width: auto`, so without it this row refuses to shrink below the
          hint's natural width and pushes the whole dialog wider than its
          max-width — which clipped every field in it, not just this one. */}
      <Box className="flex items-start justify-between gap-3">
        <Text as="span" className="min-w-0 text-xs text-ink/50">
          {hint ?? "Shown on cards and lists, trimmed to two lines."}
        </Text>
        {/* Weight, not colour, marks the limit — reaching it is a constraint
            working, not a failure, and `error` is reserved for those (TASTE
            §10.1). */}
        <Text
          as="span"
          className={cn(
            "text-xs tabular-nums shrink-0",
            atLimit ? "font-semibold text-ink" : "text-ink/50",
          )}
        >
          {text.length} / {DESCRIPTION_MAX_LENGTH}
        </Text>
      </Box>
    </Box>
  );
}
