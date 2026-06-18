"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Search, UserPlus, Users, Upload, Download,
  FileSpreadsheet, AlertCircle, BookOpen, ClipboardList,
  CheckCircle2, XCircle, Clock, Trophy, TrendingUp,
  ChevronDown, ChevronUp, CalendarDays,
} from "lucide-react";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api-client";
import { createUser, updateUser, bulkCreateUsers, toggleUserStatus, deleteUser } from "@/services/api/admin/admin-api";

const AVATAR_COLORS = [
  "bg-emerald-500 text-white",
  "bg-orange-500 text-white",
  "bg-pink-500 text-white",
  "bg-violet-500 text-white",
  "bg-blue-500 text-white",
  "bg-rose-500 text-white",
  "bg-teal-500 text-white",
  "bg-amber-500 text-white",
  "bg-indigo-500 text-white",
  "bg-cyan-500 text-white",
];

const DEPARTMENTS = [
  "Sales", "HR", "Technology", "Finance", "Marketing",
  "Operations", "Legal", "Customer Support", "Product", "Design",
];

const EMPTY_FORM = { first_name: "", last_name: "", email: "", password: "", department: "", location: "", job_role: "" };

const HEADER_MAP = {
  "employee id": "employee_id", "employeeid": "employee_id", "employee_id": "employee_id",
  "first name": "first_name",  "firstname":  "first_name",  "first_name":  "first_name",
  "last name":  "last_name",   "lastname":   "last_name",   "last_name":   "last_name",
  "email": "email", "email address": "email",
  "department": "department", "dept": "department",
  "location": "location", "city": "location",
  "job role": "job_role", "job_role": "job_role", "jobrole": "job_role", "title": "job_role", "position": "job_role",
  "password": "password",
};

async function parseXlsx(file) {
  const buffer = await file.arrayBuffer();
  const mod  = await import("xlsx");
  const XLSX = mod.default ?? mod;
  const wb   = XLSX.read(new Uint8Array(buffer), { type: "array" });
  const ws   = wb.Sheets[wb.SheetNames[0]];
  const raw  = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  if (raw.length < 2) return [];

  // Our template has a merged instruction row before the headers.
  // Scan the first 5 rows to find the one that has recognised column names.
  let headerIdx = 0;
  for (let i = 0; i < Math.min(raw.length, 5); i++) {
    if (raw[i].some((h) => HEADER_MAP[String(h).trim().toLowerCase()])) {
      headerIdx = i;
      break;
    }
  }

  const headerRow = raw[headerIdx].map((h) => String(h).trim().toLowerCase());
  const fieldMap  = headerRow.map((h) => HEADER_MAP[h] ?? null);
  return raw
    .slice(headerIdx + 1)
    .filter((r) => r.some((c) => String(c).trim()))
    .map((r) => {
      const obj = {};
      fieldMap.forEach((field, i) => { if (field) obj[field] = String(r[i] ?? "").trim(); });
      return obj;
    });
}

function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement("a");
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function AssessmentBlock({ assessment }) {
  const [expanded, setExpanded] = useState(false);
  const { title, passing_score, questions_count, attempt_count, best_score, has_passed, attempts } = assessment;

  return (
    <Box className="rounded-xl border bg-background overflow-hidden">
      <Box className="flex items-center justify-between gap-4 px-4 py-3 flex-wrap">
        <Box className="flex items-center gap-3 flex-1 min-w-0">
          <Box className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
            has_passed ? "bg-emerald-100" : attempt_count > 0 ? "bg-red-100" : "bg-gray-100"
          }`}>
            {has_passed
              ? <Trophy className="h-4 w-4 text-emerald-600" />
              : attempt_count > 0
                ? <XCircle className="h-4 w-4 text-red-500" />
                : <ClipboardList className="h-4 w-4 text-gray-400" />
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

function UserDetailModal({ userId, token, open, onClose }) {
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

  const user    = data?.user;
  const summary = data?.summary;
  const courses = data?.courses ?? [];

  const initials = user ? `${(user.first_name || "")[0]}${(user.last_name || "")[0]}`.toUpperCase() : "?";

  const summaryCards = summary ? [
    { label: "Courses Assigned",    value: summary.coursesAssigned,                                          color: "text-indigo-600",  bg: "bg-indigo-50"  },
    { label: "Completed",           value: summary.coursesCompleted,                                          color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Assessment Attempts", value: summary.totalAttempts,                                             color: "text-amber-600",   bg: "bg-amber-50"   },
    { label: "Best Score",          value: summary.bestScore != null ? `${summary.bestScore}%` : "—",         color: summary.bestScore >= 60 ? "text-emerald-600" : "text-red-500", bg: summary.bestScore >= 60 ? "bg-emerald-50" : "bg-red-50" },
  ] : [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Learner Details</DialogTitle>
        </DialogHeader>

        {loading && (
          <Box className="space-y-3 py-2">
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
          <Box className="space-y-6 pb-2">
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
                  {user.job_role && (
                    <Text as="span" className="text-xs text-muted-foreground">{user.job_role}</Text>
                  )}
                  {user.location && (
                    <Text as="span" className="text-xs text-muted-foreground">· {user.location}</Text>
                  )}
                  <Box className="flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                    <Text as="span" className="text-xs text-muted-foreground">Joined {formatDate(user.created_at)}</Text>
                  </Box>
                </Box>
              </Box>
            </Box>

            <Box className="grid grid-cols-4 gap-3">
              {summaryCards.map((s) => (
                <Box key={s.label} className={`${s.bg} rounded-xl p-3 text-center border`}>
                  <Text as="p" className={`text-2xl font-bold ${s.color}`}>{s.value}</Text>
                  <Text as="p" className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{s.label}</Text>
                </Box>
              ))}
            </Box>

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
                  const isComplete   = c.progress === 100;
                  const isInProgress = !isComplete && c.completedLessons > 0;
                  const accentBar    = isComplete ? "bg-emerald-500" : isInProgress ? "bg-indigo-500" : "bg-gray-300";
                  const statusLabel  = isComplete ? "Completed" : isInProgress ? "In Progress" : "Not Started";
                  const statusClass  = isComplete
                    ? "bg-emerald-100 text-emerald-700"
                    : isInProgress
                      ? "bg-indigo-100 text-indigo-700"
                      : "bg-gray-100 text-gray-500";

                  return (
                    <Card key={c.course_id} className="overflow-hidden">
                      <Box className={`h-1.5 w-full ${accentBar}`} />
                      <CardContent className="p-5 space-y-4">
                        <Box className="flex items-start justify-between gap-3">
                          <Box className="flex items-center gap-3 flex-1 min-w-0">
                            <Box className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                              <BookOpen className="h-4 w-4 text-indigo-600" />
                            </Box>
                            <Box className="min-w-0">
                              <Text as="h4" className="text-sm font-bold leading-snug">{c.course_name}</Text>
                              <Text as="span" className="text-xs text-muted-foreground">Enrolled {formatDate(c.assigned_at)}</Text>
                            </Box>
                          </Box>
                          <Badge variant="secondary" className={`text-xs shrink-0 px-2.5 py-1 ${statusClass}`}>
                            {statusLabel}
                          </Badge>
                        </Box>
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
      </DialogContent>
    </Dialog>
  );
}

export function AdminEmployeesContent() {
  const { token } = useAuth();
  const fileRef   = useRef(null);

  const [employees, setEmployees]           = useState(null);
  const [search, setSearch]                 = useState("");
  const [filterDept, setFilterDept]         = useState("all");
  const [filterStatus, setFilterStatus]     = useState("all");
  const [filterProgress, setFilterProgress] = useState("all");
  const [filterLocation, setFilterLocation] = useState("all");
  const [filterJobRole, setFilterJobRole]   = useState("all");
  const [error, setError]                   = useState(null);
  const [dialogOpen, setDialogOpen]         = useState(false);
  const [form, setForm]                     = useState(EMPTY_FORM);
  const [saving, setSaving]                 = useState(false);
  const [formError, setFormError]           = useState(null);
  const [confirmToggle, setConfirmToggle]   = useState(null);
  const [confirmDelete, setConfirmDelete]   = useState(null);
  const [actioning, setActioning]           = useState(false);
  const [selected, setSelected]             = useState(new Set());
  const [exporting, setExporting]           = useState(false);

  // view detail modal
  const [detailUserId, setDetailUserId] = useState(null);

  // edit modal
  const [editUser, setEditUser]     = useState(null);
  const [editForm, setEditForm]     = useState({ first_name: "", last_name: "", email: "", location: "", job_role: "" });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError]   = useState(null);

  // bulk upload
  const [bulkOpen, setBulkOpen]               = useState(false);
  const [bulkRows, setBulkRows]               = useState(null);
  const [bulkUploading, setBulkUploading]     = useState(false);
  const [bulkResult, setBulkResult]           = useState(null);
  const [parseError, setParseError]           = useState(null);
  const [templateLoading, setTemplateLoading] = useState(false);

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

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setActioning(true);
    try {
      await deleteUser({ token, userId: confirmDelete.id });
      setEmployees((prev) => prev.filter((e) => e.id !== confirmDelete.id));
      setSelected((prev) => { const n = new Set(prev); n.delete(confirmDelete.id); return n; });
      setConfirmDelete(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setActioning(false);
    }
  };

  const handleCreate = async () => {
    if (!form.first_name.trim()) { setFormError("First name is required"); return; }
    if (!form.last_name.trim())  { setFormError("Last name is required");  return; }
    if (!form.email.trim())      { setFormError("Email is required");       return; }
    if (form.password.length < 6){ setFormError("Password must be at least 6 characters"); return; }
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

  const handleEditSave = async () => {
    if (!editForm.first_name.trim()) { setEditError("First name is required"); return; }
    if (!editForm.last_name.trim())  { setEditError("Last name is required");  return; }
    if (!editForm.email.trim())      { setEditError("Email is required");       return; }
    setEditSaving(true); setEditError(null);
    try {
      await updateUser({ token, userId: editUser.id, data: editForm });
      setEmployees((prev) => prev.map((e) => e.id === editUser.id ? { ...e, ...editForm } : e));
      setEditUser(null);
    } catch (e) {
      setEditError(e.message);
    } finally {
      setEditSaving(false);
    }
  };

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const res  = await fetch("/api/admin/export", { headers: { Authorization: `Bearer ${token}` } });
      const blob = await res.blob();
      triggerBlobDownload(blob, "users-export.xlsx");
    } catch (_) {
      // silent fail
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    setTemplateLoading(true);
    try {
      const res  = await fetch("/api/admin/users/template", { headers: { Authorization: `Bearer ${token}` } });
      const blob = await res.blob();
      triggerBlobDownload(blob, "bulk-upload-template.xlsx");
    } catch (_) {
      // silent fail
    } finally {
      setTemplateLoading(false);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    setParseError(null);
    try {
      const rows = await parseXlsx(file);
      if (rows.length === 0) {
        setParseError("No data rows found. Make sure the file has a header row and data.");
        return;
      }
      setBulkRows(rows);
    } catch {
      setParseError("Could not read the file. Make sure it is a valid .xlsx file.");
    }
  };

  const handleBulkUpload = async () => {
    if (!bulkRows?.length) return;
    setBulkUploading(true);
    try {
      const result = await bulkCreateUsers({ token, users: bulkRows });
      setBulkResult(result);
      setBulkRows(null);
      if (result.created > 0) load();
    } catch (e) {
      setParseError(e.message);
    } finally {
      setBulkUploading(false);
    }
  };

  const closeBulk = () => {
    setBulkOpen(false);
    setBulkRows(null);
    setBulkResult(null);
    setParseError(null);
    setTemplateLoading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  if (error) return (
    <Card className="p-6 text-center">
      <Text as="p" className="text-red-500 text-sm">{error}</Text>
    </Card>
  );

  if (!employees) return (
    <Box className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
    </Box>
  );

  const depts    = [...new Set(employees.map((e) => e.department).filter(Boolean))].sort();
  const locations = [...new Set(employees.map((e) => e.location).filter(Boolean))].sort();
  const jobRoles  = [...new Set(employees.map((e) => e.job_role).filter(Boolean))].sort();

  const filtered = employees.filter((e) => {
    const q = `${e.first_name} ${e.last_name} ${e.email}`.toLowerCase();
    const matchSearch   = q.includes(search.toLowerCase());
    const matchDept     = filterDept     === "all" || e.department === filterDept;
    const matchStatus   = filterStatus   === "all"
      || (filterStatus   === "active"   && e.is_active)
      || (filterStatus   === "inactive" && !e.is_active);
    const matchProgress = filterProgress === "all" || e.status === filterProgress;
    const matchLocation = filterLocation === "all" || e.location === filterLocation;
    const matchJobRole  = filterJobRole  === "all" || e.job_role === filterJobRole;
    return matchSearch && matchDept && matchStatus && matchProgress && matchLocation && matchJobRole;
  });

  const allSelected = filtered.length > 0 && filtered.every((e) => selected.has(e.id));
  const toggleAll   = () => {
    setSelected((prev) => {
      const n = new Set(prev);
      allSelected
        ? filtered.forEach((e) => n.delete(e.id))
        : filtered.forEach((e) => n.add(e.id));
      return n;
    });
  };

  return (
    <Box>
      {/* hidden file input — always mounted so ref stays stable */}
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={handleFileSelect}
      />

      <Card className="overflow-hidden">

        {/* ── Header ── */}
        <Box className="flex items-center justify-between px-6 py-4 border-b">
          <Box>
            <Text as="h2" className="text-base font-bold">All Users</Text>
            <Text as="p" className="text-xs text-muted-foreground mt-0.5">
              {filtered.length} of {employees.length} users shown
            </Text>
          </Box>
          <Box className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => { setBulkResult(null); setBulkRows(null); setParseError(null); setBulkOpen(true); }}
            >
              <Upload className="h-3.5 w-3.5" />
              Bulk Upload
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={handleExport}
              disabled={exporting}
            >
              <Download className="h-3.5 w-3.5" />
              {exporting ? "Exporting…" : "Export"}
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5 bg-blue-500 hover:bg-blue-600 text-white"
              onClick={() => { setForm(EMPTY_FORM); setFormError(null); setDialogOpen(true); }}
            >
              <UserPlus className="h-3.5 w-3.5" />
              + Add User
            </Button>
          </Box>
        </Box>

        {/* ── Filter Bar ── */}
        <Box className="px-6 py-3 border-b space-y-2.5">
          {/* Search row */}
          <Box className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoComplete="off"
              className="pl-10 h-10 text-sm bg-gray-100 border-gray-200 placeholder:text-gray-400 focus-visible:ring-1 focus-visible:ring-blue-400 focus-visible:bg-white transition-colors"
            />
          </Box>
          {/* Filters row */}
          <Box className="flex flex-wrap items-center gap-2">
            <Text as="span" className="text-xs font-medium text-gray-400 mr-1">Filter by:</Text>
            <Select value={filterDept} onValueChange={setFilterDept}>
              <SelectTrigger className={`h-8 text-xs w-[150px] bg-gray-100 border-gray-200 hover:bg-gray-200 transition-colors ${filterDept === "all" ? "text-gray-400" : "text-gray-800 font-medium"}`}>
                <SelectValue>{filterDept === "all" ? "All Departments" : filterDept}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {depts.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className={`h-8 text-xs w-[130px] bg-gray-100 border-gray-200 hover:bg-gray-200 transition-colors ${filterStatus === "all" ? "text-gray-400" : "text-gray-800 font-medium"}`}>
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
            <Select value={filterProgress} onValueChange={setFilterProgress}>
              <SelectTrigger className={`h-8 text-xs w-[140px] bg-gray-100 border-gray-200 hover:bg-gray-200 transition-colors ${filterProgress === "all" ? "text-gray-400" : "text-gray-800 font-medium"}`}>
                <SelectValue>
                  {filterProgress === "all" ? "All Progress"
                    : filterProgress === "completed" ? "Completed"
                    : filterProgress === "in-progress" ? "In Progress"
                    : filterProgress === "not-started" ? "Not Started"
                    : "Failed"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="not-started">Not Started</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterLocation} onValueChange={setFilterLocation}>
              <SelectTrigger className={`h-8 text-xs w-[140px] bg-gray-100 border-gray-200 hover:bg-gray-200 transition-colors ${filterLocation === "all" ? "text-gray-400" : "text-gray-800 font-medium"}`}>
                <SelectValue>{filterLocation === "all" ? "All Locations" : filterLocation}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locations.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterJobRole} onValueChange={setFilterJobRole}>
              <SelectTrigger className={`h-8 text-xs w-[160px] bg-gray-100 border-gray-200 hover:bg-gray-200 transition-colors ${filterJobRole === "all" ? "text-gray-400" : "text-gray-800 font-medium"}`}>
                <SelectValue>{filterJobRole === "all" ? "All Job Roles" : filterJobRole}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Job Roles</SelectItem>
                {jobRoles.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
            {(search || filterDept !== "all" || filterStatus !== "all" || filterProgress !== "all" || filterLocation !== "all" || filterJobRole !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-3 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                onClick={() => { setSearch(""); setFilterDept("all"); setFilterStatus("all"); setFilterProgress("all"); setFilterLocation("all"); setFilterJobRole("all"); }}
              >
                × Clear filters
              </Button>
            )}
          </Box>
        </Box>

        {/* ── Table ── */}
        {filtered.length === 0 ? (
          <Box className="py-16 text-center">
            <Users className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
            <Text as="p" className="text-sm text-muted-foreground">
              {search || filterDept !== "all" || filterStatus !== "all" || filterProgress !== "all"
                ? "No users match your filters."
                : "No learners yet. Add the first user."}
            </Text>
          </Box>
        ) : (
          <Box className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/20">
                  <th className="px-5 py-3 w-10">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={toggleAll}
                      aria-label="Select all"
                    />
                  </th>
                  {["User", "Role", "Department", "Status", "Courses", "Completion", "Last Activity", "Actions"].map((h) => (
                    <th key={h} className="text-left text-[11px] font-semibold text-muted-foreground tracking-wide uppercase px-4 py-3 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((emp, i) => {
                  const initials    = `${(emp.first_name || "")[0]}${(emp.last_name || "")[0]}`.toUpperCase();
                  const avatarColor = AVATAR_COLORS[i % AVATAR_COLORS.length];
                  return (
                    <tr key={emp.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">

                      <td className="px-5 py-3.5">
                        <Checkbox
                          checked={selected.has(emp.id)}
                          onCheckedChange={(v) => setSelected((prev) => {
                            const n = new Set(prev);
                            v ? n.add(emp.id) : n.delete(emp.id);
                            return n;
                          })}
                          aria-label={`Select ${emp.first_name}`}
                        />
                      </td>

                      <td className="px-4 py-3.5">
                        <Box className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 shrink-0">
                            <AvatarFallback className={`text-xs font-bold ${avatarColor}`}>{initials}</AvatarFallback>
                          </Avatar>
                          <Box>
                            <Text as="p" className="text-sm font-semibold leading-tight">{emp.first_name} {emp.last_name}</Text>
                            <Text as="span" className="text-[11px] text-muted-foreground">{emp.email}</Text>
                          </Box>
                        </Box>
                      </td>

                      <td className="px-4 py-3.5">
                        <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold tracking-widest uppercase px-2.5 py-0.5">
                          Learner
                        </Badge>
                      </td>

                      <td className="px-4 py-3.5">
                        <Text as="span" className="text-sm">{emp.department || "—"}</Text>
                      </td>

                      <td className="px-4 py-3.5">
                        {emp.is_active ? (
                          <Badge className="bg-emerald-50 text-emerald-600 border border-emerald-200 gap-1.5 font-medium text-xs px-2.5">
                            <Box className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                            Active
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-50 text-gray-400 border border-gray-200 gap-1.5 font-medium text-xs px-2.5">
                            <Box className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" />
                            Inactive
                          </Badge>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        <Text as="span" className="text-sm font-bold text-blue-500">{emp.assigned_courses}</Text>
                      </td>

                      <td className="px-4 py-3.5">
                        <Box className="flex items-center gap-2 min-w-[120px]">
                          <Progress value={emp.progress} className="h-1.5 w-20" />
                          <Text as="span" className="text-xs text-muted-foreground shrink-0">{emp.progress}%</Text>
                        </Box>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <Text as="span" className="text-sm">
                          {new Date(emp.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </Text>
                      </td>

                      <td className="px-4 py-3.5">
                        <Box className="flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-3 text-xs font-medium"
                            onClick={() => setDetailUserId(emp.id)}
                          >
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-3 text-xs font-medium"
                            onClick={() => {
                              setEditUser(emp);
                              setEditForm({ first_name: emp.first_name, last_name: emp.last_name, email: emp.email, location: emp.location || "", job_role: emp.job_role || "" });
                              setEditError(null);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-3 text-xs font-medium"
                            onClick={() => setConfirmToggle({ id: emp.id, name: `${emp.first_name} ${emp.last_name}`, is_active: emp.is_active })}
                          >
                            {emp.is_active ? "Deactivate" : "Activate"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-3 text-xs font-medium text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600"
                            onClick={() => setConfirmDelete({ id: emp.id, name: `${emp.first_name} ${emp.last_name}` })}
                          >
                            Delete
                          </Button>
                        </Box>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Box>
        )}
      </Card>

      {/* ── Confirm Toggle Status ── */}
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
              {actioning ? "Please wait…" : confirmToggle?.is_active ? "Deactivate" : "Activate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Confirm Delete ── */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => { if (!o) setConfirmDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{confirmDelete?.name}</strong> and all their data. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actioning}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={actioning}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {actioning ? "Deleting…" : "Delete User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── User Detail Modal ── */}
      <UserDetailModal
        userId={detailUserId}
        token={token}
        open={!!detailUserId}
        onClose={() => setDetailUserId(null)}
      />

      {/* ── Edit User Modal ── */}
      <Dialog open={!!editUser} onOpenChange={(o) => { if (!o) setEditUser(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Learner</DialogTitle>
          </DialogHeader>
          {editUser && (
            <Box className="space-y-4">
              <Box className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border">
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarFallback className="bg-indigo-100 text-indigo-600 text-sm font-bold">
                    {`${(editUser.first_name || "")[0]}${(editUser.last_name || "")[0]}`.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <Box className="flex-1 min-w-0">
                  <Text as="p" className="text-sm font-semibold leading-tight">{editUser.first_name} {editUser.last_name}</Text>
                  <Text as="span" className="text-xs text-muted-foreground">{editUser.email}</Text>
                </Box>
                <Badge variant="secondary" className={`text-xs shrink-0 ${editUser.is_active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                  {editUser.is_active ? "Active" : "Inactive"}
                </Badge>
              </Box>
              <Box className="grid grid-cols-2 gap-3">
                <Box className="space-y-1.5">
                  <Label>First Name <Text as="span" className="text-red-500">*</Text></Label>
                  <Input value={editForm.first_name} onChange={(e) => setEditForm((p) => ({ ...p, first_name: e.target.value }))} />
                </Box>
                <Box className="space-y-1.5">
                  <Label>Last Name <Text as="span" className="text-red-500">*</Text></Label>
                  <Input value={editForm.last_name} onChange={(e) => setEditForm((p) => ({ ...p, last_name: e.target.value }))} />
                </Box>
              </Box>
              <Box className="space-y-1.5">
                <Label>Email <Text as="span" className="text-red-500">*</Text></Label>
                <Input type="email" value={editForm.email} onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))} />
              </Box>
              <Box className="grid grid-cols-2 gap-3">
                <Box className="space-y-1.5">
                  <Label>Location</Label>
                  <Input placeholder="e.g. Bangalore" value={editForm.location} onChange={(e) => setEditForm((p) => ({ ...p, location: e.target.value }))} />
                </Box>
                <Box className="space-y-1.5">
                  <Label>Job Role</Label>
                  <Input placeholder="e.g. Software Engineer" value={editForm.job_role} onChange={(e) => setEditForm((p) => ({ ...p, job_role: e.target.value }))} />
                </Box>
              </Box>
              {editError && (
                <Box className="flex items-center gap-2 text-red-500 text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {editError}
                </Box>
              )}
            </Box>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)} disabled={editSaving}>Cancel</Button>
            <Button
              onClick={handleEditSave}
              disabled={editSaving}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              {editSaving ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add User Dialog ── */}
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
              <Input type="email" placeholder="alice@company.com" autoComplete="off" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
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
            <Box className="grid grid-cols-2 gap-3">
              <Box className="space-y-1.5">
                <Label>Location</Label>
                <Input placeholder="e.g. Bangalore" value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} />
              </Box>
              <Box className="space-y-1.5">
                <Label>Job Role</Label>
                <Input placeholder="e.g. Software Engineer" value={form.job_role} onChange={(e) => setForm((p) => ({ ...p, job_role: e.target.value }))} />
              </Box>
            </Box>
            <Box className="space-y-1.5">
              <Label>Password <Text as="span" className="text-red-500">*</Text></Label>
              <Input type="password" placeholder="Minimum 6 characters" autoComplete="new-password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} />
            </Box>
            {formError && <Text as="p" className="text-sm text-red-500">{formError}</Text>}
          </Box>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleCreate}
              disabled={saving}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              {saving ? "Creating…" : "Add Learner"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Bulk Upload Dialog ── */}
      <Dialog open={bulkOpen} onOpenChange={(o) => { if (!o) closeBulk(); }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bulk Upload Learners</DialogTitle>
          </DialogHeader>

          {bulkResult ? (
            /* Results screen */
            <Box className="space-y-4 py-2">
              <Box className="grid grid-cols-3 gap-3">
                <Box className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-center">
                  <Text as="p" className="text-2xl font-bold text-emerald-600">{bulkResult.created}</Text>
                  <Text as="p" className="text-xs text-muted-foreground mt-0.5">Users Created</Text>
                </Box>
                <Box className="rounded-xl bg-red-50 border border-red-200 p-4 text-center">
                  <Text as="p" className="text-2xl font-bold text-red-500">{bulkResult.failed?.length ?? 0}</Text>
                  <Text as="p" className="text-xs text-muted-foreground mt-0.5">Failed</Text>
                </Box>
                <Box className="rounded-xl bg-muted border p-4 text-center">
                  <Text as="p" className="text-2xl font-bold">{bulkResult.total}</Text>
                  <Text as="p" className="text-xs text-muted-foreground mt-0.5">Total Rows</Text>
                </Box>
              </Box>
              {bulkResult.failed?.length > 0 && (
                <Box className="rounded-xl border overflow-hidden">
                  <Box className="px-4 py-2.5 bg-red-50 border-b">
                    <Text as="p" className="text-xs font-semibold text-red-600 uppercase tracking-wide">Failed Rows</Text>
                  </Box>
                  <Box className="max-h-48 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/40">
                        <tr>
                          <th className="px-4 py-2 text-left font-semibold text-muted-foreground">Row</th>
                          <th className="px-4 py-2 text-left font-semibold text-muted-foreground">Email</th>
                          <th className="px-4 py-2 text-left font-semibold text-muted-foreground">Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bulkResult.failed.map((f, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="px-4 py-2 text-muted-foreground">#{f.row}</td>
                            <td className="px-4 py-2">{f.email}</td>
                            <td className="px-4 py-2 text-red-500">{f.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Box>
                </Box>
              )}
              <DialogFooter>
                <Button onClick={closeBulk} className="bg-blue-500 hover:bg-blue-600 text-white">Done</Button>
              </DialogFooter>
            </Box>
          ) : (
            /* Upload flow */
            <Box className="space-y-5 py-2">

              {/* Step 1 — Download template */}
              <Box className="rounded-xl border p-4 space-y-3">
                <Box className="flex items-center gap-2">
                  <Box className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">1</Box>
                  <Text as="p" className="text-sm font-semibold">Download the Excel template</Text>
                </Box>
                <Text as="p" className="text-xs text-muted-foreground pl-8">
                  Fill in employee details. Leave Password blank to use the default: <strong>Edstellar@123</strong>
                </Text>
                <Box className="pl-8">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1.5"
                    onClick={handleDownloadTemplate}
                    disabled={templateLoading}
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                    {templateLoading ? "Downloading…" : "Download Template (.xlsx)"}
                  </Button>
                </Box>
              </Box>

              {/* Step 2 — Upload filled file */}
              <Box className="rounded-xl border p-4 space-y-3">
                <Box className="flex items-center gap-2">
                  <Box className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">2</Box>
                  <Text as="p" className="text-sm font-semibold">Upload the filled file</Text>
                </Box>
                <Box className="pl-8">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1.5"
                    onClick={() => fileRef.current?.click()}
                    disabled={bulkUploading}
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Choose File (.xlsx)
                  </Button>
                </Box>
                {parseError && (
                  <Box className="pl-8 flex items-center gap-2 text-red-500 text-xs">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    {parseError}
                  </Box>
                )}
              </Box>

              {/* Preview table */}
              {bulkRows && bulkRows.length > 0 && (
                <Box className="rounded-xl border overflow-hidden">
                  <Box className="px-4 py-2.5 bg-muted/40 border-b">
                    <Text as="p" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Preview — {bulkRows.length} row{bulkRows.length !== 1 ? "s" : ""}
                    </Text>
                  </Box>
                  <Box className="overflow-x-auto max-h-52 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/20 sticky top-0">
                        <tr>
                          {["Employee ID", "First Name", "Last Name", "Email", "Department", "Location", "Job Role", "Password"].map((h) => (
                            <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {bulkRows.map((r, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="px-3 py-2 text-muted-foreground">{r.employee_id || "—"}</td>
                            <td className="px-3 py-2">{r.first_name}</td>
                            <td className="px-3 py-2">{r.last_name}</td>
                            <td className="px-3 py-2">{r.email}</td>
                            <td className="px-3 py-2">{r.department || "—"}</td>
                            <td className="px-3 py-2">{r.location || "—"}</td>
                            <td className="px-3 py-2">{r.job_role || "—"}</td>
                            <td className="px-3 py-2 text-muted-foreground">{r.password ? "••••••" : "(default)"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Box>
                </Box>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={closeBulk} disabled={bulkUploading}>Cancel</Button>
                <Button
                  onClick={handleBulkUpload}
                  disabled={!bulkRows?.length || bulkUploading}
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                >
                  {bulkUploading ? "Uploading…" : `Upload ${bulkRows?.length ?? 0} Users`}
                </Button>
              </DialogFooter>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
