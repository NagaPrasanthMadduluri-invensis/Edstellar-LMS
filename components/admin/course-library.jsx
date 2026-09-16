"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Archive, ArchiveRestore, Ban, BookOpen, CheckCircle2, ClipboardList,
  Clock, Layers, Pencil, Plus, Search, TrendingUp, Trash2, Users, Percent,
  AlertTriangle, CalendarDays,
} from "lucide-react";

import Box from "@/components/ui/box";
import Text from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CourseArt } from "@/components/shared/course-art";
import { DescriptionField } from "@/components/shared/description-field";
import { ThumbnailField } from "@/components/admin/thumbnail-field";
import { useAuth } from "@/hooks/use-auth";
import {
  bulkCourseAction, createCourse, deleteCourse, discardCourseThumbnail,
  fetchAdminCourses, fetchAssignments, updateCourse, uploadCourseThumbnail,
} from "@/services/api/admin/admin-api";
import {
  COMPLIANCE_CATEGORY, COURSE_CATEGORIES, RENEWAL_MONTHS,
  categoryColor, categoryTint, isMandatory,
} from "@/lib/course-taxonomy";
import { BRAND, progressFill } from "@/lib/brand";
import { cn } from "@/lib/utils";

const EMPTY_FORM = {
  name: "", description: "", is_active: false,
  category: "", is_mandatory: false, expiry_months: "", tags: "",
};

function formatDuration(minutes) {
  if (!minutes) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m} min`;
}

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/** A square icon button in the card's action strip. */
function CardAction({ icon: Icon, label, onClick, danger = false, disabled = false, tone }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={(event) => { event.stopPropagation(); onClick?.(); }}
      className={cn(
        "flex flex-1 items-center justify-center gap-1.5 border-r border-line py-2.5",
        "text-[11.5px] font-semibold transition-colors duration-150 last:border-r-0",
        disabled
          ? "cursor-not-allowed bg-surface-2 text-text-3/50"
          : danger
            // Filled on hover, not tinted: these sit in a row of five and a
            // 10% wash was hard to tell from the one beside it.
            ? "cursor-pointer text-text-2 hover:bg-danger hover:text-white"
            : "cursor-pointer text-text-2 hover:bg-accent-blue hover:text-white",
        tone,
      )}
    >
      <Icon className="size-3.5" />
    </button>
  );
}

/** One filled pill. Category carries its own colour; the rest are neutral. */
function Pill({ children, bg, fg }) {
  return (
    <Text
      as="span"
      className="shrink-0 whitespace-nowrap px-2 py-0.5 text-[10px] font-bold"
      style={{ background: bg, color: fg }}
    >
      {children}
    </Text>
  );
}

function LibrarySkeleton() {
  return (
    <Box className="space-y-4">
      <Skeleton className="h-[86px] w-full" />
      <Skeleton className="h-11 w-full" />
      <Box className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[360px]" />)}
      </Box>
    </Box>
  );
}

export function CourseLibrary() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [showArchived, setShowArchived] = useState(false);

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");
  const [selected, setSelected] = useState(new Set());

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const [confirmDelete, setConfirmDelete] = useState(null);
  const [roster, setRoster] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      setData(await fetchAdminCourses({ archived: showArchived }));
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  }, [user, showArchived]);

  useEffect(() => { load(); }, [load]);
  // A selection made in the active library means nothing in the archive, and
  // acting on it there would apply an action to ids the view no longer shows.
  useEffect(() => { setSelected(new Set()); }, [showArchived]);

  const courses = data?.courses ?? [];
  const stats = data?.stats;

  const categories = useMemo(
    () => [...new Set(courses.map((c) => c.category).filter(Boolean))].sort(),
    [courses],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = courses.filter((c) => {
      // Title, category and tags — the three things the search box promises.
      const haystack = `${c.name} ${c.category ?? ""} ${c.tags ?? ""} ${c.description ?? ""}`.toLowerCase();
      const matchSearch = !q || haystack.includes(q);
      const matchCategory = filterCategory === "all" || c.category === filterCategory;
      const matchStatus =
        filterStatus === "all"
        || (filterStatus === "published" && c.is_active)
        || (filterStatus === "draft" && !c.is_active);
      return matchSearch && matchCategory && matchStatus;
    });
    if (sortOrder === "newest") rows = [...rows].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    if (sortOrder === "alpha") rows = [...rows].sort((a, b) => a.name.localeCompare(b.name));
    if (sortOrder === "enrolled") rows = [...rows].sort((a, b) => b.enrollments_count - a.enrollments_count);
    return rows;
  }, [courses, search, filterCategory, filterStatus, sortOrder]);

  const allSelected = filtered.length > 0 && filtered.every((c) => selected.has(c.id));

  const toggleOne = (id) => setSelected((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  async function runBulk(action) {
    setBusy(true);
    try {
      await bulkCourseAction({ action, courseIds: [...selected] });
      setSelected(new Set());
      await load();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  /** Single-card actions reuse the bulk endpoint — one code path, one result. */
  async function runOne(action, id) {
    setBusy(true);
    try {
      await bulkCourseAction({ action, courseIds: [id] });
      await load();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setThumbnailFile(null);
    setFormError(null);
    setDialogOpen(true);
  }

  /**
   * `?edit=<id>` opens that course's editor as soon as the list has loaded.
   *
   * The course detail page's "Edit course" button navigates here rather than
   * carrying a second copy of this form. One editor means the category,
   * compliance and expiry rules cannot come to differ between two screens —
   * and the URL is the only way to say "open it" across a navigation.
   */
  useEffect(() => {
    const wanted = Number(searchParams.get("edit"));
    if (!wanted || !data?.courses) return;
    const course = data.courses.find((c) => c.id === wanted);
    if (course) openEdit(course);
    // Consume the intent, so a refresh or a Back does not reopen the dialog.
    router.replace("/admin/courses", { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, searchParams]);

  function openEdit(course) {
    setEditing(course);
    setForm({
      name: course.name ?? "",
      description: course.description ?? "",
      is_active: Boolean(course.is_active),
      category: course.category ?? "",
      is_mandatory: Boolean(course.is_mandatory),
      expiry_months: course.expiry_months ? String(course.expiry_months) : "",
      tags: course.tags ?? "",
    });
    setThumbnailFile(null);
    setFormError(null);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) { setFormError("Course name is required"); return; }
    setSaving(true); setFormError(null);

    // The image must exist before the course can reference it, so it is
    // uploaded first and rolled back if the save then fails — the same
    // ordering the lesson editor uses for a SCORM package.
    let uploadedUrl = null;
    try {
      if (thumbnailFile) {
        uploadedUrl = (await uploadCourseThumbnail({ file: thumbnailFile })).url;
      }
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        is_active: form.is_active,
        category: form.category || null,
        is_mandatory: form.is_mandatory,
        // Only a compliance course carries a cadence; the server drops it
        // otherwise, and sending it anyway would be a value the card never
        // shows and the admin cannot explain.
        expiry_months:
          form.category === COMPLIANCE_CATEGORY && form.expiry_months
            ? Number(form.expiry_months)
            : null,
        tags: form.tags.trim() || null,
        ...(uploadedUrl ? { thumbnail_url: uploadedUrl } : {}),
      };
      if (editing) await updateCourse({ courseId: editing.id, data: payload });
      else await createCourse({ data: payload });
      setDialogOpen(false);
      await load();
    } catch (e) {
      if (uploadedUrl) await discardCourseThumbnail({ url: uploadedUrl });
      setFormError(e.message);
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setBusy(true);
    try {
      await deleteCourse({ courseId: confirmDelete.id });
      setConfirmDelete(null);
      await load();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  if (error && !data) {
    return (
      <Box className="border border-line bg-surface px-4 py-10 text-center">
        <Text as="p" className="text-sm text-danger">{error}</Text>
        <Button size="sm" variant="outline" className="mt-3" onClick={load}>Retry</Button>
      </Box>
    );
  }
  if (!data) return <LibrarySkeleton />;

  const tiles = [
    { label: showArchived ? "Archived courses" : "Total courses", value: stats.total, hint: `${stats.published} published · ${stats.draft} draft`, icon: Layers, tone: "tile-accent" },
    { label: "Total enrolled", value: stats.enrolled, hint: "Across all courses", icon: Users, tone: "tile-accent" },
    { label: "Avg completion", value: `${stats.avg_completion}%`, hint: "Of enrolled learners", icon: TrendingUp, tone: "tile-success" },
    { label: "Avg score", value: `${stats.avg_score}%`, hint: "Where assessed", icon: Percent, tone: "tile-success" },
    { label: "Mandatory", value: stats.mandatory, hint: "Incl. all compliance", icon: ClipboardList, tone: "tile-warning" },
    { label: "Need attention", value: stats.needs_attention, hint: "No assessment, or under 40%", icon: AlertTriangle, tone: stats.needs_attention ? "tile-rust" : "tile-accent" },
  ];

  return (
    <Box className="space-y-4">
      {/* ── KPI tiles ── */}
      <Box className="grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-3 xl:grid-cols-6">
        {tiles.map((t) => (
          <Box key={t.label} className="bg-surface px-3.5 py-3">
            <Box className={cn("mb-2 flex size-7 items-center justify-center", t.tone)}>
              <t.icon className="size-[15px]" />
            </Box>
            <Text as="p" className="text-xl font-bold leading-none text-ink">{t.value}</Text>
            <Text as="p" className="mt-1 text-[10.5px] font-medium text-text-2">{t.label}</Text>
            <Text as="p" className="mt-0.5 text-[10px] text-text-3">{t.hint}</Text>
          </Box>
        ))}
      </Box>

      {/* ── Toolbar ── */}
      <Box className="flex flex-wrap items-center gap-2">
        <Box className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-3" />
          <Input
            placeholder="Search title, category, tags…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 bg-white pl-9 text-[13px]"
          />
        </Box>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="h-9 w-[160px] text-[12.5px]"><SelectValue>{filterCategory === "all" ? "All categories" : filterCategory}</SelectValue></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-9 w-[130px] text-[12.5px]">
            <SelectValue>
              {{ all: "All status", published: "Published", draft: "Draft" }[filterStatus]}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortOrder} onValueChange={setSortOrder}>
          <SelectTrigger className="h-9 w-[150px] text-[12.5px]">
            <SelectValue>
              {{ newest: "Newest first", alpha: "A → Z", enrolled: "Most enrolled" }[sortOrder]}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="alpha">A → Z</SelectItem>
            <SelectItem value="enrolled">Most enrolled</SelectItem>
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant="outline"
          onClick={() => setShowArchived((v) => !v)}
          className={cn("h-9 gap-1.5 rounded-none text-[12.5px] font-semibold",
            showArchived && "bg-navy text-accent-soft hover:bg-navy hover:text-accent-soft")}
        >
          <Archive className="size-3.5" />
          {showArchived
            ? "← Active"
            : `Archived${data.archived_count ? ` (${data.archived_count})` : ""}`}
        </Button>

        <Button
          onClick={openCreate}
          disabled={showArchived}
          title={showArchived ? "Switch to the active library to add a course" : undefined}
          className="h-9 gap-1.5 rounded-none bg-navy px-4 text-[12.5px] font-bold text-accent-soft hover:bg-accent-blue hover:text-white"
        >
          <Plus className="size-3.5" />
          Add course
        </Button>
      </Box>

      {/* ── Bulk action bar ── */}
      {selected.size > 0 && (
        <Box className="flex flex-wrap items-center gap-2 bg-navy px-4 py-2.5">
          <Text as="span" className="text-[12.5px] font-semibold text-on-navy">
            {selected.size} selected
          </Text>
          <Box className="flex-1" />
          {!showArchived ? (
            <>
              <BulkButton onClick={() => runBulk("publish")} disabled={busy}>Publish</BulkButton>
              <BulkButton onClick={() => runBulk("unpublish")} disabled={busy}>Unpublish</BulkButton>
              <BulkButton onClick={() => runBulk("archive")} disabled={busy}>Archive</BulkButton>
            </>
          ) : (
            <BulkButton onClick={() => runBulk("restore")} disabled={busy}>Restore</BulkButton>
          )}
          <BulkButton onClick={() => setSelected(new Set())} disabled={busy} plain>Clear</BulkButton>
        </Box>
      )}

      {/* ── Select all + count ── */}
      <Box className="flex items-center gap-3">
        {filtered.length > 0 && (
          <label className="flex cursor-pointer items-center gap-2 text-[12px] text-text-2">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() => setSelected(allSelected ? new Set() : new Set(filtered.map((c) => c.id)))}
              className="size-3.5 accent-accent-blue"
            />
            Select all
          </label>
        )}
        <Text as="span" className="text-[12px] text-text-3">
          {filtered.length} of {courses.length} {showArchived ? "archived " : ""}
          course{courses.length === 1 ? "" : "s"}
        </Text>
      </Box>

      {/* ── Card grid ── */}
      {filtered.length === 0 ? (
        <Box className="border border-dashed border-line-strong bg-surface px-6 py-16 text-center">
          <BookOpen className="mx-auto mb-3 size-8 text-text-3" />
          <Text as="p" className="text-[13px] font-semibold text-ink">
            No {showArchived ? "archived " : ""}courses match your filters
          </Text>
          <Text as="p" className="mt-1 text-[12px] text-text-2">
            {showArchived
              ? "Courses you archive from the active library appear here."
              : "Clear a filter, or add your first course."}
          </Text>
        </Box>
      ) : (
        <Box className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((course, index) => (
            <CourseCard
              key={course.id}
              course={course}
              // The first row is above the fold on every viewport we support.
              priority={index < 3}
              archived={showArchived}
              selected={selected.has(course.id)}
              busy={busy}
              onToggleSelect={() => toggleOne(course.id)}
              onOpen={() => router.push(
                course.session_id
                  ? `/admin/sessions?session=${course.session_id}`
                  : `/admin/courses/${course.id}`,
              )}
              onEdit={() => openEdit(course)}
              onPublish={() => runOne(course.is_active ? "unpublish" : "publish", course.id)}
              onArchive={() => runOne(showArchived ? "restore" : "archive", course.id)}
              onDelete={() => setConfirmDelete(course)}
              onOpenRoster={() => setRoster(course)}
            />
          ))}
        </Box>
      )}

      <CourseDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        form={form}
        setForm={setForm}
        thumbnailFile={thumbnailFile}
        setThumbnailFile={setThumbnailFile}
        saving={saving}
        error={formError}
        onSave={handleSave}
      />

      <RosterDialog course={roster} onClose={() => setRoster(null)} />

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => { if (!o) setConfirmDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete course</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes <strong>{confirmDelete?.name}</strong>, its
              modules and lessons, and every learner&apos;s progress on it. This
              cannot be undone — archive it instead if you only want it out of the way.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={busy}
              className="bg-danger text-white hover:bg-danger/90"
            >
              {busy ? "Deleting…" : "Delete course"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Box>
  );
}

function BulkButton({ children, onClick, disabled, plain = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "px-3 py-1.5 text-[11.5px] font-semibold text-on-navy transition-colors disabled:opacity-50",
        plain ? "hover:underline" : "border border-white/25 hover:bg-white/10",
      )}
    >
      {children}
    </button>
  );
}

/* ── One course card ─────────────────────────────────────────────────────── */

function CourseCard({
  course, archived, selected, busy, priority = false,
  onToggleSelect, onOpen, onEdit, onPublish, onArchive, onDelete, onOpenRoster,
}) {
  const colour = categoryColor(course.category);
  const mandatory = course.mandatory ?? isMandatory(course);
  const compliance = course.category === COMPLIANCE_CATEGORY;
  const duration = formatDuration(course.total_duration_minutes);
  const enrolled = Number(course.enrollments_count ?? 0);
  const done = Number(course.completed_count ?? 0);
  const inProgress = Number(course.in_progress_count ?? 0);
  const notStarted = Number(course.not_started_count ?? 0);
  const pct = (n) => (enrolled ? (n / enrolled) * 100 : 0);

  // A session's companion training is generated from the session and kept in
  // step with it, so the API refuses edits here (422, §10.7). The actions say
  // so rather than offering something that will be rejected.
  const isSessionTraining = Boolean(course.session_id);

  const statusLabel = archived ? "Archived" : course.is_active ? "Published" : "Draft";
  const statusTint = archived ? "rgba(90,107,130,.12)" : course.is_active ? "rgba(26,94,58,.10)" : "rgba(138,98,0,.10)";
  const statusFg = archived ? "#5A6B82" : course.is_active ? BRAND.success : BRAND.warning;

  return (
    <Box
      className={cn(
        "flex flex-col border border-line bg-surface transition-colors",
        selected && "outline outline-2 -outline-offset-2 outline-accent-blue",
      )}
    >
      {/* ── Artwork, with the select box and the importance ribbon over it ── */}
      <Box className="relative h-[120px] shrink-0 cursor-pointer" onClick={onOpen}>
        <CourseArt
          thumbnailUrl={course.thumbnail_url}
          alt=""
          scrim="light"
          priority={priority}
          className="h-full w-full"
          sizes="(max-width: 768px) 100vw, 33vw"
        />
        <label
          className="absolute left-2 top-2 flex size-[22px] cursor-pointer items-center justify-center border border-line bg-white"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            aria-label={`Select ${course.name}`}
            className="size-3 accent-accent-blue"
          />
        </label>
        {mandatory && (
          <Text
            as="span"
            className="absolute right-2 top-2 px-2 py-[3px] text-[9px] font-extrabold uppercase tracking-wider text-white"
            style={{ background: BRAND.danger }}
          >
            {compliance ? "Compliance" : "Mandatory"}
          </Text>
        )}
      </Box>

      {/* ── Body ── */}
      <Box className="flex flex-1 flex-col px-4 py-3">
        <Box className="mb-2 flex flex-wrap items-center gap-1.5">
          {course.category && (
            <Pill bg={categoryTint(course.category)} fg={colour}>{course.category}</Pill>
          )}
          <Pill bg="var(--spectra-surface-3)" fg="var(--spectra-text-2)">
            Modules: {course.modules_count ?? 0}
          </Pill>
          <Pill bg={statusTint} fg={statusFg}>{statusLabel}</Pill>
          {isSessionTraining && (
            <Pill bg="rgba(59,111,212,.10)" fg={BRAND.accent}>Session</Pill>
          )}
        </Box>

        <Text
          as="h3"
          className="line-clamp-2 min-h-[2.4rem] cursor-pointer text-[14.5px] font-bold leading-snug tracking-tight text-ink hover:text-accent-blue"
          title={course.name}
          onClick={onOpen}
        >
          {course.name}
        </Text>

        <Box className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-text-3">
          <Text as="span" className="inline-flex items-center gap-1">
            <CalendarDays className="size-3" />{formatDate(course.created_at)}
          </Text>
          {duration && (
            <Text as="span" className="inline-flex items-center gap-1">
              <Clock className="size-3" />{duration}
            </Text>
          )}
          {compliance && course.expiry_months && (
            <Text as="span" className="font-semibold text-danger">
              Renews every {course.expiry_months} mo
            </Text>
          )}
        </Box>

        {/* ── Stats ── */}
        <Box className="mt-3 flex items-center justify-between border-t border-line pt-3">
          {/* Enrolled is a BUTTON — it opens the roster. The other two are
              plain figures, so only this one gets the affordance: an
              underline on hover and a pointer, rather than all three looking
              clickable when two are not. */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onOpenRoster?.(); }}
            disabled={enrolled === 0}
            title={enrolled === 0 ? "Nobody is enrolled yet" : `View the ${enrolled} learners enrolled`}
            className={cn(
              "group flex-1 rounded-none py-0.5 text-center transition-colors",
              enrolled === 0
                ? "cursor-default"
                : "cursor-pointer hover:bg-accent-tint",
            )}
          >
            <Text
              as="span"
              className={cn(
                "block text-base font-bold leading-none",
                enrolled === 0 ? "text-ink" : "text-accent-blue group-hover:underline",
              )}
            >
              {enrolled}
            </Text>
            <Text as="span" className="mt-1 block font-mono text-[8.5px] font-semibold uppercase tracking-wider text-text-3">
              Enrolled
            </Text>
          </button>
          {[
            { value: `${course.completion_pct ?? 0}%`, label: "Complete" },
            { value: `${course.avg_score ?? 0}%`, label: "Avg score" },
          ].map((s) => (
            <Box key={s.label} className="flex-1 text-center">
              <Text as="p" className="text-base font-bold leading-none text-ink">{s.value}</Text>
              <Text as="p" className="mt-1 font-mono text-[8.5px] font-semibold uppercase tracking-wider text-text-3">
                {s.label}
              </Text>
            </Box>
          ))}
        </Box>

        {/* ── Breakdown. Every figure is counted, never estimated. ── */}
        <Box className="mt-2 flex flex-wrap items-center gap-3 text-[10.5px] text-text-2">
          <Text as="span" className="inline-flex items-center gap-1.5">
            <Box className="size-2 shrink-0" style={{ background: BRAND.success }} />{done} completed
          </Text>
          <Text as="span" className="inline-flex items-center gap-1.5">
            <Box className="size-2 shrink-0" style={{ background: BRAND.accent }} />{inProgress} in progress
          </Text>
          <Text as="span" className="inline-flex items-center gap-1.5">
            <Box className="size-2 shrink-0" style={{ background: BRAND.lineStrong }} />{notStarted} not started
          </Text>
        </Box>
        <Box className="mt-2 flex h-1.5 w-full overflow-hidden bg-surface-3">
          <Box style={{ width: `${pct(done)}%`, background: BRAND.success }} />
          <Box style={{ width: `${pct(inProgress)}%`, background: BRAND.accent }} />
          <Box style={{ width: `${pct(notStarted)}%`, background: BRAND.lineStrong }} />
        </Box>
      </Box>

      {/* ── Actions ── */}
      <Box className="flex border-t border-line">
        {archived ? (
          <>
            <CardAction icon={ArchiveRestore} label="Restore to the library" onClick={onArchive} disabled={busy} tone="text-success hover:!bg-success hover:!text-white" />
            <CardAction icon={Trash2} label="Delete permanently" onClick={onDelete} disabled={busy} danger />
          </>
        ) : (
          <>
            <CardAction icon={Layers} label="Manage modules & lessons" onClick={onOpen} disabled={busy} />
            <CardAction
              icon={Pencil}
              label={isSessionTraining ? "Edit this in Sessions — a session training is generated" : "Edit course details"}
              onClick={onEdit}
              disabled={busy || isSessionTraining}
            />
            <CardAction
              icon={course.is_active ? Ban : CheckCircle2}
              label={isSessionTraining ? "A session training follows its session" : course.is_active ? "Unpublish" : "Publish"}
              onClick={onPublish}
              disabled={busy || isSessionTraining}
            />
            <CardAction
              icon={Archive}
              label={isSessionTraining ? "Delete the session to remove its training" : "Archive"}
              onClick={onArchive}
              disabled={busy || isSessionTraining}
            />
            <CardAction icon={Trash2} label="Delete" onClick={onDelete} disabled={busy} danger />
          </>
        )}
      </Box>
    </Box>
  );
}

/* ── Enrolled-learner roster ─────────────────────────────────────────────── */

/**
 * Who is enrolled on one course, opened from the card's Enrolled count.
 *
 * Reads `GET /admin/courses/:id/assignments`, which already existed for the
 * course detail page — the card needed a popup, not a new endpoint. Fetched on
 * open rather than with the library: eleven rosters nobody has asked for is
 * eleven queries and a payload several times the size of the grid itself.
 */
function RosterDialog({ course, onClose }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!course) { setRows(null); setError(null); return undefined; }
    let alive = true;
    setRows(null);
    setError(null);
    fetchAssignments({ courseId: course.id })
      .then((d) => alive && setRows(d.assignments ?? []))
      .catch((e) => alive && setError(e.message || "Could not load the roster"));
    return () => { alive = false; };
  }, [course]);

  return (
    <Dialog open={!!course} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[85vh] overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-line px-5 py-4">
          <DialogTitle className="text-[15px]">Enrolled learners</DialogTitle>
          <Text as="p" className="mt-0.5 text-[12px] text-text-3">
            {course?.name}
            {rows ? ` · ${rows.length} enrolled` : ""}
          </Text>
        </DialogHeader>

        <Box className="max-h-[60vh] overflow-y-auto">
          {error ? (
            <Box className="px-5 py-10 text-center">
              <Text as="p" className="text-[13px] text-danger">{error}</Text>
            </Box>
          ) : !rows ? (
            <Box className="space-y-2 p-5">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-11" />)}
            </Box>
          ) : rows.length === 0 ? (
            <Box className="px-5 py-12 text-center">
              <Users className="mx-auto mb-2 size-7 text-text-3" />
              <Text as="p" className="text-[12.5px] text-text-2">
                Nobody is enrolled on this course yet.
              </Text>
            </Box>
          ) : (
            <table className="w-full border-collapse">
              <thead className="sticky top-0">
                <tr>
                  {["Learner", "Progress", "Assigned"].map((h, i) => (
                    <th
                      key={h}
                      className={cn(
                        "border-b border-line bg-surface-2 px-5 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.06em] text-text-3",
                        i === 0 ? "text-left" : "text-right",
                      )}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const total = Number(r.total_lessons ?? 0);
                  const done = Number(r.completed_lessons ?? 0);
                  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                  return (
                    <tr key={r.id ?? r.user_id} className="hover:bg-surface-2">
                      <td className="border-b border-line px-5 py-2.5">
                        <Text as="p" className="text-[12.5px] font-semibold text-ink">
                          {r.first_name} {r.last_name}
                        </Text>
                        <Text as="p" className="text-[11px] text-text-3">{r.email}</Text>
                      </td>
                      <td className="border-b border-line px-5 py-2.5">
                        <Box className="flex items-center justify-end gap-2">
                          <Box className="h-1.5 w-20 shrink-0 bg-surface-3">
                            <Box
                              className="h-full"
                              style={{ width: `${pct}%`, background: progressFill(pct) }}
                            />
                          </Box>
                          <Text as="span" className="w-9 shrink-0 text-right text-[12px] font-semibold text-text-2">
                            {pct}%
                          </Text>
                        </Box>
                        <Text as="p" className="mt-0.5 text-right text-[10.5px] text-text-3">
                          {done} of {total} lessons
                        </Text>
                      </td>
                      <td className="whitespace-nowrap border-b border-line px-5 py-2.5 text-right text-[12px] text-text-2">
                        {formatDate(r.assigned_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
}

/* ── Create / edit dialog ────────────────────────────────────────────────── */

function CourseDialog({
  open, onOpenChange, editing, form, setForm,
  thumbnailFile, setThumbnailFile, saving, error, onSave,
}) {
  const compliance = form.category === COMPLIANCE_CATEGORY;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit course" : "Add course"}</DialogTitle>
        </DialogHeader>

        <Box className="space-y-4">
          <Box className="space-y-1.5">
            <Label>Course name <Text as="span" className="text-danger">*</Text></Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Data Analytics Fundamentals"
            />
          </Box>

          <DescriptionField
            value={form.description}
            onChange={(v) => setForm((p) => ({ ...p, description: v }))}
          />

          <Box className="grid gap-3 sm:grid-cols-2">
            <Box className="space-y-1.5">
              <Label>Category</Label>
              {/* `value` is always a defined string — "" for "not chosen".
                  Passing `undefined` first and a string later makes the Select
                  switch from uncontrolled to controlled, which React warns
                  about and which loses the first selection on some paths. */}
              <Select
                value={form.category}
                onValueChange={(v) => setForm((p) => ({
                  ...p,
                  category: v,
                  // Leaving Compliance clears the cadence in the form as well
                  // as on the server, so the field cannot keep a stale value
                  // the admin can no longer see.
                  expiry_months: v === COMPLIANCE_CATEGORY ? p.expiry_months : "",
                }))}
              >
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {COURSE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </Box>

            <Box className="space-y-1.5">
              <Label>Renews every</Label>
              <Select
                value={form.expiry_months}
                onValueChange={(v) => setForm((p) => ({ ...p, expiry_months: v }))}
                disabled={!compliance}
              >
                <SelectTrigger>
                  <SelectValue placeholder={compliance ? "Does not expire" : "Compliance only"} />
                </SelectTrigger>
                <SelectContent>
                  {RENEWAL_MONTHS.map((m) => (
                    <SelectItem key={m} value={String(m)}>{m} months</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Box>
          </Box>

          <Box className="space-y-1.5">
            <Label>Tags</Label>
            <Input
              value={form.tags}
              onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))}
              placeholder="comma,separated,keywords"
            />
            <Text as="p" className="text-[11px] text-text-3">
              Searchable only — nothing filters or reports on a tag.
            </Text>
          </Box>

          <ThumbnailField
            value={editing?.thumbnail_url ?? null}
            file={thumbnailFile}
            onSelect={setThumbnailFile}
            onClear={() => setThumbnailFile(null)}
            disabled={saving}
          />

          <Box className="flex items-center justify-between border border-line bg-surface-2 px-3 py-2.5">
            <Box>
              <Text as="p" className="text-[13px] font-semibold text-ink">Mandatory</Text>
              <Text as="p" className="text-[11px] text-text-3">
                {compliance
                  ? "Compliance courses are always mandatory."
                  : "Every learner assigned this must complete it."}
              </Text>
            </Box>
            {/* Forced on and locked for compliance: the server derives it that
                way regardless, so an unticked box here would be a lie. */}
            <Switch
              checked={compliance || form.is_mandatory}
              disabled={compliance}
              onCheckedChange={(v) => setForm((p) => ({ ...p, is_mandatory: v }))}
            />
          </Box>

          <Box className="flex items-center justify-between border border-line bg-surface-2 px-3 py-2.5">
            <Box>
              <Text as="p" className="text-[13px] font-semibold text-ink">Published</Text>
              <Text as="p" className="text-[11px] text-text-3">
                Draft courses are hidden from learners.
              </Text>
            </Box>
            <Switch
              checked={form.is_active}
              onCheckedChange={(v) => setForm((p) => ({ ...p, is_active: v }))}
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
          <Button
            onClick={onSave}
            disabled={saving}
            className="bg-navy text-accent-soft hover:bg-accent-blue hover:text-white"
          >
            {saving ? "Saving…" : editing ? "Save changes" : "Create course"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
