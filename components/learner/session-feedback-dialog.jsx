"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, Star } from "lucide-react";

import Box from "@/components/ui/box";
import Text from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { submitSessionFeedback } from "@/services/api/feedback-api";
import { FEEDBACK_DIMENSIONS, RATING_MAX } from "@/lib/feedback";
import { DESCRIPTION_MAX_LENGTH } from "@/lib/content-limits";
import { cn } from "@/lib/utils";

/**
 * Rate a session you attended.
 *
 * **The promise of anonymity is made here, on the form, in words.** The API
 * stores the author so one person cannot rate twice and so an admin can
 * attribute abuse, and no trainer route ever selects that column. A learner
 * deciding how honest to be needs to know which of those is true, and they
 * will not read the migration — so the dialog says it.
 *
 * All three ratings are required. A half-answered form makes a row that skews
 * every average it lands in, so Save stays disabled rather than accepting one
 * and quietly discarding the rest.
 */

function StarRow({ value, onChange, label, help }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;

  return (
    <Box className="space-y-1">
      <Text as="p" className="text-[12px] font-semibold text-ink">{label}</Text>
      <Text as="p" className="text-[10.5px] leading-snug text-text-3">{help}</Text>
      <Box className="flex items-center gap-1 pt-0.5" onMouseLeave={() => setHover(0)}>
        {Array.from({ length: RATING_MAX }, (_, i) => {
          const n = i + 1;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              onMouseEnter={() => setHover(n)}
              aria-label={`${label}: ${n} out of ${RATING_MAX}`}
              title={`${n} out of ${RATING_MAX}`}
              className="cursor-pointer p-0.5"
            >
              <Star
                className={cn(
                  "size-5 transition-colors",
                  n <= shown ? "fill-warning text-warning" : "text-line-strong",
                )}
              />
            </button>
          );
        })}
        <Text as="span" className="ml-1.5 text-[11px] text-text-3">
          {value ? `${value} / ${RATING_MAX}` : "Not rated"}
        </Text>
      </Box>
    </Box>
  );
}

export function SessionFeedbackDialog({ session, open, onOpenChange, onSaved }) {
  const existing = session?.feedback ?? null;

  const [ratings, setRatings] = useState({});
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Reload whenever a different session opens, so the form never shows the
  // previous session's answers — and so revising an answer starts from what
  // was actually saved rather than from blank.
  useEffect(() => {
    if (!open) return;
    setRatings(
      existing
        ? Object.fromEntries(
            FEEDBACK_DIMENSIONS.map((d) => [d.key, existing[d.field] ?? 0]),
          )
        : {},
    );
    setComment(existing?.comment ?? "");
    setError(null);
  }, [open, session?.session_id]); // eslint-disable-line react-hooks/exhaustive-deps

  const complete = FEEDBACK_DIMENSIONS.every((d) => ratings[d.key] > 0);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const body = Object.fromEntries(
        FEEDBACK_DIMENSIONS.map((d) => [d.field, ratings[d.key]]),
      );
      await submitSessionFeedback({
        sessionId: session.session_id ?? session.id,
        ...body,
        comment: comment.trim() || null,
      });
      onOpenChange(false);
      onSaved?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (!session) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="pr-6 text-[15px] leading-snug">
            {existing ? "Update your feedback" : "How was this session?"}
          </DialogTitle>
        </DialogHeader>

        <Box className="space-y-4">
          <Text as="p" className="text-[11.5px] text-text-2">
            {session.title}
          </Text>

          {/* The promise, before the first star is clicked. */}
          <Box className="border border-line bg-surface-2 px-3 py-2">
            <Text as="p" className="text-[11px] leading-snug text-text-2">
              <Text as="span" className="font-semibold text-ink">
                Your trainer will not see your name.
              </Text>{" "}
              They see the ratings and anything you write, never who wrote it.
              Say what you actually think — that is the only version worth
              having.
            </Text>
          </Box>

          {FEEDBACK_DIMENSIONS.map((d) => (
            <StarRow
              key={d.key}
              label={d.label}
              help={d.help}
              value={ratings[d.key] ?? 0}
              onChange={(n) => setRatings((r) => ({ ...r, [d.key]: n }))}
            />
          ))}

          <Box className="space-y-1">
            <Box className="flex items-baseline justify-between">
              <Text as="p" className="text-[12px] font-semibold text-ink">
                Anything you would like to add?
              </Text>
              <Text as="span" className="text-[10.5px] text-text-3">
                {comment.length} / {DESCRIPTION_MAX_LENGTH}
              </Text>
            </Box>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={DESCRIPTION_MAX_LENGTH}
              rows={3}
              placeholder="Optional. What worked, and what would you change?"
              className="text-[12px]"
            />
          </Box>

          {error && (
            <Text as="p" className="text-[11.5px] text-danger">{error}</Text>
          )}

          <Box className="flex items-center justify-between gap-3 border-t border-line pt-3">
            {/* Says why Save is off, rather than leaving a dead button. */}
            <Text as="p" className="text-[10.5px] text-text-3">
              {complete
                ? existing
                  ? "This replaces your earlier answer."
                  : "You can change this later."
                : "Rate all three to save."}
            </Text>
            <Button
              size="sm"
              onClick={save}
              disabled={!complete || saving}
              className="cursor-pointer gap-1.5 disabled:cursor-not-allowed"
            >
              {saving ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Check className="size-3.5" />
              )}
              {existing ? "Update feedback" : "Send feedback"}
            </Button>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
