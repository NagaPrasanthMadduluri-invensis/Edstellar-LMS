"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlignLeft,
  ArrowDown,
  ArrowUp,
  CircleDot,
  Lock,
  MessageSquare,
  Plus,
  Star,
  ToggleLeft,
  Trash2,
  Type,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { ApiError } from "@/lib/api-client";
import {
  FEEDBACK_QUESTION_TYPES,
  FEEDBACK_QUESTION_TYPE_IDS,
  LIKERT_SCALE,
  MAX_TEMPLATE_QUESTIONS,
  questionTypeLabel,
} from "@/lib/feedback-questions";
import {
  createSurveyTemplate,
  deleteSurveyTemplate,
  fetchSurveyResponses,
  fetchSurveyTemplate,
  fetchSurveyTemplates,
  updateSurveyTemplate,
} from "@/services/api/surveys-api";

import Box from "@/components/ui/box";
import Text from "@/components/ui/text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DescriptionField } from "@/components/shared/description-field";

/**
 * Surveys & Feedback.
 *
 * Two tabs over one subject: the FORMS an admin writes, and the ANSWERS
 * learners gave. They are one page because editing a question and reading
 * what it collected are the same job seen from two ends — and because the
 * response count on a template card is the thing that makes an admin click
 * through.
 *
 * Three templates are seeded per organization and cannot be deleted: a
 * course's CATEGORY resolves to one of them by key (Technical → technical,
 * Compliance → compliance, everything else → standard), so deleting one would
 * leave every course in its category resolving to nothing. Their questions
 * and their wording are fully editable, which is what the owner asked for.
 *
 * WHICH form a given course shows is answered by the API, never recomputed
 * here — a second copy of the resolution rule would be free to drift from the
 * one the learner actually gets.
 */

/** Lucide names from the catalogue, mapped here — the catalogue stays data
 *  (§10.3.1.6). `Type` is the text icon and does not shadow anything. */
const QUESTION_ICON = {
  Star,
  AlignLeft,
  CircleDot,
  ToggleLeft,
  Type,
};

const TABS = [
  { key: "templates", label: "Templates" },
  { key: "responses", label: "Responses" },
];

const EMPTY_QUESTION = {
  question_type: "rating",
  prompt: "",
  options: [],
  is_required: false,
};

export function AdminSurveysContent() {
  const [tab, setTab] = useState("templates");
  const [templates, setTemplates] = useState(null);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchSurveyTemplates();
      setTemplates(data.templates || []);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load templates");
      setTemplates([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function openEditor(templateId) {
    try {
      const data = await fetchSurveyTemplate(templateId);
      setEditing(data.template);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not open that form");
    }
  }

  function openCreate() {
    setEditing({
      id: null,
      key: null,
      name: "",
      description: "",
      is_system: false,
      is_active: true,
      questions: [{ ...EMPTY_QUESTION }],
    });
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await deleteSurveyTemplate(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete that form");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Box className="space-y-4">
      {error && (
        <Box className="border border-danger/40 bg-danger/10 px-3 py-2">
          <Text as="p" className="text-[13px] text-danger">{error}</Text>
        </Box>
      )}

      <Box className="flex border border-line bg-surface-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "flex-1 cursor-pointer border-b-2 px-3 py-2.5 text-[13px] transition-colors",
              tab === t.key
                ? "border-navy bg-surface font-bold text-ink"
                : "border-transparent font-semibold text-text-3 hover:bg-surface hover:text-ink",
            )}
          >
            {t.label}
          </button>
        ))}
      </Box>

      {tab === "templates" && (
        <TemplatesTab
          templates={templates}
          onEdit={openEditor}
          onCreate={openCreate}
          onDelete={setDeleteTarget}
        />
      )}
      {tab === "responses" && <ResponsesTab />}

      {editing && (
        <TemplateEditor
          template={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await load();
          }}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <Box className="space-y-2 text-[13px]">
                <Text as="p">
                  {deleteTarget?.course_count
                    ? `${deleteTarget.course_count} course${deleteTarget.course_count === 1 ? "" : "s"} point at this form. They go back to the form their category implies — they do not lose their feedback setting.`
                    : "No course points at this form."}
                </Text>
                <Text as="p">
                  {deleteTarget?.response_count
                    ? `${deleteTarget.response_count} answer${deleteTarget.response_count === 1 ? "" : "s"} already given stay, but the questions they answered do not — they will read as "a question that has since been changed".`
                    : "Nothing has been answered on it."}
                </Text>
              </Box>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              disabled={busy}
              className="bg-danger text-white hover:bg-danger/90"
            >
              {busy ? "Deleting…" : "Delete form"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Box>
  );
}

/* ───────────────────────────── Templates ───────────────────────────── */

function TemplatesTab({ templates, onEdit, onCreate, onDelete }) {
  if (!templates) {
    return (
      <Box className="grid gap-3 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-44 w-full" />
        ))}
      </Box>
    );
  }

  return (
    <Box className="space-y-3">
      <Box className="flex items-center justify-between">
        <Text as="p" className="text-[13px] text-text-2">
          {templates.length} form{templates.length === 1 ? "" : "s"} · a course
          uses the one its category implies unless you pick another on the
          course itself.
        </Text>
        <Button size="sm" onClick={onCreate} className="cursor-pointer">
          <Plus className="mr-1.5 size-4" /> New form
        </Button>
      </Box>

      <Box className="grid gap-3 lg:grid-cols-3">
        {templates.map((t) => (
          <TemplateCard key={t.id} template={t} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </Box>
    </Box>
  );
}

function TemplateCard({ template, onEdit, onDelete }) {
  return (
    <Box className="flex flex-col border border-line bg-surface">
      <Box className="flex items-start justify-between gap-2 border-b border-line px-3 py-2.5">
        <Box className="min-w-0">
          <Text as="h3" className="truncate text-[13px] font-bold text-ink">
            {template.name}
          </Text>
          <Text as="p" className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-text-3">
            {template.categories.length > 0
              ? template.categories.join(" · ")
              : "Only on courses that pick it"}
          </Text>
        </Box>
        {template.is_system ? (
          <Badge variant="outline" className="shrink-0 gap-1 text-[10px]">
            <Lock className="size-3" /> Built in
          </Badge>
        ) : null}
      </Box>

      <Box className="flex-1 px-3 py-2.5">
        <Text as="p" className="line-clamp-2 min-h-[2.75rem] text-[12px] leading-relaxed text-text-2">
          {template.description || ""}
        </Text>
        <Box className="mt-2 grid grid-cols-3 gap-2 border-t border-line pt-2">
          <Stat label="Questions" value={template.question_count} />
          <Stat label="Courses" value={template.course_count || "—"} />
          <Stat label="Answers" value={template.response_count || "—"} />
        </Box>
      </Box>

      <Box className="flex gap-2 border-t border-line px-3 py-2">
        <Button
          size="sm"
          variant="outline"
          className="flex-1 cursor-pointer"
          onClick={() => onEdit(template.id)}
        >
          Edit questions
        </Button>
        <Button
          size="icon"
          variant="outline"
          className={cn(
            "size-8 cursor-pointer",
            template.is_system && "cursor-not-allowed opacity-50",
          )}
          disabled={template.is_system}
          onClick={() => onDelete(template)}
          title={
            template.is_system
              ? "Built-in forms cannot be deleted — every course in their category resolves to them"
              : `Delete ${template.name}`
          }
          aria-label={
            template.is_system
              ? "Built-in forms cannot be deleted"
              : `Delete ${template.name}`
          }
        >
          <Trash2 className="size-4" />
        </Button>
      </Box>
    </Box>
  );
}

function Stat({ label, value }) {
  return (
    <Box>
      <Text as="p" className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-3">
        {label}
      </Text>
      <Text as="p" className="text-[15px] font-bold text-ink">{value}</Text>
    </Box>
  );
}

/* ───────────────────────── The question builder ─────────────────────── */

function TemplateEditor({ template, onClose, onSaved }) {
  const [name, setName] = useState(template.name);
  const [description, setDescription] = useState(template.description || "");
  const [questions, setQuestions] = useState(
    (template.questions || []).map((q) => ({
      question_type: q.question_type,
      prompt: q.prompt,
      options: q.options || [],
      is_required: !!q.is_required,
    })),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const isNew = !template.id;

  function patch(index, next) {
    setQuestions((qs) => qs.map((q, i) => (i === index ? { ...q, ...next } : q)));
  }

  function move(index, delta) {
    setQuestions((qs) => {
      const target = index + delta;
      if (target < 0 || target >= qs.length) return qs;
      const copy = [...qs];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    });
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const body = {
        name: name.trim(),
        description: description.trim() || null,
        questions: questions.map((q) => ({
          question_type: q.question_type,
          prompt: q.prompt.trim(),
          // Only `choice` carries a list; sending one on any other type would
          // store a field the learner never sees.
          ...(q.question_type === "choice"
            ? { options: q.options.map((o) => o.trim()).filter(Boolean) }
            : {}),
          is_required: !!q.is_required,
        })),
      };
      if (isNew) await createSurveyTemplate(body);
      else await updateSurveyTemplate(template.id, body);
      await onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save this form");
      setSaving(false);
    }
  }

  const blocked = useMemo(() => {
    if (!name.trim()) return "Give the form a name";
    if (questions.length === 0) return "Add at least one question";
    if (questions.some((q) => !q.prompt.trim())) return "Every question needs wording";
    if (
      questions.some(
        (q) =>
          q.question_type === "choice" &&
          q.options.map((o) => o.trim()).filter(Boolean).length < 2,
      )
    ) {
      return "A multiple choice question needs at least two choices";
    }
    return null;
  }, [name, questions]);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-2xl">
        <DialogHeader className="surface-dark px-4 py-3">
          <DialogTitle className="text-white">
            {isNew ? "New feedback form" : template.name}
          </DialogTitle>
          {template.is_system && (
            <Text as="p" className="mt-1 text-[12px] text-accent-soft">
              A built-in form. Every {template.categories.join(" and ").toLowerCase()} course
              asks it, so edits here reach all of them.
            </Text>
          )}
        </DialogHeader>

        <Box className="space-y-4 px-4 py-4">
          {error && (
            <Box className="border border-danger/40 bg-danger/10 px-3 py-2">
              <Text as="p" className="text-[13px] text-danger">{error}</Text>
            </Box>
          )}

          <Box className="space-y-1.5">
            <Text as="label" className="text-[12px] font-semibold text-ink">Form name</Text>
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
          </Box>

          <DescriptionField
            value={description}
            onChange={setDescription}
            label="What this form is for"
          />

          <Box className="space-y-2">
            <Box className="flex items-center justify-between">
              <Text as="p" className="text-[12px] font-semibold text-ink">
                Questions ({questions.length}/{MAX_TEMPLATE_QUESTIONS})
              </Text>
              <Button
                size="sm"
                variant="outline"
                className="cursor-pointer"
                disabled={questions.length >= MAX_TEMPLATE_QUESTIONS}
                onClick={() => setQuestions((qs) => [...qs, { ...EMPTY_QUESTION }])}
                title={
                  questions.length >= MAX_TEMPLATE_QUESTIONS
                    ? `${MAX_TEMPLATE_QUESTIONS} is the limit — a longer form is one nobody finishes`
                    : "Add a question"
                }
              >
                <Plus className="mr-1.5 size-4" /> Add question
              </Button>
            </Box>

            {questions.map((q, i) => (
              <QuestionRow
                key={i}
                index={i}
                question={q}
                total={questions.length}
                onPatch={(next) => patch(i, next)}
                onMove={(d) => move(i, d)}
                onRemove={() => setQuestions((qs) => qs.filter((_, j) => j !== i))}
              />
            ))}
          </Box>
        </Box>

        {/* p-0 above means the footer's own -mx-4 -mb-4 has nothing to cancel,
            so it is reset — without this the footer is 16px wider than the
            dialog and gives it a horizontal scrollbar (§10.3.1.11). */}
        <DialogFooter className="mx-0 mb-0 border-t border-line bg-surface-2 px-4 py-3">
          <Box className="mr-auto">
            {blocked && (
              <Text as="p" className="text-[12px] text-text-3">{blocked}</Text>
            )}
          </Box>
          <Button variant="outline" onClick={onClose} disabled={saving} className="cursor-pointer">
            Cancel
          </Button>
          <Button
            onClick={save}
            disabled={saving || !!blocked}
            className="cursor-pointer"
            title={blocked || undefined}
          >
            {saving ? "Saving…" : isNew ? "Create form" : "Save form"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function QuestionRow({ index, question, total, onPatch, onMove, onRemove }) {
  const def = FEEDBACK_QUESTION_TYPES[question.question_type];
  const Icon = QUESTION_ICON[def?.icon] ?? Type;

  return (
    <Box className="border border-line bg-surface-2 p-2.5">
      <Box className="flex items-start gap-2">
        <Box className="mt-1.5 flex size-7 shrink-0 items-center justify-center border border-line bg-surface">
          <Icon className="size-3.5 text-accent-blue" />
        </Box>

        <Box className="min-w-0 flex-1 space-y-2">
          <Input
            value={question.prompt}
            onChange={(e) => onPatch({ prompt: e.target.value })}
            placeholder={`Question ${index + 1}`}
            maxLength={300}
          />

          <Box className="flex flex-wrap items-center gap-2">
            <Select
              value={question.question_type}
              onValueChange={(v) =>
                onPatch({
                  question_type: v,
                  // An open text question is never required — a mandatory
                  // essay is how a form gets abandoned. The API enforces it
                  // too; this keeps the switch from lying on screen.
                  is_required: v === "text" ? false : question.is_required,
                  options: v === "choice" ? question.options : [],
                })
              }
            >
              <SelectTrigger className="h-8 w-[170px] text-[12px]">
                {/* SelectValue renders the raw value without children. */}
                <SelectValue>{questionTypeLabel(question.question_type)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {FEEDBACK_QUESTION_TYPE_IDS.map((id) => (
                  <SelectItem key={id} value={id}>
                    {FEEDBACK_QUESTION_TYPES[id].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Box className="flex items-center gap-1.5">
              <Switch
                checked={!!question.is_required}
                disabled={question.question_type === "text"}
                onCheckedChange={(v) => onPatch({ is_required: v })}
                aria-label="Required"
              />
              <Text
                as="span"
                className={cn(
                  "text-[12px]",
                  question.question_type === "text" ? "text-text-3" : "text-text-2",
                )}
                title={
                  question.question_type === "text"
                    ? "An open text question is never required"
                    : undefined
                }
              >
                Required
              </Text>
            </Box>

            <Box className="ml-auto flex items-center gap-1">
              <IconButton
                icon={ArrowUp}
                label="Move up"
                disabled={index === 0}
                onClick={() => onMove(-1)}
              />
              <IconButton
                icon={ArrowDown}
                label="Move down"
                disabled={index === total - 1}
                onClick={() => onMove(1)}
              />
              <IconButton
                icon={Trash2}
                label="Remove question"
                destructive
                onClick={onRemove}
              />
            </Box>
          </Box>

          <Text as="p" className="text-[11px] text-text-3">{def?.help}</Text>

          {question.question_type === "choice" && (
            <OptionsEditor
              options={question.options}
              onChange={(options) => onPatch({ options })}
            />
          )}
          {question.question_type === "likert" && (
            <Text as="p" className="text-[11px] text-text-3">
              Answers: {LIKERT_SCALE.join(" · ")}
            </Text>
          )}
        </Box>
      </Box>
    </Box>
  );
}

function OptionsEditor({ options, onChange }) {
  return (
    <Box className="space-y-1.5 border-l-2 border-line pl-2.5">
      {options.map((o, i) => (
        <Box key={i} className="flex items-center gap-1.5">
          <Input
            value={o}
            onChange={(e) =>
              onChange(options.map((x, j) => (j === i ? e.target.value : x)))
            }
            placeholder={`Choice ${i + 1}`}
            className="h-8 text-[12px]"
            maxLength={100}
          />
          <IconButton
            icon={X}
            label={`Remove choice ${i + 1}`}
            onClick={() => onChange(options.filter((_, j) => j !== i))}
          />
        </Box>
      ))}
      <Button
        size="sm"
        variant="outline"
        className="h-7 cursor-pointer text-[12px]"
        disabled={options.length >= 10}
        onClick={() => onChange([...options, ""])}
      >
        <Plus className="mr-1 size-3" /> Add choice
      </Button>
    </Box>
  );
}

/** A square icon action. Every one carries `title` AND `aria-label`
 *  (§10.3.1.2) — a bare glyph in a button is an unlabelled control. */
function IconButton({ icon: Icon, label, onClick, disabled, destructive }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cn(
        "flex size-7 items-center justify-center border border-line bg-surface text-text-2 transition-colors",
        disabled
          ? "cursor-not-allowed opacity-40"
          : destructive
            ? "cursor-pointer hover:border-danger hover:bg-danger hover:text-white"
            : "cursor-pointer hover:border-accent-blue hover:bg-accent-blue hover:text-white",
      )}
    >
      <Icon className="size-3.5" />
    </button>
  );
}

/* ───────────────────────────── Responses ───────────────────────────── */

function ResponsesTab() {
  const [data, setData] = useState(null);
  const [courseId, setCourseId] = useState("all");
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setData(null);
      try {
        const res = await fetchSurveyResponses({
          courseId: courseId === "all" ? undefined : Number(courseId),
        });
        if (!cancelled) {
          setData(res);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Could not load answers");
          setData({ responses: [], total: 0 });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  /**
   * The course filter is built from the responses already on screen rather
   * than from a second query, so it can never offer a course with nothing
   * behind it — the rule the KPI tiles follow (§10.3.1.8). When a filter is
   * active the list is one course, so the full set is kept from the unfiltered
   * load.
   */
  const [courses, setCourses] = useState([]);
  useEffect(() => {
    if (courseId === "all" && data?.responses) {
      const seen = new Map();
      for (const r of data.responses) seen.set(r.course_id, r.course_name);
      setCourses([...seen].map(([id, name]) => ({ id, name })));
    }
  }, [courseId, data]);

  if (!data) {
    return (
      <Box className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </Box>
    );
  }

  if (error) {
    return (
      <Box className="border border-danger/40 bg-danger/10 px-3 py-2">
        <Text as="p" className="text-[13px] text-danger">{error}</Text>
      </Box>
    );
  }

  if (data.total === 0 && courseId === "all") {
    return (
      <Box className="border border-dashed border-line-strong bg-surface px-4 py-10 text-center">
        <MessageSquare className="mx-auto size-8 text-text-3" />
        <Text as="p" className="mt-2 text-[13px] font-semibold text-ink">
          No feedback yet
        </Text>
        <Text as="p" className="mx-auto mt-1 max-w-md text-[12px] text-text-2">
          Learners are asked once they open a course that has a form. Nothing
          here holds a course back — giving feedback is never part of finishing
          one.
        </Text>
      </Box>
    );
  }

  return (
    <Box className="space-y-3">
      <Box className="flex flex-wrap items-center justify-between gap-2">
        <Text as="p" className="text-[13px] text-text-2">
          {data.total} answer{data.total === 1 ? "" : "s"}
          {" · "}
          <Text as="span" className="text-text-3">
            named, because an admin is the only person who sees these
          </Text>
        </Text>
        {courses.length > 1 && (
          <Select value={courseId} onValueChange={setCourseId}>
            <SelectTrigger className="h-8 w-[240px] text-[12px]">
              <SelectValue>
                {courseId === "all"
                  ? "All courses"
                  : (courses.find((c) => String(c.id) === courseId)?.name ??
                    "All courses")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All courses</SelectItem>
              {courses.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </Box>

      {data.responses.map((r) => (
        <ResponseCard key={r.id} response={r} />
      ))}
    </Box>
  );
}

function ResponseCard({ response }) {
  return (
    <Box className="border border-line bg-surface">
      <Box className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface-2 px-3 py-2">
        <Box className="min-w-0">
          <Text as="p" className="truncate text-[13px] font-bold text-ink">
            {response.learner_name}
            <Text as="span" className="ml-2 font-normal text-text-3">
              {response.department || "—"}
            </Text>
          </Text>
          <Text as="p" className="truncate text-[11px] text-text-2">
            {response.course_name}
            {response.template_name ? ` · ${response.template_name}` : ""}
          </Text>
        </Box>
        <Text as="p" className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-3">
          {formatDate(response.submitted_at)}
        </Text>
      </Box>

      <Box className="divide-y divide-line">
        {response.answers.map((a) => (
          <Box key={a.question_id} className="px-3 py-2">
            <Text as="p" className="text-[12px] text-text-2">{a.prompt}</Text>
            <Box className="mt-0.5">
              {a.question_type === "rating" ? (
                <RatingValue value={a.answer} />
              ) : (
                <Text
                  as="p"
                  className={cn(
                    "text-[13px]",
                    a.answer === null ? "text-text-3" : "font-semibold text-ink",
                  )}
                >
                  {a.answer === null ? "Not answered" : String(a.answer)}
                </Text>
              )}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

function RatingValue({ value }) {
  if (value === null || value === undefined) {
    return <Text as="p" className="text-[13px] text-text-3">Not answered</Text>;
  }
  return (
    <Box className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            "size-3.5",
            n <= Number(value) ? "fill-accent-blue text-accent-blue" : "text-line-strong",
          )}
        />
      ))}
      <Text as="span" className="ml-1 text-[12px] font-semibold text-ink">
        {value}/5
      </Text>
    </Box>
  );
}

/** The API sends real ISO here, so `new Date()` is safe — unlike a raw
 *  Postgres timestamp, which carries a space and a `+00` it rejects. */
function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
