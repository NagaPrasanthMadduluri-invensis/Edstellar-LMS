"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserCheck, UserX, Users, BookOpen, CheckCircle2, Clock, Layers, PlayCircle, ClipboardList, GraduationCap, ShieldCheck, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api-client";
import {
  fetchAdminCourses,
  assignUser,
  removeAssignment,
} from "@/services/api/admin/admin-api";

const AVATAR_COLORS = [
  "bg-indigo-100 text-indigo-600",
  "bg-emerald-100 text-emerald-600",
  "bg-amber-100 text-amber-600",
  "bg-violet-100 text-violet-600",
  "bg-pink-100 text-pink-600",
  "bg-cyan-100 text-cyan-600",
];

const STATUS_CONFIG = {
  "completed":   { label: "Completed",   className: "bg-emerald-100 text-emerald-700" },
  "in-progress": { label: "In Progress", className: "bg-blue-100 text-blue-700" },
  "not-started": { label: "Not Started", className: "bg-gray-100 text-gray-500" },
  "failed":      { label: "Failed",      className: "bg-red-100 text-red-700" },
};

function formatDuration(minutes) {
  if (!minutes) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

export function AdminAssignLearningContent() {
  const { token } = useAuth();
  const [courses, setCourses] = useState(null);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [employees, setEmployees] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [unassignTarget, setUnassignTarget] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Load courses
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

  // Load employees with their status for selected course
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

  const handleAssign = async (userId) => {
    try {
      await assignUser({ token, courseId: selectedCourseId, userId });
      await loadData();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleUnassign = async () => {
    if (!unassignTarget) return;
    const asgn = assignments.find((a) => a.user_id === unassignTarget.id);
    if (!asgn) return setUnassignTarget(null);
    try {
      await removeAssignment({ token, assignmentId: asgn.id });
      setUnassignTarget(null);
      await loadData();
    } catch (e) {
      setError(e.message);
    }
  };

  if (!courses) return (
    <Box className="space-y-3">
      <Skeleton className="h-10 w-64 rounded-lg" />
      <Skeleton className="h-64 rounded-xl" />
    </Box>
  );

  if (courses.length === 0) return (
    <Card className="p-16 text-center">
      <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
      <Text as="p" className="text-sm text-muted-foreground">No courses yet. Create a course first before assigning learners.</Text>
    </Card>
  );

  const assignedUserIds = new Set(assignments.map((a) => a.user_id));
  const assignedCount = assignedUserIds.size;
  const totalLearners = employees?.length ?? 0;
  const selectedCourse = courses.find((c) => String(c.id) === String(selectedCourseId));

  // Filter by search query, then group by department
  const filteredEmployees = employees
    ? employees.filter((emp) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(q) ||
          (emp.email || "").toLowerCase().includes(q)
        );
      })
    : [];

  const deptGroups = filteredEmployees.reduce((acc, emp) => {
    const dept = emp.department || "No Department";
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(emp);
    return acc;
  }, {});

  return (
    <Box className="space-y-5">
      {error && <Text as="p" className="text-sm text-red-500">{error}</Text>}

      {/* ── Course Selector + Summary ── */}
      <Box className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: selector + selected course info */}
        <Box className="space-y-3">
          <Card>
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-sm font-semibold">Select Course</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                <SelectTrigger className="h-11 text-sm w-full min-w-0">
                  <SelectValue placeholder="Choose a course" className="truncate" />
                </SelectTrigger>
                <SelectContent className="max-w-[480px]">
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)} className="whitespace-normal break-words py-2">{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Selected course detail panel */}
          {selectedCourse && (
            <Card className="overflow-hidden border-indigo-100">
              <Box className="flex gap-0">
                <Box className="w-1 shrink-0 bg-gradient-to-b from-indigo-500 to-purple-500" />
                <Box className="flex-1 px-4 py-3.5">
                  <Box className="flex items-center gap-2 mb-1">
                    <BookOpen className="h-4 w-4 text-indigo-500 shrink-0" />
                    <Text as="p" className="text-sm font-bold text-indigo-700 leading-tight">
                      {selectedCourse.name}
                    </Text>
                  </Box>
                  {selectedCourse.description && (
                    <Text as="p" className="text-[11px] text-muted-foreground mb-2.5 line-clamp-2">
                      {selectedCourse.description}
                    </Text>
                  )}
                  <Box className="flex flex-wrap gap-1.5">
                    {selectedCourse.modules_count > 0 && (
                      <Box className="flex items-center gap-1 bg-indigo-50 text-indigo-700 rounded-full px-2 py-0.5">
                        <Layers className="h-2.5 w-2.5" />
                        <Text as="span" className="text-[10px] font-medium">{selectedCourse.modules_count} Module{selectedCourse.modules_count !== 1 ? "s" : ""}</Text>
                      </Box>
                    )}
                    {selectedCourse.lessons_count > 0 && (
                      <Box className="flex items-center gap-1 bg-violet-50 text-violet-700 rounded-full px-2 py-0.5">
                        <PlayCircle className="h-2.5 w-2.5" />
                        <Text as="span" className="text-[10px] font-medium">{selectedCourse.lessons_count} Lesson{selectedCourse.lessons_count !== 1 ? "s" : ""}</Text>
                      </Box>
                    )}
                    {formatDuration(selectedCourse.total_duration_minutes) && (
                      <Box className="flex items-center gap-1 bg-amber-50 text-amber-700 rounded-full px-2 py-0.5">
                        <Clock className="h-2.5 w-2.5" />
                        <Text as="span" className="text-[10px] font-medium">{formatDuration(selectedCourse.total_duration_minutes)}</Text>
                      </Box>
                    )}
                    {selectedCourse.assessments_count > 0 && (
                      <Box className="flex items-center gap-1 bg-violet-50 text-violet-700 rounded-full px-2 py-0.5">
                        <ClipboardList className="h-2.5 w-2.5" />
                        <Text as="span" className="text-[10px] font-medium">{selectedCourse.assessments_count} Assessment{selectedCourse.assessments_count !== 1 ? "s" : ""}</Text>
                      </Box>
                    )}
                    {selectedCourse.passing_score != null && (
                      <Box className="flex items-center gap-1 bg-amber-50 text-amber-700 rounded-full px-2 py-0.5">
                        <ShieldCheck className="h-2.5 w-2.5" />
                        <Text as="span" className="text-[10px] font-medium">Pass: {selectedCourse.passing_score}%</Text>
                      </Box>
                    )}
                    {selectedCourse.assessments_count > 0 && (
                      <Box className="flex items-center gap-1 bg-emerald-50 text-emerald-700 rounded-full px-2 py-0.5">
                        <GraduationCap className="h-2.5 w-2.5" />
                        <Text as="span" className="text-[10px] font-medium">Certificate on Completion</Text>
                      </Box>
                    )}
                  </Box>
                </Box>
              </Box>
            </Card>
          )}
        </Box>

        {/* Right: assignment summary */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-semibold">Assignment Summary</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <Box className="grid grid-cols-3 gap-3">
              {[
                { label: "Total Learners", val: totalLearners, color: "text-indigo-600" },
                { label: "Assigned", val: assignedCount, color: "text-emerald-600" },
                { label: "Unassigned", val: totalLearners - assignedCount, color: "text-muted-foreground" },
              ].map((s) => (
                <Box key={s.label} className="text-center">
                  <Text as="p" className={`text-2xl font-bold ${s.color}`}>{s.val}</Text>
                  <Text as="p" className="text-[10px] text-muted-foreground">{s.label}</Text>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* ── Search + Assign All ── */}
      {employees && employees.length > 0 && (
        <Box className="flex items-center gap-3">
          <Box className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search employees by name or email…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10"
            />
          </Box>
          <Button
            className="h-10 px-4 bg-indigo-500 hover:bg-indigo-600 text-white shrink-0"
            onClick={async () => {
              const unassigned = employees.filter((m) => !assignedUserIds.has(m.id));
              for (const m of unassigned) {
                try { await assignUser({ token, courseId: selectedCourseId, userId: m.id }); } catch {}
              }
              await loadData();
            }}
          >
            <UserCheck className="h-4 w-4 mr-2" />
            Assign All Employees
          </Button>
        </Box>
      )}

      {/* ── Learner Groups by Department ── */}
      {loading || !employees ? (
        <Box className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </Box>
      ) : employees.length === 0 ? (
        <Card className="p-16 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <Text as="p" className="text-sm text-muted-foreground">No learners registered yet.</Text>
        </Card>
      ) : filteredEmployees.length === 0 ? (
        <Card className="p-16 text-center">
          <Search className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <Text as="p" className="text-sm text-muted-foreground">No employees match &quot;{searchQuery}&quot;.</Text>
        </Card>
      ) : (
        Object.entries(deptGroups).sort(([a], [b]) => a.localeCompare(b)).map(([dept, members]) => {
          const assignedInDept = members.filter((m) => assignedUserIds.has(m.id)).length;
          return (
            <Card key={dept} className="overflow-hidden">
              {/* Dept header */}
              <Box className="flex items-center justify-between px-4 py-2.5 bg-muted/40 border-b">
                <Box className="flex items-center gap-2">
                  <Text as="p" className="text-sm font-bold">{dept}</Text>
                  <Text as="span" className="text-xs text-muted-foreground">{members.length} learner{members.length !== 1 ? "s" : ""}</Text>
                  <Badge variant="secondary" className="text-[10px] bg-emerald-50 text-emerald-700">
                    <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
                    {assignedInDept}/{members.length} assigned
                  </Badge>
                </Box>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={async () => {
                    const unassigned = members.filter((m) => !assignedUserIds.has(m.id));
                    for (const m of unassigned) {
                      try { await assignUser({ token, courseId: selectedCourseId, userId: m.id }); } catch {}
                    }
                    await loadData();
                  }}
                >
                  Assign All in {dept}
                </Button>
              </Box>

              {/* Learner rows */}
              {members.map((emp, idx) => {
                const isAssigned = assignedUserIds.has(emp.id);
                const initials = `${(emp.first_name || "")[0]}${(emp.last_name || "")[0]}`.toUpperCase();
                const colorClass = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                const statusCfg = STATUS_CONFIG[emp.status] || STATUS_CONFIG["not-started"];
                return (
                  <Box
                    key={emp.id}
                    className="flex items-center gap-3 px-4 py-2.5 border-b last:border-0 hover:bg-muted/20"
                  >
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarFallback className={`text-[10px] font-bold ${colorClass}`}>{initials}</AvatarFallback>
                    </Avatar>
                    <Box className="flex-1 min-w-0">
                      <Text as="p" className="text-xs font-semibold">{emp.first_name} {emp.last_name}</Text>
                      <Text as="span" className="text-[10px] text-muted-foreground">{emp.email}</Text>
                    </Box>
                    <Badge variant="secondary" className={`text-[10px] shrink-0 ${statusCfg.className}`}>
                      {statusCfg.label}
                    </Badge>
                    {isAssigned ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200 shrink-0"
                        onClick={() => setUnassignTarget(emp)}
                      >
                        <UserX className="h-3 w-3 mr-1" />
                        Remove
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="h-7 text-xs bg-indigo-500 hover:bg-indigo-600 text-white shrink-0"
                        onClick={() => handleAssign(emp.id)}
                      >
                        <UserCheck className="h-3 w-3 mr-1" />
                        Assign
                      </Button>
                    )}
                  </Box>
                );
              })}
            </Card>
          );
        })
      )}

      {/* ── Unassign Confirmation ── */}
      <AlertDialog open={!!unassignTarget} onOpenChange={(open) => !open && setUnassignTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Assignment</AlertDialogTitle>
            <AlertDialogDescription>
              Remove the course assignment for{" "}
              <strong>{unassignTarget?.first_name} {unassignTarget?.last_name}</strong>?
              Their progress will be preserved but they will lose access to the course.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnassign}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Box>
  );
}
