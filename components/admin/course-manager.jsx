"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, BookOpen, ChevronDown, ChevronUp, ClipboardList, Clock,
  FileText, Image as ImageIcon, Layers, Link2, Package, Pencil, PlayCircle,
  Plus, Trash2, Unlink, Upload, Users, AlertTriangle,
} from "lucide-react";

import Box from "@/components/ui/box";
import Text from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
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
import { CourseAssessmentsContent } from "@/components/admin/course-assessments-content";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api-client";
import {
  createCourseLesson, createModule, deleteLesson, deleteModule,
  deleteScormPackage, fetchAssessments, fetchCourseLessons, fetchModules,
  scormSizeError, setLessonModule, updateLesson, updateModule,
  uploadScormPackage,
  presignDocument, presignNewVideo, readVideoDuration,
  uploadToR2,
} from "@/services/api/admin/admin-api";
import { documentMimeFor, formatBytes } from "@/components/admin/lesson-resources-fields";
import {
  CONTENT_TYPE_ICON, LESSON_CONTENT_TYPES, OFFICE_GUIDANCE, contentTypeOf,
  durationRequiredFor,
} from "@/lib/lesson-content";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "modules", label: "Modules" },
  { key: "lessons", label: "Lessons" },
  { key: "assessments", label: "Assessments" },
  { key: "outline", label: "Outline" },
];

const ICONS = {
  video: PlayCircle, file: FileText, image: ImageIcon,
  link: Link2, package: Package, users: Users, clipboard: ClipboardList,
};

function LessonIcon({ contentType, className }) {
  const Icon = ICONS[CONTENT_TYPE_ICON[contentType] ?? "file"] ?? FileText;
  return <Icon className={className} />;
}

function formatDuration(minutes) {
  if (!minutes) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

/* ══════════════════════════════════════════════════════════════════════════
   The page
   ══════════════════════════════════════════════════════════════════════════ */

export function CourseManager({ courseId }) {
  const { user } = useAuth();
  const [tab, setTab] = useState("modules");

  const [course, setCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [error, setError] = useState(null);

  /**
   * One load for the whole page.
   *
   * Every tab reads the same four things — the Outline needs all of them at
   * once, and the Lessons tab needs modules for its link dropdown — so
   * fetching per tab would mean the outline could disagree with the list the
   * admin just edited.
   */
  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [c, m, l, a] = await Promise.all([
        apiClient(`/api/admin/courses/${courseId}`),
        fetchModules({ courseId }),
        fetchCourseLessons({ courseId }),
        fetchAssessments({ courseId }),
      ]);
      setCourse(c.course);
      setModules(m.modules ?? []);
      setLessons(l.lessons ?? []);
      setAssessments(a.assessments ?? []);
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  }, [user, courseId]);

  useEffect(() => { load(); }, [load]);

  const staged = useMemo(() => lessons.filter((l) => l.staged), [lessons]);
  const placed = useMemo(() => lessons.filter((l) => !l.staged), [lessons]);

  if (error) {
    return (
      <Box className="border border-line bg-surface px-4 py-10 text-center">
        <Text as="p" className="text-sm text-danger">{error}</Text>
        <Button size="sm" variant="outline" className="mt-3" onClick={load}>Retry</Button>
      </Box>
    );
  }
  if (!course) {
    return (
      <Box className="space-y-4">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-[110px] w-full" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-[320px] w-full" />
      </Box>
    );
  }

  const isSessionTraining = Boolean(course.session_id);

  return (
    <Box className="space-y-4">
      {/* ── Course header card ── */}
      <Box className="flex flex-wrap items-start gap-4 border border-line bg-surface px-5 py-4">
        <Box className="flex size-12 shrink-0 items-center justify-center border border-line bg-surface-3 text-text-2">
          <Layers className="size-5" />
        </Box>
        <Box className="min-w-0 flex-1">
          <Box className="flex flex-wrap items-center gap-2.5">
            <Text as="h2" className="text-[16px] font-bold text-ink">{course.name}</Text>
            <Text
              as="span"
              className={course.is_active ? "chip chip-complete" : "chip chip-warning"}
            >
              {course.is_active ? "Published" : "Draft"}
            </Text>
            {course.category && (
              <Text as="span" className="chip chip-idle">{course.category}</Text>
            )}
            {isSessionTraining && (
              <Text as="span" className="chip chip-progress">Session training</Text>
            )}
          </Box>
          {course.description && (
            <Text as="p" className="mt-1 text-[12.5px] text-text-2">{course.description}</Text>
          )}
          <Box className="mt-2.5 flex flex-wrap gap-4 text-[12px] text-text-3">
            <Text as="span" className="inline-flex items-center gap-1.5">
              <Layers className="size-3.5" />{modules.length} modules
            </Text>
            <Text as="span" className="inline-flex items-center gap-1.5">
              <PlayCircle className="size-3.5" />{placed.length} lessons
              {staged.length > 0 && (
                <Text as="span" className="text-warning">· {staged.length} staged</Text>
              )}
            </Text>
            <Text as="span" className="inline-flex items-center gap-1.5">
              <ClipboardList className="size-3.5" />{assessments.length} assessment{assessments.length === 1 ? "" : "s"}
            </Text>
            <Text as="span" className="inline-flex items-center gap-1.5">
              <Users className="size-3.5" />{course.enrolled_count ?? 0} enrolled
            </Text>
          </Box>
        </Box>

        {/* Edits go back to the library's editor rather than a second copy of
            the same form — see the `?edit=` handler in course-library.jsx. */}
        <Link
          href={`/admin/courses?edit=${courseId}`}
          className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 border border-line-strong bg-surface px-3.5 py-2 text-[12.5px] font-semibold text-ink transition-colors hover:bg-accent-blue hover:text-white"
        >
          <Pencil className="size-3.5" />
          Edit course
        </Link>
      </Box>

      {isSessionTraining && (
        <Box className="flex items-start gap-2.5 border border-line bg-surface-2 px-4 py-3">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
          <Text as="p" className="text-[12px] leading-relaxed text-text-2">
            This course is generated from a live session and is kept in step with
            it. Editing its modules or lessons here is refused — change the
            session instead, in Sessions &amp; Attendance.
          </Text>
        </Box>
      )}

      {/* ── Tabs ── */}
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

      {tab === "modules" && (
        <ModulesTab
          courseId={courseId} modules={modules} lessons={lessons}
          locked={isSessionTraining} onChanged={load}
        />
      )}
      {tab === "lessons" && (
        <LessonsTab
          courseId={courseId} modules={modules} lessons={lessons}
          locked={isSessionTraining} onChanged={load}
        />
      )}
      {tab === "assessments" && (
        <CourseAssessmentsContent
          courseId={courseId} modules={modules} lessons={lessons}
          onChanged={load}
        />
      )}
      {tab === "outline" && (
        <OutlineTab modules={modules} lessons={lessons} assessments={assessments} />
      )}
    </Box>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Modules
   ══════════════════════════════════════════════════════════════════════════ */

function ModulesTab({ courseId, modules, lessons, locked, onChanged }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: "", description: "", is_active: true });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  const lessonsIn = (moduleId) => lessons.filter((l) => l.module_id === moduleId);

  function openCreate() {
    setEditing(null);
    setForm({ title: "", description: "", is_active: true });
    setFormError(null);
    setOpen(true);
  }
  function openEdit(m) {
    setEditing(m);
    setForm({ title: m.title, description: m.description ?? "", is_active: m.is_active !== 0 });
    setFormError(null);
    setOpen(true);
  }

  async function save() {
    if (!form.title.trim()) { setFormError("Module title is required"); return; }
    setSaving(true); setFormError(null);
    try {
      const data = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        is_active: form.is_active,
      };
      if (editing) await updateModule({ moduleId: editing.id, data });
      else await createModule({ courseId, data });
      setOpen(false);
      await onChanged();
    } catch (e) { setFormError(e.message); } finally { setSaving(false); }
  }

  async function remove() {
    setBusy(true);
    try {
      await deleteModule({ moduleId: confirm.id });
      setConfirm(null);
      await onChanged();
    } catch (e) { setFormError(e.message); } finally { setBusy(false); }
  }

  /**
   * Swap a module with its neighbour.
   *
   * Two writes rather than a reorder endpoint, because a swap only ever
   * touches two rows and the pair is what the admin actually asked for. Each
   * send carries the module's own title and description as well — `PUT` is a
   * replace, so omitting them would blank what it is not moving.
   */
  async function move(index, delta) {
    const a = modules[index];
    const b = modules[index + delta];
    if (!a || !b) return;
    setBusy(true); setFormError(null);
    try {
      const body = (m, sortOrder) => ({
        moduleId: m.id,
        data: {
          title: m.title,
          description: m.description ?? null,
          is_active: m.is_active !== 0,
          sort_order: sortOrder,
        },
      });
      await updateModule(body(a, b.sort_order));
      await updateModule(body(b, a.sort_order));
      await onChanged();
    } catch (e) { setFormError(e.message); } finally { setBusy(false); }
  }

  return (
    <Box className="space-y-3">
      <Box className="flex items-center justify-between">
        <Text as="p" className="text-[12px] text-text-3">
          {modules.length} module{modules.length === 1 ? "" : "s"}
        </Text>
        <Button
          onClick={openCreate}
          disabled={locked}
          className="h-8 gap-1.5 rounded-none bg-navy px-3 text-[12.5px] font-bold text-accent-soft hover:bg-accent-blue hover:text-white"
        >
          <Plus className="size-3.5" />Add module
        </Button>
      </Box>

      {modules.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No modules yet"
          body="Modules group the lessons in this course. Add one, then link lessons to it from the Lessons tab."
        />
      ) : (
        <Box className="space-y-2">
          {modules.map((m, index) => {
            const inside = lessonsIn(m.id);
            const minutes = inside.reduce((a, l) => a + Number(l.duration_minutes ?? 0), 0);
            return (
              <Box key={m.id} className="border border-line bg-surface">
                <Box className="flex flex-wrap items-start gap-3 px-4 py-3">
                  {/* Buttons, not a drag handle. A handle that cannot be
                      dragged is a control that lies, and up/down is keyboard
                      reachable besides. */}
                  <Box className="mt-0.5 flex shrink-0 flex-col">
                    <IconBtn
                      icon={ChevronUp} label="Move up" small
                      onClick={() => move(index, -1)}
                      disabled={locked || busy || index === 0}
                    />
                    <IconBtn
                      icon={ChevronDown} label="Move down" small
                      onClick={() => move(index, 1)}
                      disabled={locked || busy || index === modules.length - 1}
                    />
                  </Box>
                  <Text as="span" className="mt-1 shrink-0 font-mono text-[11px] font-bold text-text-3">
                    {index + 1}
                  </Text>
                  <Box className="min-w-0 flex-1">
                    <Box className="flex flex-wrap items-center gap-2">
                      <Text as="p" className="text-[13.5px] font-bold text-ink">{m.title}</Text>
                      {m.is_active === 0 && <Text as="span" className="chip chip-idle">Hidden</Text>}
                    </Box>
                    {m.description && (
                      <Text as="p" className="mt-0.5 line-clamp-2 text-[12px] text-text-2">
                        {m.description}
                      </Text>
                    )}
                    <Text as="p" className="mt-1 text-[11.5px] text-text-3">
                      {inside.length} lesson{inside.length === 1 ? "" : "s"}
                      {minutes > 0 && ` · ${formatDuration(minutes)}`}
                    </Text>
                  </Box>
                  <Box className="flex shrink-0 items-center gap-1">
                    <IconBtn icon={Pencil} label="Edit module" onClick={() => openEdit(m)} disabled={locked} />
                    <IconBtn icon={Trash2} label="Delete module" danger onClick={() => setConfirm(m)} disabled={locked} />
                  </Box>
                </Box>
                {inside.length > 0 && (
                  <Box className="divide-y divide-line border-t border-line">
                    {inside.map((l) => (
                      <Box key={l.id} className="flex items-center gap-2.5 bg-surface-2 px-4 py-2">
                        <LessonIcon contentType={l.content_type} className="size-3.5 shrink-0 text-text-3" />
                        <Text as="span" className="min-w-0 flex-1 truncate text-[12.5px] text-ink">
                          {l.title}
                        </Text>
                        <Text as="span" className="shrink-0 text-[11px] text-text-3">
                          {formatDuration(l.duration_minutes) ?? "—"}
                        </Text>
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit module" : "Add module"}</DialogTitle>
          </DialogHeader>
          <Box className="space-y-4">
            <Box className="space-y-1.5">
              <Label>Title <Text as="span" className="text-danger">*</Text></Label>
              <Input
                value={form.title} maxLength={80}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="e.g. Planning & Scheduling"
              />
              <Text as="p" className="text-right text-[10.5px] text-text-3">{form.title.length}/80</Text>
            </Box>
            <DescriptionField
              value={form.description}
              onChange={(v) => setForm((p) => ({ ...p, description: v }))}
            />
            <Box className="flex items-center justify-between border border-line bg-surface-2 px-3 py-2.5">
              <Box>
                <Text as="p" className="text-[13px] font-semibold text-ink">Visible</Text>
                <Text as="p" className="text-[11px] text-text-3">
                  A hidden module stays in the course but is not shown to learners.
                </Text>
              </Box>
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm((p) => ({ ...p, is_active: v }))}
              />
            </Box>
            {formError && (
              <Box className="border border-danger/30 bg-danger/10 px-3 py-2">
                <Text as="p" className="text-[12.5px] text-danger">{formError}</Text>
              </Box>
            )}
          </Box>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving} className="bg-navy text-accent-soft hover:bg-accent-blue hover:text-white">
              {saving ? "Saving…" : editing ? "Save changes" : "Add module"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirm} onOpenChange={(o) => { if (!o) setConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete module</AlertDialogTitle>
            <AlertDialogDescription>
              {/* The reassurance is the point: this used to cascade. */}
              <strong>{confirm?.title}</strong> will be removed.
              {confirm && lessonsIn(confirm.id).length > 0 && (
                lessonsIn(confirm.id).length === 1
                  ? <> Its lesson is <strong>not</strong> deleted — it goes back to
                      staged, and you can link it to another module.</>
                  : <> Its {lessonsIn(confirm.id).length} lessons are <strong>not</strong> deleted
                      — they go back to staged, and you can link them to another module.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={remove} disabled={busy} className="bg-danger text-white hover:bg-danger/90">
              {busy ? "Deleting…" : "Delete module"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Box>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Lessons
   ══════════════════════════════════════════════════════════════════════════ */

function LessonsTab({ courseId, modules, lessons, locked, onChanged }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const staged = lessons.filter((l) => l.staged);
  const placed = lessons.filter((l) => !l.staged);

  async function link(lessonId, moduleId) {
    setBusy(true); setErr(null);
    try {
      await setLessonModule({ lessonId, moduleId });
      await onChanged();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  async function remove() {
    setBusy(true);
    try {
      await deleteLesson({ lessonId: confirm.id });
      setConfirm(null);
      await onChanged();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  const row = (l) => (
    <Box key={l.id} className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-2.5 last:border-b-0">
      <LessonIcon contentType={l.content_type} className="size-4 shrink-0 text-text-3" />
      <Box className="min-w-0 flex-1">
        <Text as="p" className="truncate text-[13px] font-semibold text-ink">{l.title}</Text>
        <Text as="p" className="text-[11px] text-text-3">
          {contentTypeOf(l.content_type)?.label ?? l.content_type}
          {l.duration_minutes ? ` · ${formatDuration(l.duration_minutes)}` : ""}
          {l.resource_count > 0 ? ` · ${l.resource_count} resource${l.resource_count === 1 ? "" : "s"}` : ""}
          {l.assessment_count > 0 ? ` · ${l.assessment_count} assessment` : ""}
        </Text>
      </Box>

      {/* The link control. A select rather than drag-and-drop: it is keyboard
          reachable, says what the options are, and "Not placed" is a real
          choice in the same list rather than a separate unlink button. */}
      <Select
        value={l.module_id ? String(l.module_id) : "none"}
        onValueChange={(v) => link(l.id, v === "none" ? null : Number(v))}
        disabled={locked || busy}
      >
        {/* This Select renders the raw VALUE unless given children, so the
            label is spelled out — a bare <SelectValue/> here showed the module
            id instead of its title. */}
        <SelectTrigger
          className="h-8 w-[210px] shrink-0 text-[12px]"
          title={l.module_id ? (modules.find((m) => m.id === l.module_id)?.title ?? "") : "Not placed (staged)"}
        >
          <SelectValue>
            {l.module_id
              ? (modules.find((m) => m.id === l.module_id)?.title ?? "Unknown module")
              : "Not placed (staged)"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Not placed (staged)</SelectItem>
          {modules.map((m) => (
            <SelectItem key={m.id} value={String(m.id)}>{m.title}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Box className="flex shrink-0 items-center gap-1">
        <IconBtn icon={Pencil} label="Edit lesson" onClick={() => { setEditing(l); setOpen(true); }} disabled={locked} />
        <IconBtn icon={Trash2} label="Delete lesson" danger onClick={() => setConfirm(l)} disabled={locked} />
      </Box>
    </Box>
  );

  return (
    <Box className="space-y-4">
      <Box className="flex items-center justify-between">
        <Text as="p" className="text-[12px] text-text-3">
          {lessons.length} lesson{lessons.length === 1 ? "" : "s"}
          {staged.length > 0 && ` · ${staged.length} staged`}
        </Text>
        <Button
          onClick={() => { setEditing(null); setOpen(true); }}
          disabled={locked}
          className="h-8 gap-1.5 rounded-none bg-navy px-3 text-[12.5px] font-bold text-accent-soft hover:bg-accent-blue hover:text-white"
        >
          <Plus className="size-3.5" />Add lesson
        </Button>
      </Box>

      {err && (
        <Box className="border border-danger/30 bg-danger/10 px-3 py-2">
          <Text as="p" className="text-[12.5px] text-danger">{err}</Text>
        </Box>
      )}

      {/* Staged first — it is the tray the admin is working out of, and a
          lesson sitting here is not yet delivered to anyone. */}
      {staged.length > 0 && (
        <Box className="border border-warning/40 bg-surface">
          <Box className="flex items-start gap-2.5 border-b border-line bg-[color-mix(in_oklab,var(--spectra-warning)_8%,transparent)] px-4 py-2.5">
            <Unlink className="mt-0.5 size-4 shrink-0 text-warning" />
            <Box>
              <Text as="p" className="text-[12.5px] font-bold text-ink">
                Staged — not in the course yet
              </Text>
              <Text as="p" className="text-[11.5px] text-text-2">
                These are written but not placed in a module, so learners cannot
                see them and they count for no learning hours. Pick a module to
                put one live.
              </Text>
            </Box>
          </Box>
          {staged.map(row)}
        </Box>
      )}

      {placed.length === 0 && staged.length === 0 ? (
        <EmptyState
          icon={PlayCircle}
          title="No lessons yet"
          body="Add a lesson, then place it in a module. Lessons are written at course level, so you can reorganise them without losing anything."
        />
      ) : placed.length > 0 && (
        <Box className="border border-line bg-surface">
          <Box className="border-b border-line bg-surface-2 px-4 py-2.5">
            <Text as="p" className="text-[12.5px] font-bold text-ink">In the course</Text>
          </Box>
          {placed.map(row)}
        </Box>
      )}

      <LessonDialog
        open={open}
        onOpenChange={setOpen}
        courseId={courseId}
        modules={modules}
        editing={editing}
        onSaved={onChanged}
      />

      <AlertDialog open={!!confirm} onOpenChange={(o) => { if (!o) setConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete lesson</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{confirm?.title}</strong> and every learner&apos;s progress on
              it will be permanently deleted. To take it out of the course without
              losing it, set its module to <em>Not placed</em> instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={remove} disabled={busy} className="bg-danger text-white hover:bg-danger/90">
              {busy ? "Deleting…" : "Delete lesson"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Box>
  );
}

/* ── Lesson create / edit ─────────────────────────────────────────────────
   One form for seven content types. Which fields appear, and which are
   required, come from the catalogue rather than a chain of conditionals — the
   same list the API validates against, so the browser and the server cannot
   disagree about what a `link` lesson needs.
──────────────────────────────────────────────────────────────────────────── */

const EMPTY_LESSON = {
  title: "", description: "", content_type: "video", content_url: "",
  duration_minutes: "", module_id: "none", is_preview: false, is_active: true,
  /** The chosen .zip, before it has been sent anywhere. */
  scorm_file: null,
  /** Set once the zip is uploaded, or carried in when editing. */
  scorm_package_id: null,
  /** The chosen video, and the R2 key once it is up but the row is not. */
  video_file: null,
  video_key_pending: null,
  video_duration_seconds: null,
  has_video: false,
  /** The chosen document, and its key once uploaded. */
  document_file: null,
  document_key: null,
  document_name: "",
  document_mime: "",
  document_size_bytes: null,
};

function LessonDialog({ open, onOpenChange, courseId, modules, editing, onSaved }) {
  const [form, setForm] = useState(EMPTY_LESSON);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(editing
      ? {
          title: editing.title ?? "",
          description: editing.description ?? "",
          content_type: editing.content_type ?? "video",
          content_url: editing.content_url ?? "",
          duration_minutes: editing.duration_minutes ? String(editing.duration_minutes) : "",
          module_id: editing.module_id ? String(editing.module_id) : "none",
          is_preview: Boolean(editing.is_preview),
          is_active: editing.is_active !== false,
          scorm_file: null,
          scorm_package_id: editing.scorm_package_id ?? null,
          video_file: null,
          video_key_pending: null,
          video_duration_seconds: editing.video_duration_seconds ?? null,
          has_video: Boolean(editing.video_key ?? editing.has_video),
          document_file: null,
          document_key: editing.document_key ?? null,
          document_name: editing.document_name ?? "",
          document_mime: editing.document_mime ?? "",
          document_size_bytes: editing.document_size_bytes ?? null,
        }
      : EMPTY_LESSON);
  }, [open, editing]);

  const type = contentTypeOf(form.content_type);
  const needsDuration = durationRequiredFor(form.content_type);

  /**
   * Four content types carry a FILE, and every one may be linked instead.
   * The form treats that as ONE shape rather than four branches.
   *
   * The catalogue has said `upload: true` for video, pdf, image and scorm
   * since it was written, and the presign endpoints have existed just as
   * long — but this form only ever branched on SCORM, so the other three
   * fell through to a bare "paste a link" box. An admin could not get a
   * video or a PDF into the product from inside the product.
   *
   * UPLOAD AND LINK EXCLUDE EACH OTHER, AND THE LOCK RUNS BOTH WAYS. A
   * lesson has one primary content; holding both would leave it ambiguous
   * which the learner is served, and that ambiguity would be resolved one
   * way by the save payload and another by whoever next read the row. So
   * choosing a file disables the URL box and typing a URL disables the
   * picker — each saying how to undo it, because a disabled control whose
   * reason is invisible reads as a bug rather than a rule.
   */
  const isScorm = form.content_type === "scorm";
  const isVideo = form.content_type === "video";
  const isDocument = ["pdf", "image"].includes(form.content_type);
  const canUpload = Boolean(type?.upload);

  const hasUpload = isScorm
    ? Boolean(form.scorm_file || form.scorm_package_id)
    : isVideo
      ? Boolean(form.video_file || form.video_key_pending || form.has_video)
      : Boolean(form.document_file || form.document_key);

  const hasLink = form.content_url.trim().length > 0;

  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(null);

  const uploadName = isScorm
    ? (form.scorm_file?.name ?? (form.scorm_package_id ? "A package is attached" : null))
    : isVideo
      ? (form.video_file?.name
          ?? ((form.has_video || form.video_key_pending) ? "A video is attached" : null))
      : (form.document_name || null);

  const uploadSize = isScorm
    ? form.scorm_file?.size
    : isVideo ? form.video_file?.size : form.document_size_bytes;

  const clearUpload = () =>
    setForm((f) => ({
      ...f,
      scorm_file: null, scorm_package_id: null,
      video_file: null, video_key_pending: null, has_video: false,
      video_duration_seconds: null,
      document_file: null, document_key: null,
      document_name: "", document_mime: "", document_size_bytes: null,
    }));

  /**
   * Validates and stages a chosen file. Nothing is sent yet — the upload
   * runs at save, so an admin who picks the wrong file and closes the dialog
   * has pushed nothing across the network.
   *
   * SCORM's size check is the exception and runs here deliberately: that cap
   * lives in the proxy rather than the API, so a 300 MB zip would otherwise
   * fail AFTER being uploaded.
   */
  const chooseFile = (file) => {
    if (!file) return;
    setError(null);

    if (isScorm) {
      const tooBig = scormSizeError(file);
      if (tooBig) { setError(tooBig); return; }
      setForm((f) => ({ ...f, scorm_file: file, content_url: "" }));
      return;
    }

    if (isVideo) {
      setForm((f) => ({
        ...f, video_file: file, video_key_pending: null, has_video: false,
        content_url: "",
      }));
      return;
    }

    // The EXTENSION decides the mime, not `file.type`: a browser reports
    // nothing at all for plenty of files, and the type is what the upload
    // URL gets signed with.
    const mime = documentMimeFor(file);
    if (!mime) {
      setError(`${file.name} is not a supported ${type?.label ?? "file"}.`);
      return;
    }
    setForm((f) => ({
      ...f,
      document_file: file, document_key: null,
      document_name: file.name, document_mime: mime, document_size_bytes: file.size,
      content_url: "",
    }));
  };

  async function save() {
    if (!form.title.trim()) { setError("Lesson title is required"); return; }

    /**
     * SCORM needs a package, every other type needs a URL.
     *
     * Checked here so the admin hears it before pressing Save rather than as
     * a 422 afterwards. The API is what enforces it (§10.8).
     */
    if (canUpload) {
      // Either half satisfies it. Naming only the upload would have the form
      // refuse something the API accepts.
      if (!hasUpload && !hasLink) {
        setError(`Upload the ${type?.label ?? "file"}, or paste a link to it.`);
        return;
      }
    } else if (!form.content_url.trim()) {
      setError("Enter the URL this lesson links to.");
      return;
    }
    if (needsDuration && !(Number(form.duration_minutes) > 0)) {
      setError("Enter how long this lesson takes, in minutes — it counts toward learning hours.");
      return;
    }
    setSaving(true); setError(null);

    /**
     * The zip goes up BEFORE the lesson is written, because the lesson row
     * needs the package id. That ordering is what `provisional` exists for
     * (§10.9): a package uploaded this way is hidden from the SCORM library
     * and swept if no lesson ever claims it, so an abandoned save leaves no
     * debris an admin can see.
     *
     * `uploadedNow` is tracked separately so the rollback below only ever
     * deletes a package THIS save created — never one the lesson already had.
     */
    let scormPackageId = form.scorm_package_id;
    let uploadedNow = null;
    if (isScorm && form.scorm_file) {
      try {
        setUploading({ percent: 0, extracting: false });
        const res = await uploadScormPackage({
          file: form.scorm_file,
          title: form.title.trim(),
          courseId,
          provisional: true,
          onProgress: (percent) =>
            setUploading({ percent, extracting: percent >= 100 }),
        });
        scormPackageId = res?.package?.id ?? res?.id ?? null;
        uploadedNow = scormPackageId;
        if (!scormPackageId) throw new Error("The server did not return a package id.");
      } catch (e) {
        setUploading(null); setSaving(false);
        setError(e?.message ?? "The SCORM package could not be uploaded.");
        return;
      }
      setUploading(null);
    }

    /*
     * A video goes up in THREE steps, and the third needs a lesson that does
     * not exist yet. presign and PUT happen here, because the row records a
     * key; CONFIRM happens after the row is written, because confirming is
     * what binds the key and its measured duration to a lesson id. That is
     * why this one is carried across the save rather than resolved in place.
     */
    let pendingVideo = null;
    if (isVideo && form.video_file) {
      try {
        setUploading({ percent: 0, extracting: false });
        // Read off the file rather than asked of the admin — video is the one
        // type whose runtime is measurable, which is exactly why the
        // catalogue marks its duration optional (§10.4).
        const durationSeconds = await readVideoDuration(form.video_file).catch(() => null);
        const contentType = form.video_file.type || "video/mp4";
        const { uploadUrl, key } = await presignNewVideo({
          filename: form.video_file.name,
          contentType,
          sizeBytes: form.video_file.size,
        });
        await uploadToR2({
          uploadUrl, file: form.video_file, contentType,
          onProgress: (percent) => setUploading({ percent, extracting: false }),
        });
        pendingVideo = { key, durationSeconds };
      } catch (e) {
        setUploading(null); setSaving(false);
        setError(e?.message ?? "The video could not be uploaded.");
        return;
      }
      setUploading(null);
    }

    /*
     * A document is the simple one — presign, PUT, record the key. The
     * service proves the object really is in the bucket before storing the
     * key (§10.8), so a key invented by a caller is refused.
     *
     * No `provisional` flag as SCORM has: a document is a bare object with no
     * row of its own, so an abandoned save leaves one unreferenced key rather
     * than a phantom entry in a library an admin can see.
     */
    let documentKey = form.document_key;
    if (isDocument && form.document_file) {
      try {
        setUploading({ percent: 0, extracting: false });
        const { uploadUrl, key } = await presignDocument({
          filename: form.document_file.name,
          contentType: form.document_mime,
          sizeBytes: form.document_file.size,
        });
        await uploadToR2({
          uploadUrl, file: form.document_file, contentType: form.document_mime,
          onProgress: (percent) => setUploading({ percent, extracting: false }),
        });
        documentKey = key;
      } catch (e) {
        setUploading(null); setSaving(false);
        setError(e?.message ?? "The document could not be uploaded.");
        return;
      }
      setUploading(null);
    }

    try {
      const data = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        content_type: form.content_type,
        content_url: isScorm ? null : (form.content_url.trim() || null),
        ...(isScorm ? { scorm_package_id: scormPackageId } : {}),
        // Sent only for the types with a document slot, and as an explicit
        // null when cleared — an omitted field means "leave it alone" on the
        // API side (§10.10), which would keep a file just removed.
        ...(isDocument
          ? {
              document_key: documentKey || null,
              document_name: documentKey ? form.document_name : null,
              document_mime: documentKey ? form.document_mime : null,
            }
          : {}),
        // The video rides WITH the save rather than following it.
        //
        // Uploading, then creating, then confirming failed at the middle
        // step: the create validated a video lesson that had no video yet
        // and refused it with "Upload a video or provide a link to one" —
        // right after the upload had succeeded. Sending the key here means
        // the row is created complete, and there is no window in which a
        // half-made lesson exists.
        ...(isVideo && pendingVideo
          ? {
              video_key: pendingVideo.key,
              ...(pendingVideo.durationSeconds
                ? { video_duration_seconds: Math.round(pendingVideo.durationSeconds) }
                : {}),
            }
          : {}),
        duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : null,
        is_preview: form.is_preview,
        is_active: form.is_active,
      };
      if (editing) {
        await updateLesson({ lessonId: editing.id, data });
      } else {
        await createCourseLesson({
          courseId,
          data: {
            ...data,
            ...(form.module_id !== "none" ? { module_id: Number(form.module_id) } : {}),
          },
        });
      }

      onOpenChange(false);
      await onSaved();
    } catch (e) {
      /**
       * The lesson failed AFTER the zip went up, so the package is orphaned.
       * The server's sweeper would collect it in 12 hours, but the browser
       * knows NOW — the same rollback the SCORM library page performs, and
       * the reason §10.9 calls the client "the fast path".
       *
       * Only a package this save created is deleted. Never one the lesson
       * already had: that would destroy a working package because an
       * unrelated field failed validation.
       */
      if (uploadedNow) {
        try { await deleteScormPackage({ packageId: uploadedNow }); } catch { /* swept later */ }
      }
      setError(e.message);
    } finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit lesson" : "Add lesson"}</DialogTitle>
        </DialogHeader>

        <Box className="space-y-4">
          <SectionLabel>Basic info</SectionLabel>
          <Box className="space-y-1.5">
            <Label>Title <Text as="span" className="text-danger">*</Text></Label>
            <Input
              value={form.title} maxLength={100}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="e.g. Introduction to phishing"
            />
            <Text as="p" className="text-right text-[10.5px] text-text-3">{form.title.length}/100</Text>
          </Box>
          <DescriptionField
            value={form.description}
            onChange={(v) => setForm((p) => ({ ...p, description: v }))}
          />

          <SectionLabel>Content</SectionLabel>
          <Box className="grid gap-3 sm:grid-cols-2">
            <Box className="space-y-1.5">
              <Label>Content type <Text as="span" className="text-danger">*</Text></Label>
              <Select
                value={form.content_type}
                onValueChange={(v) => setForm((p) => ({ ...p, content_type: v }))}
              >
                <SelectTrigger>
                  <SelectValue>{type?.label ?? form.content_type}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {LESSON_CONTENT_TYPES.map((t) => (
                    <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {type && <Text as="p" className="text-[10.5px] text-text-3">{type.hint}</Text>}
            </Box>

            <Box className="space-y-1.5">
              <Label>
                Duration (minutes)
                {/* A required star with no explanation reads as the form being
                    inconsistent between types, so the reason is stated. */}
                {needsDuration && <Text as="span" className="text-danger"> *</Text>}
              </Label>
              <Input
                type="number" min="0" value={form.duration_minutes}
                onChange={(e) => setForm((p) => ({ ...p, duration_minutes: e.target.value }))}
                placeholder="e.g. 10"
              />
              <Text as="p" className="text-[10.5px] text-text-3">
                {needsDuration
                  ? "Required — this type has no runtime to measure, so this is what it contributes to learning hours."
                  : "Optional — measured watch time counts until the lesson is complete."}
              </Text>
            </Box>
          </Box>

          {/*
            ONE block for all four uploadable types, and the link beside it.

            Upload first, because an admin holding a file wants to send it;
            the link is the fallback for something already hosted elsewhere.
            Each half disables the other — see the derivation above for why
            holding both is not allowed — and each says how to undo it,
            because a disabled control whose reason is invisible reads as a
            bug rather than a rule.
          */}
          {canUpload && (
            <Box className="space-y-2">
              <Label>
                {type?.label ?? "File"}
                <Text as="span" className="text-danger"> *</Text>
              </Label>

              <input
                ref={fileRef}
                type="file"
                accept={type?.accept ?? ""}
                className="hidden"
                onChange={(e) => { chooseFile(e.target.files?.[0]); e.target.value = ""; }}
              />

              <Box
                onClick={() => !saving && !hasLink && fileRef.current?.click()}
                className={cn(
                  "flex flex-col items-center gap-2 border border-dashed px-4 py-5 transition-colors",
                  hasLink
                    ? "cursor-not-allowed border-line bg-surface-2 opacity-50"
                    : hasUpload
                      ? "cursor-pointer border-line-strong bg-surface-2"
                      : "cursor-pointer border-line bg-surface hover:border-line-strong hover:bg-surface-2",
                )}
              >
                <Upload className="size-6 text-text-3" />
                <Box className="text-center">
                  {hasLink ? (
                    <Text as="p" className="text-[12.5px] text-text-3">
                      A link is set — clear it to upload a file instead
                    </Text>
                  ) : hasUpload ? (
                    <>
                      <Text as="p" className="text-[13px] font-semibold text-ink">
                        {uploadName}
                      </Text>
                      <Text as="p" className="text-[11px] text-text-3">
                        {formatBytes(uploadSize) ?? "attached"} · click to replace
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text as="p" className="text-[13px] font-medium text-ink">
                        Click to choose a file
                      </Text>
                      <Text as="p" className="text-[11px] text-text-3">
                        {type?.hint} · uploaded to Cloudflare when you save
                      </Text>
                    </>
                  )}
                </Box>
              </Box>

              {hasUpload && (
                <button
                  type="button"
                  onClick={clearUpload}
                  disabled={saving}
                  className="cursor-pointer text-[11px] text-accent-blue underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:text-text-3"
                >
                  Remove this file
                </button>
              )}

              <Box className="space-y-1.5 pt-1">
                <Label className="text-[11px] text-text-2">Or link to it instead</Label>
                <Input
                  value={form.content_url}
                  disabled={hasUpload}
                  onChange={(e) => setForm((p) => ({ ...p, content_url: e.target.value }))}
                  placeholder="https://…"
                />
                <Text as="p" className="text-[10.5px] text-text-3">
                  {hasUpload
                    ? "Remove the uploaded file to link to one instead."
                    : isVideo
                      // Named explicitly because "paste a link to the file" is
                      // wrong for a YouTube URL, and a watch-page link is what
                      // somebody will actually paste — the learner page
                      // translates it to the player URL.
                      ? "A YouTube, Vimeo, Loom or direct video URL. It plays from that host, so this product cannot protect it."
                      : "A linked file is served from wherever it is hosted, so this product cannot protect it."}
                </Text>
              </Box>

              {uploading && (
                <Box className="space-y-1">
                  <Box className="flex items-center justify-between text-[11px] text-text-2">
                    <Text as="span">
                      {uploading.extracting
                        ? "Extracting the package on the server…"
                        : `Uploading ${uploadName ?? "file"}…`}
                    </Text>
                    {!uploading.extracting && (
                      <Text as="span" className="font-mono">{uploading.percent}%</Text>
                    )}
                  </Box>
                  <Box className="h-1 w-full bg-surface-3">
                    {/* A percentage is genuinely dynamic, so it is an inline
                        width — the exception `youtube-player.jsx` already
                        makes. Tailwind cannot see an interpolated class. */}
                    <Box
                      className="h-1 bg-accent-blue transition-all"
                      style={{ width: `${uploading.percent}%` }}
                    />
                  </Box>
                </Box>
              )}
            </Box>
          )}

          {/* `link` is the one type with nothing to upload. */}
          {!canUpload && (
            <Box className="space-y-1.5">
              <Label>
                URL<Text as="span" className="text-danger"> *</Text>
              </Label>
              <Input
                value={form.content_url}
                onChange={(e) => setForm((p) => ({ ...p, content_url: e.target.value }))}
                placeholder="https://…"
              />
              <Text as="p" className="text-[10.5px] text-text-3">
                Opens in a new tab for the learner.
              </Text>
            </Box>
          )}

          {/*
            PowerPoint and Word are not in the dropdown, so an admin holding
            one needs to be told what to do instead — here, where they are
            looking, rather than left to conclude the feature is missing.
          */}
          <Box className="border border-line bg-surface-2 px-3 py-2.5">
            <Text as="p" className="text-[11.5px] font-semibold text-ink">
              {OFFICE_GUIDANCE.title}
            </Text>
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              {OFFICE_GUIDANCE.lines.map((line) => (
                <li key={line} className="text-[10.5px] leading-snug text-text-2">{line}</li>
              ))}
            </ul>
            <Text as="p" className="mt-1.5 text-[10.5px] leading-snug text-text-3">
              {OFFICE_GUIDANCE.why}
            </Text>
          </Box>


          {!editing && (
            <>
              <SectionLabel>Placement</SectionLabel>
              <Box className="space-y-1.5">
                <Label>Module</Label>
                <Select
                  value={form.module_id}
                  onValueChange={(v) => setForm((p) => ({ ...p, module_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue>
                      {form.module_id === "none"
                        ? "Not placed (staged)"
                        : (modules.find((m) => String(m.id) === form.module_id)?.title ?? "")}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not placed (staged)</SelectItem>
                    {modules.map((m) => (
                      <SelectItem key={m.id} value={String(m.id)}>{m.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Text as="p" className="text-[10.5px] text-text-3">
                  Staged lessons are invisible to learners and count for no
                  learning hours until you place them.
                </Text>
              </Box>
            </>
          )}

          <SectionLabel>Settings</SectionLabel>
          <Box className="grid gap-3 sm:grid-cols-2">
            <Toggle
              label="Free preview"
              hint="Visible before enrolling."
              checked={form.is_preview}
              onChange={(v) => setForm((p) => ({ ...p, is_preview: v }))}
            />
            <Toggle
              label="Active"
              hint="Inactive lessons stay in the module but are hidden."
              checked={form.is_active}
              onChange={(v) => setForm((p) => ({ ...p, is_active: v }))}
            />
          </Box>

          {error && (
            <Box className="border border-danger/30 bg-danger/10 px-3 py-2">
              <Text as="p" className="text-[12.5px] text-danger">{error}</Text>
            </Box>
          )}
        </Box>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving} className="bg-navy text-accent-soft hover:bg-accent-blue hover:text-white">
            {saving ? "Saving…" : editing ? "Save changes" : "Add lesson"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Outline — the whole course as one picture
   ══════════════════════════════════════════════════════════════════════════ */

function OutlineTab({ modules, lessons, assessments }) {
  const staged = lessons.filter((l) => l.staged);
  const final = assessments.find((a) => a.link_type === "course");
  const unplaced = assessments.filter((a) => a.link_type === "none");
  const forModule = (id) => assessments.filter((a) => a.link_type === "module" && a.module_id === id);
  const forLesson = (id) => assessments.filter((a) => a.link_type === "lesson" && a.lesson_id === id);

  const totalMinutes = lessons
    .filter((l) => !l.staged)
    .reduce((a, l) => a + Number(l.duration_minutes ?? 0), 0);

  if (modules.length === 0 && lessons.length === 0) {
    return (
      <EmptyState
        icon={BookOpen}
        title="Nothing to outline yet"
        body="Add a module and some lessons, and the shape of the course appears here."
      />
    );
  }

  return (
    <Box className="space-y-3">
      <Box className="flex flex-wrap items-center gap-4 border border-line bg-surface px-4 py-3 text-[12px] text-text-2">
        <Text as="span"><strong className="text-ink">{modules.length}</strong> modules</Text>
        <Text as="span"><strong className="text-ink">{lessons.length - staged.length}</strong> lessons live</Text>
        <Text as="span">
          <strong className="text-ink">{assessments.length}</strong> assessment{assessments.length === 1 ? "" : "s"}
        </Text>
        <Text as="span"><strong className="text-ink">{formatDuration(totalMinutes) ?? "0m"}</strong> total</Text>
      </Box>

      {modules.map((m, i) => {
        const inside = lessons.filter((l) => l.module_id === m.id);
        return (
          <Box key={m.id} className="border border-line bg-surface">
            <Box className="flex items-center gap-3 border-b border-line bg-surface-2 px-4 py-2.5">
              <Text as="span" className="flex size-6 shrink-0 items-center justify-center bg-navy font-mono text-[11px] font-bold text-accent-soft">
                {i + 1}
              </Text>
              <Text as="p" className="min-w-0 flex-1 truncate text-[13px] font-bold text-ink">{m.title}</Text>
              <Text as="span" className="shrink-0 text-[11px] text-text-3">
                {inside.length} lesson{inside.length === 1 ? "" : "s"}
              </Text>
            </Box>

            <Box className="space-y-1.5 p-3">
              {inside.length === 0 ? (
                <Text as="p" className="px-1 py-2 text-[12px] italic text-text-3">
                  No lessons placed in this module yet.
                </Text>
              ) : inside.map((l) => (
                <Box key={l.id}>
                  <Box className="flex items-center gap-2.5 border border-line bg-surface px-3 py-2">
                    <LessonIcon contentType={l.content_type} className="size-3.5 shrink-0 text-text-3" />
                    <Text as="span" className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-ink">
                      {l.title}
                    </Text>
                    <Text as="span" className="shrink-0 text-[10.5px] text-text-3">
                      {formatDuration(l.duration_minutes) ?? ""}
                    </Text>
                  </Box>
                  {forLesson(l.id).map((a) => (
                    <Box key={a.id} className="ml-6 mt-1 flex items-center gap-2 border-l-2 border-accent-blue bg-accent-tint px-3 py-1.5">
                      <ClipboardList className="size-3 shrink-0 text-accent-blue" />
                      <Text as="span" className="truncate text-[11.5px] text-ink">{a.title}</Text>
                      <Text as="span" className="ml-auto shrink-0 text-[10.5px] text-text-3">
                        {a.questions_count} q
                      </Text>
                    </Box>
                  ))}
                </Box>
              ))}

              {forModule(m.id).map((a) => (
                <Box key={a.id} className="flex items-center gap-2 border border-accent-blue/30 bg-accent-tint px-3 py-2">
                  <ClipboardList className="size-3.5 shrink-0 text-accent-blue" />
                  <Text as="span" className="truncate text-[12px] font-semibold text-ink">{a.title}</Text>
                  <Text as="span" className="ml-auto shrink-0 text-[10.5px] text-text-3">
                    Module assessment · {a.questions_count} q
                  </Text>
                </Box>
              ))}
            </Box>
          </Box>
        );
      })}

      {final && (
        <Box className="flex items-center gap-3 border-2 border-navy bg-surface px-4 py-3">
          <ClipboardList className="size-4 shrink-0 text-navy" />
          <Box className="min-w-0 flex-1">
            <Text as="p" className="text-[13px] font-bold text-ink">{final.title}</Text>
            <Text as="p" className="text-[11px] text-text-3">
              Final assessment · {final.questions_count} questions · pass mark {final.passing_score}%
            </Text>
          </Box>
        </Box>
      )}

      {(staged.length > 0 || unplaced.length > 0) && (
        <Box className="border border-dashed border-line-strong bg-surface-2 px-4 py-3">
          <Text as="p" className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-text-3">
            Not in the course
          </Text>
          <Box className="space-y-1.5">
            {staged.map((l) => (
              <Box key={`l${l.id}`} className="flex items-center gap-2.5 border border-line bg-surface px-3 py-1.5 opacity-70">
                <LessonIcon contentType={l.content_type} className="size-3.5 shrink-0 text-text-3" />
                <Text as="span" className="truncate text-[12px] text-text-2">{l.title}</Text>
                <Text as="span" className="ml-auto shrink-0 text-[10.5px] text-warning">Staged</Text>
              </Box>
            ))}
            {unplaced.map((a) => (
              <Box key={`a${a.id}`} className="flex items-center gap-2.5 border border-line bg-surface px-3 py-1.5 opacity-70">
                <ClipboardList className="size-3.5 shrink-0 text-text-3" />
                <Text as="span" className="truncate text-[12px] text-text-2">{a.title}</Text>
                <Text as="span" className="ml-auto shrink-0 text-[10.5px] text-warning">Not placed</Text>
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}

/* ── Small shared pieces ──────────────────────────────────────────────────── */

function SectionLabel({ children }) {
  return (
    <Text as="p" className="border-b border-line pb-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-text-3">
      {children}
    </Text>
  );
}

function Toggle({ label, hint, checked, onChange }) {
  return (
    <Box className="flex items-center justify-between gap-3 border border-line bg-surface-2 px-3 py-2.5">
      <Box className="min-w-0">
        <Text as="p" className="text-[13px] font-semibold text-ink">{label}</Text>
        <Text as="p" className="text-[11px] text-text-3">{hint}</Text>
      </Box>
      <Switch checked={checked} onCheckedChange={onChange} />
    </Box>
  );
}

function IconBtn({ icon: Icon, label, onClick, danger = false, disabled = false, small = false }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex items-center justify-center border transition-colors",
        small ? "h-3.5 w-6" : "size-7",
        disabled
          ? "cursor-not-allowed border-line bg-surface-2 text-text-3/50"
          : danger
            ? "cursor-pointer border-line bg-surface text-text-2 hover:bg-danger hover:text-white"
            : "cursor-pointer border-line bg-surface text-text-2 hover:bg-accent-blue hover:text-white",
      )}
    >
      <Icon className={small ? "size-3" : "size-3.5"} />
    </button>
  );
}

function EmptyState({ icon: Icon, title, body }) {
  return (
    <Box className="border border-dashed border-line-strong bg-surface px-6 py-14 text-center">
      <Icon className="mx-auto mb-3 size-8 text-text-3" />
      <Text as="h3" className="text-[14px] font-bold text-ink">{title}</Text>
      <Text as="p" className="mx-auto mt-1.5 max-w-md text-[12.5px] leading-relaxed text-text-2">
        {body}
      </Text>
    </Box>
  );
}
