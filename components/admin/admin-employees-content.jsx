"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Search, UserPlus, Users, ExternalLink, BookOpen,
  ClipboardList, CheckCircle2, XCircle, Clock, Trophy,
  TrendingUp, ChevronDown, ChevronUp, CalendarDays, UserX, UserCheck,
} from "lucide-react";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api-client";
import { createUser, toggleUserStatus } from "@/services/api/admin/admin-api";

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

const DEPARTMENTS = [
  "Sales", "HR", "Technology", "Finance", "Marketing",
  "Operations", "Legal", "Customer Support", "Product", "Design",
];

const EMPTY_FORM = { first_name: "", last_name: "", email: "", password: "", department: "" };

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function AssessmentBlock({ assessment }) {
  const [expanded, setExpanded] = useState(false);
  const { title, passing_score, questions_count, attempt_count, best_score, has_passed, attempts } = assessment;

  return (
    <Box className="rounded-xl border bg-background overflow-hidden">
      {/* Assessment row */}
      <Box className="flex items-center justify-between gap-4 px-4 py-3 flex-wrap">
        <Box className="flex items-center gap-3 flex-1 min-w-0">
          <Box className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
            has_passed ? "bg-emerald-100" : attempt_count > 0 ? "bg-red-100" : "bg-gray-100"
          }`}>
            {has_passed
              ? <Trophy className="h-4.5 w-4.5 text-emerald-600" />
              : attempt_count > 0
                ? <XCircle className="h-4.5 w-4.5 text-red-500" />
                : <ClipboardList className="h-4.5 w-4.5 text-gray-400" />
            }
          </Box>
          <Box className="min-w-0">
            <Text as="p" className="text-sm font-semibold leading-tight truncate">{title}</Text>
            <Text as="span" className="text-xs text-muted-foreground">
              Pass mark: {passing_score}% &nbsp;·&nbsp; {questions_count} questions
            </Text>
          </Box>
        </Box>

        <Box className="flex items-center gap-3 shrink-0">
          {attempt_count > 0 ? (
            <Badge variant="secondary" className={`text-xs font-semibold px-2.5 py-1 ${
              has_passed ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
            }`}>
              Best: {best_score}%
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-xs px-2.5 py-1 bg-gray-100 text-gray-500">
              Not attempted
            </Badge>
          )}
          <Text as="span" className="text-xs text-muted-foreground whitespace-nowrap">
            {attempt_count} attempt{attempt_count !== 1 ? "s" : ""}
          </Text>
          {attempt_count > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExpanded((v) => !v)}
              className="h-7 px-2.5 text-xs gap-1.5"
            >
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              History
            </Button>
          )}
        </Box>
      </Box>

      {/* Attempt history */}
      {expanded && attempts.length > 0 && (
        <Box className="border-t bg-muted/20 px-4 py-3 space-y-2">
          <Text as="p" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Attempt History
          </Text>
          {attempts.map((att, i) => (
            <Box key={att.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-background border">
              <Text as="span" className="text-xs font-medium text-muted-foreground w-6 shrink-0">
                #{attempts.length - i}
              </Text>
              {att.is_passed
                ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                : <XCircle className="h-4 w-4 text-red-400 shrink-0" />
              }
              <Badge variant="secondary" className={`text-xs font-semibold px-2 ${
                att.is_passed ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
              }`}>
                {att.percentage}%
              </Badge>
              <Text as="span" className="text-xs text-muted-foreground">
                {att.score}/{att.total_questions} correct
              </Text>
              <Box className="flex items-center gap-1.5 ml-auto shrink-0">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <Text as="span" className="text-xs text-muted-foreground">{formatDate(att.submitted_at)}</Text>
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}

function UserDetailSheet({ userId, token, open, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId || !token || !open) return;
    setData(null);
    setLoading(true);
    apiClient(`/api/admin/users/${userId}`, { token })
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId, token, open]);

  const user = data?.user;
  const summary = data?.summary;
  const courses = data?.courses ?? [];

  const initials = user ? `${(user.first_name || "")[0]}${(user.last_name || "")[0]}`.toUpperCase() : "?";

  const summaryCards = summary ? [
    { label: "Courses Assigned", value: summary.coursesAssigned, color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "Completed",        value: summary.coursesCompleted, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Assessment Attempts", value: summary.totalAttempts, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Best Score",       value: summary.bestScore != null ? `${summary.bestScore}%` : "—", color: summary.bestScore >= 60 ? "text-emerald-600" : "text-red-500", bg: summary.bestScore >= 60 ? "bg-emerald-50" : "bg-red-50" },
  ] : [];

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full overflow-y-auto px-3" style={{ maxWidth: "720px" }}>
        <SheetHeader className="mb-4">
          <SheetTitle>Learner Details</SheetTitle>
        </SheetHeader>

        {loading && (
          <Box className="space-y-3">
            <Box className="flex items-center gap-3">
              <Skeleton className="h-14 w-14 rounded-full" />
              <Box className="space-y-2 flex-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-56" />
              </Box>
            </Box>
            <Box className="grid grid-cols-2 gap-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
            </Box>
            {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-lg" />)}
          </Box>
        )}

        {!loading && user && (
          <Box className="space-y-6 pb-6">
            {/* ── Profile ── */}
            <Box className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 border">
              <Avatar className="h-14 w-14 shrink-0">
                <AvatarFallback className="bg-indigo-100 text-indigo-600 text-xl font-bold">{initials}</AvatarFallback>
              </Avatar>
              <Box className="flex-1 min-w-0">
                <Box className="flex items-center gap-2 flex-wrap">
                  <Text as="h2" className="text-lg font-bold">{user.first_name} {user.last_name}</Text>
                  <Badge variant="secondary" className={`text-xs ${user.is_active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                    {user.is_active ? "Active" : "Inactive"}
                  </Badge>
                </Box>
                <Text as="p" className="text-sm text-muted-foreground">{user.email}</Text>
                <Box className="flex items-center gap-3 mt-1.5 flex-wrap">
                  {user.department && (
                    <Badge variant="secondary" className="text-xs bg-indigo-50 text-indigo-700">{user.department}</Badge>
                  )}
                  <Box className="flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                    <Text as="span" className="text-xs text-muted-foreground">Joined {formatDate(user.created_at)}</Text>
                  </Box>
                </Box>
              </Box>
            </Box>

            {/* ── Summary stats ── */}
            <Box className="grid grid-cols-4 gap-3">
              {summaryCards.map((s) => (
                <Box key={s.label} className={`${s.bg} rounded-xl p-3 text-center border`}>
                  <Text as="p" className={`text-2xl font-bold ${s.color}`}>{s.value}</Text>
                  <Text as="p" className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{s.label}</Text>
                </Box>
              ))}
            </Box>

            {/* ── Course breakdown ── */}
            {courses.length === 0 ? (
              <Box className="text-center py-10">
                <BookOpen className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
                <Text as="p" className="text-sm text-muted-foreground">No courses assigned yet.</Text>
              </Box>
            ) : (
              <Box className="space-y-4">
                <Text as="h3" className="text-sm font-bold text-muted-foreground uppercase tracking-wide">
                  Course Breakdown
                </Text>
                {courses.map((c) => {
                  const isComplete = c.progress === 100;
                  const isInProgress = !isComplete && c.completedLessons > 0;
                  const accentBar = isComplete ? "bg-emerald-500" : isInProgress ? "bg-indigo-500" : "bg-gray-300";
                  const statusLabel = isComplete ? "Completed" : isInProgress ? "In Progress" : "Not Started";
                  const statusClass = isComplete
                    ? "bg-emerald-100 text-emerald-700"
                    : isInProgress
                      ? "bg-indigo-100 text-indigo-700"
                      : "bg-gray-100 text-gray-500";

                  return (
                    <Card key={c.course_id} className="overflow-hidden">
                      {/* Colored accent bar */}
                      <Box className={`h-1.5 w-full ${accentBar}`} />

                      <CardContent className="p-5 space-y-4">
                        {/* Course title row */}
                        <Box className="flex items-start justify-between gap-3">
                          <Box className="flex items-center gap-3 flex-1 min-w-0">
                            <Box className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                              <BookOpen className="h-4.5 w-4.5 text-indigo-600" />
                            </Box>
                            <Box className="min-w-0">
                              <Text as="h4" className="text-sm font-bold leading-snug">{c.course_name}</Text>
                              <Text as="span" className="text-xs text-muted-foreground">
                                Enrolled {formatDate(c.assigned_at)}
                              </Text>
                            </Box>
                          </Box>
                          <Badge variant="secondary" className={`text-xs shrink-0 px-2.5 py-1 ${statusClass}`}>
                            {statusLabel}
                          </Badge>
                        </Box>

                        {/* Lesson progress */}
                        <Box className="rounded-lg bg-muted/40 border px-4 py-3 space-y-2">
                          <Box className="flex items-center justify-between">
                            <Text as="span" className="text-xs font-semibold flex items-center gap-1.5">
                              <TrendingUp className="h-3.5 w-3.5 text-indigo-500" />
                              Lesson Progress
                            </Text>
                            <Text as="span" className="text-sm font-bold">{c.progress}%</Text>
                          </Box>
                          <Progress value={c.progress} className="h-2" />
                          <Text as="span" className="text-xs text-muted-foreground">
                            {c.completedLessons} of {c.totalLessons} lessons completed
                          </Text>
                        </Box>

                        {/* Assessments */}
                        {c.assessments.length > 0 && (
                          <Box className="space-y-2.5">
                            <Text as="p" className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                              <ClipboardList className="h-3.5 w-3.5" />
                              Assessments
                            </Text>
                            {c.assessments.map((a) => (
                              <AssessmentBlock key={a.id} assessment={a} />
                            ))}
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </Box>
            )}
          </Box>
        )}
      </SheetContent>
    </Sheet>
  );
}

export function AdminEmployeesContent() {
  const { token } = useAuth();
  const [employees, setEmployees] = useState(null);
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [detailUserId, setDetailUserId] = useState(null);
  const [confirmToggle, setConfirmToggle] = useState(null); // { id, name, is_active }
  const [actioning, setActioning] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const d = await apiClient("/api/admin/employees", { token });
      setEmployees(d.employees || []);
    } catch (e) {
      setError(e.message);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const handleToggleStatus = async () => {
    if (!confirmToggle) return;
    setActioning(true);
    try {
      await toggleUserStatus({ token, userId: confirmToggle.id, is_active: !confirmToggle.is_active });
      setEmployees((prev) => prev.map((e) => e.id === confirmToggle.id ? { ...e, is_active: !e.is_active } : e));
      setConfirmToggle(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setActioning(false);
    }
  };

  const handleCreate = async () => {
    if (!form.first_name.trim()) { setFormError("First name is required"); return; }
    if (!form.last_name.trim()) { setFormError("Last name is required"); return; }
    if (!form.email.trim()) { setFormError("Email is required"); return; }
    if (form.password.length < 6) { setFormError("Password must be at least 6 characters"); return; }
    setSaving(true); setFormError(null);
    try {
      await createUser({ token, data: form });
      setDialogOpen(false);
      setForm(EMPTY_FORM);
      load();
    } catch (e) {
      setFormError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (error) return <Card className="p-6 text-center"><Text as="p" className="text-red-500 text-sm">{error}</Text></Card>;
  if (!employees) return (
    <Box className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
    </Box>
  );

  const depts = [...new Set(employees.map((e) => e.department).filter(Boolean))].sort();

  const filtered = employees.filter((e) => {
    const matchSearch = `${e.first_name} ${e.last_name} ${e.email}`.toLowerCase().includes(search.toLowerCase());
    const matchDept = filterDept === "all" || e.department === filterDept;
    const matchStatus = filterStatus === "all" || e.status === filterStatus;
    return matchSearch && matchDept && matchStatus;
  });

  return (
    <Box className="space-y-4">
      {/* ── Toolbar ── */}
      <Box className="flex flex-wrap items-center gap-3">
        <Box className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-8 text-sm"
          />
        </Box>
        <Select value={filterDept} onValueChange={setFilterDept}>
          <SelectTrigger className="h-8 text-xs w-[150px]">
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {depts.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-8 text-xs w-[140px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="in-progress">In Progress</SelectItem>
            <SelectItem value="not-started">Not Started</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
        <Button
          size="sm"
          onClick={() => { setForm(EMPTY_FORM); setFormError(null); setDialogOpen(true); }}
          className="h-8 text-xs bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shrink-0"
        >
          <UserPlus className="h-3.5 w-3.5 mr-1.5" />
          Add User
        </Button>
      </Box>

      <Text as="p" className="text-xs text-muted-foreground">
        {filtered.length} of {employees.length} learner{employees.length !== 1 ? "s" : ""}
      </Text>

      {filtered.length === 0 ? (
        <Card className="p-10 text-center">
          <Users className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
          <Text as="p" className="text-sm text-muted-foreground">
            {search || filterDept !== "all" || filterStatus !== "all"
              ? "No employees match your filters."
              : "No learners yet. Add the first user."}
          </Text>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <Box className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-2.5">Employee</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-2.5">Department</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-2.5">Status</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-2.5 min-w-[140px]">Progress</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-2.5">Score</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-2.5">Courses</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-2.5">Joined</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((emp, i) => {
                  const initials = `${(emp.first_name || "")[0]}${(emp.last_name || "")[0]}`.toUpperCase();
                  const colorClass = AVATAR_COLORS[i % AVATAR_COLORS.length];
                  const statusCfg = STATUS_CONFIG[emp.status] || STATUS_CONFIG["not-started"];
                  return (
                    <tr key={emp.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2.5">
                        <Box className="flex items-center gap-2.5">
                          <Avatar className="h-7 w-7 shrink-0">
                            <AvatarFallback className={`text-[10px] font-bold ${colorClass}`}>{initials}</AvatarFallback>
                          </Avatar>
                          <Box>
                            <Text as="p" className="text-xs font-semibold leading-tight">{emp.first_name} {emp.last_name}</Text>
                            <Text as="span" className="text-[10px] text-muted-foreground">{emp.email}</Text>
                          </Box>
                        </Box>
                      </td>
                      <td className="px-4 py-2.5">
                        <Text as="span" className="text-xs text-muted-foreground">{emp.department || "—"}</Text>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant="secondary" className={`text-[10px] px-1.5 py-0.5 ${statusCfg.className}`}>
                          {statusCfg.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5">
                        <Box className="flex items-center gap-2">
                          <Progress value={emp.progress} className="h-1.5 flex-1" />
                          <Text as="span" className="text-[10px] text-muted-foreground w-7 shrink-0">{emp.progress}%</Text>
                        </Box>
                      </td>
                      <td className="px-4 py-2.5">
                        {emp.score != null ? (
                          <Text as="span" className={`text-xs font-bold ${emp.score >= 60 ? "text-emerald-600" : "text-red-500"}`}>
                            {emp.score}%
                          </Text>
                        ) : (
                          <Text as="span" className="text-xs text-muted-foreground">—</Text>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <Text as="span" className="text-xs text-muted-foreground">{emp.assigned_courses}</Text>
                      </td>
                      <td className="px-4 py-2.5">
                        <Text as="span" className="text-[10px] text-muted-foreground">
                          {new Date(emp.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </Text>
                      </td>
                      <td className="px-4 py-2.5">
                        <Box className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className={`h-6 px-2 text-[10px] font-medium gap-1 ${emp.is_active ? "border-amber-400 text-amber-600 hover:bg-amber-50" : "border-emerald-400 text-emerald-600 hover:bg-emerald-50"}`}
                            onClick={() => setConfirmToggle({ id: emp.id, name: `${emp.first_name} ${emp.last_name}`, is_active: emp.is_active })}
                          >
                            {emp.is_active
                              ? <><UserX className="h-3 w-3" />Deactivate</>
                              : <><UserCheck className="h-3 w-3" />Activate</>}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDetailUserId(emp.id)}
                            className="h-6 px-2 text-[10px] text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 font-medium gap-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            View Details
                          </Button>
                        </Box>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Box>
        </Card>
      )}

      {/* ── Confirm Toggle Dialog ── */}
      <AlertDialog open={!!confirmToggle} onOpenChange={(o) => { if (!o) setConfirmToggle(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmToggle?.is_active ? "Deactivate User" : "Activate User"}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmToggle?.is_active
                ? `${confirmToggle?.name} will no longer be able to log in.`
                : `${confirmToggle?.name} will be able to log in again.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actioning}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleToggleStatus} disabled={actioning}>
              {actioning ? "Please wait..." : confirmToggle?.is_active ? "Deactivate" : "Activate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── User Detail Sheet ── */}
      <UserDetailSheet
        userId={detailUserId}
        token={token}
        open={!!detailUserId}
        onClose={() => setDetailUserId(null)}
      />

      {/* ── Create User Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Learner</DialogTitle>
          </DialogHeader>
          <Box className="space-y-3 py-2">
            <Box className="grid grid-cols-2 gap-3">
              <Box className="space-y-1.5">
                <Label>First Name <Text as="span" className="text-red-500">*</Text></Label>
                <Input placeholder="Alice" value={form.first_name} onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))} />
              </Box>
              <Box className="space-y-1.5">
                <Label>Last Name <Text as="span" className="text-red-500">*</Text></Label>
                <Input placeholder="Johnson" value={form.last_name} onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))} />
              </Box>
            </Box>
            <Box className="space-y-1.5">
              <Label>Email <Text as="span" className="text-red-500">*</Text></Label>
              <Input type="email" placeholder="alice@company.com" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
            </Box>
            <Box className="space-y-1.5">
              <Label>Department</Label>
              <Select value={form.department} onValueChange={(v) => setForm((p) => ({ ...p, department: v }))}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </Box>
            <Box className="space-y-1.5">
              <Label>Password <Text as="span" className="text-red-500">*</Text></Label>
              <Input type="password" placeholder="Minimum 6 characters" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} />
            </Box>
            {formError && <Text as="p" className="text-sm text-red-500">{formError}</Text>}
          </Box>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white">
              {saving ? "Creating..." : "Add Learner"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
