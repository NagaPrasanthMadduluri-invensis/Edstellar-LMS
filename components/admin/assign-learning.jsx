"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpen, Building2, CheckCircle2, Map as MapIcon, Plus, Search, Send, Users, X,
} from "lucide-react";

import Box from "@/components/ui/box";
import Text from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import {
  assignLearningPath, assignUsersBulk, fetchAdminCourses, fetchEmployees,
  fetchLearningPaths,
} from "@/services/api/admin/admin-api";
import { cn } from "@/lib/utils";

const MODES = [
  { key: "org", label: "Entire organisation", icon: Building2 },
  { key: "depts", label: "Departments", icon: Users },
  { key: "people", label: "Specific people", icon: Search },
];

/**
 * Assign Learning — one flow, three steps, one Assign button.
 *
 * This replaced a four-tab screen (Courses / Journeys / Groups / Assessments)
 * where each tab assigned one thing to one audience in its own way. Assigning
 * a course and a path to the same department meant doing the job twice in two
 * different shapes, and two of the tabs assigned nothing at all.
 *
 * The steps read as one sentence — assign THESE items to THESE people by THIS
 * date — and the footer says that sentence back with the real counts before
 * anything is sent.
 */
export function AssignLearning() {
  const { user } = useAuth();

  const [courses, setCourses] = useState(null);
  const [paths, setPaths] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loadError, setLoadError] = useState(null);

  // Step 1
  const [itemType, setItemType] = useState("course");
  const [picker, setPicker] = useState("");
  const [items, setItems] = useState([]);

  // Step 2
  const [mode, setMode] = useState("org");
  const [depts, setDepts] = useState(new Set());
  const [people, setPeople] = useState(new Set());
  const [peopleSearch, setPeopleSearch] = useState("");

  // Step 3
  const [dueDate, setDueDate] = useState("");
  /**
   * Per-person due dates, keyed by user id.
   *
   * The global date is the default for everybody; a value here overrides it
   * for one person. Typing a NEW global clears the whole map — that is what
   * "the global overwrites the individual dates" means, and the hint under the
   * field says so, because silently keeping stale overrides after an admin
   * deliberately set one date for all would be the surprising behaviour.
   */
  const [personDue, setPersonDue] = useState({});

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [c, p, e] = await Promise.all([
        fetchAdminCourses(),
        fetchLearningPaths({ status: "active" }),
        fetchEmployees(),
      ]);
      // Only what can actually be delivered: a draft or archived item, or a
      // session training (which is assigned by adding someone to its roster,
      // §10.7), must not be offered here.
      setCourses(
        (c.courses ?? []).filter((x) => x.is_active && !x.archived_at && !x.session_id),
      );
      setPaths((p.journeys ?? []).filter((x) => x.is_active && !x.archived_at));
      setEmployees(e.employees ?? []);
      setLoadError(null);
    } catch (err) {
      setLoadError(err.message);
      setCourses([]);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const departments = useMemo(
    () => [...new Set(employees.map((e) => e.department).filter(Boolean))].sort(),
    [employees],
  );

  const library = itemType === "course" ? courses ?? [] : paths;
  const chosenIds = new Set(items.filter((i) => i.type === itemType).map((i) => i.id));
  const available = library.filter((x) => !chosenIds.has(x.id));

  /** Who the current mode actually resolves to. One definition, read by the
   *  counter, the confirm dialog and the send — so they cannot disagree. */
  const audience = useMemo(() => {
    if (mode === "org") return employees.map((e) => e.id);
    if (mode === "depts") return employees.filter((e) => depts.has(e.department)).map((e) => e.id);
    return [...people];
  }, [mode, employees, depts, people]);

  const visiblePeople = useMemo(() => {
    const q = peopleSearch.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter(
      (e) =>
        `${e.first_name} ${e.last_name}`.toLowerCase().includes(q) ||
        (e.email ?? "").toLowerCase().includes(q) ||
        (e.department ?? "").toLowerCase().includes(q),
    );
  }, [employees, peopleSearch]);

  function addItem() {
    const row = library.find((x) => String(x.id) === picker);
    if (!row) return;
    setItems((prev) => [
      ...prev,
      { type: itemType, id: row.id, name: row.name ?? row.title },
    ]);
    setPicker("");
  }

  function reset() {
    setItems([]); setMode("org"); setDepts(new Set()); setPeople(new Set());
    setPeopleSearch(""); setDueDate(""); setPersonDue({});
    setResult(null); setError(null);
  }

  /**
   * The audience grouped by the date they actually resolve to.
   *
   * Per-person dates could have meant one request per learner. They do not:
   * the bulk endpoint takes one date for a set of user ids, so the audience is
   * bucketed by resolved date and each bucket goes in one set-based call. With
   * nobody overridden that is ONE call per item — the common case is unchanged
   * — and three people on their own dates is four, not forty.
   */
  const dueBuckets = useMemo(() => {
    const buckets = new Map();
    for (const id of audience) {
      const resolved = personDue[id] || dueDate || null;
      const key = resolved ?? "";
      const bucket = buckets.get(key);
      if (bucket) bucket.push(id);
      else buckets.set(key, [id]);
    }
    return [...buckets.entries()].map(([date, ids]) => ({ date: date || null, ids }));
  }, [audience, personDue, dueDate]);

  /**
   * Send.
   *
   * One call per (item x distinct due date), never one per learner. The bulk
   * endpoints are single statements, so a department cannot end up
   * half-enrolled.
   *
   * A learning path takes no due date — its pace comes from the order of its
   * steps (§10.11) — so a path is one call for the whole audience regardless
   * of how the dates were split.
   */
  async function send() {
    setSending(true); setError(null);
    const done = [];
    const failed = [];
    for (const item of items) {
      try {
        if (item.type === "course") {
          for (const bucket of dueBuckets) {
            await assignUsersBulk({
              courseId: item.id,
              userIds: bucket.ids,
              dueDate: bucket.date,
            });
          }
        } else {
          await assignLearningPath({ pathId: item.id, userIds: audience });
        }
        done.push(item.name);
      } catch (e) {
        failed.push(`${item.name}: ${e.message}`);
      }
    }
    setSending(false);
    setConfirmOpen(false);
    if (failed.length) setError(failed.join(" · "));
    if (done.length) {
      setResult({ items: done.length, learners: audience.length });
      setItems([]);
    }
  }

  const canSend = items.length > 0 && audience.length > 0;

  if (courses === null) {
    return (
      <Box className="space-y-4">
        <Skeleton className="h-[230px] w-full" />
        <Skeleton className="h-[280px] w-full" />
      </Box>
    );
  }

  return (
    <Box className="space-y-4">
      {loadError && (
        <Box className="border border-danger/30 bg-danger/10 px-3 py-2">
          <Text as="p" className="text-[12.5px] text-danger">{loadError}</Text>
        </Box>
      )}

      {result && (
        <Box className="flex items-start gap-2.5 border border-success/40 bg-success/10 px-4 py-3">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
          <Text as="p" className="text-[12.5px] text-ink">
            Assigned <strong>{result.items}</strong> item{result.items === 1 ? "" : "s"} to{" "}
            <strong>{result.learners}</strong> learner{result.learners === 1 ? "" : "s"}.
            Anyone who already had an item keeps their progress — it is not reset.
          </Text>
        </Box>
      )}

      <Box className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
        {/* ── 1 · What ── */}
        <Box className="border border-line bg-surface p-4">
          <StepLabel n={1}>What to assign</StepLabel>

          <Box className="mt-3 flex flex-wrap gap-2">
            <Select
              value={itemType}
              onValueChange={(v) => { setItemType(v); setPicker(""); }}
            >
              <SelectTrigger className="h-9 w-[160px] text-[12.5px]">
                <SelectValue>{itemType === "course" ? "Course" : "Learning path"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="course">Course</SelectItem>
                <SelectItem value="path">Learning path</SelectItem>
              </SelectContent>
            </Select>

            <Select value={picker} onValueChange={setPicker}>
              <SelectTrigger className="h-9 min-w-[200px] flex-1 text-[12.5px]">
                <SelectValue
                  placeholder={
                    available.length
                      ? `Choose a ${itemType === "course" ? "course" : "path"}`
                      : `No published ${itemType === "course" ? "courses" : "paths"} left`
                  }
                >
                  {library.find((x) => String(x.id) === picker)?.name
                    ?? library.find((x) => String(x.id) === picker)?.title}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {available.map((x) => (
                  <SelectItem key={x.id} value={String(x.id)}>{x.name ?? x.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={addItem}
              disabled={!picker}
              className="h-9 cursor-pointer gap-1.5 rounded-none text-[12.5px]"
            >
              <Plus className="size-3.5" />Add
            </Button>
          </Box>

          <Box className="mt-3 space-y-1.5">
            {items.length === 0 ? (
              <Box className="border border-dashed border-line-strong bg-surface-2 px-4 py-8 text-center">
                <Text as="p" className="text-[12px] text-text-2">
                  Nothing chosen yet. Add one or more courses and paths — they all
                  go to the same people.
                </Text>
              </Box>
            ) : (
              items.map((item, i) => {
                const Icon = item.type === "course" ? BookOpen : MapIcon;
                return (
                  <Box
                    key={`${item.type}-${item.id}`}
                    className="flex items-center gap-2.5 border border-line bg-surface-2 px-3 py-2"
                  >
                    <Icon className="size-3.5 shrink-0 text-text-3" />
                    <Text as="span" className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-ink">
                      {item.name}
                    </Text>
                    <Text as="span" className="chip chip-idle shrink-0">
                      {item.type === "course" ? "Course" : "Path"}
                    </Text>
                    <button
                      type="button"
                      aria-label={`Remove ${item.name}`}
                      title="Remove"
                      onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}
                      className="shrink-0 cursor-pointer text-text-3 hover:text-danger"
                    >
                      <X className="size-3.5" />
                    </button>
                  </Box>
                );
              })
            )}
          </Box>
        </Box>

        {/* ── 3 · Due date (beside step 1, as in the reference — it is the
                smallest step and pairs with the running totals) ── */}
        <Box className="border border-line bg-surface p-4">
          <StepLabel n={3}>Due date</StepLabel>

          <Box className="mt-3 space-y-1.5">
            <Label>Applies to every item assigned</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => {
                setDueDate(e.target.value);
                // Setting a global date is a decision about everybody, so it
                // clears the per-person overrides rather than sitting behind
                // them invisibly.
                setPersonDue({});
              }}
              className="h-9 text-[12.5px]"
            />
            <Text as="p" className="text-[10.5px] leading-relaxed text-text-3">
              Optional. A due date is a prompt on the learner&apos;s card and in
              overdue counts — nothing locks or expires when it passes.
              {" "}Setting it here <strong>replaces every individual date</strong> below.
              {items.some((i) => i.type === "path") && (
                <> Learning paths do not carry one: a path&apos;s pace comes from
                  the order of its steps.</>
              )}
            </Text>
          </Box>

          <Box className="mt-4 flex gap-6 border-t border-line pt-4">
            <Box>
              <Text as="p" className="text-2xl font-bold leading-none text-accent-blue">
                {items.length}
              </Text>
              <Text as="p" className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-text-3">
                Items selected
              </Text>
            </Box>
            <Box>
              <Text as="p" className="text-2xl font-bold leading-none text-accent-blue">
                {audience.length}
              </Text>
              <Text as="p" className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-text-3">
                Learners selected
              </Text>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* ── 2 · Who ── */}
      <Box className="border border-line bg-surface">
        <Box className="border-b border-line px-4 py-3.5">
          <StepLabel n={2}>Who to assign to</StepLabel>
          <Box className="mt-2.5 inline-flex border border-line-strong">
            {MODES.map((m, i) => (
              <button
                key={m.key}
                type="button"
                onClick={() => setMode(m.key)}
                className={cn(
                  "flex cursor-pointer items-center gap-1.5 px-4 py-2 text-[12.5px] font-bold transition-colors",
                  i < MODES.length - 1 && "border-r border-line-strong",
                  mode === m.key
                    ? "bg-navy text-accent-soft"
                    : "bg-surface text-text-2 hover:bg-surface-2 hover:text-ink",
                )}
              >
                <m.icon className="size-3.5" />
                {m.label}
              </button>
            ))}
          </Box>
        </Box>

        <Box className="p-4">
          {mode === "org" && (
            <Box className="flex items-center gap-4 border border-line bg-surface-2 px-5 py-5">
              <Box className="flex size-12 shrink-0 items-center justify-center tile-accent">
                <Building2 className="size-6" />
              </Box>
              <Box>
                <Text as="p" className="text-[15px] font-bold text-ink">Entire organisation</Text>
                <Text as="p" className="mt-0.5 text-[12.5px] text-text-2">
                  All {employees.length} learner{employees.length === 1 ? "" : "s"} across{" "}
                  {departments.length} department{departments.length === 1 ? "" : "s"} will
                  receive this.
                </Text>
              </Box>
            </Box>
          )}

          {mode === "depts" && (
            <Box className="space-y-3">
              <Text as="p" className="text-[11.5px] text-text-3">
                Pick one or more departments — everyone in them gets assigned.
              </Text>
              <Box className="flex flex-wrap gap-2">
                {departments.map((d) => {
                  const n = employees.filter((e) => e.department === d).length;
                  const on = depts.has(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() =>
                        setDepts((prev) => {
                          const next = new Set(prev);
                          if (next.has(d)) next.delete(d); else next.add(d);
                          return next;
                        })}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 border px-3.5 py-2 text-[12.5px] font-semibold transition-colors",
                        on
                          ? "border-navy bg-navy text-white"
                          : "border-line-strong bg-surface text-ink hover:bg-surface-2",
                      )}
                    >
                      {on && <CheckCircle2 className="size-3.5" />}
                      {d}
                      <Text as="span" className={cn("text-[11px]", on ? "text-white/70" : "text-text-3")}>
                        {n}
                      </Text>
                    </button>
                  );
                })}
              </Box>
              {depts.size > 0 && (
                <Box className="space-y-2 pt-1">
                  <Box className="flex flex-wrap items-baseline justify-between gap-2">
                    <Text as="p" className="text-[12px] text-text-2">
                      {depts.size} department{depts.size === 1 ? "" : "s"} · {audience.length}{" "}
                      learner{audience.length === 1 ? "" : "s"}
                    </Text>
                    <Text as="p" className="text-[10.5px] text-text-3">
                      Each person takes the global due date unless you set theirs below.
                    </Text>
                  </Box>

                  {/* Grouped by department rather than one flat list: an admin
                      who picked three departments is checking three groups, and
                      a 40-row list with no headings makes them count. */}
                  {[...depts].sort().map((d) => {
                    const members = employees.filter((e) => e.department === d);
                    return (
                      <Box key={d} className="border border-line">
                        <Box className="flex items-center justify-between border-b border-line bg-surface-2 px-3.5 py-2">
                          <Text as="p" className="text-[12px] font-bold text-ink">{d}</Text>
                          <Text as="p" className="text-[11px] text-text-3">
                            {members.length} learner{members.length === 1 ? "" : "s"}
                          </Text>
                        </Box>
                        {members.map((e) => (
                          <PersonDueRow
                            key={e.id}
                            person={e}
                            value={personDue[e.id] ?? ""}
                            fallback={dueDate}
                            onChange={(v) => setPersonDue((prev) => ({ ...prev, [e.id]: v }))}
                          />
                        ))}
                      </Box>
                    );
                  })}
                </Box>
              )}
            </Box>
          )}

          {mode === "people" && (
            <Box className="space-y-3">
              <Box className="flex flex-wrap items-center gap-2">
                <Box className="relative min-w-[200px] flex-1">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-text-3" />
                  <Input
                    value={peopleSearch}
                    onChange={(e) => setPeopleSearch(e.target.value)}
                    placeholder="Search name, email, department…"
                    className="h-9 bg-surface-2 pl-8 text-[12.5px]"
                  />
                </Box>
                <Button
                  variant="outline"
                  onClick={() =>
                    setPeople((prev) =>
                      prev.size === visiblePeople.length && visiblePeople.every((e) => prev.has(e.id))
                        ? new Set()
                        : new Set(visiblePeople.map((e) => e.id)))}
                  className="h-9 cursor-pointer rounded-none text-[12px]"
                >
                  {visiblePeople.length > 0 && visiblePeople.every((e) => people.has(e.id))
                    ? "Clear all"
                    : `Select all ${visiblePeople.length}`}
                </Button>
              </Box>

              <Box className="max-h-[320px] overflow-y-auto border border-line">
                {visiblePeople.length === 0 ? (
                  <Text as="p" className="px-4 py-8 text-center text-[12px] text-text-3">
                    Nobody matches that search.
                  </Text>
                ) : (
                  visiblePeople.map((e) => (
                    <label
                      key={e.id}
                      className="flex cursor-pointer items-center gap-3 border-b border-line bg-surface px-3.5 py-2.5 last:border-b-0 hover:bg-surface-2"
                    >
                      <Checkbox
                        checked={people.has(e.id)}
                        onCheckedChange={() =>
                          setPeople((prev) => {
                            const next = new Set(prev);
                            if (next.has(e.id)) next.delete(e.id); else next.add(e.id);
                            return next;
                          })}
                        aria-label={`Select ${e.first_name} ${e.last_name}`}
                        className="cursor-pointer"
                      />
                      <Box className="min-w-0 flex-1">
                        <Text as="p" className="truncate text-[12.5px] font-semibold text-ink">
                          {e.first_name} {e.last_name}
                        </Text>
                        <Text as="p" className="truncate text-[11px] text-text-3">{e.email}</Text>
                      </Box>
                      {e.department && (
                        <Text as="span" className="chip chip-idle shrink-0">{e.department}</Text>
                      )}
                      {/* Only once they are actually selected — a date field
                          beside somebody who is not being assigned anything
                          invites filling in a value that goes nowhere. */}
                      {people.has(e.id) && (
                        <Input
                          type="date"
                          value={personDue[e.id] ?? ""}
                          placeholder={dueDate || undefined}
                          onClick={(ev) => ev.preventDefault()}
                          onChange={(ev) =>
                            setPersonDue((prev) => ({ ...prev, [e.id]: ev.target.value }))}
                          title={personDue[e.id] ? "Overrides the global due date" : "Uses the global due date"}
                          className="h-7 w-[140px] shrink-0 text-[11px]"
                        />
                      )}
                    </label>
                  ))
                )}
              </Box>
            </Box>
          )}
        </Box>
      </Box>

      {error && (
        <Box className="border border-danger/30 bg-danger/10 px-3 py-2">
          <Text as="p" className="text-[12.5px] text-danger">{error}</Text>
        </Box>
      )}

      {/* ── The sentence, said back before anything is sent ── */}
      <Box className="flex flex-wrap items-center justify-between gap-3 border border-line bg-surface px-4 py-3">
        <Text as="p" className="text-[12.5px] text-text-2">
          <strong className="text-ink">{audience.length}</strong> learner
          {audience.length === 1 ? "" : "s"} will be assigned{" "}
          <strong className="text-ink">{items.length}</strong> item
          {items.length === 1 ? "" : "s"}
          {items.some((i) => i.type === "course") && dueBuckets.length > 0 && (
            dueBuckets.length === 1
              ? dueBuckets[0].date
                ? <>, due <strong className="text-ink">{dueBuckets[0].date}</strong></>
                : <>, with no due date</>
              // Saying one date when several apply would be wrong for most of
              // them, so the count is reported instead.
              : <>, across <strong className="text-ink">{dueBuckets.length}</strong> different due dates</>
          )}
        </Text>
        <Box className="flex gap-2">
          <Button variant="outline" onClick={reset} className="cursor-pointer rounded-none">
            Reset
          </Button>
          <Button
            onClick={() => setConfirmOpen(true)}
            disabled={!canSend || sending}
            className="cursor-pointer gap-1.5 rounded-none bg-navy text-accent-soft hover:bg-accent-blue hover:text-white"
          >
            <Send className="size-3.5" />
            {sending ? "Assigning…" : "Assign learning"}
          </Button>
        </Box>
      </Box>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Assign {items.length} item{items.length === 1 ? "" : "s"} to {audience.length} learner
              {audience.length === 1 ? "" : "s"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {items.map((i) => i.name).join(", ")} will appear in their My Courses
              straight away.
              {" "}
              {/* Said plainly, because the opposite would be alarming and is
                  what an admin re-assigning a department will assume. */}
              Anybody who already has one of these keeps their existing progress —
              nothing is reset.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={send}
              disabled={sending}
              className="bg-navy text-accent-soft hover:bg-accent-blue hover:text-white"
            >
              {sending ? "Assigning…" : "Assign"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Box>
  );
}

/**
 * One learner with their own due date.
 *
 * The input shows the GLOBAL date as its placeholder when nothing is set, so a
 * row reads as "this is what will happen" rather than as an empty field the
 * admin has forgotten. Clearing the input hands the person back to the global.
 */
function PersonDueRow({ person, value, fallback, onChange }) {
  const overridden = Boolean(value) && value !== fallback;
  return (
    <Box className="flex items-center gap-3 border-b border-line bg-surface px-3.5 py-2 last:border-b-0">
      <Box className="min-w-0 flex-1">
        <Text as="p" className="truncate text-[12.5px] font-semibold text-ink">
          {person.first_name} {person.last_name}
        </Text>
        <Text as="p" className="truncate text-[11px] text-text-3">{person.email}</Text>
      </Box>
      {overridden && (
        <Text as="span" className="chip chip-progress shrink-0">Own date</Text>
      )}
      <Input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        title={
          value
            ? "Overrides the global due date for this person"
            : fallback
              ? `Uses the global due date (${fallback})`
              : "No due date"
        }
        className="h-7 w-[140px] shrink-0 text-[11px]"
      />
    </Box>
  );
}

function StepLabel({ n, children }) {
  return (
    <Box className="flex items-center gap-2">
      <Text as="span" className="flex size-5 items-center justify-center bg-navy font-mono text-[10px] font-bold text-accent-soft">
        {n}
      </Text>
      <Text as="p" className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-text-3">
        {children}
      </Text>
    </Box>
  );
}
