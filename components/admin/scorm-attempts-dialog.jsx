"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Loader2, Check, X, Minus } from "lucide-react";

import Box from "@/components/ui/box";
import Text from "@/components/ui/text";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { fetchScormAttempts } from "@/services/api/admin/admin-api";

/**
 * One learner's SCORM attempt history, shown the way assessment attempts are:
 * attempt number, score, verdict, submission time — newest first, with the
 * per-question breakdown underneath when the package reports one.
 */

/** Status carried by fill weight, not by extra hues (TASTE §10.3). */
function verdictChip(isPassed) {
  if (isPassed === true) return { label: "Passed", cls: "bg-navy text-paper border-0" };
  if (isPassed === false) return { label: "Failed", cls: "bg-error/10 text-error border-0" };
  return { label: "Not graded", cls: "bg-paper-warm text-ink/60 border border-border" };
}

function formatSubmitted(iso) {
  if (!iso) return "";
  // Postgres renders timestamptz as "2026-08-17 12:39:20.53+00"; the raw string
  // parses correctly, whereas rewriting the space to a "T" does not.
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function QuestionRow({ q }) {
  const Icon = q.isCorrect === true ? Check : q.isCorrect === false ? X : Minus;
  const tone =
    q.isCorrect === true ? "text-navy"
      : q.isCorrect === false ? "text-error"
        : "text-ink/40";

  return (
    <Box className="flex items-start gap-2.5 py-2 border-b border-border/60 last:border-0">
      <Icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${tone}`} />
      <Box className="min-w-0 flex-1">
        <Text as="p" className="text-xs font-medium text-ink/80 truncate">
          {q.description || q.id || `Question ${q.index + 1}`}
          {q.type && (
            <Text as="span" className="ml-1.5 font-mono text-[10px] text-ink/40 uppercase">
              {q.type}
            </Text>
          )}
        </Text>
        <Text as="p" className="text-[11px] text-ink/60 mt-0.5 break-words">
          Answered: <Text as="span" className="font-mono">{q.learnerResponse ?? "—"}</Text>
          {q.isCorrect === false && q.correctResponse && (
            <>
              {"  ·  "}Correct: <Text as="span" className="font-mono">{q.correctResponse}</Text>
            </>
          )}
        </Text>
      </Box>
    </Box>
  );
}

function AttemptCard({ attempt }) {
  const [open, setOpen] = useState(false);
  const chip = verdictChip(attempt.is_passed);
  const hasQuestions = attempt.question_count > 0;
  const Chevron = open ? ChevronDown : ChevronRight;

  return (
    <Box className="rounded-xl border border-border bg-white overflow-hidden">
      <Box
        onClick={() => hasQuestions && setOpen((v) => !v)}
        className={`flex items-center justify-between gap-3 px-3.5 py-3 ${
          hasQuestions ? "cursor-pointer hover:bg-paper-warm transition-colors" : ""
        }`}
      >
        <Box className="flex items-center gap-2.5 min-w-0">
          {hasQuestions
            ? <Chevron className="h-4 w-4 text-ink/40 shrink-0" />
            : <Box className="w-4 shrink-0" />}
          <Box className="min-w-0">
            <Text as="p" className="text-sm font-semibold text-navy">
              Attempt {attempt.attempt_number}
              {attempt.score_max
                ? ` — ${attempt.score_raw ?? 0}/${attempt.score_max}`
                : ""}
              {attempt.percentage !== null && (
                <Text as="span" className="text-ink/60 font-normal"> ({attempt.percentage}%)</Text>
              )}
            </Text>
            <Text as="p" className="text-[11px] text-ink/55 mt-0.5">
              {formatSubmitted(attempt.submitted_at)}
              {attempt.total_time ? `  ·  ${attempt.total_time.replace("PT", "")}` : ""}
              {hasQuestions ? `  ·  ${attempt.correct_count}/${attempt.question_count} correct` : ""}
            </Text>
          </Box>
        </Box>
        <Badge className={`text-[10px] shrink-0 ${chip.cls}`}>{chip.label}</Badge>
      </Box>

      {open && hasQuestions && (
        <Box className="px-3.5 pb-2 bg-paper-warm/50 border-t border-border">
          {attempt.interactions.map((q) => <QuestionRow key={q.index} q={q} />)}
        </Box>
      )}
    </Box>
  );
}

export function ScormAttemptsDialog({ packageId, learner, open, onClose }) {
  const [data, setData] = useState(undefined);

  useEffect(() => {
    if (!open || !packageId || !learner) return;
    setData(undefined);
    fetchScormAttempts({ packageId, userId: learner.user_id })
      .then(setData)
      .catch(() => setData(null));
  }, [open, packageId, learner]);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-xl max-h-[85dvh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base">
            Attempts — {learner?.first_name} {learner?.last_name}
          </DialogTitle>
          {data?.package && (
            <Text as="p" className="text-xs text-ink/55">
              {data.package.title} · SCORM {data.package.version}
            </Text>
          )}
        </DialogHeader>

        <Box className="flex-1 overflow-y-auto space-y-2 pr-1">
          {data === undefined && (
            <Box className="space-y-2">
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </Box>
          )}

          {data === null && (
            <Box className="py-8 text-center">
              <Text as="p" className="text-sm text-error">Could not load attempts.</Text>
            </Box>
          )}

          {data?.attempts?.length === 0 && (
            <Box className="py-10 text-center">
              <Text as="p" className="text-sm text-ink/60">No attempts recorded yet.</Text>
              <Text as="p" className="text-xs text-ink/45 mt-1">
                An attempt is recorded when the learner finishes the package.
              </Text>
            </Box>
          )}

          {data?.attempts?.map((a) => <AttemptCard key={a.id} attempt={a} />)}

          {data?.attempts?.length > 0 && !data.reportsQuestions && (
            <Text as="p" className="text-[11px] text-ink/45 pt-1">
              This package does not report per-question data, so only scores are available.
            </Text>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
}
