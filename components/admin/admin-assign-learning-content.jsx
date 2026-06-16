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
import { BookOpen, Map, Users, ClipboardList } from "lucide-react";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api-client";
import { fetchAdminCourses, assignUser, removeAssignment } from "@/services/api/admin/admin-api";

/* ── Constants ── */

const TABS = [
  { id: "courses",     label: "Courses",     icon: BookOpen,     iconColor: "text-emerald-500" },
  { id: "journeys",    label: "Journeys",    icon: Map,          iconColor: "text-teal-500"    },
  { id: "groups",      label: "Groups",      icon: Users,        iconColor: "text-blue-500"    },
  { id: "assessments", label: "Assessments", icon: ClipboardList,iconColor: "text-amber-500"   },
];

const DEPT_CFG = {
  Engineering: { text: "text-emerald-600", chip: "border-emerald-200 text-emerald-700 hover:bg-emerald-50 bg-white" },
  Sales:       { text: "text-blue-600",    chip: "border-blue-200 text-blue-700 hover:bg-blue-50 bg-white"         },
  Operations:  { text: "text-amber-600",   chip: "border-amber-200 text-amber-700 hover:bg-amber-50 bg-white"      },
  HR:          { text: "text-pink-600",    chip: "border-pink-200 text-pink-700 hover:bg-pink-50 bg-white"         },
};
const DEFAULT_DEPT_CFG = { text: "text-violet-600", chip: "border-violet-200 text-violet-700 hover:bg-violet-50 bg-white" };

const AVATAR_COLORS = [
  "bg-blue-500",  "bg-emerald-500", "bg-amber-500",  "bg-violet-500",
  "bg-pink-500",  "bg-teal-500",    "bg-orange-500", "bg-cyan-500",
  "bg-rose-500",  "bg-indigo-500",  "bg-lime-600",   "bg-sky-500",
];

function empStatus(emp) {
  if (!emp.is_active) return { label: "inactive", cls: "text-gray-400" };
  if (emp.status === "failed") return { label: "failed", cls: "text-red-500 font-medium" };
  return { label: "active", cls: "text-gray-500" };
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
  const { token } = useAuth();
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

  /* ── Load courses once ── */
  useEffect(() => {
    if (!token) return;
    fetchAdminCourses({ token })
      .then((d) => {
        const list = d.courses || [];
        setCourses(list);
        if (list.length) setSelectedCourseId(String(list[0].id));
      })
      .catch((e) => setError(e.message));
  }, [token]);

  /* ── Load employees + assignments when course changes ── */
  const loadData = useCallback(async () => {
    if (!token || !selectedCourseId) return;
    setLoading(true);
    try {
      const [empRes, assignRes] = await Promise.all([
        apiClient("/api/admin/employees", { token }),
        apiClient(`/api/admin/courses/${selectedCourseId}/assignments`, { token }),
      ]);
      setEmployees(empRes.employees || []);
      setAssignments(assignRes.assignments || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token, selectedCourseId]);

  useEffect(() => { loadData(); }, [loadData]);

  /* ── Actions ── */
  const handleAssign = async (userId) => {
    try {
      await assignUser({ token, courseId: selectedCourseId, userId });
      await loadData();
    } catch (e) { setError(e.message); }
  };

  const handleUnassign = async () => {
    if (!unassignTarget) return;
    const asgn = assignments.find((a) => a.user_id === unassignTarget.id);
    if (!asgn) { setUnassignTarget(null); return; }
    try {
      await removeAssignment({ token, assignmentId: asgn.id });
      setUnassignTarget(null);
      await loadData();
    } catch (e) { setError(e.message); }
  };

  const handleAssignDept = async (dept) => {
    const deptMembers = (employees || []).filter((e) => e.department === dept);
    const unassigned = deptMembers.filter((m) => !assignedUserIds.has(m.id));
    for (const m of unassigned) {
      try { await assignUser({ token, courseId: selectedCourseId, userId: m.id }); } catch {}
    }
    await loadData();
  };

  /* ── Derived ── */
  const assignedUserIds = new Set(assignments.map((a) => a.user_id));
  const selectedCourse = courses?.find((c) => String(c.id) === selectedCourseId);
  const totalLearners = employees?.length ?? 0;
  const assignedAnyCount = employees?.filter((e) => e.assigned_courses > 0).length ?? 0;

  const deptGroups = (employees || []).reduce((acc, emp) => {
    const d = emp.department || "No Department";
    if (!acc[d]) acc[d] = [];
    acc[d].push(emp);
    return acc;
  }, {});

  const deptNames = Object.keys(deptGroups).sort();

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
                  ? "bg-blue-500 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
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
      {error && <Text as="p" className="text-sm text-red-500">{error}</Text>}

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
              <Text as="p" className="text-sm font-medium text-teal-600 mt-0.5">
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
              className="h-10 px-3 text-sm border border-input rounded-lg w-full bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
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

      {/* ── Dept groups ── */}
      {loading ? (
        <Box className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </Box>
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
                    className="mr-3 shrink-0 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
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
                        className="shrink-0 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                      />

                      {/* Avatar */}
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarFallback className={`text-xs font-bold text-white ${avatarColor}`}>
                          {initials(emp)}
                        </AvatarFallback>
                      </Avatar>

                      {/* Name + dept */}
                      <Box className="flex-1 min-w-0">
                        <Text as="p" className="text-sm font-semibold leading-tight">{emp.first_name} {emp.last_name}</Text>
                        <Text as="p" className="text-xs text-muted-foreground mt-0.5">{emp.department}</Text>
                      </Box>

                      {/* Status */}
                      <Text as="span" className={`text-xs w-16 shrink-0 ${st.cls}`}>{st.label}</Text>

                      {/* Per-row due date */}
                      <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setRowDueDates((prev) => ({ ...prev, [emp.id]: e.target.value }))}
                        className="h-8 px-2 text-xs border border-gray-200 rounded-lg w-32 bg-white focus:outline-none focus:ring-1 focus:ring-blue-300 shrink-0"
                      />

                      {/* Assign / Assigned */}
                      {isAssigned ? (
                        <Button
                          size="sm"
                          className="h-8 bg-emerald-500 hover:bg-emerald-600 text-white text-xs px-4 shrink-0"
                          onClick={() => setUnassignTarget(emp)}
                        >
                          Assigned
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="h-8 bg-blue-500 hover:bg-blue-600 text-white text-xs px-4 shrink-0"
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
            <AlertDialogAction onClick={handleUnassign} className="bg-red-600 hover:bg-red-700 text-white">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Box>
  );
}
