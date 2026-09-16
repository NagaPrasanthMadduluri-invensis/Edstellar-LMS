"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2, ChevronDown, ChevronRight, ClipboardList, Circle,
  Pencil, Plus, Trash2, X,
} from "lucide-react";

import Box from "@/components/ui/box";
import Text from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DescriptionField } from "@/components/shared/description-field";
import {
  addQuestion, createAssessment, deleteAssessment, deleteQuestion,
  fetchAssessmentDetail, fetchAssessments, updateAssessment, updateQuestion,
} from "@/services/api/admin/admin-api";
import {
  ASSESSMENT_LINK_TYPES, QUESTION_TYPES, isOptionBacked, questionTypeOf,
} from "@/lib/lesson-content";
import { cn } from "@/lib/utils";

const LINK_LABEL = Object.fromEntries(
  ASSESSMENT_LINK_TYPES.map((t) => [t.key, t.label]),
);

/**
 * Assessments live on the course page, not in a builder of their own.
 *
 * An assessment only ever means something in the context of what it tests, so
 * authoring it beside the modules and lessons it attaches to is the whole
 * point — the placement control can offer the real modules and lessons rather
 * than making the admin remember ids from another screen.
 */
export function CourseAssessmentsContent({ courseId, modules = [], lessons = [], onChanged }) {
  const [assessments, setAssessments] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  const [qOpen, setQOpen] = useState(false);
  const [qEditing, setQEditing] = useState(null);
  const [qConfirm, setQConfirm] = useState(null);

  const reload = useCallback(async () => {
    try {
      const res = await fetchAssessments({ courseId });
      setAssessments(res.assessments ?? []);
      setError(null);
    } catch (e) { setError(e.message); }
  }, [courseId]);

  useEffect(() => { reload(); }, [reload]);

  const loadDetail = useCallback(async (assessmentId) => {
    try {
      const res = await fetchAssessmentDetail({ assessmentId });
      setDetail(res);
    } catch (e) { setError(e.message); }
  }, []);

  function toggle(assessment) {
    if (expanded === assessment.id) { setExpanded(null); setDetail(null); return; }
    setExpanded(assessment.id);
    setDetail(null);
    loadDetail(assessment.id);
  }

  async function refreshAll() {
    await reload();
    if (expanded) await loadDetail(expanded);
    if (onChanged) await onChanged();
  }

  async function removeAssessment() {
    setBusy(true);
    try {
      await deleteAssessment({ assessmentId: confirm.id });
      if (expanded === confirm.id) { setExpanded(null); setDetail(null); }
      setConfirm(null);
      await refreshAll();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function removeQuestion() {
    setBusy(true);
    try {
      await deleteQuestion({ questionId: qConfirm.id });
      setQConfirm(null);
      await refreshAll();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  if (assessments === null) {
    return (
      <Box className="border border-line bg-surface px-6 py-14 text-center">
        <Text as="p" className="text-[12.5px] text-text-3">Loading assessments…</Text>
      </Box>
    );
  }

  return (
    <Box className="space-y-3">
      <Box className="flex items-center justify-between">
        <Text as="p" className="text-[12px] text-text-3">
          {assessments.length} assessment{assessments.length === 1 ? "" : "s"}
        </Text>
        <Button
          onClick={() => { setEditing(null); setDialogOpen(true); }}
          className="h-8 gap-1.5 rounded-none bg-navy px-3 text-[12.5px] font-bold text-accent-soft hover:bg-accent-blue hover:text-white"
        >
          <Plus className="size-3.5" />Add assessment
        </Button>
      </Box>

      {error && (
        <Box className="border border-danger/30 bg-danger/10 px-3 py-2">
          <Text as="p" className="text-[12.5px] text-danger">{error}</Text>
        </Box>
      )}

      {assessments.length === 0 ? (
        <Box className="border border-dashed border-line-strong bg-surface px-6 py-14 text-center">
          <ClipboardList className="mx-auto mb-3 size-8 text-text-3" />
          <Text as="h3" className="text-[14px] font-bold text-ink">No assessments yet</Text>
          <Text as="p" className="mx-auto mt-1.5 max-w-md text-[12.5px] leading-relaxed text-text-2">
            Attach one to a lesson, to a module, or to the course as its final.
            There is no separate builder — the questions are written here.
          </Text>
        </Box>
      ) : (
        <Box className="space-y-2">
          {assessments.map((a) => {
            const isOpen = expanded === a.id;
            const where = a.link_type === "module" ? a.module_title
              : a.link_type === "lesson" ? a.lesson_title
              : null;
            return (
              <Box key={a.id} className="border border-line bg-surface">
                <Box className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => toggle(a)}
                    aria-expanded={isOpen}
                    className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 text-left"
                  >
                    {isOpen
                      ? <ChevronDown className="size-4 shrink-0 text-text-3" />
                      : <ChevronRight className="size-4 shrink-0 text-text-3" />}
                    <Box className="min-w-0">
                      <Box className="flex flex-wrap items-center gap-2">
                        <Text as="span" className="text-[13.5px] font-bold text-ink">{a.title}</Text>
                        <Text
                          as="span"
                          className={cn(
                            "chip",
                            a.link_type === "course" ? "chip-progress"
                              : a.link_type === "none" ? "chip-warning" : "chip-idle",
                          )}
                        >
                          {LINK_LABEL[a.link_type] ?? a.link_type}
                          {where ? `: ${where}` : ""}
                        </Text>
                        {a.is_active !== 1 && (
                          <Text as="span" className="chip chip-idle">Hidden</Text>
                        )}
                      </Box>
                      <Text as="p" className="mt-0.5 text-[11.5px] text-text-3">
                        {a.questions_count} question{a.questions_count === 1 ? "" : "s"}
                        {a.total_marks > 0 && ` · ${a.total_marks} mark${a.total_marks === 1 ? "" : "s"}`}
                        {` · pass at ${a.passing_score}%`}
                        {a.attempts_count > 0 && ` · ${a.attempts_count} attempts`}
                      </Text>
                    </Box>
                  </button>
                  <Box className="flex shrink-0 items-center gap-1">
                    <SmallBtn icon={Pencil} label="Edit assessment"
                      onClick={() => { setEditing(a); setDialogOpen(true); }} />
                    <SmallBtn icon={Trash2} label="Delete assessment" danger
                      onClick={() => setConfirm(a)} />
                  </Box>
                </Box>

                {isOpen && (
                  <Box className="border-t border-line bg-surface-2 p-4">
                    {a.attempts_count > 0 && (
                      <Box className="mb-3 border border-warning/40 bg-[color-mix(in_oklab,var(--spectra-warning)_8%,transparent)] px-3 py-2">
                        <Text as="p" className="text-[11.5px] text-text-2">
                          {a.attempts_count} learner{a.attempts_count === 1 ? " has" : "s have"} already
                          sat this. Changing a question does not re-score attempts already taken.
                        </Text>
                      </Box>
                    )}

                    {!detail ? (
                      <Text as="p" className="py-4 text-center text-[12px] text-text-3">Loading…</Text>
                    ) : (
                      <Box className="space-y-2">
                        {detail.questions.length === 0 && (
                          <Text as="p" className="py-3 text-center text-[12px] italic text-text-3">
                            No questions yet.
                          </Text>
                        )}
                        {detail.questions.map((q, i) => (
                          <QuestionRow
                            key={q.id} question={q} index={i}
                            onEdit={() => { setQEditing(q); setQOpen(true); }}
                            onDelete={() => setQConfirm(q)}
                          />
                        ))}
                        <Button
                          variant="outline"
                          onClick={() => { setQEditing(null); setQOpen(true); }}
                          className="h-8 w-full gap-1.5 rounded-none border-dashed text-[12.5px]"
                        >
                          <Plus className="size-3.5" />Add question
                        </Button>
                      </Box>
                    )}
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
      )}

      <AssessmentDialog
        open={dialogOpen} onOpenChange={setDialogOpen}
        courseId={courseId} editing={editing}
        modules={modules} lessons={lessons}
        onSaved={refreshAll}
      />

      <QuestionDialog
        open={qOpen} onOpenChange={setQOpen}
        assessmentId={expanded} editing={qEditing}
        onSaved={refreshAll}
      />

      <AlertDialog open={!!confirm} onOpenChange={(o) => { if (!o) setConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete assessment</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{confirm?.title}</strong>, its {confirm?.questions_count} question
              {confirm?.questions_count === 1 ? "" : "s"}
              {confirm?.attempts_count > 0 && <> and {confirm.attempts_count} learner attempt
                {confirm.attempts_count === 1 ? "" : "s"}</>} will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={removeAssessment} disabled={busy}
              className="bg-danger text-white hover:bg-danger/90">
              {busy ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!qConfirm} onOpenChange={(o) => { if (!o) setQConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete question</AlertDialogTitle>
            <AlertDialogDescription>
              This question and its answers will be removed from the assessment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={removeQuestion} disabled={busy}
              className="bg-danger text-white hover:bg-danger/90">
              {busy ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Box>
  );
}

/* ── One question, read-only ───────────────────────────────────────────── */

function QuestionRow({ question, index, onEdit, onDelete }) {
  const type = questionTypeOf(question.question_type);
  const optionBacked = isOptionBacked(question.question_type);

  return (
    <Box className="border border-line bg-surface px-3 py-2.5">
      <Box className="flex items-start gap-2.5">
        <Text as="span" className="mt-0.5 shrink-0 font-mono text-[11px] font-bold text-text-3">
          Q{index + 1}
        </Text>
        <Box className="min-w-0 flex-1">
          <Text as="p" className="text-[12.5px] font-semibold leading-snug text-ink">
            {question.question_text}
          </Text>
          <Text as="p" className="mt-0.5 text-[10.5px] text-text-3">
            {type?.label ?? question.question_type} · {question.marks} mark
            {question.marks === 1 ? "" : "s"}
          </Text>

          {optionBacked ? (
            <Box className="mt-2 grid gap-1 sm:grid-cols-2">
              {question.options.map((o) => {
                const correct = o.is_correct === 1 || o.is_correct === true;
                return (
                  <Box
                    key={o.id}
                    className={cn(
                      "flex items-center gap-1.5 border px-2 py-1 text-[11.5px]",
                      correct
                        ? "border-success/40 bg-success/10 font-semibold text-success"
                        : "border-line bg-surface-2 text-text-2",
                    )}
                  >
                    {correct
                      ? <CheckCircle2 className="size-3 shrink-0" />
                      : <Circle className="size-3 shrink-0 opacity-40" />}
                    <Text as="span" className="truncate">{o.option_text}</Text>
                  </Box>
                );
              })}
            </Box>
          ) : (
            <Box className="mt-2 border border-success/40 bg-success/10 px-2 py-1">
              <Text as="p" className="text-[10px] uppercase tracking-wide text-text-3">
                Expected answer
              </Text>
              <Text as="p" className="font-mono text-[11.5px] text-success">
                {question.correct_answer || "—"}
              </Text>
            </Box>
          )}
        </Box>
        <Box className="flex shrink-0 items-center gap-1">
          <SmallBtn icon={Pencil} label="Edit question" onClick={onEdit} />
          <SmallBtn icon={Trash2} label="Delete question" danger onClick={onDelete} />
        </Box>
      </Box>
    </Box>
  );
}

/* ── Assessment create / edit ──────────────────────────────────────────── */

const EMPTY_ASSESSMENT = {
  title: "", description: "", passing_score: 60,
  link_type: "course", module_id: "", lesson_id: "", is_active: false,
};

function AssessmentDialog({ open, onOpenChange, courseId, editing, modules, lessons, onSaved }) {
  const [form, setForm] = useState(EMPTY_ASSESSMENT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(editing
      ? {
          title: editing.title ?? "",
          description: editing.description ?? "",
          passing_score: editing.passing_score ?? 60,
          link_type: editing.link_type ?? "course",
          module_id: editing.module_id ? String(editing.module_id) : "",
          lesson_id: editing.lesson_id ? String(editing.lesson_id) : "",
          is_active: editing.is_active !== 0,
        }
      : EMPTY_ASSESSMENT);
  }, [open, editing]);

  // Only placed lessons can carry an assessment: a staged lesson is not
  // delivered, so an assessment hung on one would be unreachable.
  const placedLessons = lessons.filter((l) => !l.staged);
  const linkMeta = ASSESSMENT_LINK_TYPES.find((t) => t.key === form.link_type);

  async function save() {
    if (!form.title.trim()) { setError("Assessment title is required"); return; }
    if (form.link_type === "module" && !form.module_id) {
      setError("Choose the module to attach this to."); return;
    }
    if (form.link_type === "lesson" && !form.lesson_id) {
      setError("Choose the lesson to attach this to."); return;
    }
    const score = Number(form.passing_score);
    if (!(score >= 0 && score <= 100)) {
      setError("Pass mark must be between 0 and 100."); return;
    }

    setSaving(true); setError(null);
    try {
      const data = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        passing_score: score,
        is_active: form.is_active,
        link_type: form.link_type,
        module_id: form.link_type === "module" ? Number(form.module_id) : null,
        lesson_id: form.link_type === "lesson" ? Number(form.lesson_id) : null,
      };
      if (editing) await updateAssessment({ assessmentId: editing.id, data });
      else await createAssessment({ courseId, data });
      onOpenChange(false);
      await onSaved();
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit assessment" : "Add assessment"}</DialogTitle>
        </DialogHeader>

        <Box className="space-y-4">
          <Box className="space-y-1.5">
            <Label>Title <Text as="span" className="text-danger">*</Text></Label>
            <Input
              value={form.title} maxLength={100}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="e.g. Module 1 knowledge check"
            />
          </Box>
          <DescriptionField
            value={form.description}
            onChange={(v) => setForm((p) => ({ ...p, description: v }))}
          />

          <Box className="space-y-1.5">
            <Label>Where it sits <Text as="span" className="text-danger">*</Text></Label>
            <Select
              value={form.link_type}
              onValueChange={(v) => setForm((p) => ({ ...p, link_type: v, module_id: "", lesson_id: "" }))}
            >
              {/* SelectValue shows the raw value unless given children. */}
              <SelectTrigger>
                <SelectValue>{linkMeta?.label ?? form.link_type}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {ASSESSMENT_LINK_TYPES.map((t) => (
                  <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {linkMeta && <Text as="p" className="text-[10.5px] text-text-3">{linkMeta.hint}</Text>}
          </Box>

          {form.link_type === "module" && (
            <Box className="space-y-1.5">
              <Label>Module <Text as="span" className="text-danger">*</Text></Label>
              <Select
                value={form.module_id}
                onValueChange={(v) => setForm((p) => ({ ...p, module_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={modules.length ? "Choose a module" : "No modules yet"}>
                    {modules.find((m) => String(m.id) === form.module_id)?.title}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {modules.map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>{m.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Box>
          )}

          {form.link_type === "lesson" && (
            <Box className="space-y-1.5">
              <Label>Lesson <Text as="span" className="text-danger">*</Text></Label>
              <Select
                value={form.lesson_id}
                onValueChange={(v) => setForm((p) => ({ ...p, lesson_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={placedLessons.length ? "Choose a lesson" : "No placed lessons yet"}>
                    {placedLessons.find((l) => String(l.id) === form.lesson_id)?.title}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {placedLessons.map((l) => (
                    <SelectItem key={l.id} value={String(l.id)}>
                      {l.module_title ? `${l.module_title} — ${l.title}` : l.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Text as="p" className="text-[10.5px] text-text-3">
                Staged lessons are not listed — nothing delivers them, so an
                assessment on one could never be reached.
              </Text>
            </Box>
          )}

          <Box className="grid gap-3 sm:grid-cols-2">
            <Box className="space-y-1.5">
              <Label>Pass mark (%)</Label>
              <Input
                type="number" min="0" max="100" value={form.passing_score}
                onChange={(e) => setForm((p) => ({ ...p, passing_score: e.target.value }))}
              />
            </Box>
            {/* Only on edit. A new assessment is created hidden by the API on
                purpose — a half-built quiz must not reach a learner — so a
                switch here would be a control that does nothing. */}
            {editing ? (
              <Box className="flex items-center justify-between gap-3 border border-line bg-surface-2 px-3 py-2.5">
                <Box className="min-w-0">
                  <Text as="p" className="text-[13px] font-semibold text-ink">Live</Text>
                  <Text as="p" className="text-[11px] text-text-3">Deliver it to learners.</Text>
                </Box>
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm((p) => ({ ...p, is_active: v }))}
                />
              </Box>
            ) : (
              <Box className="flex items-center border border-line bg-surface-2 px-3 py-2.5">
                <Text as="p" className="text-[11.5px] leading-relaxed text-text-2">
                  It starts hidden. Write the questions, then turn it live from
                  its Edit dialog.
                </Text>
              </Box>
            )}
          </Box>

          {error && (
            <Box className="border border-danger/30 bg-danger/10 px-3 py-2">
              <Text as="p" className="text-[12.5px] text-danger">{error}</Text>
            </Box>
          )}
        </Box>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving}
            className="bg-navy text-accent-soft hover:bg-accent-blue hover:text-white">
            {saving ? "Saving…" : editing ? "Save changes" : "Add assessment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Question create / edit ────────────────────────────────────────────────
   Five types across two storage shapes. Which editor appears is read from the
   catalogue, not from a chain of `if (type === ...)`, so the browser cannot
   require something different from what the API validates.
──────────────────────────────────────────────────────────────────────────── */

const BLANK_OPTIONS = [
  { option_text: "", is_correct: true },
  { option_text: "", is_correct: false },
  { option_text: "", is_correct: false },
  { option_text: "", is_correct: false },
];

const EMPTY_QUESTION = {
  question_text: "", question_type: "mcq", marks: 1,
  correct_answer: "", options: BLANK_OPTIONS,
};

function QuestionDialog({ open, onOpenChange, assessmentId, editing, onSaved }) {
  const [form, setForm] = useState(EMPTY_QUESTION);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(editing
      ? {
          question_text: editing.question_text ?? "",
          question_type: editing.question_type ?? "mcq",
          marks: editing.marks ?? 1,
          correct_answer: editing.correct_answer ?? "",
          options: editing.options?.length
            ? editing.options.map((o) => ({
                option_text: o.option_text,
                is_correct: o.is_correct === 1 || o.is_correct === true,
              }))
            : BLANK_OPTIONS,
        }
      : EMPTY_QUESTION);
  }, [open, editing]);

  const type = questionTypeOf(form.question_type);
  const optionBacked = isOptionBacked(form.question_type);

  /** Switching type rebuilds the answer editor, because the two shapes cannot
   *  carry each other's data — True/False in particular owns its options. */
  function changeType(next) {
    const meta = questionTypeOf(next);
    setForm((p) => ({
      ...p,
      question_type: next,
      options: meta?.fixedOptions
        ? meta.fixedOptions.map((t, i) => ({ option_text: t, is_correct: i === 0 }))
        : p.options?.length ? p.options : BLANK_OPTIONS,
    }));
  }

  function setOption(i, patch) {
    setForm((p) => ({
      ...p,
      options: p.options.map((o, idx) => (idx === i ? { ...o, ...patch } : o)),
    }));
  }

  function markCorrect(i) {
    setForm((p) => ({
      ...p,
      options: p.options.map((o, idx) =>
        type?.multipleCorrect
          ? (idx === i ? { ...o, is_correct: !o.is_correct } : o)
          : { ...o, is_correct: idx === i }),
    }));
  }

  async function save() {
    if (!form.question_text.trim()) { setError("Question text is required"); return; }

    let options;
    if (optionBacked) {
      options = form.options.filter((o) => o.option_text.trim());
      if (options.length < 2) { setError("Give the question at least two options."); return; }
      const correct = options.filter((o) => o.is_correct).length;
      if (correct === 0) { setError("Mark which option is correct."); return; }
      if (type?.multipleCorrect && correct < 2) {
        setError("A multiple-select question needs at least two correct options — use Multiple choice for one.");
        return;
      }
      if (!type?.multipleCorrect && correct > 1) {
        setError("Only one option can be correct for this type."); return;
      }
    } else if (!form.correct_answer.trim()) {
      setError(form.question_type === "matching"
        ? "Enter the pairs, one per line as `left = right`."
        : "Enter the answer the learner is expected to type.");
      return;
    }

    setSaving(true); setError(null);
    try {
      const data = {
        question_text: form.question_text.trim(),
        question_type: form.question_type,
        marks: Number(form.marks) || 1,
        ...(optionBacked
          ? { options: options.map((o) => ({ option_text: o.option_text.trim(), is_correct: o.is_correct })) }
          : { correct_answer: form.correct_answer.trim() }),
      };
      if (editing) await updateQuestion({ questionId: editing.id, data });
      else await addQuestion({ assessmentId, data });
      onOpenChange(false);
      await onSaved();
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit question" : "Add question"}</DialogTitle>
        </DialogHeader>

        <Box className="space-y-4">
          <Box className="grid gap-3 sm:grid-cols-[1fr_100px]">
            <Box className="space-y-1.5">
              <Label>Question type</Label>
              <Select value={form.question_type} onValueChange={changeType}>
                <SelectTrigger>
                  <SelectValue>{type?.label ?? form.question_type}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {QUESTION_TYPES.map((t) => (
                    <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {type && <Text as="p" className="text-[10.5px] text-text-3">{type.hint}</Text>}
            </Box>
            <Box className="space-y-1.5">
              <Label>Marks</Label>
              <Input
                type="number" min="1" value={form.marks}
                onChange={(e) => setForm((p) => ({ ...p, marks: e.target.value }))}
              />
            </Box>
          </Box>

          <Box className="space-y-1.5">
            <Label>Question <Text as="span" className="text-danger">*</Text></Label>
            <Textarea
              rows={2} value={form.question_text}
              onChange={(e) => setForm((p) => ({ ...p, question_text: e.target.value }))}
              placeholder="What do you want to ask?"
            />
          </Box>

          {optionBacked ? (
            <Box className="space-y-2">
              <Box className="flex items-center justify-between">
                <Label>
                  Options <Text as="span" className="text-danger">*</Text>
                </Label>
                <Text as="span" className="text-[10.5px] text-text-3">
                  {type?.multipleCorrect ? "Tick every correct option" : "Tick the correct option"}
                </Text>
              </Box>

              {form.options.map((opt, i) => {
                const fixed = Boolean(type?.fixedOptions);
                return (
                  <Box
                    key={i}
                    className={cn(
                      "flex items-center gap-2 border px-2 py-1.5",
                      opt.is_correct ? "border-success/50 bg-success/10" : "border-line bg-surface-2",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => markCorrect(i)}
                      aria-label={opt.is_correct ? "Correct answer" : "Mark as correct"}
                      className="shrink-0 cursor-pointer"
                    >
                      {opt.is_correct
                        ? <CheckCircle2 className="size-4 text-success" />
                        : <Circle className="size-4 text-text-3" />}
                    </button>
                    <Input
                      value={opt.option_text}
                      readOnly={fixed}
                      onChange={(e) => setOption(i, { option_text: e.target.value })}
                      placeholder={`Option ${i + 1}`}
                      className={cn(
                        "h-8 flex-1 border-0 bg-transparent p-0 text-[12.5px] shadow-none focus-visible:ring-0",
                        opt.is_correct && "font-semibold text-success",
                      )}
                    />
                    {!fixed && form.options.length > 2 && (
                      <button
                        type="button"
                        aria-label="Remove option"
                        onClick={() => setForm((p) => ({
                          ...p, options: p.options.filter((_, idx) => idx !== i),
                        }))}
                        className="shrink-0 cursor-pointer text-text-3 hover:text-danger"
                      >
                        <X className="size-3.5" />
                      </button>
                    )}
                  </Box>
                );
              })}

              {!type?.fixedOptions && form.options.length < 8 && (
                <Button
                  variant="outline"
                  onClick={() => setForm((p) => ({
                    ...p, options: [...p.options, { option_text: "", is_correct: false }],
                  }))}
                  className="h-7 w-full gap-1.5 rounded-none border-dashed text-[11.5px]"
                >
                  <Plus className="size-3" />Add option
                </Button>
              )}
            </Box>
          ) : (
            <Box className="space-y-1.5">
              <Label>
                {form.question_type === "matching" ? "Pairs" : "Expected answer"}
                <Text as="span" className="text-danger"> *</Text>
              </Label>
              <Textarea
                rows={form.question_type === "matching" ? 4 : 2}
                value={form.correct_answer}
                onChange={(e) => setForm((p) => ({ ...p, correct_answer: e.target.value }))}
                placeholder={form.question_type === "matching"
                  ? "Scope = What is included\nSchedule = When it happens"
                  : "The answer, as the learner should type it"}
                className="font-mono text-[12px]"
              />
              <Text as="p" className="text-[10.5px] text-text-3">
                {form.question_type === "matching"
                  ? "One pair per line, left and right separated by ="
                  : "Matched case-insensitively, with surrounding spaces ignored."}
              </Text>
            </Box>
          )}

          {error && (
            <Box className="border border-danger/30 bg-danger/10 px-3 py-2">
              <Text as="p" className="text-[12.5px] text-danger">{error}</Text>
            </Box>
          )}
        </Box>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving}
            className="bg-navy text-accent-soft hover:bg-accent-blue hover:text-white">
            {saving ? "Saving…" : editing ? "Save changes" : "Add question"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SmallBtn({ icon: Icon, label, onClick, danger = false }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "flex size-7 cursor-pointer items-center justify-center border border-line bg-surface text-text-2 transition-colors",
        danger ? "hover:bg-danger hover:text-white" : "hover:bg-accent-blue hover:text-white",
      )}
    >
      <Icon className="size-3.5" />
    </button>
  );
}
