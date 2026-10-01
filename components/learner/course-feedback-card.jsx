"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, MessageSquare, Star } from "lucide-react";

import { cn } from "@/lib/utils";
import { ApiError } from "@/lib/api-client";
import { LIKERT_SCALE } from "@/lib/feedback-questions";
import {
  fetchCourseFeedbackForm,
  submitCourseFeedback,
} from "@/services/api/surveys-api";

import Box from "@/components/ui/box";
import Text from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * "Tell us what you thought", under the assessments on a course page.
 *
 * IT IS NOT PART OF FINISHING THE COURSE, and the card says so in words
 * rather than leaving it to be inferred. A learner who sees a form under the
 * assessments reasonably assumes it is the last thing standing between them
 * and their certificate; it is not, and believing it is would make them fill
 * it in to get past it, which is the opposite of what feedback is for.
 *
 * It renders NOTHING when the course asks for no feedback — the API answers
 * `{ feedback: null }` for a course with it switched off and for a session's
 * companion training, which is rated through the session instead. An empty
 * card headed "Feedback" with nothing in it would be worse than absence.
 *
 * Re-opening loads what was actually saved, so revising starts from the
 * existing answer rather than from blank — the same rule the session feedback
 * form follows, and the footer says so.
 */
export function CourseFeedbackCard({ courseId }) {
  const [form, setForm] = useState(null);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchCourseFeedbackForm(courseId);
      setForm(data.feedback);
    } catch {
      // A course whose feedback could not be loaded shows no card. This is
      // the one thing on the page that is genuinely optional, so a red banner
      // over it would be louder than the feature is important.
      setForm(null);
    } finally {
      setLoaded(true);
    }
  }, [courseId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!loaded || !form) return null;

  const given = !!form.submitted_at;

  return (
    <Box>
      <Box className="mb-3 flex items-center gap-2">
        <Text as="h2" className="text-base font-semibold">Your feedback</Text>
        <Text as="span" className="text-[11px] text-muted-foreground">
          optional — it does not affect completion
        </Text>
      </Box>

      <Card className="overflow-hidden py-0">
        <Box className="flex items-center gap-3 p-4">
          <Box className="flex size-10 shrink-0 items-center justify-center bg-accent-tint">
            {given ? (
              <CheckCircle2 className="size-5 text-success" />
            ) : (
              <MessageSquare className="size-5 text-accent-blue" />
            )}
          </Box>

          <Box className="min-w-0 flex-1">
            <Text as="p" className="truncate text-sm font-semibold">
              {given ? "Thanks — you have given feedback" : form.template_name}
            </Text>
            <Text as="p" className="mt-0.5 text-[11px] text-muted-foreground">
              {given
                ? "You can change your answers any time."
                : `${form.questions.length} question${form.questions.length === 1 ? "" : "s"}. It takes a minute and it does not count towards finishing the course.`}
            </Text>
          </Box>

          <Button
            size="sm"
            variant={given ? "outline" : "default"}
            className="shrink-0 cursor-pointer text-xs"
            onClick={() => setOpen(true)}
          >
            {given ? "Edit answers" : "Give feedback"}
          </Button>
        </Box>
      </Card>

      {open && (
        <FeedbackDialog
          courseId={courseId}
          form={form}
          onClose={() => setOpen(false)}
          onSaved={async () => {
            setOpen(false);
            await load();
          }}
        />
      )}
    </Box>
  );
}

/**
 * Exported so the Surveys module opens the SAME form the course page does.
 * Two copies would drift on the one thing that must not — what a learner is
 * asked and what gets saved.
 */
export function FeedbackDialog({ courseId, form, onClose, onSaved }) {
  const [answers, setAnswers] = useState(() => ({ ...(form.my_answers || {}) }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function set(id, value) {
    setAnswers((a) => ({ ...a, [String(id)]: value }));
  }

  const missing = form.questions.filter(
    (q) =>
      q.is_required &&
      (answers[String(q.id)] === undefined ||
        answers[String(q.id)] === null ||
        answers[String(q.id)] === ""),
  );

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await submitCourseFeedback(courseId, answers);
      await onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save your feedback");
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-lg">
        <DialogHeader className="surface-dark px-4 py-3">
          <DialogTitle className="text-white">{form.template_name}</DialogTitle>
          <Text as="p" className="mt-1 text-[12px] text-accent-soft">
            Your answers go to your organization&apos;s admin. Nothing here
            affects your progress, your hours or your certificate.
          </Text>
        </DialogHeader>

        <Box className="space-y-4 px-4 py-4">
          {error && (
            <Box className="border border-danger/40 bg-danger/10 px-3 py-2">
              <Text as="p" className="text-[13px] text-danger">{error}</Text>
            </Box>
          )}

          {form.questions.map((q) => (
            <Box key={q.id} className="space-y-2">
              <Text as="p" className="text-[13px] font-semibold text-ink">
                {q.prompt}
                {q.is_required && (
                  <Text as="span" className="ml-1 text-danger">*</Text>
                )}
              </Text>
              <QuestionInput
                question={q}
                value={answers[String(q.id)]}
                onChange={(v) => set(q.id, v)}
              />
            </Box>
          ))}
        </Box>

        {/* p-0 on the content means the footer's own -mx-4 -mb-4 has nothing
            to cancel, so both are reset (§10.3.1.11). */}
        <DialogFooter className="mx-0 mb-0 flex-col items-stretch gap-2 border-t border-line bg-surface-2 px-4 py-3 sm:flex-row sm:items-center">
          <Text as="p" className="mr-auto text-[11px] text-text-3">
            {form.submitted_at
              ? "This replaces your earlier answer."
              : missing.length > 0
                ? `Answer the ${missing.length} starred question${missing.length === 1 ? "" : "s"} to save.`
                : "You can change it later."}
          </Text>
          <Button variant="outline" onClick={onClose} disabled={saving} className="cursor-pointer">
            Cancel
          </Button>
          <Button
            onClick={save}
            disabled={saving || missing.length > 0}
            className="cursor-pointer"
            title={missing.length > 0 ? `Answer: ${missing[0].prompt}` : undefined}
          >
            {saving ? "Saving…" : "Send feedback"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function QuestionInput({ question, value, onChange }) {
  switch (question.question_type) {
    case "rating":
      return <RatingInput value={value} onChange={onChange} />;
    case "likert":
      return (
        <ChoiceRow options={LIKERT_SCALE} value={value} onChange={onChange} />
      );
    case "choice":
      return (
        <ChoiceRow
          options={question.options || []}
          value={value}
          onChange={onChange}
        />
      );
    case "yesno":
      return <ChoiceRow options={["Yes", "No"]} value={value} onChange={onChange} />;
    default:
      return (
        <Textarea
          rows={3}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          maxLength={1000}
          placeholder="In your own words…"
          className="resize-none"
        />
      );
  }
}

function RatingInput({ value, onChange }) {
  const current = Number(value) || 0;
  return (
    <Box className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          title={`${n} out of 5`}
          aria-label={`${n} out of 5`}
          className="cursor-pointer p-0.5"
        >
          <Star
            className={cn(
              "size-6 transition-colors",
              n <= current
                ? "fill-accent-blue text-accent-blue"
                : "text-line-strong hover:text-accent-blue",
            )}
          />
        </button>
      ))}
      {current > 0 && (
        <Text as="span" className="ml-1 text-[12px] text-text-2">{current}/5</Text>
      )}
    </Box>
  );
}

function ChoiceRow({ options, value, onChange }) {
  return (
    <Box className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={cn(
            "cursor-pointer border px-2.5 py-1.5 text-[12px] transition-colors",
            value === o
              ? "border-accent-blue bg-accent-blue text-white"
              : "border-line bg-surface text-text-2 hover:border-accent-blue hover:text-ink",
          )}
        >
          {o}
        </button>
      ))}
    </Box>
  );
}
