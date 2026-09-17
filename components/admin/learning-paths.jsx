"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive, ArchiveRestore, Award, CheckCircle2, Clock, Layers, Pencil,
  Percent, Plus, Search, Trash2, TrendingUp, Users, X,
} from "lucide-react";

import Box from "@/components/ui/box";
import Text from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useAuth } from "@/hooks/use-auth";
import {
  bulkLearningPaths, createLearningPath, fetchAdminCourses, fetchLearningPath,
  fetchLearningPathLearners, fetchLearningPaths, setLearningPathCourses,
  updateLearningPath,
} from "@/services/api/admin/admin-api";
import { cn } from "@/lib/utils";

const SORTS = [
  { key: "newest", label: "Newest first" },
  { key: "alpha", label: "A → Z" },
  { key: "enrolled", label: "Most enrolled" },
  { key: "completion", label: "Highest completion" },
];

const EMPTY_FORM = {
  title: "", description: "", tag: "",
  badge_label: "", points_bonus: "200", is_active: true,
};

/**
 * The Learning Paths builder.
 *
 * This REPLACED a page built entirely on a hardcoded `SEED_JOURNEYS` array —
 * it made no API calls at all, while eleven working endpoints sat behind it
 * and `journeys` held zero rows. An admin could fill the form, see a card
 * appear, and lose it on refresh. That is the screen-that-lies failure
 * (BACKEND_STRUCTURE §5.2.1) in its purest form, so the primary job here was
 * wiring, not styling.
 */
export function LearningPaths() {
  const { user } = useAuth();

  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [showArchived, setShowArchived] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");
  const [selected, setSelected] = useState(new Set());
  const [busy, setBusy] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const [confirm, setConfirm] = useState(null);
  const [coursesFor, setCoursesFor] = useState(null);
  const [rosterFor, setRosterFor] = useState(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      setData(await fetchLearningPaths({ archived: showArchived }));
      setError(null);
    } catch (e) {
      setError(e.message);
      setData({ journeys: [], total: 0, archived_count: 0 });
    }
  }, [user, showArchived]);

  useEffect(() => { load(); }, [load]);

  // Switching sets invalidates the selection: those ids are no longer on screen
  // and a bulk action would act on rows the admin can no longer see.
  useEffect(() => { setSelected(new Set()); }, [showArchived]);

  const paths = data?.journeys ?? [];

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = paths.filter((p) => {
      const matchesSearch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        (p.tag ?? "").toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" ? p.is_active : !p.is_active);
      return matchesSearch && matchesStatus;
    });
    if (sortOrder === "alpha") rows = [...rows].sort((a, b) => a.title.localeCompare(b.title));
    else if (sortOrder === "enrolled") rows = [...rows].sort((a, b) => b.learners_count - a.learners_count);
    else if (sortOrder === "completion") rows = [...rows].sort((a, b) => b.completion_pct - a.completion_pct);
    return rows;
  }, [paths, search, statusFilter, sortOrder]);

  /** Tiles are reduced from the rows on screen, so they cannot disagree. */
  const kpis = useMemo(() => {
    const enrolled = paths.reduce((a, p) => a + p.learners_count, 0);
    const withCompletion = paths.filter((p) => p.learners_count > 0);
    const scored = paths.filter((p) => p.avg_score !== null);
    return {
      total: paths.length,
      enrolled,
      avgCompletion: withCompletion.length
        ? Math.round(withCompletion.reduce((a, p) => a + p.completion_pct, 0) / withCompletion.length)
        : 0,
      avgScore: scored.length
        ? Math.round(scored.reduce((a, p) => a + p.avg_score, 0) / scored.length)
        : null,
      active: paths.filter((p) => p.is_active).length,
      draft: paths.filter((p) => !p.is_active).length,
    };
  }, [paths]);

  const allVisibleSelected = visible.length > 0 && visible.every((p) => selected.has(p.id));

  function toggleAll() {
    setSelected(allVisibleSelected ? new Set() : new Set(visible.map((p) => p.id)));
  }

  function toggleOne(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function runBulk(action, ids = [...selected]) {
    if (ids.length === 0) return;
    setBusy(true); setError(null);
    try {
      const res = await bulkLearningPaths({ ids, action });
      // The count is reported rather than assumed: a selection spanning a
      // platform-owned path affects fewer rows than it named, and saying so is
      // better than a silent partial success.
      if (res.affected < res.requested) {
        setError(
          `${res.affected} of ${res.requested} updated — the rest are not this ` +
          `organisation's to change, or were archived.`,
        );
      }
      setSelected(new Set());
      setConfirm(null);
      await load();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  function openCreate() {
    setEditing(null); setForm(EMPTY_FORM); setFormError(null); setDialogOpen(true);
  }

  function openEdit(path) {
    setEditing(path);
    setForm({
      title: path.title ?? "",
      description: path.description ?? "",
      tag: path.tag ?? "",
      badge_label: path.badge_label ?? "",
      points_bonus: String(path.points_bonus ?? 200),
      is_active: Boolean(path.is_active),
    });
    setFormError(null);
    setDialogOpen(true);
  }

  async function save() {
    if (!form.title.trim()) { setFormError("Path title is required"); return; }
    if (!form.badge_label.trim()) { setFormError("Badge label is required — it is what a learner earns."); return; }
    setSaving(true); setFormError(null);
    try {
      const body = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        tag: form.tag.trim() || null,
        badge_label: form.badge_label.trim(),
        points_bonus: Number(form.points_bonus) || 0,
        is_active: form.is_active,
      };
      if (editing) await updateLearningPath({ pathId: editing.id, data: body });
      else await createLearningPath({ data: body });
      setDialogOpen(false);
      await load();
    } catch (e) { setFormError(e.message); } finally { setSaving(false); }
  }

  if (!data) {
    return (
      <Box className="space-y-4">
        <Skeleton className="h-[86px] w-full" />
        <Skeleton className="h-10 w-full" />
        <Box className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[190px] w-full" />)}
        </Box>
      </Box>
    );
  }

  return (
    <Box className="space-y-4">
      {/* ── KPI tiles ── */}
      <Box className="grid gap-px border border-line bg-line sm:grid-cols-3 xl:grid-cols-6">
        <Kpi icon={TrendingUp} tone="accent" value={kpis.total} label="Total paths" />
        <Kpi icon={Users} tone="warning" value={kpis.enrolled} label="Total enrolled" />
        <Kpi icon={Percent} tone="accent" value={`${kpis.avgCompletion}%`} label="Avg completion" />
        <Kpi icon={Award} tone="success" value={kpis.avgScore === null ? "—" : `${kpis.avgScore}%`} label="Avg score" />
        <Kpi icon={CheckCircle2} tone="success" value={kpis.active} label="Active" />
        <Kpi icon={Clock} tone="rust" value={kpis.draft} label="Draft" />
      </Box>

      {/* ── Toolbar ── */}
      <Box className="flex flex-wrap items-center gap-2">
        <Box className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-text-3" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search path title, tag…"
            className="h-9 bg-surface pl-8 text-[12.5px]"
          />
        </Box>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-[140px] text-[12.5px]">
            <SelectValue>
              {statusFilter === "all" ? "All status" : statusFilter === "active" ? "Active" : "Draft"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortOrder} onValueChange={setSortOrder}>
          <SelectTrigger className="h-9 w-[180px] text-[12.5px]">
            <SelectValue>{SORTS.find((s) => s.key === sortOrder)?.label}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {SORTS.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          onClick={() => setShowArchived((v) => !v)}
          className={cn(
            "h-9 cursor-pointer gap-1.5 rounded-none text-[12.5px] font-semibold",
            showArchived && "border-navy bg-navy text-accent-soft hover:bg-navy-soft hover:text-accent-soft",
          )}
        >
          {showArchived ? <ArchiveRestore className="size-3.5" /> : <Archive className="size-3.5" />}
          {showArchived ? "Active paths" : `Archived${data.archived_count ? ` (${data.archived_count})` : ""}`}
        </Button>

        <Button
          onClick={openCreate}
          disabled={showArchived}
          className="h-9 cursor-pointer gap-1.5 rounded-none bg-navy px-3.5 text-[12.5px] font-bold text-accent-soft hover:bg-accent-blue hover:text-white"
        >
          <Plus className="size-3.5" />Create path
        </Button>
      </Box>

      {error && (
        <Box className="border border-danger/30 bg-danger/10 px-3 py-2">
          <Text as="p" className="text-[12.5px] text-danger">{error}</Text>
        </Box>
      )}

      {/* ── Bulk bar ── */}
      {selected.size > 0 && (
        <Box className="flex flex-wrap items-center gap-2 bg-navy px-4 py-2.5">
          <Text as="span" className="text-[12.5px] font-semibold text-white">
            {selected.size} selected
          </Text>
          <Box className="flex-1" />
          {!showArchived ? (
            <>
              <BulkBtn onClick={() => runBulk("activate")} disabled={busy}>Activate</BulkBtn>
              <BulkBtn onClick={() => runBulk("draft")} disabled={busy}>Move to draft</BulkBtn>
              <BulkBtn onClick={() => runBulk("archive")} disabled={busy}>Archive</BulkBtn>
            </>
          ) : (
            <BulkBtn onClick={() => runBulk("restore")} disabled={busy}>Restore</BulkBtn>
          )}
          <BulkBtn danger onClick={() => setConfirm({ bulk: true, count: selected.size })} disabled={busy}>
            Delete
          </BulkBtn>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="cursor-pointer px-2 text-[11.5px] text-white/80 hover:text-white"
          >
            Clear
          </button>
        </Box>
      )}

      {/* ── Select-all + count ── */}
      {visible.length > 0 && (
        <Box className="flex items-center gap-2.5">
          <Checkbox
            checked={allVisibleSelected}
            onCheckedChange={toggleAll}
            aria-label="Select all paths"
            className="cursor-pointer"
          />
          <Text as="p" className="text-[12px] text-text-3">
            {visible.length} path{visible.length === 1 ? "" : "s"}
            {showArchived && " · archived"}
          </Text>
        </Box>
      )}

      {/* ── Cards ── */}
      {visible.length === 0 ? (
        <EmptyState showArchived={showArchived} filtered={paths.length > 0} onCreate={openCreate} />
      ) : (
        <Box className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {visible.map((path) => (
            <PathCard
              key={path.id}
              path={path}
              selected={selected.has(path.id)}
              archived={showArchived}
              busy={busy}
              onToggle={() => toggleOne(path.id)}
              onEdit={() => openEdit(path)}
              onCourses={() => setCoursesFor(path)}
              onRoster={() => setRosterFor(path)}
              onArchive={() => runBulk(showArchived ? "restore" : "archive", [path.id])}
              onDelete={() => setConfirm({ path })}
            />
          ))}
        </Box>
      )}

      <PathDialog
        open={dialogOpen} onOpenChange={setDialogOpen} editing={editing}
        form={form} setForm={setForm} saving={saving} error={formError} onSave={save}
      />

      {coursesFor && (
        <CoursesDialog
          path={coursesFor}
          onClose={() => setCoursesFor(null)}
          onSaved={load}
        />
      )}

      {rosterFor && (
        <RosterDialog path={rosterFor} onClose={() => setRosterFor(null)} />
      )}

      <AlertDialog open={!!confirm} onOpenChange={(o) => { if (!o) setConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.bulk ? `Delete ${confirm.count} learning paths` : "Delete learning path"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.bulk
                ? "These paths and every learner's place on them will be permanently deleted."
                : <>
                    <strong>{confirm?.path?.title}</strong> will be permanently deleted,
                    along with {confirm?.path?.learners_count ?? 0} learner
                    {confirm?.path?.learners_count === 1 ? "'s" : "s'"} place on it.
                  </>}
              {" "}Courses inside the path are not deleted. To take a path out of
              circulation without losing anybody's progress, archive it instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => runBulk("delete", confirm?.bulk ? [...selected] : [confirm.path.id])}
              disabled={busy}
              className="bg-danger text-white hover:bg-danger/90"
            >
              {busy ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Box>
  );
}

/* ── Pieces ─────────────────────────────────────────────────────────────── */

const TONE_TILE = {
  accent: "tile-accent", success: "tile-success",
  warning: "tile-warning", rust: "tile-rust",
};

function Kpi({ icon: Icon, tone, value, label }) {
  return (
    <Box className="flex items-center gap-3 bg-surface px-4 py-3">
      <Box className={cn("flex size-8 shrink-0 items-center justify-center", TONE_TILE[tone])}>
        <Icon className="size-4" />
      </Box>
      <Box className="min-w-0">
        <Text as="p" className="text-xl font-bold leading-none text-ink">{value}</Text>
        <Text as="p" className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-text-3">
          {label}
        </Text>
      </Box>
    </Box>
  );
}

function BulkBtn({ children, onClick, disabled, danger = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "cursor-pointer border px-3 py-1.5 text-[11.5px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        danger
          ? "border-danger bg-danger text-white hover:bg-danger/85"
          : "border-white/25 bg-transparent text-white hover:bg-white/10",
      )}
    >
      {children}
    </button>
  );
}

function PathCard({
  path, selected, archived, busy,
  onToggle, onEdit, onCourses, onRoster, onArchive, onDelete,
}) {
  return (
    <Box
      className={cn(
        "flex flex-col border bg-surface transition-colors",
        selected ? "border-accent-blue" : "border-line hover:border-line-strong",
      )}
    >
      <Box className="flex items-start gap-2.5 px-4 pt-3.5">
        <Checkbox
          checked={selected}
          onCheckedChange={onToggle}
          aria-label={`Select ${path.title}`}
          className="mt-0.5 cursor-pointer"
        />
        <Box className="min-w-0 flex-1">
          <Box className="flex flex-wrap items-center gap-2">
            <Text as="span" className={path.is_active ? "chip chip-complete" : "chip chip-idle"}>
              {path.is_active ? "Active" : "Draft"}
            </Text>
            {path.tag && <Text as="span" className="chip chip-progress">{path.tag}</Text>}
            {archived && <Text as="span" className="chip chip-warning">Archived</Text>}
          </Box>
          <Text as="h3" className="mt-2 line-clamp-2 text-[14px] font-bold leading-snug text-ink">
            {path.title}
          </Text>
          {/* Two lines reserved even when empty, so cards in a row line up
              (§10.3.2). */}
          <Text as="p" className="mt-1 line-clamp-2 min-h-[2.75rem] text-[12px] leading-relaxed text-text-2">
            {path.description ?? ""}
          </Text>
        </Box>
      </Box>

      <Box className="mt-1 grid grid-cols-3 gap-px border-y border-line bg-line">
        <Stat value={path.courses_count} label="Courses" />
        {/* Clickable, so it says so (§10.3.1.2). */}
        <button
          type="button"
          onClick={onRoster}
          className="cursor-pointer bg-surface px-3 py-2.5 text-left transition-colors hover:bg-surface-2"
        >
          <Text as="p" className="text-[15px] font-bold leading-none text-accent-blue underline-offset-2 hover:underline">
            {path.learners_count}
          </Text>
          <Text as="p" className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.1em] text-text-3">
            Enrolled
          </Text>
        </button>
        <Stat value={`${path.completion_pct}%`} label="Complete" />
      </Box>

      <Box className="flex items-center gap-1 px-3 py-2">
        <CardAction icon={Layers} label="Manage courses" onClick={onCourses} disabled={archived || busy} />
        <CardAction icon={Pencil} label="Edit path" onClick={onEdit} disabled={archived || busy} />
        <CardAction
          icon={archived ? ArchiveRestore : Archive}
          label={archived ? "Restore path" : "Archive path"}
          onClick={onArchive}
          disabled={busy}
        />
        <Box className="flex-1" />
        <CardAction icon={Trash2} label="Delete path" danger onClick={onDelete} disabled={busy} />
      </Box>
    </Box>
  );
}

function Stat({ value, label }) {
  return (
    <Box className="bg-surface px-3 py-2.5">
      <Text as="p" className="text-[15px] font-bold leading-none text-ink">{value}</Text>
      <Text as="p" className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.1em] text-text-3">
        {label}
      </Text>
    </Box>
  );
}

function CardAction({ icon: Icon, label, onClick, danger = false, disabled = false }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex size-7 items-center justify-center border border-line transition-colors",
        disabled
          ? "cursor-not-allowed bg-surface-2 text-text-3/50"
          : danger
            ? "cursor-pointer bg-surface text-text-2 hover:bg-danger hover:text-white"
            : "cursor-pointer bg-surface text-text-2 hover:bg-accent-blue hover:text-white",
      )}
    >
      <Icon className="size-3.5" />
    </button>
  );
}

function EmptyState({ showArchived, filtered, onCreate }) {
  return (
    <Box className="border border-dashed border-line-strong bg-surface px-6 py-16 text-center">
      <TrendingUp className="mx-auto mb-3 size-8 text-text-3" />
      <Text as="h3" className="text-[14px] font-bold text-ink">
        {showArchived ? "No archived paths" : filtered ? "Nothing matches those filters" : "No learning paths yet"}
      </Text>
      <Text as="p" className="mx-auto mt-1.5 max-w-md text-[12.5px] leading-relaxed text-text-2">
        {showArchived
          ? "Archived paths are taken out of circulation without losing anybody's progress."
          : filtered
            ? "Clear the search or widen the status filter."
            : "A path is an ordered run of existing courses with a badge at the end. Create one, then add its courses."}
      </Text>
      {!showArchived && !filtered && (
        <Button
          onClick={onCreate}
          className="mt-4 cursor-pointer gap-1.5 rounded-none bg-navy text-accent-soft hover:bg-accent-blue hover:text-white"
        >
          <Plus className="size-3.5" />Create path
        </Button>
      )}
    </Box>
  );
}

/* ── Create / edit ──────────────────────────────────────────────────────── */

function PathDialog({ open, onOpenChange, editing, form, setForm, saving, error, onSave }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit learning path" : "Create learning path"}</DialogTitle>
        </DialogHeader>

        <Box className="space-y-4">
          <Box className="space-y-1.5">
            <Label>Title <Text as="span" className="text-danger">*</Text></Label>
            <Input
              value={form.title} maxLength={120}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="e.g. First-Time Manager Path"
            />
          </Box>

          <DescriptionField
            value={form.description}
            onChange={(v) => setForm((p) => ({ ...p, description: v }))}
          />

          <Box className="grid gap-3 sm:grid-cols-2">
            <Box className="space-y-1.5">
              <Label>Tag</Label>
              <Input
                value={form.tag} maxLength={60}
                onChange={(e) => setForm((p) => ({ ...p, tag: e.target.value }))}
                placeholder="e.g. Sales · Role Path"
              />
              <Text as="p" className="text-[10.5px] text-text-3">
                Shown on the card and searchable. Free text.
              </Text>
            </Box>
            <Box className="space-y-1.5">
              <Label>Points bonus</Label>
              <Input
                type="number" min="0" value={form.points_bonus}
                onChange={(e) => setForm((p) => ({ ...p, points_bonus: e.target.value }))}
              />
              <Text as="p" className="text-[10.5px] text-text-3">
                Awarded on completion, on top of the courses&apos; own points.
              </Text>
            </Box>
          </Box>

          <Box className="space-y-1.5">
            <Label>Badge label <Text as="span" className="text-danger">*</Text></Label>
            <Input
              value={form.badge_label} maxLength={80}
              onChange={(e) => setForm((p) => ({ ...p, badge_label: e.target.value }))}
              placeholder="e.g. Certified People Manager"
            />
            <Text as="p" className="text-[10.5px] text-text-3">
              What the learner earns. Shown on their achievements page.
            </Text>
          </Box>

          <Box className="flex items-center justify-between border border-line bg-surface-2 px-3 py-2.5">
            <Box>
              <Text as="p" className="text-[13px] font-semibold text-ink">Active</Text>
              <Text as="p" className="text-[11px] text-text-3">
                A draft path can be built up before anybody is put on it.
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

          {!editing && (
            <Box className="border-l-2 border-accent-blue bg-accent-tint px-3 py-2">
              <Text as="p" className="text-[11.5px] leading-relaxed text-text-2">
                Courses are added after the path exists — the API needs at least
                two before it will accept an ordering.
              </Text>
            </Box>
          )}
        </Box>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={onSave} disabled={saving} className="bg-navy text-accent-soft hover:bg-accent-blue hover:text-white">
            {saving ? "Saving…" : editing ? "Save changes" : "Create path"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── The ordered course list ─────────────────────────────────────────────
   The whole set is replaced in one call, so this edits a local ordering and
   sends it once — not a request per row.
────────────────────────────────────────────────────────────────────────── */

function CoursesDialog({ path, onClose, onSaved }) {
  const [steps, setSteps] = useState(null);
  const [library, setLibrary] = useState([]);
  const [picker, setPicker] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [detail, courses] = await Promise.all([
          fetchLearningPath({ pathId: path.id }),
          fetchAdminCourses(),
        ]);
        if (!alive) return;
        setSteps(
          (detail.journey?.courses ?? detail.courses ?? []).map((c) => ({
            course_id: c.course_id ?? c.id,
            name: c.course_name ?? c.name,
            is_required: c.is_required !== 0,
          })),
        );
        setLibrary((courses.courses ?? []).filter((c) => c.is_active && !c.archived_at));
      } catch (e) { if (alive) setError(e.message); }
    })();
    return () => { alive = false; };
  }, [path.id]);

  const available = useMemo(
    () => library.filter((c) => !(steps ?? []).some((s) => s.course_id === c.id)),
    [library, steps],
  );

  function move(index, delta) {
    setSteps((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function save() {
    if (steps.length < 2) {
      setError("A path needs at least two courses — one course is just a course.");
      return;
    }
    setSaving(true); setError(null);
    try {
      await setLearningPathCourses({
        pathId: path.id,
        courses: steps.map((s, i) => ({
          course_id: s.course_id,
          sort_order: i + 1,
          is_required: s.is_required,
        })),
      });
      onClose();
      await onSaved();
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Courses in {path.title}</DialogTitle>
        </DialogHeader>

        {steps === null ? (
          <Text as="p" className="py-6 text-center text-[12.5px] text-text-3">Loading…</Text>
        ) : (
          <Box className="space-y-4">
            <Box className="flex gap-2">
              <Select value={picker} onValueChange={setPicker}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={available.length ? "Choose a course to add" : "No more published courses"}>
                    {library.find((c) => String(c.id) === picker)?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {available.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                disabled={!picker}
                onClick={() => {
                  const course = library.find((c) => String(c.id) === picker);
                  if (!course) return;
                  setSteps((prev) => [...prev, { course_id: course.id, name: course.name, is_required: true }]);
                  setPicker("");
                }}
                className="cursor-pointer gap-1.5 rounded-none"
              >
                <Plus className="size-3.5" />Add
              </Button>
            </Box>

            {steps.length === 0 ? (
              <Box className="border border-dashed border-line-strong bg-surface-2 px-4 py-10 text-center">
                <Text as="p" className="text-[12.5px] text-text-2">
                  No courses yet. Add at least two — the order is the path.
                </Text>
              </Box>
            ) : (
              <Box className="space-y-1.5">
                {steps.map((step, i) => (
                  <Box key={step.course_id} className="flex items-center gap-2.5 border border-line bg-surface px-3 py-2">
                    <Text as="span" className="flex size-6 shrink-0 items-center justify-center bg-navy font-mono text-[11px] font-bold text-accent-soft">
                      {i + 1}
                    </Text>
                    <Text as="span" className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-ink">
                      {step.name}
                    </Text>
                    <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-[11px] text-text-2">
                      <Checkbox
                        checked={step.is_required}
                        onCheckedChange={(v) =>
                          setSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, is_required: Boolean(v) } : s)))}
                        aria-label={`${step.name} is required`}
                        className="cursor-pointer"
                      />
                      Required
                    </label>
                    <Box className="flex shrink-0 flex-col">
                      <button
                        type="button" aria-label="Move up" title="Move up"
                        disabled={i === 0} onClick={() => move(i, -1)}
                        className="h-3.5 w-6 cursor-pointer border border-line text-[8px] leading-none text-text-2 hover:bg-accent-blue hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                      >▲</button>
                      <button
                        type="button" aria-label="Move down" title="Move down"
                        disabled={i === steps.length - 1} onClick={() => move(i, 1)}
                        className="h-3.5 w-6 cursor-pointer border border-line text-[8px] leading-none text-text-2 hover:bg-accent-blue hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                      >▼</button>
                    </Box>
                    <button
                      type="button" aria-label={`Remove ${step.name}`} title="Remove"
                      onClick={() => setSteps((prev) => prev.filter((_, idx) => idx !== i))}
                      className="shrink-0 cursor-pointer text-text-3 hover:text-danger"
                    >
                      <X className="size-3.5" />
                    </button>
                  </Box>
                ))}
              </Box>
            )}

            <Text as="p" className="text-[10.5px] leading-relaxed text-text-3">
              A required step must be finished before the next one unlocks. An
              optional step is offered but never blocks the path.
            </Text>

            {error && (
              <Box className="border border-danger/30 bg-danger/10 px-3 py-2">
                <Text as="p" className="text-[12.5px] text-danger">{error}</Text>
              </Box>
            )}
          </Box>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving || steps === null} className="bg-navy text-accent-soft hover:bg-accent-blue hover:text-white">
            {saving ? "Saving…" : "Save order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Who is on this path ────────────────────────────────────────────────── */

function RosterDialog({ path, onClose }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    fetchLearningPathLearners({ pathId: path.id })
      .then((d) => alive && setRows(d.learners ?? []))
      .catch((e) => alive && setError(e.message));
    return () => { alive = false; };
  }, [path.id]);

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Learners on {path.title}</DialogTitle>
        </DialogHeader>

        {error && <Text as="p" className="text-[12.5px] text-danger">{error}</Text>}
        {rows === null && !error && (
          <Text as="p" className="py-6 text-center text-[12.5px] text-text-3">Loading…</Text>
        )}
        {rows?.length === 0 && (
          <Box className="border border-dashed border-line-strong bg-surface-2 px-4 py-10 text-center">
            <Users className="mx-auto mb-2 size-6 text-text-3" />
            <Text as="p" className="text-[12.5px] text-text-2">
              Nobody is on this path yet. Put people on it from Assign Learning.
            </Text>
          </Box>
        )}
        {rows?.length > 0 && (
          <Box className="divide-y divide-line border border-line">
            {rows.map((r) => (
              <Box key={r.user_id ?? r.id} className="flex items-center gap-3 bg-surface px-3.5 py-2.5">
                <Box className="min-w-0 flex-1">
                  <Text as="p" className="truncate text-[12.5px] font-semibold text-ink">
                    {r.name ?? `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim()}
                  </Text>
                  <Text as="p" className="truncate text-[11px] text-text-3">{r.email}</Text>
                </Box>
                <Text
                  as="span"
                  className={cn("chip shrink-0", r.completed_at ? "chip-complete" : "chip-progress")}
                >
                  {r.completed_at ? "Completed" : `${r.progress_pct ?? 0}%`}
                </Text>
              </Box>
            ))}
          </Box>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
