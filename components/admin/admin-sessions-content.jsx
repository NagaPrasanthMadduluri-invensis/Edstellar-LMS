"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  CalendarDays, Clock, Users, MapPin, Video, Plus, Search,
  Pencil, Trash2, CheckCircle2, AlertCircle, BookOpen, UserCircle,
  CalendarCheck, BarChart3, Lock, Save, UserPlus, ChevronDown,
  TrendingUp, Archive, ArchiveRestore, X, ArrowLeft, Layers, UserCheck,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { cn } from "@/lib/utils";
import { SESSION_TYPE_LABEL, sessionTypeLabel } from "@/lib/session-types";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api-client";
import {
  bulkSessionAction, createSessionBatch, updateSessionBatch, deleteSessionBatch,
  fetchSessionWaitlist, promoteFromWaitlist, dropFromWaitlist,
  uploadCourseThumbnail, discardCourseThumbnail,
} from "@/services/api/admin/admin-api";
import { ThumbnailField } from "@/components/admin/thumbnail-field";
import { DescriptionField } from "@/components/shared/description-field";
import { CourseArt } from "@/components/shared/course-art";

/* ── constants ── */

const EMPTY_FORM = {
  title: "", session_type: "ILT", department: "", course_id: "",
  capacity: 20, trainer: "", trainer_user_id: "", venue_url: "", date: "",
  start_time: "", end_time: "", description: "", status: "upcoming",
};

/* Four states, in the fill weights the design system defines: not started is
   the lightest, complete is the heaviest, failure is the only colour.
   `in_progress` is derived from the clock by the API (display_status) rather
   than stored — see server/src/modules/sessions/session-status.util.ts. */
const STATUS_CFG = {
  upcoming:    { label: "Upcoming",    cls: "bg-paper-warm text-ink/60 border-border", chip: "chip-idle"     },
  in_progress: { label: "In progress", cls: "bg-paper-cream text-ink border-navy/25",  chip: "chip-progress" },
  completed:   { label: "Completed",   cls: "bg-navy text-paper border-navy",          chip: "chip-complete" },
  cancelled:   { label: "Cancelled",   cls: "bg-error/10 text-error border-error/30",  chip: "chip-error"    },
};

/** The status to show. Falls back to the stored one if the API is older. */
function displayOf(session) {
  return session?.display_status || session?.status || "upcoming";
}

/* Labels come from lib/session-types so the list, both calendars and the form
   all say the same thing. Only the icon and chip live here. */
const TYPE_CFG = {
  ILT:     { label: SESSION_TYPE_LABEL.ILT,     cls: "bg-paper-cream text-navy border-0", chip: "chip-idle", icon: MapPin },
  Virtual: { label: SESSION_TYPE_LABEL.Virtual, cls: "bg-paper-cream text-navy border-0", chip: "chip-idle", icon: Video  },
  Webinar: { label: SESSION_TYPE_LABEL.Webinar, cls: "bg-paper-cream text-navy border-0", chip: "chip-idle", icon: Video  },
};

const ATTENDANCE_STATUS_CFG = {
  present:  { label: "Present",  cls: "bg-navy text-paper border-navy", triggerCls: "border-navy/20 bg-paper-cream text-navy" },
  absent:   { label: "Absent",   cls: "bg-error/10 text-error border-error/30",     triggerCls: "border-error/30 bg-error/10 text-error"             },
  late:     { label: "Late",     cls: "bg-paper-cream text-ink border-navy/25",    triggerCls: "border-navy/20 bg-paper-cream text-navy"           },
  partial:  { label: "Partial",  cls: "bg-paper-cream text-ink border-navy/25",  triggerCls: "border-navy/20 bg-paper-cream text-navy"    },
  excused:  { label: "Excused",  cls: "bg-paper-warm text-ink/60 border-border",  triggerCls: "border-border bg-paper-cream text-ink/70"    },
};

const AVATAR_COLORS = [
  "bg-navy","bg-navy","bg-navy","bg-navy",
  "bg-navy","bg-navy","bg-navy","bg-navy",
  "bg-error","bg-navy","bg-navy","bg-navy",
];

/** Spectra tinted tiles (TASTE §10.4) — replaces the old paper-cream circles. */
const TILE = {
  accent: "tile-accent", success: "tile-success",
  warning: "tile-warning", rust: "tile-rust",
};

/* ── helpers ── */

function formatDate(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatTime(t) {
  if (!t) return "";
  const [h, min] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(min).padStart(2, "0")} ${ampm}`;
}

function avatarInitials(first, last) {
  return `${(first || "")[0] || ""}${(last || "")[0] || ""}`.toUpperCase();
}

function avatarColor(id) {
  return AVATAR_COLORS[Number(id || 0) % AVATAR_COLORS.length];
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

function LoadingSkeleton() {
  return (
    <Box className="space-y-5">
      <Box className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
      </Box>
      <Skeleton className="h-12 rounded-lg" />
      {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
    </Box>
  );
}

/* ══════════════════════════════════════════
   ROSTER DIALOG
══════════════════════════════════════════ */

function RosterDialog({ sessionId, sessionTitle, open, onClose, onRosterSaved }) {
  const [enrolled,    setEnrolled]    = useState([]);
  const [available,   setAvailable]   = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [deptFilter,  setDeptFilter]  = useState("all");
  const [addDept,     setAddDept]     = useState("all");
  const [activeDept,  setActiveDept]  = useState("all");

  const load = useCallback(async () => {
    if (!open || !sessionId) return;
    setLoading(true);
    try {
      const d = await apiClient(`/api/admin/sessions/${sessionId}/roster`);
      setEnrolled(d.enrolled || []);
      setAvailable(d.available || []);
    } finally { setLoading(false); }
  }, [open, sessionId]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (userId) => {
    const d = await apiClient(`/api/admin/sessions/${sessionId}/roster`, { method: "POST", body: { user_id: userId } });
    setEnrolled(d.enrolled || []);
    setAvailable(d.available || []);
  };

  const handleRemove = async (userId) => {
    const d = await apiClient(`/api/admin/sessions/${sessionId}/roster`, { method: "DELETE", body: { user_id: userId } });
    setEnrolled(d.enrolled || []);
    setAvailable(d.available || []);
  };

  const handleEnrollAll = async (dept) => {
    const d = await apiClient(`/api/admin/sessions/${sessionId}/roster`, { method: "POST", body: { enroll_all: true, department: dept } });
    setEnrolled(d.enrolled || []);
    setAvailable(d.available || []);
  };

  const enrolledDepts = [...new Set(enrolled.map((e) => e.department).filter(Boolean))].sort();
  const filteredEnrolled = activeDept === "all" ? enrolled : enrolled.filter((e) => e.department === activeDept);
  const filteredAvailable = addDept === "all" ? available : available.filter((a) => a.department === addDept);
  const availableDepts = [...new Set(available.map((a) => a.department).filter(Boolean))].sort();

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Session Roster</DialogTitle>
          <Text as="p" className="text-xs text-muted-foreground mt-0.5">{sessionTitle}</Text>
        </DialogHeader>

        {loading ? (
          <Box className="space-y-3 py-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
          </Box>
        ) : (
          <Box className="space-y-5 py-2">

            {/* ── ENROLLED section ── */}
            <Box>
              <Text as="p" className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
                Enrolled by Department
              </Text>

              {/* Dept chips */}
              <Box className="flex items-center gap-2 flex-wrap mb-3">
                {enrolledDepts.map((dept) => (
                  <Box key={dept} className="flex items-center gap-1">
                    <Button
                      variant="outline" size="sm"
                      className={cn("h-7 text-xs px-2.5", activeDept === dept && "bg-paper-cream border-navy/20 text-navy")}
                      onClick={() => setActiveDept(activeDept === dept ? "all" : dept)}
                    >
                      {dept}
                    </Button>
                    <Button
                      variant="outline" size="sm"
                      className="h-7 text-xs px-2 text-navy border-navy/20 hover:bg-paper-cream"
                      onClick={() => handleEnrollAll(dept)}
                      title={`Enroll all ${dept}`}
                    >
                      + All
                    </Button>
                  </Box>
                ))}
                {enrolledDepts.length === 0 && available.length > 0 && (
                  <Text as="span" className="text-xs text-muted-foreground">No departments yet — add learners below</Text>
                )}
              </Box>

              {filteredEnrolled.length === 0 ? (
                <Box className="py-4 text-center border border-dashed rounded-lg">
                  <Text as="p" className="text-sm text-muted-foreground">No learners enrolled yet.</Text>
                </Box>
              ) : (
                <Box className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {filteredEnrolled.map((u) => (
                    <Box key={u.id} className="flex items-center gap-3 p-2.5 rounded-lg border bg-paper-warm">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className={`text-xs font-bold text-white ${avatarColor(u.id)}`}>
                          {avatarInitials(u.first_name, u.last_name)}
                        </AvatarFallback>
                      </Avatar>
                      <Box className="flex-1 min-w-0">
                        <Text as="p" className="text-sm font-semibold leading-none">{u.first_name} {u.last_name}</Text>
                        <Text as="p" className="text-xs text-muted-foreground">{u.email}</Text>
                      </Box>
                      {u.department && (
                        <Badge variant="outline" className="text-[10px] border-border text-ink/60 shrink-0">{u.department}</Badge>
                      )}
                      <Button
                        variant="ghost" size="sm"
                        className="h-7 text-xs text-error hover:bg-error/10 hover:text-error shrink-0"
                        onClick={() => handleRemove(u.id)}
                      >
                        Remove
                      </Button>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>

            {/* ── ADD INDIVIDUAL section ── */}
            <Box>
              <Text as="p" className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
                Add Individual Learners
              </Text>

              <Select value={addDept} onValueChange={setAddDept}>
                <SelectTrigger className="h-8 text-xs w-[180px] mb-3">
                  <SelectValue>{addDept === "all" ? "All Departments" : addDept}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {availableDepts.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>

              {filteredAvailable.length === 0 ? (
                <Box className="py-4 text-center border border-dashed rounded-lg">
                  <Text as="p" className="text-sm text-muted-foreground">
                    {available.length === 0 ? "All learners are already enrolled." : "No learners in this department."}
                  </Text>
                </Box>
              ) : (
                <Box className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {filteredAvailable.map((u) => (
                    <Box key={u.id} className="flex items-center gap-3 p-2.5 rounded-lg border hover:bg-paper-warm transition-colors">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className={`text-xs font-bold text-white ${avatarColor(u.id)}`}>
                          {avatarInitials(u.first_name, u.last_name)}
                        </AvatarFallback>
                      </Avatar>
                      <Box className="flex-1 min-w-0">
                        <Text as="p" className="text-sm font-semibold leading-none">{u.first_name} {u.last_name}</Text>
                        <Text as="p" className="text-xs text-muted-foreground">{u.email}</Text>
                      </Box>
                      {u.department && (
                        <Badge variant="outline" className="text-[10px] border-border text-ink/60 shrink-0">{u.department}</Badge>
                      )}
                      <Button
                        variant="outline" size="sm"
                        className="h-7 text-xs text-navy border-navy/20 hover:bg-paper-cream shrink-0"
                        onClick={() => handleAdd(u.id)}
                      >
                        <UserPlus className="h-3 w-3 mr-1" />+ Add
                      </Button>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          </Box>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button className="bg-navy hover:bg-navy-soft text-paper" onClick={() => { onRosterSaved(); onClose(); }}>
            Done — Save Roster
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ══════════════════════════════════════════
   SESSIONS TAB
══════════════════════════════════════════ */

function SessionsTab({
  sessions, courses, allDepts,
  openCreate, openEdit, load,
  setDeleteTarget,
  onMarkAttendance,
  focusSessionId,
  showArchived, setShowArchived, archivedCount,
  setBatchTarget, setWaitlistTarget,
}) {
  const focusRef = useRef(null);

  // Bring the session the admin came here for into view, once, after the list
  // has rendered. The ring fades on its own — a permanent highlight would
  // still be there next time they visit the page from the sidebar.
  const [highlighted, setHighlighted] = useState(focusSessionId ?? null);
  useEffect(() => {
    if (!focusSessionId || !focusRef.current) return;
    focusRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    const timer = setTimeout(() => setHighlighted(null), 2600);
    return () => clearTimeout(timer);
  }, [focusSessionId, sessions.length]);
  const [filterType,     setFilterType]     = useState("all");
  const [filterStatus,   setFilterStatus]   = useState("all");
  const [search,         setSearch]         = useState("");
  const [sortOrder,      setSortOrder]      = useState("newest");
  const [selected,       setSelected]       = useState(new Set());
  const [bulkBusy,       setBulkBusy]       = useState(false);
  const [bulkError,      setBulkError]      = useState(null);
  const [bulkConfirm,    setBulkConfirm]    = useState(null);
  const [rosterTarget,   setRosterTarget]   = useState(null);
  const [cancelTarget,   setCancelTarget]   = useState(null);
  const [cancelling,     setCancelling]     = useState(false);
  const [completeTarget, setCompleteTarget] = useState(null);
  const [completing,     setCompleting]     = useState(false);
  const [completeError,  setCompleteError]  = useState(null);

  // Switching sets invalidates the selection: those ids are no longer on
  // screen and a bulk action would act on rows the admin can no longer see.
  useEffect(() => { setSelected(new Set()); }, [showArchived]);

  const query = search.trim().toLowerCase();
  let filtered = sessions.filter((s) => {
    const matchType   = filterType   === "all" || s.session_type === filterType;
    const matchStatus = filterStatus === "all" || displayOf(s)   === filterStatus;
    const matchSearch =
      !query ||
      s.title.toLowerCase().includes(query) ||
      (s.trainer ?? "").toLowerCase().includes(query) ||
      (s.session_type ?? "").toLowerCase().includes(query) ||
      (s.venue_url ?? "").toLowerCase().includes(query);
    return matchType && matchStatus && matchSearch;
  });
  if (sortOrder === "alpha") {
    filtered = [...filtered].sort((a, b) => a.title.localeCompare(b.title));
  } else if (sortOrder === "registered") {
    filtered = [...filtered].sort(
      (a, b) => Number(b.roster_count || 0) - Number(a.roster_count || 0),
    );
  }
  // "newest" is the API's own order (date DESC, start_time DESC) — left alone
  // rather than re-sorted, so the two cannot drift apart.

  const allVisibleSelected =
    filtered.length > 0 && filtered.every((s) => selected.has(s.id));

  function toggleAll() {
    setSelected(allVisibleSelected ? new Set() : new Set(filtered.map((s) => s.id)));
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
    setBulkBusy(true); setBulkError(null);
    try {
      const res = await bulkSessionAction({ ids, action });
      if (res.affected < res.requested) {
        setBulkError(
          `${res.affected} of ${res.requested} updated — a completed session ` +
          `cannot be cancelled, because its attendance has already credited people.`,
        );
      }
      setSelected(new Set());
      setBulkConfirm(null);
      await load();
    } catch (e) { setBulkError(e.message); } finally { setBulkBusy(false); }
  }

  const totalRegistered = sessions.reduce((sum, s) => sum + Number(s.roster_count || 0), 0);
  const countOf = (status) => sessions.filter((s) => displayOf(s) === status).length;

  const completedSessions = sessions.filter((s) => displayOf(s) === "completed");

  /**
   * Attendance actually CREDITED, averaged over completed sessions.
   *
   * Only `present`, `late` and `partial` credit a learner (§10.7), which is
   * exactly what `credited_count` counts — so this rate matches the hours and
   * completions those sessions produced, rather than being a turnout figure
   * that would quietly disagree with them.
   */
  const avgAttendance = completedSessions.length
    ? Math.round(
        completedSessions.reduce((sum, s) => {
          const roster = Number(s.roster_count || 0);
          return sum + (roster ? (Number(s.credited_count || 0) / roster) * 100 : 0);
        }, 0) / completedSessions.length,
      )
    : null;

  /**
   * Completed sessions whose attendance is not fully marked.
   *
   * The one actionable number on the strip: until every name is marked, the
   * people who turned up have not been credited with the training or its
   * hours. A prompt, not a fault — which is why it reads "need attention" and
   * only takes the danger colour when there is something to do.
   */
  const needsAttention = completedSessions.filter(
    (s) => Number(s.attendance_marked_count || 0) < Number(s.roster_count || 0),
  ).length;

  const statCards = [
    { icon: CalendarCheck, value: sessions.length,      label: "Total sessions",   tone: "accent"  },
    { icon: Clock,         value: countOf("upcoming"),  label: "Upcoming",         tone: "warning" },
    { icon: CheckCircle2,  value: countOf("completed"), label: "Completed",        tone: "success" },
    { icon: Users,         value: totalRegistered,      label: "Total registered", tone: "accent"  },
    { icon: TrendingUp,    value: avgAttendance === null ? "—" : `${avgAttendance}%`,
      label: "Avg attendance", tone: "success" },
    { icon: AlertCircle,   value: needsAttention,       label: "Need attention",
      tone: "rust", alert: needsAttention > 0 },
  ];

  /**
   * Manual completion. This is the only thing that credits the roster with the
   * training, its learning hours and its completion — so it confirms first, and
   * surfaces the API's refusal (422) when attendance has not been marked rather
   * than failing quietly.
   */
  const handleComplete = async () => {
    if (!completeTarget) return;
    setCompleting(true);
    setCompleteError(null);
    try {
      await apiClient(`/api/admin/sessions/${completeTarget.id}/complete`, {
        method: "POST",
      });
      load();
      setCompleteTarget(null);
    } catch (e) {
      setCompleteError(e.message);
    } finally {
      setCompleting(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await apiClient(`/api/admin/sessions/${cancelTarget.id}`, {
        method: "PUT",
        body: { ...cancelTarget, status: "cancelled", capacity: Number(cancelTarget.capacity), course_id: cancelTarget.course_id || null },
      });
      load();
      setCancelTarget(null);
    } finally { setCancelling(false); }
  };

  return (
    <Box className="space-y-5">

      {/* ── KPI strip. Reduced from the rows already on screen, never from a
              second query, so a tile cannot disagree with the list beneath it —
              the rule the Manage Users directory follows (§10.12). ── */}
      <Box className="grid gap-px border border-line bg-line sm:grid-cols-3 xl:grid-cols-6">
        {statCards.map((s) => (
          <Box key={s.label} className="flex items-center gap-3 bg-surface px-4 py-3">
            <Box className={cn("flex size-8 shrink-0 items-center justify-center", TILE[s.tone])}>
              <s.icon className="size-4" />
            </Box>
            <Box className="min-w-0">
              <Text
                as="p"
                className={cn(
                  "text-xl font-bold leading-none",
                  s.alert ? "text-danger" : "text-ink",
                )}
              >
                {s.value}
              </Text>
              <Text as="p" className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-text-3">
                {s.label}
              </Text>
            </Box>
          </Box>
        ))}
      </Box>

      {/* Toolbar */}
      <Box className="flex items-center gap-3 flex-wrap">
        <Box className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-3" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, trainer, type, venue…"
            className="h-10 bg-white pl-9 text-sm"
          />
        </Box>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="h-10 w-[140px] text-sm bg-white border-border shadow-sm">
            <SelectValue>{filterType === "all" ? "All Types" : sessionTypeLabel(filterType)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="ILT">{SESSION_TYPE_LABEL.ILT}</SelectItem>
            <SelectItem value="Virtual">{SESSION_TYPE_LABEL.Virtual}</SelectItem>
            <SelectItem value="Webinar">{SESSION_TYPE_LABEL.Webinar}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-10 w-[150px] text-sm bg-white border-border shadow-sm">
            <SelectValue>{filterStatus === "all" ? "All Status" : (STATUS_CFG[filterStatus]?.label || filterStatus)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="in_progress">In progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortOrder} onValueChange={setSortOrder}>
          <SelectTrigger className="h-10 w-[170px] bg-white text-sm">
            <SelectValue>
              {sortOrder === "alpha" ? "A → Z"
                : sortOrder === "registered" ? "Most registered" : "Newest first"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="alpha">A → Z</SelectItem>
            <SelectItem value="registered">Most registered</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          onClick={() => setShowArchived((v) => !v)}
          className={cn(
            "h-10 cursor-pointer gap-1.5 shrink-0 text-sm font-semibold",
            showArchived && "border-navy bg-navy text-accent-soft hover:bg-navy-soft hover:text-accent-soft",
          )}
        >
          {showArchived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
          {showArchived ? "Active" : `Archived${archivedCount ? ` (${archivedCount})` : ""}`}
        </Button>

        <Button
          className="h-10 shrink-0 cursor-pointer gap-1.5 bg-navy px-5 text-sm text-paper hover:bg-navy-soft"
          onClick={openCreate}
          disabled={showArchived}
        >
          <Plus className="h-4 w-4" />New Session
        </Button>
      </Box>

      {bulkError && (
        <Box className="border border-danger/30 bg-danger/10 px-3 py-2">
          <Text as="p" className="text-[12.5px] text-danger">{bulkError}</Text>
        </Box>
      )}

      {/* ── Bulk action bar ── */}
      {selected.size > 0 && (
        <Box className="flex flex-wrap items-center gap-2 bg-navy px-4 py-2.5">
          <Text as="span" className="text-[12.5px] font-semibold text-white">
            {selected.size} selected
          </Text>
          <Box className="flex-1" />
          {!showArchived ? (
            <>
              <BulkBtn onClick={() => runBulk("cancel")} disabled={bulkBusy}>Cancel</BulkBtn>
              <BulkBtn onClick={() => runBulk("archive")} disabled={bulkBusy}>Archive</BulkBtn>
            </>
          ) : (
            <BulkBtn onClick={() => runBulk("restore")} disabled={bulkBusy}>Restore</BulkBtn>
          )}
          <BulkBtn danger onClick={() => setBulkConfirm(selected.size)} disabled={bulkBusy}>
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

      {/* ── Select all + count ── */}
      <Box className="flex items-center gap-2.5">
        {filtered.length > 0 && (
          <Checkbox
            checked={allVisibleSelected}
            onCheckedChange={toggleAll}
            aria-label="Select all sessions"
            className="cursor-pointer"
          />
        )}
        <Text as="p" className="text-[12px] text-text-3">
          {filtered.length} {showArchived ? "archived " : ""}session{filtered.length !== 1 ? "s" : ""}
        </Text>
      </Box>

      <AlertDialog open={bulkConfirm !== null} onOpenChange={(o) => { if (!o) setBulkConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {bulkConfirm} session{bulkConfirm === 1 ? "" : "s"}</AlertDialogTitle>
            <AlertDialogDescription>
              {/* The warning is the point. A session IS a course assignment
                  (§10.7), so deleting one takes real learning history with
                  it — the archive is the reversible alternative and the
                  dialog has to say so. */}
              This permanently deletes each session, its companion training
              course, its roster, its attendance record and every completion
              those sessions credited. Learning hours already earned from them
              go too, and none of it can be undone.
              <br /><br />
              To clear finished sessions off this list without losing any of
              that, <strong>archive</strong> them instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => runBulk("delete")}
              disabled={bulkBusy}
              className="bg-danger text-white hover:bg-danger/90"
            >
              {bulkBusy ? "Deleting…" : `Delete ${bulkConfirm}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Session List */}
      {filtered.length === 0 ? (
        <Card className="p-14 text-center">
          <CalendarCheck className="h-10 w-10 mx-auto text-muted-foreground/25 mb-3" />
          <Text as="p" className="text-sm text-muted-foreground">
            {filterType !== "all" || filterStatus !== "all" ? "No sessions match your filters." : "No sessions yet."}
          </Text>
        </Card>
      ) : (
        <Box className="space-y-3">
          {filtered.map((s) => (
            <SessionCard
              key={s.id}
              session={s}
              selected={selected.has(s.id)}
              highlighted={String(s.id) === String(highlighted)}
              cardRef={String(s.id) === String(focusSessionId) ? focusRef : null}
              onToggle={() => toggleOne(s.id)}
              onRoster={() => setRosterTarget({ id: s.id, title: s.title })}
              onBatches={() => setBatchTarget(s)}
              onWaitlist={() => setWaitlistTarget(s)}
              onAttendance={() => onMarkAttendance(String(s.id))}
              onEdit={() => openEdit(s)}
              onComplete={() => { setCompleteError(null); setCompleteTarget(s); }}
              onCancel={() => setCancelTarget(s)}
            />
          ))}
        </Box>
      )}

      {/* Roster Dialog */}
      {rosterTarget && (
        <RosterDialog
          sessionId={rosterTarget.id}
          sessionTitle={rosterTarget.title}
          open={!!rosterTarget}
          onClose={() => setRosterTarget(null)}
          onRosterSaved={load}
        />
      )}

      {/* Complete Confirm — spells out the side effects, because they reach the
          learner's course card, their learning hours and their completion. */}
      <AlertDialog open={!!completeTarget} onOpenChange={(o) => { if (!o) { setCompleteTarget(null); setCompleteError(null); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark session completed</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{completeTarget?.title}</strong> will be credited to the
              learners recorded as present, late or partial. Their training is
              marked complete and the session&apos;s duration counts toward their
              learning hours. Learners marked absent or excused are not credited.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {completeError && (
            <Text as="p" className="text-sm text-error">{completeError}</Text>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={completing}>Back</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); handleComplete(); }} disabled={completing}
              className="bg-navy hover:bg-navy-soft text-paper">
              {completing ? "Completing…" : "Mark Completed"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Confirm */}
      <AlertDialog open={!!cancelTarget} onOpenChange={(o) => { if (!o) setCancelTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Session</AlertDialogTitle>
            <AlertDialogDescription>
              Mark <strong>{cancelTarget?.title}</strong> as cancelled? This can be undone via Edit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Back</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} disabled={cancelling} className="bg-error hover:bg-error text-white">
              {cancelling ? "Cancelling…" : "Cancel Session"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Box>
  );
}

/* ══════════════════════════════════════════
   MARK ATTENDANCE TAB
══════════════════════════════════════════ */


/* ── One session ───────────────────────────────────────────────────────────
   Spectra: square, hairline-ruled, no shadow (§10.4). The old card carried
   `rounded-xl` and `hover:shadow-md`, which is the one thing that makes a
   component look foreign here.

   Three things the reference card shows that our data now supports: which
   sitting people are in (batches), who is queuing (waitlist), and how they got
   on (enrolment mode). A single-sitting session — the default, and every
   session that predates batches — draws a plain meter and says none of it.
────────────────────────────────────────────────────────────────────────────*/

function SessionCard({
  session: s, selected, highlighted, cardRef,
  onToggle, onRoster, onBatches, onWaitlist, onAttendance, onEdit,
  onComplete, onCancel,
}) {
  const typeCfg = TYPE_CFG[s.session_type] || TYPE_CFG.ILT;
  const view = displayOf(s);
  const statusCfg = STATUS_CFG[view] || STATUS_CFG.upcoming;
  const TypeIcon = typeCfg.icon;
  const isCompleted = view === "completed";
  const isCancelled = view === "cancelled";
  const isUpcoming = view === "upcoming";

  const roster = Number(s.roster_count || 0);
  const credited = Number(s.credited_count || 0);
  const marked = Number(s.attendance_marked_count || 0);
  const capacity = Number(s.capacity || 0);
  const attendancePct = roster > 0 ? Math.round((credited / roster) * 100) : 0;

  const batches = (s.batches ?? []).filter((b) => b.display_status !== "cancelled");
  const isMultiBatch = batches.length > 1;
  const pending = batches.filter((b) => b.display_status === "pending");
  const waiting = Number(s.waitlist_count || 0);
  const isSelf = s.enroll_mode === "self";

  /**
   * What "out of" means when there are several sittings.
   *
   * Batches may carry different capacities, so "N per batch" is only true when
   * they all match — the reference could assume one number because its mock
   * had one. Mixed sizes report the TOTAL instead, because a single per-batch
   * figure would be wrong for at least one of them.
   */
  const batchCaps = batches.map((b) => Number(b.capacity || capacity || 0));
  const sameCap = batchCaps.length > 0 && batchCaps.every((c) => c === batchCaps[0]);
  const batchCapacityLabel = sameCap
    ? `${batchCaps[0]} per batch`
    : `${batchCaps.reduce((a, c) => a + c, 0)} across ${batches.length} batches`;

  return (
    <Box
      ref={cardRef}
      className={cn(
        "border bg-surface transition-colors",
        selected ? "border-accent-blue" : "border-line hover:border-line-strong",
        highlighted && "ring-2 ring-accent-blue/40",
      )}
    >
      <Box className="flex flex-wrap items-start gap-4 px-4 py-3.5 sm:px-5">
        <Checkbox
          checked={selected}
          onCheckedChange={onToggle}
          aria-label={`Select ${s.title}`}
          className="mt-1 shrink-0 cursor-pointer"
        />

        {s.thumbnail_url && (
          <CourseArt
            thumbnailUrl={s.thumbnail_url}
            alt={s.title}
            scrim="light"
            sizes="64px"
            className="size-16 shrink-0 border border-line"
          />
        )}

        {/* ── Left ── */}
        <Box className="min-w-0 flex-1 basis-[14rem] space-y-2">
          <Box className="flex flex-wrap items-center gap-2">
            <Text as="span" className={cn("chip inline-flex items-center gap-1", typeCfg.chip)}>
              <TypeIcon className="size-3" />{typeCfg.label}
            </Text>
            <Text as="span" className={cn("chip", statusCfg.chip)}>{statusCfg.label}</Text>
            {/* Only said when it is NOT the default — a chip on every card
                saying "Admin assigned" is noise, not information. */}
            {isSelf && <Text as="span" className="chip chip-progress">Self enrolment</Text>}
            {isMultiBatch && (
              <Text as="span" className="chip chip-idle">{batches.length} batches</Text>
            )}
            {s.course_name && (
              <Text as="span" className="chip chip-idle inline-flex items-center gap-1">
                <BookOpen className="size-3" />{s.course_name}
              </Text>
            )}
          </Box>

          <Text as="h3" className="text-[15px] font-bold leading-snug text-ink">{s.title}</Text>

          <Box className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-text-2">
            <Text as="span" className="inline-flex items-center gap-1.5">
              <UserCircle className="size-3.5 shrink-0 text-text-3" />{s.trainer}
            </Text>
            {/* A multi-batch session has no single date of its own — saying
                one would name whichever sitting happened to be first. */}
            <Text as="span" className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-3.5 shrink-0 text-text-3" />
              {isMultiBatch ? `${batches.length} sittings` : formatDate(s.date)}
            </Text>
            {!isMultiBatch && (
              <Text as="span" className="inline-flex items-center gap-1.5">
                <Clock className="size-3.5 shrink-0 text-text-3" />
                {s.start_time}–{s.end_time} IST
              </Text>
            )}
            <Text as="span" className="inline-flex min-w-0 items-center gap-1.5">
              {s.session_type === "Virtual"
                ? <Video className="size-3.5 shrink-0 text-text-3" />
                : <MapPin className="size-3.5 shrink-0 text-text-3" />}
              <Text as="span" className="truncate">{s.venue_url}</Text>
            </Text>
          </Box>

          {s.description && (
            <Text as="p" className="line-clamp-2 text-[12px] leading-relaxed text-text-2">
              {s.description}
            </Text>
          )}

          {/* ── Fill meter. Segmented per batch when there is more than one,
                  so an admin can see at a glance which sitting still has room.
                  A pending batch is hatched rather than filled: it has no date,
                  so its bar would otherwise claim a scheduled sitting. ── */}
          <Box className="pt-1">
            <Box className="flex items-baseline justify-between gap-2">
              <Text as="span" className="text-[11px] text-text-3">
                Registered
              </Text>
              <Text as="span" className="text-[12.5px] font-bold text-ink">
                {roster}
                <Text as="span" className="font-normal text-[11px] text-text-3">
                  {isMultiBatch ? ` / ${batchCapacityLabel}` : ` / ${capacity}`}
                </Text>
                {isCompleted && roster > 0 && (
                  <Text
                    as="span"
                    className={cn("font-semibold", attendancePct >= 70 ? "text-success" : "text-danger")}
                  >
                    {" "}· {attendancePct}% attended
                  </Text>
                )}
              </Text>
            </Box>
            <BatchMeter batches={batches} roster={roster} capacity={capacity} />
            {pending.length > 0 && (
              <Text as="p" className="mt-1 text-[10.5px] text-warning">
                {pending.length} batch{pending.length === 1 ? "" : "es"} awaiting a date
              </Text>
            )}
          </Box>

          {!isCompleted && !isCancelled && roster > 0 && (
            <Text as="p" className="text-[11px] text-text-3">
              {marked > 0
                ? `Attendance marked for ${marked} of ${roster}`
                : "Attendance not marked yet"}
            </Text>
          )}
        </Box>

        {/* ── Right: actions ── */}
        <Box className="ml-auto flex w-full shrink-0 flex-col items-start gap-2 sm:w-auto sm:items-end">
          {waiting > 0 && (
            <button
              type="button"
              onClick={onWaitlist}
              className="cursor-pointer text-[11.5px] font-semibold text-warning underline-offset-2 hover:underline"
            >
              {waiting} waiting
            </button>
          )}

          <Box className="flex flex-wrap items-center gap-1.5 sm:justify-end">
            {!isCompleted && (
              <CardBtn onClick={onRoster}>Roster</CardBtn>
            )}
            {/* Shown for a completed session too: its sittings are still
                worth looking at, and the dialog is where an admin sees who
                was in which batch. Only a cancelled session hides it. */}
            {!isCancelled && (
              <CardBtn onClick={onBatches} icon={Layers}>
                {batches.length ? `Batches (${batches.length})` : "Batches"}
              </CardBtn>
            )}
            <CardBtn onClick={onAttendance} icon={UserCheck}>
              {isCompleted ? "View attendance" : "Mark attendance"}
            </CardBtn>
            {!isCompleted && <CardBtn onClick={onEdit} icon={Pencil}>Edit</CardBtn>}
            {!isCompleted && !isCancelled && (
              <CardBtn primary onClick={onComplete} icon={CheckCircle2}>Mark completed</CardBtn>
            )}
            {isUpcoming && <CardBtn danger onClick={onCancel}>Cancel</CardBtn>}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

/**
 * The fill bar.
 *
 * One plain bar for a single sitting; one segment per batch when there are
 * several. A `pending` batch is hatched, not filled — it has no date, so a
 * proportional bar would read as a scheduled sitting that is partly full.
 */
function BatchMeter({ batches, roster, capacity }) {
  if (batches.length === 0) {
    const pct = capacity ? Math.min(100, Math.round((roster / capacity) * 100)) : 0;
    return (
      <Box className="mt-1.5 h-[7px] w-full bg-surface-3">
        <Box className="h-full bg-accent-blue" style={{ width: `${pct}%` }} />
      </Box>
    );
  }
  return (
    <Box className="mt-1.5 flex h-[7px] gap-[3px]">
      {batches.map((b) => {
        const cap = Number(b.capacity || capacity || 0);
        const pct = cap ? Math.min(100, Math.round((Number(b.roster_count) / cap) * 100)) : 0;
        const label = `Batch ${b.batch_no} · ${b.roster_count}/${cap}${
          b.display_status === "pending" ? " · awaiting date" : ""
        }`;
        return (
          <Box key={b.id} title={label} className="relative flex-1 overflow-hidden bg-surface-3">
            {b.display_status === "pending" ? (
              <Box className="absolute inset-0 bg-[repeating-linear-gradient(45deg,var(--spectra-warning)_0_3px,color-mix(in_oklab,var(--spectra-warning)_60%,white)_3px_6px)]" />
            ) : (
              <Box
                className={cn(
                  "absolute inset-y-0 left-0",
                  b.display_status === "completed" ? "bg-success" : "bg-accent-blue",
                )}
                style={{ width: `${pct}%` }}
              />
            )}
          </Box>
        );
      })}
    </Box>
  );
}

function CardBtn({ children, onClick, icon: Icon, primary = false, danger = false, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-7 items-center gap-1 border px-2.5 text-[11.5px] font-semibold transition-colors",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
        primary
          ? "border-navy bg-navy text-accent-soft hover:bg-accent-blue hover:text-white"
          : danger
            ? "border-line bg-surface text-text-2 hover:bg-danger hover:text-white"
            : "border-line bg-surface text-text-2 hover:bg-accent-blue hover:text-white",
      )}
    >
      {Icon && <Icon className="size-3" />}
      {children}
    </button>
  );
}


/* ── Batch manager ─────────────────────────────────────────────────────────
   A batch is one sitting. Adding the first one turns a single-sitting session
   into a multi-batch one; deleting the last one turns it back, and nobody is
   unenrolled either way — roster rows fall back to "no sitting assigned".
────────────────────────────────────────────────────────────────────────────*/

const EMPTY_BATCH = { label: "", date: "", start_time: "", end_time: "", capacity: "" };

function BatchesDialog({ session, onClose, onChanged }) {
  const [form, setForm] = useState(EMPTY_BATCH);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const batches = session.batches ?? [];

  async function save() {
    setBusy(true); setError(null);
    try {
      const data = {
        label: form.label.trim() || null,
        date: form.date || null,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        capacity: form.capacity ? Number(form.capacity) : null,
      };
      if (editing) await updateSessionBatch({ batchId: editing.id, data: { ...data, status: editing.status } });
      else await createSessionBatch({ sessionId: session.id, data });
      setForm(EMPTY_BATCH); setEditing(null);
      await onChanged();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function remove(batch) {
    setBusy(true); setError(null);
    try {
      await deleteSessionBatch({ batchId: batch.id });
      await onChanged();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Batches — {session.title}</DialogTitle>
        </DialogHeader>

        <Box className="space-y-4">
          <Box className="border-l-2 border-accent-blue bg-accent-tint px-3 py-2">
            <Text as="p" className="text-[11.5px] leading-relaxed text-text-2">
              A batch is one sitting of this session. Everyone still earns the
              same training — batches only say <em>when</em> each person attends.
              With no batches, the session runs once on its own date.
            </Text>
          </Box>

          {batches.length > 0 && (
            <Box className="divide-y divide-line border border-line">
              {batches.map((b) => (
                <Box key={b.id} className="flex flex-wrap items-center gap-3 bg-surface px-3.5 py-2.5">
                  <Text as="span" className="flex size-6 shrink-0 items-center justify-center bg-navy font-mono text-[11px] font-bold text-accent-soft">
                    {b.batch_no}
                  </Text>
                  <Box className="min-w-0 flex-1">
                    <Text as="p" className="truncate text-[12.5px] font-semibold text-ink">
                      {b.label || `Batch ${b.batch_no}`}
                    </Text>
                    <Text as="p" className="text-[11px] text-text-3">
                      {b.date ? `${formatDate(b.date)} · ${b.start_time ?? "—"}–${b.end_time ?? "—"}` : "Date not set"}
                      {" · "}{b.roster_count}/{b.capacity} registered
                    </Text>
                  </Box>
                  <Text
                    as="span"
                    className={cn(
                      "chip shrink-0",
                      b.display_status === "completed" ? "chip-complete"
                        : b.display_status === "pending" ? "chip-warning" : "chip-progress",
                    )}
                  >
                    {b.display_status}
                  </Text>
                  <Box className="flex shrink-0 gap-1">
                    <CardBtn
                      icon={Pencil}
                      onClick={() => {
                        setEditing(b);
                        setForm({
                          label: b.label ?? "", date: b.date ?? "",
                          start_time: b.start_time ?? "", end_time: b.end_time ?? "",
                          capacity: b.capacity ? String(b.capacity) : "",
                        });
                      }}
                    >
                      Edit
                    </CardBtn>
                    <CardBtn danger icon={Trash2} onClick={() => remove(b)}>Delete</CardBtn>
                  </Box>
                </Box>
              ))}
            </Box>
          )}

          <Box className="space-y-3 border border-line bg-surface-2 p-3.5">
            <Text as="p" className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-text-3">
              {editing ? `Edit batch ${editing.batch_no}` : "Add a batch"}
            </Text>
            <Box className="grid gap-3 sm:grid-cols-2">
              <Box className="space-y-1.5">
                <Label>Label</Label>
                <Input
                  value={form.label} maxLength={80}
                  onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
                  placeholder="e.g. Morning cohort"
                />
              </Box>
              <Box className="space-y-1.5">
                <Label>Capacity</Label>
                <Input
                  type="number" min="1" value={form.capacity}
                  onChange={(e) => setForm((p) => ({ ...p, capacity: e.target.value }))}
                  placeholder={`Defaults to ${session.capacity}`}
                />
              </Box>
            </Box>
            <Box className="grid gap-3 sm:grid-cols-3">
              <Box className="space-y-1.5">
                <Label>Date</Label>
                <Input
                  type="date" value={form.date}
                  onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                />
              </Box>
              <Box className="space-y-1.5">
                <Label>Start</Label>
                <Input
                  type="time" value={form.start_time}
                  onChange={(e) => setForm((p) => ({ ...p, start_time: e.target.value }))}
                />
              </Box>
              <Box className="space-y-1.5">
                <Label>End</Label>
                <Input
                  type="time" value={form.end_time}
                  onChange={(e) => setForm((p) => ({ ...p, end_time: e.target.value }))}
                />
              </Box>
            </Box>
            <Text as="p" className="text-[10.5px] text-text-3">
              Leave the date blank to create the batch now and fix the date later —
              it shows as <strong>pending</strong> until you do.
            </Text>
            <Box className="flex gap-2">
              <Button
                onClick={save}
                disabled={busy}
                className="h-8 cursor-pointer rounded-none bg-navy text-[12.5px] text-accent-soft hover:bg-accent-blue hover:text-white"
              >
                {busy ? "Saving…" : editing ? "Save batch" : "Add batch"}
              </Button>
              {editing && (
                <Button
                  variant="outline"
                  onClick={() => { setEditing(null); setForm(EMPTY_BATCH); }}
                  className="h-8 cursor-pointer rounded-none text-[12.5px]"
                >
                  Cancel edit
                </Button>
              )}
            </Box>
          </Box>

          {error && (
            <Box className="border border-danger/30 bg-danger/10 px-3 py-2">
              <Text as="p" className="text-[12.5px] text-danger">{error}</Text>
            </Box>
          )}
        </Box>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Waitlist ──────────────────────────────────────────────────────────────
   Only self-enrol sessions produce one. A waitlisted person is NOT enrolled —
   promoting them is what creates their assignment and puts the training in
   their My Courses, which is why it goes through the roster path.
────────────────────────────────────────────────────────────────────────────*/

function WaitlistDialog({ session, onClose, onChanged }) {
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const d = await fetchSessionWaitlist({ sessionId: session.id });
      setRows(d.waitlist ?? []);
      setError(null);
    } catch (e) { setError(e.message); setRows([]); }
  }, [session.id]);

  useEffect(() => { load(); }, [load]);

  const full = Number(session.roster_count || 0) >= Number(session.capacity || 0);

  async function act(fn, userId) {
    setBusy(true); setError(null);
    try {
      await fn({ sessionId: session.id, userId });
      await load();
      await onChanged();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Waitlist — {session.title}</DialogTitle>
        </DialogHeader>

        <Text as="p" className="-mt-2 text-[12px] text-text-2">
          {session.roster_count}/{session.capacity} places taken.
          {full
            ? " The session is full, so new self-enrolments queue here."
            : " There is room — promoting somebody enrols them straight away."}
        </Text>

        {error && (
          <Box className="border border-danger/30 bg-danger/10 px-3 py-2">
            <Text as="p" className="text-[12.5px] text-danger">{error}</Text>
          </Box>
        )}

        {rows === null ? (
          <Text as="p" className="py-6 text-center text-[12.5px] text-text-3">Loading…</Text>
        ) : rows.length === 0 ? (
          <Box className="border border-dashed border-line-strong bg-surface-2 px-4 py-10 text-center">
            <Text as="p" className="text-[12.5px] text-text-2">Nobody is waiting.</Text>
          </Box>
        ) : (
          <Box className="divide-y divide-line border border-line">
            {rows.map((r, i) => (
              <Box key={r.id} className="flex items-center gap-3 bg-surface px-3.5 py-2.5">
                <Text as="span" className="w-5 shrink-0 font-mono text-[11px] font-bold text-text-3">
                  {i + 1}
                </Text>
                <Box className="min-w-0 flex-1">
                  <Text as="p" className="truncate text-[12.5px] font-semibold text-ink">
                    {r.first_name} {r.last_name}
                  </Text>
                  <Text as="p" className="truncate text-[11px] text-text-3">{r.email}</Text>
                </Box>
                <Box className="flex shrink-0 gap-1">
                  <CardBtn primary disabled={busy} onClick={() => act(promoteFromWaitlist, r.user_id)}>
                    Enrol
                  </CardBtn>
                  <CardBtn danger disabled={busy} onClick={() => act(dropFromWaitlist, r.user_id)}>
                    Remove
                  </CardBtn>
                </Box>
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

function MarkAttendanceTab({ sessions, initialSessionId }) {
  const [selectedId,     setSelectedId]     = useState(initialSessionId || "");
  const [records,        setRecords]        = useState([]);
  const [isLocked,       setIsLocked]       = useState(false);
  const [loadingAtt,     setLoadingAtt]     = useState(false);
  const [saving,         setSaving]         = useState(false);
  const [localRows,      setLocalRows]      = useState([]);

  const selectedSession = sessions.find((s) => String(s.id) === selectedId);

  useEffect(() => {
    if (!selectedId) return;
    setLoadingAtt(true);
    apiClient(`/api/admin/sessions/${selectedId}/attendance`)
      .then((d) => {
        setRecords(d.records || []);
        setIsLocked(!!d.is_locked);
        setLocalRows((d.records || []).map((r) => ({
          user_id:   r.user_id,
          status:    r.status || "",
          join_time: r.join_time || "",
          notes:     r.notes || "",
        })));
      })
      .finally(() => setLoadingAtt(false));
  }, [selectedId]);

  const updateRow = (userId, field, value) => {
    setLocalRows((prev) => prev.map((r) => r.user_id === userId ? { ...r, [field]: value } : r));
  };

  const quickMarkAll = (status) => {
    setLocalRows((prev) => prev.map((r) => ({ ...r, status })));
  };

  const handleSave = async (lock) => {
    setSaving(true);
    try {
      const d = await apiClient(`/api/admin/sessions/${selectedId}/attendance`, {
        method: "PUT",
        body: { records: localRows, lock },
      });
      setRecords(d.records || []);
      setIsLocked(!!d.is_locked);
      setLocalRows((d.records || []).map((r) => ({
        user_id:   r.user_id,
        status:    r.status || "",
        join_time: r.join_time || "",
        notes:     r.notes || "",
      })));
    } finally { setSaving(false); }
  };

  const markedCount = localRows.filter((r) => r.status).length;

  // The same four states the Sessions tab shows, from the same config — this
  // used to read "Scheduled" for anything that was not completed, including a
  // cancelled session.
  const statusCfg   = STATUS_CFG[displayOf(selectedSession)] || STATUS_CFG.upcoming;
  const statusLabel = selectedSession ? statusCfg.label : "";
  const statusCls   = statusCfg.cls;

  return (
    <Box className="space-y-5">

      {/* Session selector row */}
      <Box className="flex items-center gap-3 flex-wrap">
        <Text as="label" className="text-sm font-semibold whitespace-nowrap">Select Session:</Text>
        <Select value={selectedId} onValueChange={setSelectedId}>
          <SelectTrigger className="h-10 flex-1 min-w-[300px] max-w-xl text-sm bg-white">
            <SelectValue placeholder="— Choose a session —">
              {selectedSession
                ? `${selectedSession.date} — ${selectedSession.title} (${selectedSession.session_type})`
                : "— Choose a session —"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {sessions.map((s) => (
              <SelectItem key={s.id} value={String(s.id)}>
                {s.date} — {s.title} ({s.session_type})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedSession && (
          <Badge className={`text-[11px] font-medium border ${statusCls}`}>{statusLabel}</Badge>
        )}
      </Box>

      {/* Session info banner */}
      {selectedSession && (
        <Card className="border">
          <CardContent className="p-4">
            <Box className="grid grid-cols-2 lg:grid-cols-6 gap-4">
              <Box className="lg:col-span-2">
                <Text as="p" className="text-[10px] text-muted-foreground uppercase tracking-wide">Session</Text>
                <Text as="p" className="text-sm font-semibold leading-tight">{selectedSession.title}</Text>
              </Box>
              <Box>
                <Text as="p" className="text-[10px] text-muted-foreground uppercase tracking-wide">Date</Text>
                <Text as="p" className="text-sm font-semibold">{formatDate(selectedSession.date)}</Text>
              </Box>
              <Box>
                <Text as="p" className="text-[10px] text-muted-foreground uppercase tracking-wide">Time</Text>
                <Text as="p" className="text-sm font-semibold">{selectedSession.start_time}–{selectedSession.end_time}</Text>
              </Box>
              <Box>
                <Text as="p" className="text-[10px] text-muted-foreground uppercase tracking-wide">Trainer</Text>
                <Text as="p" className="text-sm font-semibold">{selectedSession.trainer}</Text>
              </Box>
              <Box className="flex gap-4">
                <Box>
                  <Text as="p" className="text-[10px] text-muted-foreground uppercase tracking-wide">Registered</Text>
                  <Text as="p" className="text-sm font-semibold">{selectedSession.roster_count}</Text>
                </Box>
                <Box>
                  <Text as="p" className="text-[10px] text-muted-foreground uppercase tracking-wide">Marked</Text>
                  <Text as="p" className={cn("text-sm font-semibold", markedCount === 0 ? "text-ink/70" : markedCount === localRows.length ? "text-navy" : "text-navy")}>
                    {markedCount}/{localRows.length}
                  </Text>
                </Box>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Locked banner */}
      {isLocked && (
        <Box className="flex items-center gap-2 px-4 py-3 rounded-lg bg-paper-cream border border-navy/20">
          <Lock className="h-4 w-4 text-navy shrink-0" />
          <Text as="p" className="text-sm text-navy font-medium">
            Attendance locked ·{" "}
            {localRows.filter((r) => r.status === "present").length} present ·{" "}
            {localRows.filter((r) => r.status === "absent").length} absent ·{" "}
            {localRows.filter((r) => r.status === "late").length} late
          </Text>
        </Box>
      )}

      {/* Quick mark all */}
      {!isLocked && localRows.length > 0 && (
        <Box className="flex items-center gap-3 flex-wrap">
          <Text as="span" className="text-sm font-medium">Quick mark all:</Text>
          {Object.entries(ATTENDANCE_STATUS_CFG).map(([key, cfg]) => (
            <button
              key={key}
              className={`text-sm font-semibold cursor-pointer hover:underline ${cfg.cls}`}
              onClick={() => quickMarkAll(key)}
            >
              {cfg.label}
            </button>
          ))}
        </Box>
      )}

      {/* Attendance table */}
      {!selectedId ? (
        <Card className="p-12 text-center">
          <CalendarCheck className="h-10 w-10 mx-auto text-muted-foreground/25 mb-3" />
          <Text as="p" className="text-sm text-muted-foreground">Select a session to mark attendance.</Text>
        </Card>
      ) : loadingAtt ? (
        <Box className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</Box>
      ) : localRows.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="h-10 w-10 mx-auto text-muted-foreground/25 mb-3" />
          <Text as="p" className="text-sm text-muted-foreground">No learners enrolled in this session yet. Add them via Roster.</Text>
        </Card>
      ) : (
        <Card className="overflow-x-auto">
          {/* Table header */}
          <Box className="grid min-w-[52rem] grid-cols-[40px_1fr_130px_160px_110px_1fr_120px] gap-0 px-5 py-2.5 border-b bg-muted/30">
            {["#","LEARNER","DEPARTMENT","STATUS","JOIN TIME","NOTES","MARKED BY"].map((h) => (
              <Text key={h} as="span" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{h}</Text>
            ))}
          </Box>

          {localRows.map((row, idx) => {
            const rec = records.find((r) => r.user_id === row.user_id) || {};
            const statusCfgItem = ATTENDANCE_STATUS_CFG[row.status] || null;

            return (
              <Box
                key={row.user_id}
                className="grid min-w-[52rem] grid-cols-[40px_1fr_130px_160px_110px_1fr_120px] gap-0 items-center px-5 py-3 border-b last:border-b-0 hover:bg-muted/10"
              >
                <Text as="span" className="text-sm text-muted-foreground">{idx + 1}</Text>

                {/* Learner */}
                <Box className="flex items-center gap-2.5 min-w-0">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className={`text-xs font-bold text-white ${avatarColor(row.user_id)}`}>
                      {avatarInitials(rec.first_name, rec.last_name)}
                    </AvatarFallback>
                  </Avatar>
                  <Box className="min-w-0">
                    <Text as="p" className="text-sm font-semibold leading-none truncate">{rec.first_name} {rec.last_name}</Text>
                    <Text as="p" className="text-[11px] text-muted-foreground truncate">{rec.email}</Text>
                  </Box>
                </Box>

                <Text as="span" className="text-sm text-muted-foreground">{rec.department || "—"}</Text>

                {/* Status select */}
                <Select value={row.status || ""} onValueChange={(v) => updateRow(row.user_id, "status", v)} disabled={isLocked}>
                  <SelectTrigger className={cn("h-8 text-xs w-[140px]", statusCfgItem ? statusCfgItem.triggerCls : "")}>
                    <SelectValue placeholder="— Select —">
                      {statusCfgItem ? statusCfgItem.label : "— Select —"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">— Select —</SelectItem>
                    {Object.entries(ATTENDANCE_STATUS_CFG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Join time */}
                <Input
                  type="time"
                  value={row.join_time}
                  onChange={(e) => updateRow(row.user_id, "join_time", e.target.value)}
                  className="h-8 text-xs w-[95px]"
                  disabled={isLocked}
                  placeholder="HH:MM"
                />

                {/* Notes */}
                <Input
                  value={row.notes}
                  onChange={(e) => updateRow(row.user_id, "notes", e.target.value)}
                  className="h-8 text-xs"
                  disabled={isLocked}
                  placeholder="Optional notes"
                />

                {/* Marked by */}
                <Text as="span" className="text-xs text-muted-foreground">
                  {rec.marker_name || "—"}
                </Text>
              </Box>
            );
          })}
        </Card>
      )}

      {/* Footer buttons */}
      {!isLocked && localRows.length > 0 && (
        <Box className="flex items-center justify-end gap-3">
          <Button variant="outline" className="gap-2" onClick={() => handleSave(false)} disabled={saving}>
            <Save className="h-4 w-4" />{saving ? "Saving…" : "Save Draft"}
          </Button>
          <Button className="bg-navy hover:bg-navy-soft text-paper gap-2" onClick={() => handleSave(true)} disabled={saving}>
            <CheckCircle2 className="h-4 w-4" />{saving ? "Locking…" : "Save & Lock Attendance"}
          </Button>
        </Box>
      )}
    </Box>
  );
}

/* ══════════════════════════════════════════
   ATTENDANCE REPORTS TAB
══════════════════════════════════════════ */

function AttendanceReportsTab({ sessions }) {
  /**
   * Reads the counts the sessions endpoint already returns — `roster_count`,
   * `attendance_marked_count` and `credited_count` — rather than fetching each
   * session's full attendance record.
   *
   * This replaces two bugs that made a trainer's saved attendance look like it
   * had never happened:
   *
   *  1. It gated every figure on `is_locked`, so attendance that had been saved
   *     but not LOCKED counted as zero and the session read "Not yet held — no
   *     attendance data". Nothing in the trainer portal locks, and an admin who
   *     saves without ticking lock hit the same thing.
   *  2. It counted only `status === "present"`. `late` and `partial` also credit
   *     the learner with the training, its hours and its completion
   *     (`CREDITING_STATUSES` on the server), so the report disagreed with both
   *     the sessions list and the learner's own record.
   *
   * It also removes an N+1: the old version issued one request per session from
   * the browser, so ten sessions meant ten round trips for numbers already
   * present in the list response.
   */
  const rows = sessions.map((s) => {
    const roster = Number(s.roster_count || 0);
    const marked = Number(s.attendance_marked_count || 0);
    const credited = Number(s.credited_count || 0);
    return {
      session: s,
      roster,
      marked,
      credited,
      // Marked, but with a status that earns nothing — absent or excused.
      notCredited: Math.max(0, marked - credited),
      unmarked: Math.max(0, roster - marked),
      // Null until something has actually been recorded, so "no data yet" and
      // "everyone was absent" stay distinguishable.
      pct: marked > 0 && roster > 0 ? Math.round((credited / roster) * 100) : null,
    };
  });

  const totalRegistered = rows.reduce((sum, r) => sum + r.roster, 0);
  const totalCredited = rows.reduce((sum, r) => sum + r.credited, 0);
  const withData = rows.filter((r) => r.pct !== null);
  const overallPct =
    totalRegistered > 0 ? Math.round((totalCredited / totalRegistered) * 100) : 0;
  const avgPerSession =
    withData.length > 0
      ? Math.round(withData.reduce((sum, r) => sum + r.pct, 0) / withData.length)
      : 0;

  const reportStatCards = [
    { icon: CalendarCheck, value: sessions.length,     label: "Total Sessions",     circle: "bg-paper-cream" },
    { icon: Users,         value: totalRegistered,     label: "Total Registered",   circle: "bg-paper-cream" },
    { icon: CheckCircle2,  value: `${overallPct}%`,    label: "Overall Attendance", circle: "bg-paper-cream" },
    { icon: BarChart3,     value: `${avgPerSession}%`, label: "Avg per Session",    circle: "bg-paper-cream" },
  ];

  return (
    <Box className="space-y-5">
      <Box className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {reportStatCards.map((s) => (
          <Card key={s.label} className="gap-0 relative overflow-hidden p-4 sm:p-5">
            <Box className="relative z-10 flex items-start gap-3">
              <Box className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-paper-cream">
                <s.icon className="h-5 w-5 text-navy" />
              </Box>
              <Box className="min-w-0">
                <Text as="h2" className="text-xl font-bold leading-tight sm:text-2xl">{s.value}</Text>
                <Text as="p" className="text-sm text-muted-foreground">{s.label}</Text>
              </Box>
            </Box>
            <Box className={`pointer-events-none absolute -right-5 -top-5 h-20 w-20 rounded-full opacity-60 sm:h-24 sm:w-24 ${s.circle}`} />
          </Card>
        ))}
      </Box>

      {/* Breakdown */}
      <Box>
        <Text as="h3" className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
          Session Attendance Breakdown
        </Text>
        <Box className="space-y-2">
          {rows.map(({ session: s, roster, credited, notCredited, unmarked, marked, pct }) => {
            const typeCfg = TYPE_CFG[s.session_type] || TYPE_CFG.ILT;
            return (
              <Card key={s.id} className="gap-0 border">
                <CardContent className="px-4 py-3">
                  <Box className="flex flex-wrap items-start justify-between gap-4">
                    <Box className="min-w-0 flex-1 basis-[12rem]">
                      <Box className="flex flex-wrap items-center gap-2 mb-1">
                        <Badge className={`text-[10px] font-medium border-0 ${typeCfg.cls}`}>{typeCfg.label}</Badge>
                        <Text as="p" className="text-sm font-semibold leading-snug">{s.title}</Text>
                      </Box>
                      {marked > 0 ? (
                        <Box className="space-y-1.5">
                          <Text as="p" className="text-xs text-muted-foreground">
                            {/* "Credited" rather than "Present": late and partial
                                earn the training too, so counting only present
                                would disagree with the learner's own record. */}
                            <Text as="span" className="text-navy font-medium">✓ Credited: {credited}</Text>
                            {"  "}
                            <Text as="span" className="text-error font-medium">✗ Not credited: {notCredited}</Text>
                            {"  "}
                            <Text as="span" className="text-muted-foreground">○ Unmarked: {unmarked}</Text>
                            {"  "}
                            Total registered: {roster}
                          </Text>
                          <Box className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <Box className="h-full rounded-full bg-navy" style={{ width: `${pct ?? 0}%` }} />
                          </Box>
                        </Box>
                      ) : (
                        <Box className="flex items-center gap-1.5">
                          <CalendarCheck className="h-3.5 w-3.5 text-muted-foreground/40" />
                          <Text as="p" className="text-xs text-muted-foreground">
                            No attendance recorded yet
                          </Text>
                        </Box>
                      )}
                    </Box>
                    <Box className="ml-auto shrink-0 text-right">
                      <Text as="p" className="text-xs text-muted-foreground">{formatDate(s.date)}</Text>
                      <Text
                        as="p"
                        className={pct !== null ? "text-base font-extrabold text-navy" : "text-base font-bold text-muted-foreground"}
                      >
                        {pct !== null ? `${pct}%` : "—"}
                      </Text>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}

/* ══════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════ */

export function AdminSessionsContent() {
  // Set when the admin arrived from a training card in the Content Library.
  // Landing on an unfiltered list of every session would make them hunt for
  // the one they just clicked.
  const focusSessionId = useSearchParams().get("session");
  const { user } = useAuth();

  /** "sessions" | "attendance" | "reports" — a place the page goes, reached
   *  from a card, not a tab the page always wears. */
  const [view, setView] = useState("sessions");
  const [attendanceSessionId, setAttendanceSessionId] = useState("");
  const [sessions,    setSessions]    = useState(null);
  const [courses,     setCourses]     = useState([]);
  const [trainers,    setTrainers]    = useState([]);
  const [deptOptions, setDeptOptions] = useState([]);
  const [error,       setError]       = useState(null);

  // Create/Edit dialog state
  const [dialogOpen,  setDialogOpen]  = useState(false);
  const [editTarget,  setEditTarget]  = useState(null);
  const [form,        setForm]        = useState(EMPTY_FORM);
  const [saving,      setSaving]      = useState(false);
  const [formError,   setFormError]   = useState(null);
  const [deleteTarget,setDeleteTarget]= useState(null);
  const [deleting,    setDeleting]    = useState(false);
  /**
   * The cover picture, kept OUT of `form` on purpose: `handleSave` spreads
   * `form` straight into the request body, and a `thumbnail_url` key present
   * on every save is exactly what would overwrite the picture on an edit that
   * never touched it. These two say what the admin actually did — picked a new
   * file, or asked to remove the existing one.
   */
  const [thumbnailFile,    setThumbnailFile]    = useState(null);
  const [thumbnailCleared, setThumbnailCleared] = useState(false);

  /**
   * The batch manager and waitlist open from a card but render up here, beside
   * the other dialogs — so the state lives with the dialog, not with the tab
   * that triggers it. Same shape as `deleteTarget`.
   */
  const [batchTarget,    setBatchTarget]    = useState(null);
  const [waitlistTarget, setWaitlistTarget] = useState(null);

  /**
   * Archived sessions instead of live ones. Held HERE rather than in
   * `SessionsTab`, because `load` is what fetches and the flag changes which
   * set the API returns — a swap, not a client-side filter.
   */
  const [showArchived,  setShowArchived]  = useState(false);
  const [archivedCount, setArchivedCount] = useState(0);

  const load = useCallback(() => {
    if (!user) return;
    Promise.all([
      apiClient(`/api/admin/sessions${showArchived ? "?archived=true" : ""}`),
      apiClient("/api/admin/courses"),
      apiClient("/api/admin/employees"),
      // The organization's trainer accounts. Assigning one is what puts the
      // session in that trainer's portal (`specs/rbac.md` §3.6.1).
      apiClient("/api/admin/sessions/trainers"),
    ])
      .then(([sRes, cRes, eRes, tRes]) => {
        setSessions(sRes.sessions || []);
        setArchivedCount(sRes.archived_count ?? 0);
        setCourses((cRes.courses || []).filter((c) => c.is_active));
        setTrainers(tRes.trainers || []);
        const depts = [...new Set((eRes.employees || []).map((e) => e.department).filter(Boolean))].sort();
        setDeptOptions(depts);
      })
      .catch((e) => setError(e.message));
  }, [user, showArchived]);

  useEffect(() => { load(); }, [load]);

  const allDepts = [
    ...new Set([
      ...deptOptions,
      ...(sessions ?? []).map((s) => s.department).filter(Boolean),
    ]),
  ].sort();

  const openCreate = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setThumbnailFile(null);
    setThumbnailCleared(false);
    setFormError(null);
    setDialogOpen(true);
  };

  const openEdit = (s) => {
    setEditTarget(s);
    setForm({
      title:        s.title        || "",
      session_type: s.session_type || "ILT",
      department:   s.department   || "",
      course_id:    s.course_id ? String(s.course_id) : "",
      capacity:     s.capacity     ?? 20,
      trainer:      s.trainer      || "",
      trainer_user_id: s.trainer_user_id ? String(s.trainer_user_id) : "",
      venue_url:    s.venue_url    || "",
      date:         s.date         || "",
      start_time:   s.start_time   || "",
      end_time:     s.end_time     || "",
      description:  s.description  || "",
      status:       s.status       || "upcoming",
    });
    setThumbnailFile(null);
    setThumbnailCleared(false);
    setFormError(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title?.trim())      { setFormError("Session title is required");         return; }
    if (!form.trainer?.trim())    { setFormError("Trainer / Facilitator is required"); return; }
    if (!form.venue_url?.trim())  { setFormError("Venue / Platform URL is required");  return; }
    if (!form.date?.trim())       { setFormError("Date is required");                  return; }
    if (!form.start_time?.trim()) { setFormError("Start time is required");            return; }
    if (!form.end_time?.trim())   { setFormError("End time is required");              return; }

    setSaving(true); setFormError(null);

    /**
     * The image is uploaded first because the session has to be able to
     * reference it, and rolled back if the save then fails — the same ordering
     * the course dialog uses. `thumbnail_url` is sent ONLY when the admin
     * changed it, so editing a venue leaves the picture where it was.
     */
    let uploadedUrl = null;
    try {
      if (thumbnailFile) {
        const uploaded = await uploadCourseThumbnail({ file: thumbnailFile });
        uploadedUrl = uploaded.url;
      }
      const body = { ...form, trainer_user_id: form.trainer_user_id ? Number(form.trainer_user_id) : null, capacity: Number(form.capacity) || 20, course_id: form.course_id || null, department: form.department || null };
      if (uploadedUrl) body.thumbnail_url = uploadedUrl;
      else if (thumbnailCleared) body.thumbnail_url = null;

      if (editTarget) {
        await apiClient(`/api/admin/sessions/${editTarget.id}`, { method: "PUT", body });
      } else {
        await apiClient("/api/admin/sessions", { method: "POST", body });
      }
      // Reloading rather than merging the response in: the row carries derived
      // fields the write does not return (the attendance tally), and a merge
      // left them undefined, which the stat cards and percentages read.
      load();
      setDialogOpen(false);
    } catch (e) {
      if (uploadedUrl) await discardCourseThumbnail({ url: uploadedUrl });
      setFormError(e.message);
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiClient(`/api/admin/sessions/${deleteTarget.id}`, { method: "DELETE" });
      setSessions((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e) { setError(e.message); } finally { setDeleting(false); }
  };

  const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e?.target ? e.target.value : e }));

  const onMarkAttendance = (sessionId) => {
    setAttendanceSessionId(sessionId);
    setView("attendance");
  };

  if (error) return (
    <Card className="p-8 text-center">
      <Text as="p" className="text-error text-sm">{error}</Text>
      <Button size="sm" variant="outline" className="mt-3" onClick={load}>Retry</Button>
    </Card>
  );
  if (!sessions) return <LoadingSkeleton />;

  return (
    <Box className="space-y-5">

      {/* ── No tab bar: the sessions grid IS the page.
              Attendance and reports are reached FROM a session — marking
              attendance is something you do to one sitting, not a mode the
              whole page sits in — and each shows a back link to return. The
              three-tab bar made the grid one of three equals and buried the
              thing every visit starts with. ── */}
      {view !== "sessions" && (
        <button
          type="button"
          onClick={() => setView("sessions")}
          className="inline-flex cursor-pointer items-center gap-1.5 text-[12px] text-text-3 transition-colors hover:text-accent-blue"
        >
          <ArrowLeft className="size-3.5" />
          Back to sessions
        </button>
      )}

      {view === "sessions" && (
        <SessionsTab
          sessions={sessions}
          courses={courses}
          allDepts={allDepts}
          openCreate={openCreate}
          openEdit={openEdit}
          load={load}
          setDeleteTarget={setDeleteTarget}
          onMarkAttendance={onMarkAttendance}
          focusSessionId={focusSessionId}
          showArchived={showArchived}
          setShowArchived={setShowArchived}
          archivedCount={archivedCount}
          onViewReports={() => setView("reports")}
          setBatchTarget={setBatchTarget}
          setWaitlistTarget={setWaitlistTarget}
        />
      )}

      {view === "attendance" && (
        <MarkAttendanceTab
          sessions={sessions}
          initialSessionId={attendanceSessionId}
        />
      )}

      {view === "reports" && (
        <AttendanceReportsTab
          sessions={sessions}
        />
      )}

      {batchTarget && (
        <BatchesDialog
          session={sessions?.find((x) => x.id === batchTarget.id) ?? batchTarget}
          onClose={() => setBatchTarget(null)}
          onChanged={load}
        />
      )}

      {waitlistTarget && (
        <WaitlistDialog
          session={sessions?.find((x) => x.id === waitlistTarget.id) ?? waitlistTarget}
          onClose={() => setWaitlistTarget(null)}
          onChanged={load}
        />
      )}

      {/* ── Create / Edit Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Edit Session" : "Create New Session"}</DialogTitle>
          </DialogHeader>

          <Box className="space-y-5 py-2">
            <Box className="space-y-2">
              <Label className="text-sm font-medium">Session Title <Text as="span" className="text-error">*</Text></Label>
              <Input placeholder="e.g. Leadership Bootcamp — Batch 1" value={form.title} onChange={set("title")} className="h-10" />
            </Box>

            <Box className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Box className="space-y-2">
                <Label className="text-sm font-medium">Session Type</Label>
                <Box className="flex gap-2">
                  {["ILT", "Virtual"].map((type) => (
                    <Button key={type} type="button" variant="outline" size="sm"
                      className={cn("flex-1 h-10 text-sm font-medium transition-colors", form.session_type === type
                        ? type === "ILT" ? "bg-paper-cream border-navy/20 text-navy" : "bg-paper-cream border-navy/20 text-navy"
                        : "bg-white text-muted-foreground")}
                      onClick={() => setForm((p) => ({ ...p, session_type: type }))}>
                      {type === "ILT" ? <MapPin className="h-3.5 w-3.5 mr-1.5" /> : <Video className="h-3.5 w-3.5 mr-1.5" />}
                      {sessionTypeLabel(type)}
                    </Button>
                  ))}
                </Box>
              </Box>
              <Box className="space-y-2">
                <Label className="text-sm font-medium">Department</Label>
                <Select value={form.department || "all"} onValueChange={(v) => setForm((p) => ({ ...p, department: v === "all" ? "" : v }))}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {allDepts.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Box>
            </Box>

            <Box className="space-y-2">
              <Label className="text-sm font-medium">Linked Course</Label>
              <Select value={form.course_id || "none"} onValueChange={(v) => setForm((p) => ({ ...p, course_id: v === "none" ? "" : v }))}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="None — Standalone session" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None — Standalone session</SelectItem>
                  {/* Session trainings are generated from sessions, so they are
                      not catalog courses a session can be linked to. */}
                  {courses.filter((c) => !c.session_id).map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Box>

            <Box className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Box className="space-y-2">
                <Label className="text-sm font-medium">Trainer / Facilitator <Text as="span" className="text-error">*</Text></Label>
                {/* A picker, with free text still available.
                    Choosing a trainer account is what puts this session in that
                    trainer's portal — it sets `trainer_user_id`, and the server
                    then DERIVES the display name from that account so the two
                    cannot disagree (`specs/rbac.md` §3.6.1).
                    "Someone else" keeps the original behaviour, which an
                    external facilitator needs and which is the only option for
                    an organization that has no trainer accounts yet. */}
                {trainers.length === 0 ? (
                  /* A new session REQUIRES a trainer account, so an org with
                     none cannot create one — and the form says where to fix
                     that rather than leaving the admin at a dead end. Linking
                     an account is what puts the session in the trainer's
                     portal, which is where attendance is marked. */
                  <Box className="border border-dashed border-line-strong bg-surface-2 px-3 py-2.5">
                    <Text as="p" className="text-[11.5px] font-semibold text-ink">
                      No trainer accounts in this organization yet
                    </Text>
                    <Text as="p" className="mt-0.5 text-[11px] text-muted-foreground">
                      A session needs one — it is what puts the session in the
                      trainer&apos;s portal, where attendance is marked.
                    </Text>
                    <Link
                      href="/admin/users"
                      className="mt-1.5 inline-block text-[11.5px] font-semibold text-accent-blue underline-offset-2 hover:underline"
                    >
                      Add a trainer from Manage Users →
                    </Link>
                  </Box>
                ) : (
                  <Select
                    value={form.trainer_user_id ? String(form.trainer_user_id) : "none"}
                    onValueChange={(v) => {
                      if (v === "none") {
                        setForm((f) => ({ ...f, trainer_user_id: "" }));
                        return;
                      }
                      const picked = trainers.find((t) => String(t.id) === v);
                      setForm((f) => ({
                        ...f,
                        trainer_user_id: v,
                        trainer: picked ? picked.name : f.trainer,
                      }));
                    }}
                  >
                    <SelectTrigger className="h-10 w-full text-sm bg-white">
                      <SelectValue>
                        {form.trainer_user_id
                          ? trainers.find((t) => String(t.id) === String(form.trainer_user_id))?.name
                            ?? "Trainer account"
                          : editTarget
                            ? "Someone else (type a name)"
                            : "Select a trainer"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {trainers.map((t) => (
                        <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                      ))}
                      {/* Only offered while editing a session that already
                          has no linked account. A NEW session must name one. */}
                      {editTarget && (
                        <SelectItem value="none">Someone else (type a name)</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                )}
                {/* Free text survives ONLY for sessions that already have it.
                    A new session must name an account, so typing a name into
                    a box the API will refuse would be a control that lies. */}
                {editTarget && !form.trainer_user_id && (
                  <>
                    <Input
                      placeholder="Full name"
                      value={form.trainer}
                      onChange={set("trainer")}
                      className="h-10"
                    />
                    <Text as="p" className="text-[11px] text-warning">
                      This session predates trainer accounts. It stays
                      admin-only until you link one — nobody can mark its
                      attendance from a trainer portal.
                    </Text>
                  </>
                )}
                {form.trainer_user_id && (
                  <Text as="p" className="text-[11px] text-muted-foreground">
                    This trainer will see the session, its participants and
                    attendance in their own portal.
                  </Text>
                )}
              </Box>
              <Box className="space-y-2">
                <Label className="text-sm font-medium">Capacity</Label>
                <Input type="number" min={1} max={500} value={form.capacity} onChange={set("capacity")} className="h-10" />
              </Box>
            </Box>

            <Box className="space-y-2">
              <Label className="text-sm font-medium">Venue / Platform URL <Text as="span" className="text-error">*</Text></Label>
              <Input placeholder="Room name / Address — or paste Zoom/Teams/Meet URL" value={form.venue_url} onChange={set("venue_url")} className="h-10" />
            </Box>

            <Box className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Box className="space-y-2">
                <Label className="text-sm font-medium">Date <Text as="span" className="text-error">*</Text></Label>
                <Input type="date" value={form.date} onChange={set("date")} className="h-10" />
              </Box>
              <Box className="space-y-2">
                <Label className="text-sm font-medium">Start Time <Text as="span" className="text-error">*</Text></Label>
                <Input type="time" value={form.start_time} onChange={set("start_time")} className="h-10" />
              </Box>
            </Box>

            <Box className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Box className="space-y-2">
                <Label className="text-sm font-medium">End Time <Text as="span" className="text-error">*</Text></Label>
                <Input type="time" value={form.end_time} onChange={set("end_time")} className="h-10" />
              </Box>
              <Box className="space-y-2">
                <Label className="text-sm font-medium">Status</Label>
                <Select value={form.status} onValueChange={set("status")}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </Box>
            </Box>

            <ThumbnailField
              value={thumbnailCleared ? null : editTarget?.thumbnail_url || null}
              file={thumbnailFile}
              onSelect={(f) => { setThumbnailFile(f); setThumbnailCleared(false); }}
              onClear={() => {
                // Clearing a pending file goes back to the stored picture;
                // clearing again removes that too.
                if (thumbnailFile) setThumbnailFile(null);
                else setThumbnailCleared(true);
              }}
              disabled={saving}
            />

            <DescriptionField
              placeholder="Brief summary of what this session covers..."
              value={form.description}
              onChange={set("description")}
            />

            {formError && (
              <Box className="bg-error/10 border border-error/30 rounded-lg px-3 py-2">
                <Text as="p" className="text-sm text-error">{formError}</Text>
              </Box>
            )}
          </Box>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            {/* A NEW session needs a trainer account; the API returns 422
                without one, so the button disables and its title says why
                rather than letting the admin fill the form and be refused
                (§10.3.1.2). Editing is unaffected — a legacy session with a
                typed name stays editable. */}
            <Button
              onClick={handleSave}
              disabled={saving || (!editTarget && !form.trainer_user_id)}
              title={
                !editTarget && !form.trainer_user_id
                  ? trainers.length === 0
                    ? "This organization has no trainer accounts yet. Add one from Manage Users."
                    : "Pick a trainer — a session has to name one."
                  : undefined
              }
              className="bg-navy hover:bg-navy-soft text-paper"
            >
              {saving ? "Saving…" : editTarget ? "Save Changes" : "Create Session"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Session</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteTarget?.title}</strong>. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-error hover:bg-error text-white">
              {deleting ? "Deleting…" : "Delete Session"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </Box>
  );
}
