"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
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
} from "lucide-react";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { cn } from "@/lib/utils";
import { SESSION_TYPE_LABEL, sessionTypeLabel } from "@/lib/session-types";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api-client";

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
  upcoming:    { label: "Upcoming",    cls: "bg-paper-warm text-ink/60 border-border"   },
  in_progress: { label: "In progress", cls: "bg-paper-cream text-ink border-navy/25"    },
  completed:   { label: "Completed",   cls: "bg-navy text-paper border-navy"            },
  cancelled:   { label: "Cancelled",   cls: "bg-error/10 text-error border-error/30"    },
};

/** The status to show. Falls back to the stored one if the API is older. */
function displayOf(session) {
  return session?.display_status || session?.status || "upcoming";
}

/* Labels come from lib/session-types so the list, both calendars and the form
   all say the same thing. Only the icon and chip live here. */
const TYPE_CFG = {
  ILT:     { label: SESSION_TYPE_LABEL.ILT,     cls: "bg-paper-cream text-navy border-0", icon: MapPin },
  Virtual: { label: SESSION_TYPE_LABEL.Virtual, cls: "bg-paper-cream text-navy border-0", icon: Video  },
  Webinar: { label: SESSION_TYPE_LABEL.Webinar, cls: "bg-paper-cream text-navy border-0", icon: Video  },
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

const TABS = [
  { id: "sessions",    label: "Sessions",           icon: CalendarCheck },
  { id: "attendance",  label: "Mark Attendance",    icon: CheckCircle2  },
  { id: "reports",     label: "Attendance Reports", icon: BarChart3     },
];

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
  const [rosterTarget,   setRosterTarget]   = useState(null);
  const [cancelTarget,   setCancelTarget]   = useState(null);
  const [cancelling,     setCancelling]     = useState(false);
  const [completeTarget, setCompleteTarget] = useState(null);
  const [completing,     setCompleting]     = useState(false);
  const [completeError,  setCompleteError]  = useState(null);

  const filtered = sessions.filter((s) => {
    const matchType   = filterType   === "all" || s.session_type === filterType;
    const matchStatus = filterStatus === "all" || displayOf(s)   === filterStatus;
    return matchType && matchStatus;
  });

  const totalRegistered = sessions.reduce((sum, s) => sum + Number(s.roster_count || 0), 0);
  const countOf = (status) => sessions.filter((s) => displayOf(s) === status).length;

  const statCards = [
    { icon: CalendarCheck, value: sessions.length,          label: "Total Sessions",   sub: "All time",             iconBg: "bg-paper-cream", iconColor: "text-navy",   circle: "bg-paper-cream" },
    { icon: AlertCircle,   value: countOf("upcoming"),      label: "Upcoming",         sub: "Not yet started",      iconBg: "bg-paper-cream", iconColor: "text-ink/70", circle: "bg-paper-cream" },
    // The actionable number: these are past their start time and still waiting
    // for the admin to mark them completed, which is what credits the learners.
    { icon: Clock,         value: countOf("in_progress"),   label: "In progress",      sub: "Awaiting completion",  iconBg: "bg-paper-cream", iconColor: "text-navy",   circle: "bg-paper-cream" },
    { icon: CheckCircle2,  value: countOf("completed"),     label: "Completed",        sub: "Learners credited",    iconBg: "bg-paper-cream", iconColor: "text-navy",   circle: "bg-paper-cream" },
    { icon: Users,         value: totalRegistered,          label: "Total Registered", sub: "Across all sessions",  iconBg: "bg-paper-cream", iconColor: "text-navy",   circle: "bg-paper-cream" },
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

      {/* Stat Cards */}
      <Box className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((s) => (
          <Card key={s.label} className="relative overflow-hidden p-5">
            <Box className="relative z-10 flex items-start gap-3">
              <Box className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${s.iconBg}`}>
                <s.icon className={`h-5 w-5 ${s.iconColor}`} />
              </Box>
              <Box>
                <Text as="h2" className="text-3xl font-bold leading-tight">{s.value}</Text>
                <Text as="p" className="text-sm text-muted-foreground">{s.label}</Text>
                <Text as="p" className="text-xs text-muted-foreground/70 mt-0.5">{s.sub}</Text>
              </Box>
            </Box>
            <Box className={`pointer-events-none absolute -right-5 -top-5 h-20 w-20 rounded-full opacity-60 sm:h-24 sm:w-24 ${s.circle}`} />
          </Card>
        ))}
      </Box>

      {/* Toolbar */}
      <Box className="flex items-center gap-3 flex-wrap">
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
        <Text as="p" className="text-sm text-muted-foreground flex-1">{filtered.length} session{filtered.length !== 1 ? "s" : ""}</Text>
        <Button className="h-10 bg-navy hover:bg-navy-soft text-paper gap-1.5 shrink-0 px-5 text-sm" onClick={openCreate}>
          <Plus className="h-4 w-4" />New Session
        </Button>
      </Box>

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
          {filtered.map((s) => {
            const typeCfg   = TYPE_CFG[s.session_type] || TYPE_CFG.ILT;
            const view      = displayOf(s);
            const statusCfg = STATUS_CFG[view] || STATUS_CFG.upcoming;
            const TypeIcon  = typeCfg.icon;
            const isCompleted = view === "completed";
            const isCancelled = view === "cancelled";
            const isUpcoming  = view === "upcoming";
            const rosterCount = Number(s.roster_count || 0);
            const credited    = Number(s.credited_count || 0);
            const marked      = Number(s.attendance_marked_count || 0);
            const attendancePct =
              rosterCount > 0 ? Math.round((credited / rosterCount) * 100) : 0;

            return (
              <Card
                key={s.id}
                ref={String(s.id) === String(focusSessionId) ? focusRef : null}
                className={cn(
                  "overflow-hidden hover:shadow-md transition-shadow",
                  String(s.id) === String(highlighted) &&
                    "ring-2 ring-navy/40 shadow-md",
                )}
              >
                <CardContent className="p-4 sm:p-5">
                  <Box className="flex flex-wrap items-start gap-4">

                    {/* Left */}
                    <Box className="min-w-0 flex-1 basis-[14rem] space-y-2">

                      {/* Row 1: badges */}
                      <Box className="flex items-center gap-2 flex-wrap">
                        <Badge className={`text-[11px] font-medium flex items-center gap-1 ${typeCfg.cls}`}>
                          <TypeIcon className="h-3 w-3" />{typeCfg.label}
                        </Badge>
                        <Badge className={`text-[11px] font-medium ${statusCfg.cls}`}>
                          {statusCfg.label}
                        </Badge>
                        {s.course_name && (
                          <Badge variant="outline" className="text-[11px] font-medium border-navy/20 text-navy bg-paper-cream flex items-center gap-1">
                            <BookOpen className="h-3 w-3" />{s.course_name}
                          </Badge>
                        )}
                      </Box>

                      {/* Row 2: title */}
                      <Text as="h3" className="text-base font-extrabold leading-snug">{s.title}</Text>

                      {/* Row 3: meta */}
                      <Box className="flex items-center gap-4 flex-wrap text-sm text-muted-foreground">
                        <Box className="flex items-center gap-1.5">
                          <UserCircle className="h-3.5 w-3.5 shrink-0" />
                          <Text as="span">{s.trainer}</Text>
                        </Box>
                        <Box className="flex items-center gap-1.5">
                          <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                          <Text as="span">{formatDate(s.date)}</Text>
                        </Box>
                        <Box className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 shrink-0" />
                          <Text as="span">{s.start_time}–{s.end_time} IST</Text>
                        </Box>
                        <Box className="flex items-center gap-1.5">
                          {s.session_type === "Virtual"
                            ? <Video className="h-3.5 w-3.5 shrink-0 text-navy" />
                            : <MapPin className="h-3.5 w-3.5 shrink-0 text-navy" />}
                          <Text as="span" className="truncate max-w-[220px]">{s.venue_url}</Text>
                        </Box>
                      </Box>

                      {/* Row 4: description */}
                      {s.description && (
                        <Text as="p" className="text-sm text-muted-foreground line-clamp-1 leading-relaxed">
                          {s.description}
                        </Text>
                      )}
                    </Box>

                    {/* Right */}
                    <Box className="ml-auto flex w-full shrink-0 flex-col items-start gap-2 sm:ml-2 sm:w-auto sm:items-end">
                      {/* Registered count */}
                      <Text as="p" className="text-sm font-semibold text-muted-foreground">
                        Registered{" "}
                        <Text as="span" className="text-foreground">{s.roster_count}/{s.capacity}</Text>
                      </Text>

                      {/* Attendance, from the real tally the API returns. This
                          read `roster/roster*75` before — the constant 75% for
                          every session with anyone on it. */}
                      {isCompleted && rosterCount > 0 && (
                        <Text as="p" className="text-sm font-bold text-navy">
                          Attendance {attendancePct}%
                          <Text as="span" className="font-normal text-muted-foreground">
                            {" "}· {credited} credited
                          </Text>
                        </Text>
                      )}
                      {!isCompleted && !isCancelled && rosterCount > 0 && (
                        <Text as="p" className="text-xs text-muted-foreground">
                          {marked > 0
                            ? `Attendance marked for ${marked} of ${rosterCount}`
                            : "Attendance not marked yet"}
                        </Text>
                      )}

                      {/* Action buttons */}
                      <Box className="flex flex-wrap items-center gap-1.5 justify-start sm:justify-end">
                        {!isCompleted && (
                          <Button variant="outline" size="sm" className="h-7 text-xs px-2.5"
                            onClick={() => setRosterTarget({ id: s.id, title: s.title })}>
                            Roster
                          </Button>
                        )}
                        <Button
                          variant="outline" size="sm"
                          className="h-7 text-xs px-2.5 text-navy border-navy/20 hover:bg-paper-cream"
                          onClick={() => onMarkAttendance(String(s.id))}
                        >
                          {isCompleted ? "View Attendance" : "Mark Attendance"}
                        </Button>
                        {!isCompleted && (
                          <Button variant="outline" size="sm" className="h-7 text-xs px-2.5" onClick={() => openEdit(s)}>
                            <Pencil className="h-3 w-3 mr-1" />Edit
                          </Button>
                        )}
                        {!isCompleted && !isCancelled && (
                          <Button size="sm"
                            className="h-7 text-xs px-2.5 bg-navy hover:bg-navy-soft text-paper"
                            onClick={() => { setCompleteError(null); setCompleteTarget(s); }}>
                            <CheckCircle2 className="h-3 w-3 mr-1" />Mark Completed
                          </Button>
                        )}
                        {isUpcoming && (
                          <Button variant="outline" size="sm" className="h-7 text-xs px-2.5 text-error border-error/30 hover:bg-error/10"
                            onClick={() => setCancelTarget(s)}>
                            Cancel
                          </Button>
                        )}
                      </Box>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            );
          })}
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

  const [activeTab,   setActiveTab]   = useState("sessions");
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

  const load = useCallback(() => {
    if (!user) return;
    Promise.all([
      apiClient("/api/admin/sessions"),
      apiClient("/api/admin/courses"),
      apiClient("/api/admin/employees"),
      // The organization's trainer accounts. Assigning one is what puts the
      // session in that trainer's portal (`specs/rbac.md` §3.6.1).
      apiClient("/api/admin/sessions/trainers"),
    ])
      .then(([sRes, cRes, eRes, tRes]) => {
        setSessions(sRes.sessions || []);
        setCourses((cRes.courses || []).filter((c) => c.is_active));
        setTrainers(tRes.trainers || []);
        const depts = [...new Set((eRes.employees || []).map((e) => e.department).filter(Boolean))].sort();
        setDeptOptions(depts);
      })
      .catch((e) => setError(e.message));
  }, [user]);

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
    try {
      const body = { ...form, trainer_user_id: form.trainer_user_id ? Number(form.trainer_user_id) : null, capacity: Number(form.capacity) || 20, course_id: form.course_id || null, department: form.department || null };
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
    } catch (e) { setFormError(e.message); } finally { setSaving(false); }
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
    setActiveTab("attendance");
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

      {/* ── Tab Bar ── */}
      <Box className="flex gap-0 overflow-x-auto border-b">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex shrink-0 items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px sm:px-5",
                active
                  ? "border-navy/20 text-navy bg-white"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-paper-warm"
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </Box>

      {/* ── Tab Content ── */}
      {activeTab === "sessions" && (
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
        />
      )}

      {activeTab === "attendance" && (
        <MarkAttendanceTab
          sessions={sessions}
          initialSessionId={attendanceSessionId}
        />
      )}

      {activeTab === "reports" && (
        <AttendanceReportsTab
          sessions={sessions}
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
                {trainers.length > 0 && (
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
                          : "Someone else (type a name)"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {trainers.map((t) => (
                        <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                      ))}
                      <SelectItem value="none">Someone else (type a name)</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                <Input
                  placeholder="Full name"
                  value={form.trainer}
                  onChange={set("trainer")}
                  disabled={Boolean(form.trainer_user_id)}
                  className="h-10"
                />
                <Text as="p" className="text-[11px] text-muted-foreground">
                  {form.trainer_user_id
                    ? "This trainer will see the session, its participants and attendance in their own portal."
                    : trainers.length > 0
                      ? "Not linked to an account — the session stays admin-only."
                      : "No trainer accounts in this organization yet, so the session stays admin-only."}
                </Text>
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

            <Box className="space-y-2">
              <Label className="text-sm font-medium">Description</Label>
              <Textarea rows={3} placeholder="Brief summary of what this session covers..." value={form.description} onChange={set("description")} />
            </Box>

            {formError && (
              <Box className="bg-error/10 border border-error/30 rounded-lg px-3 py-2">
                <Text as="p" className="text-sm text-error">{formError}</Text>
              </Box>
            )}
          </Box>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-navy hover:bg-navy-soft text-paper">
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
