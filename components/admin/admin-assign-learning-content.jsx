"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { BookOpen, Map, Users, ClipboardList, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api-client";
import { fetchAdminCourses, assignUser, removeAssignment } from "@/services/api/admin/admin-api";

/* ── Constants ── */

const TABS = [
  { id: "courses",     label: "Courses",     icon: BookOpen,     iconColor: "text-navy" },
  { id: "journeys",    label: "Journeys",    icon: Map,          iconColor: "text-navy"    },
  { id: "groups",      label: "Groups",      icon: Users,        iconColor: "text-navy"    },
  { id: "assessments", label: "Assessments", icon: ClipboardList,iconColor: "text-ink/70"   },
];

const DEPT_CFG = {
  Engineering: { text: "text-navy", chip: "border-navy/20 text-navy hover:bg-paper-cream bg-white" },
  Sales:       { text: "text-navy",    chip: "border-navy/20 text-navy hover:bg-paper-cream bg-white"         },
  Operations:  { text: "text-ink/70",   chip: "border-border text-ink/70 hover:bg-paper-cream bg-white"      },
  HR:          { text: "text-navy",    chip: "border-navy/20 text-navy hover:bg-paper-cream bg-white"         },
};
const DEFAULT_DEPT_CFG = { text: "text-navy", chip: "border-navy/20 text-navy hover:bg-paper-cream bg-white" };

const AVATAR_COLORS = [
  "bg-navy",  "bg-navy", "bg-navy",  "bg-navy",
  "bg-navy",  "bg-navy",    "bg-navy", "bg-navy",
  "bg-error",  "bg-navy",  "bg-navy",   "bg-navy",
];

function empStatus(emp) {
  if (!emp.is_active) return { label: "inactive", cls: "bg-navy text-paper border-navy" };
  if (emp.status === "failed") return { label: "failed", cls: "text-error font-medium" };
  return { label: "active", cls: "bg-navy text-paper border-navy" };
}

function initials(emp) {
  return `${(emp.first_name || "")[0]}${(emp.last_name || "")[0]}`.toUpperCase();
}

function formatDateDisplay(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${m}/${d}/${y}`;
}

/* ── Loading skeleton ── */
function LoadingSkeleton() {
  return (
    <Box className="space-y-5 mt-5">
      <Box className="grid grid-cols-2 gap-4">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
      </Box>
      {[1, 2, 3].map((i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
    </Box>
  );
}

/* ── Main component ── */
export function AdminAssignLearningContent() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("courses");
  const [courses, setCourses] = useState(null);
  const [employees, setEmployees] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [globalDueDate, setGlobalDueDate] = useState("2026-07-31");
  const [rowDueDates, setRowDueDates] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [unassignTarget, setUnassignTarget] = useState(null);
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  /* ── Load courses once ── */
  useEffect(() => {
    if (!user) return;
    fetchAdminCourses()
      .then((d) => {
        const list = (d.courses || []).filter((c) => c.is_active);
        setCourses(list);
        if (list.length) setSelectedCourseId(String(list[0].id));
      })
      .catch((e) => setError(e.message));
  }, [user]);

  /* ── Load employees + assignments when course changes ── */
  const loadData = useCallback(async () => {
    if (!user || !selectedCourseId) return;
    setLoading(true);
    try {
      const [empRes, assignRes] = await Promise.all([
        apiClient("/api/admin/employees"),
        apiClient(`/api/admin/courses/${selectedCourseId}/assignments`),
      ]);
      setEmployees(empRes.employees || []);
      setAssignments(assignRes.assignments || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [user, selectedCourseId]);

  useEffect(() => { loadData(); }, [loadData]);

  /* ── Actions ── */
  const handleAssign = async (userId) => {
    const dueDate = rowDueDates[userId] || globalDueDate || null;
    try {
      await assignUser({ courseId: selectedCourseId, userId, dueDate });
      await loadData();
    } catch (e) { setError(e.message); }
  };

  const handleUnassign = async () => {
    if (!unassignTarget) return;
    const asgn = assignments.find((a) => a.user_id === unassignTarget.id);
    if (!asgn) { setUnassignTarget(null); return; }
    try {
      await removeAssignment({ assignmentId: asgn.id });
      setUnassignTarget(null);
      await loadData();
    } catch (e) { setError(e.message); }
  };

  const handleAssignDept = async (dept) => {
    const deptMembers = (employees || []).filter((e) => e.department === dept);
    const unassigned = deptMembers.filter((m) => !assignedUserIds.has(m.id));
    for (const m of unassigned) {
      const dueDate = rowDueDates[m.id] || globalDueDate || null;
      try { await assignUser({ courseId: selectedCourseId, userId: m.id, dueDate }); } catch {}
    }
    await loadData();
  };

  /* ── Derived ── */
  const assignedUserIds = new Set(assignments.map((a) => a.user_id));
  const selectedCourse = courses?.find((c) => String(c.id) === selectedCourseId);
  const totalLearners = employees?.length ?? 0;
  const assignedAnyCount = employees?.filter((e) => e.assigned_courses > 0).length ?? 0;

  const allDepts = [...new Set((employees || []).map((e) => e.department).filter(Boolean))].sort();

  const filteredEmployees = (employees || []).filter((emp) => {
    const q = `${emp.first_name} ${emp.last_name} ${emp.email} ${emp.job_role || ""} ${emp.location || ""}`.toLowerCase();
    const matchSearch = !search || q.includes(search.toLowerCase());
    const matchDept   = filterDept   === "all" || emp.department === filterDept;
    const matchStatus = filterStatus === "all"
      || (filterStatus === "active"   && emp.is_active)
      || (filterStatus === "inactive" && !emp.is_active);
    return matchSearch && matchDept && matchStatus;
  });

  const deptGroups = filteredEmployees.reduce((acc, emp) => {
    const d = emp.department || "No Department";
    if (!acc[d]) acc[d] = [];
    acc[d].push(emp);
    return acc;
  }, {});

  const deptNames = Object.keys(deptGroups).sort();
  const hasFilter = search || filterDept !== "all" || filterStatus !== "all";

  /* ── Page header ── */
  const header = (
    <Box className="flex items-start justify-between gap-4">
      <Box>
        <Text as="h1" className="text-2xl font-bold">Assign Learning</Text>
        <Text as="p" className="text-sm text-muted-foreground mt-0.5">
          {employees
            ? `${assignedAnyCount} of ${totalLearners} employees have a course assigned`
            : "Loading…"}
        </Text>
      </Box>

      {/* Tab bar */}
      <Box className="flex items-center gap-1 shrink-0">
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all",
                active
                  ? "bg-navy text-white shadow-sm"
                  : "text-ink/60 hover:text-ink/80 hover:bg-paper-cream"
              )}
            >
              <tab.icon className={cn("h-4 w-4", active ? "text-white" : tab.iconColor)} />
              {tab.label}
            </button>
          );
        })}
      </Box>
    </Box>
  );

  /* ── Not-yet-loaded ── */
  if (!courses) return (
    <Box className="space-y-5">
      {header}
      <LoadingSkeleton />
    </Box>
  );

  /* ── Non-Courses tabs ── */
  if (activeTab !== "courses") {
    const tab = TABS.find((t) => t.id === activeTab);
    return (
      <Box className="space-y-5">
        {header}
        <Card className="p-16 flex flex-col items-center justify-center gap-3">
          <tab.icon className={`h-12 w-12 ${tab.iconColor} opacity-30`} />
          <Text as="p" className="text-sm font-medium text-muted-foreground">{tab.label} — Coming Soon</Text>
          <Text as="p" className="text-xs text-muted-foreground/70">This section is under construction.</Text>
        </Card>
      </Box>
    );
  }

  /* ── Courses tab ── */
  return (
    <Box className="space-y-5">
      {header}
      {error && <Text as="p" className="text-sm text-error">{error}</Text>}

      {/* ── Two-panel row ── */}
      <Box className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Left — Select Course */}
        <Card className="p-5 space-y-3">
          <Text as="h3" className="text-sm font-bold">Select Course</Text>
          <Box>
            <Text as="p" className="text-xs text-muted-foreground mb-1.5">Course to assign:</Text>
            <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
              <SelectTrigger className="h-10 text-sm w-full bg-white">
                <SelectValue placeholder="Choose a course" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Box>
          {selectedCourse?.first_assessment_title && (
            <Box>
              <Text as="p" className="text-xs text-muted-foreground">Linked Assessment:</Text>
              <Text as="p" className="text-sm font-medium text-navy mt-0.5">
                {selectedCourse.first_assessment_title}
              </Text>
            </Box>
          )}
        </Card>

        {/* Right — Set Due Date */}
        <Card className="p-5 space-y-3">
          <Text as="h3" className="text-sm font-bold">Set Due Date</Text>
          <Box>
            <Text as="p" className="text-xs text-muted-foreground mb-1.5">Global due date for all selected:</Text>
            <input
              type="date"
              value={globalDueDate}
              onChange={(e) => setGlobalDueDate(e.target.value)}
              className="h-10 px-3 text-sm border border-input rounded-lg w-full bg-white focus:outline-none focus:ring-2 focus:ring-navy/20"
            />
          </Box>
          <Box>
            <Box className="flex flex-wrap gap-2 mb-1.5">
              {deptNames.map((dept) => {
                const cfg = DEPT_CFG[dept] || DEFAULT_DEPT_CFG;
                return (
                  <button
                    key={dept}
                    onClick={() => handleAssignDept(dept)}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                      cfg.chip
                    )}
                  >
                    {dept}
                  </button>
                );
              })}
            </Box>
            <Text as="p" className="text-[11px] text-muted-foreground">Click a department to assign all its members</Text>
          </Box>
        </Card>
      </Box>

      {/* ── Filter bar ── */}
      <Box className="space-y-2.5">
        <Box className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink/45" />
          <Input
            placeholder="Search by name, email, job role, or location…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoComplete="off"
            className="pl-10 h-10 text-sm bg-paper-cream border-border placeholder:text-ink/45 focus-visible:ring-1 focus-visible:ring-navy focus-visible:bg-white transition-colors"
          />
        </Box>
        <Box className="flex flex-wrap items-center gap-2">
          <Text as="span" className="text-xs font-medium text-ink/45 mr-1">Filter by:</Text>
          <Select value={filterDept} onValueChange={setFilterDept}>
            <SelectTrigger className={`h-8 text-xs w-[150px] bg-paper-cream border-border hover:bg-paper-cream transition-colors ${filterDept === "all" ? "text-ink/45" : "text-ink font-medium"}`}>
              <SelectValue>{filterDept === "all" ? "All Departments" : filterDept}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {allDepts.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className={`h-8 text-xs w-[130px] bg-paper-cream border-border hover:bg-paper-cream transition-colors ${filterStatus === "all" ? "text-ink/45" : "text-ink font-medium"}`}>
              <SelectValue>
                {filterStatus === "all" ? "All Statuses" : filterStatus === "active" ? "Active" : "Inactive"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          {hasFilter && (
            <button
              onClick={() => { setSearch(""); setFilterDept("all"); setFilterStatus("all"); }}
              className="h-8 px-3 text-xs text-ink/45 hover:text-ink/70 hover:bg-paper-cream rounded-md transition-colors"
            >
              × Clear filters
            </button>
          )}
          <Text as="span" className="ml-auto text-xs text-muted-foreground">
            {filteredEmployees.length} of {totalLearners} learners
          </Text>
        </Box>
      </Box>

      {/* ── Dept groups ── */}
      {loading ? (
        <Box className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </Box>
      ) : filteredEmployees.length === 0 && employees?.length > 0 ? (
        <Card className="p-10 text-center">
          <Users className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
          <Text as="p" className="text-sm text-muted-foreground">No learners match your filters.</Text>
        </Card>
      ) : (
        <Box className="space-y-4">
          {deptNames.map((dept) => {
            const members = deptGroups[dept];
            const cfg = DEPT_CFG[dept] || DEFAULT_DEPT_CFG;
            const assignedInDept = members.filter((m) => assignedUserIds.has(m.id)).length;
            const allAssigned = assignedInDept === members.length;

            return (
              <Card key={dept} className="overflow-hidden">
                {/* Dept header */}
                <Box className="flex items-center px-5 py-3 border-b">
                  <Checkbox
                    checked={allAssigned}
                    onCheckedChange={() => handleAssignDept(dept)}
                    className="mr-3 shrink-0 data-[state=checked]:bg-navy data-[state=checked]:border-navy/20"
                  />
                  <Text as="span" className={`text-sm font-bold ${cfg.text}`}>{dept}</Text>
                  <Text as="span" className="text-xs text-muted-foreground ml-2">{members.length} employees</Text>
                  <Text as="span" className="ml-auto text-xs text-muted-foreground">
                    {assignedInDept}/{members.length} assigned
                  </Text>
                </Box>

                {/* Learner rows */}
                {members.map((emp, idx) => {
                  const isAssigned = assignedUserIds.has(emp.id);
                  const avatarColor = AVATAR_COLORS[emp.id % AVATAR_COLORS.length];
                  const st = empStatus(emp);
                  const dueDate = rowDueDates[emp.id] || globalDueDate;

                  return (
                    <Box
                      key={emp.id}
                      className="flex items-center gap-4 px-5 py-3 border-b last:border-b-0 hover:bg-muted/10 transition-colors"
                    >
                      {/* Checkbox */}
                      <Checkbox
                        checked={isAssigned}
                        onCheckedChange={() => {
                          if (isAssigned) setUnassignTarget(emp);
                          else handleAssign(emp.id);
                        }}
                        className="shrink-0 data-[state=checked]:bg-navy data-[state=checked]:border-navy/20"
                      />

                      {/* Avatar */}
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarFallback className={`text-xs font-bold text-white ${avatarColor}`}>
                          {initials(emp)}
                        </AvatarFallback>
                      </Avatar>

                      {/* Name + role + location */}
                      <Box className="flex-1 min-w-0">
                        <Text as="p" className="text-sm font-semibold leading-tight">{emp.first_name} {emp.last_name}</Text>
                        <Box className="flex items-center gap-1.5 flex-wrap mt-0.5">
                          {emp.department && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-paper-cream text-navy border-0">{emp.department}</Badge>
                          )}
                          {emp.job_role && (
                            <Text as="span" className="text-[11px] text-muted-foreground">{emp.job_role}</Text>
                          )}
                          {emp.location && (
                            <Text as="span" className="text-[11px] text-muted-foreground">· {emp.location}</Text>
                          )}
                        </Box>
                      </Box>

                      {/* Status */}
                      <Text as="span" className={`text-xs w-16 shrink-0 ${st.cls}`}>{st.label}</Text>

                      {/* Per-row due date */}
                      <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setRowDueDates((prev) => ({ ...prev, [emp.id]: e.target.value }))}
                        className="h-8 px-2 text-xs border border-border rounded-lg w-32 bg-white focus:outline-none focus:ring-1 focus:ring-navy shrink-0"
                      />

                      {/* Assign / Assigned */}
                      {isAssigned ? (
                        <Button
                          size="sm"
                          className="h-8 bg-navy hover:bg-navy-soft text-paper text-xs px-4 shrink-0"
                          onClick={() => setUnassignTarget(emp)}
                        >
                          Assigned
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="h-8 bg-navy hover:bg-navy-soft text-paper text-xs px-4 shrink-0"
                          onClick={() => handleAssign(emp.id)}
                        >
                          Assign
                        </Button>
                      )}
                    </Box>
                  );
                })}
              </Card>
            );
          })}
        </Box>
      )}

      {/* ── Unassign confirmation ── */}
      <AlertDialog open={!!unassignTarget} onOpenChange={(open) => !open && setUnassignTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Assignment</AlertDialogTitle>
            <AlertDialogDescription>
              Remove <strong>{unassignTarget?.first_name} {unassignTarget?.last_name}</strong> from this course?
              Their progress will be preserved but they will lose access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnassign} className="bg-error hover:bg-error text-white">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Box>
  );
}
