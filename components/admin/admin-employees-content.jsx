"use client";

import { SERVER_URL } from "@/lib/api-client";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
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
  DialogDescription,
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
  ChevronDown, ChevronUp, CalendarDays, FileArchive, MinusCircle,
  Eye, EyeOff, Pencil, Power, Trash2, ShieldCheck, GraduationCap, Presentation, UserX,
  Mail, ChevronLeft, ChevronRight,
} from "lucide-react";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api-client";
import { createUser, updateUser, bulkCreateUsers, toggleUserStatus, deleteUser, fetchSeatState, fetchOrgRoles, assignUserRole } from "@/services/api/admin/admin-api";
import { SeatUsagePanel } from "@/components/admin/seat-usage-panel";
// The lists are per-tenant data now, curated by Edstellar at onboarding
// (`0031`), so they are FETCHED rather than imported. `lib/workforce.js` is
// gone — a constant could not describe a customer with an office in Dubai.
import { fetchMyOrgOptions } from "@/services/api/profile-api";
import { cn } from "@/lib/utils";
import { progressFill } from "@/lib/brand";

/** How a role's portal reads in a picker. One place, so it cannot drift. */
const PORTAL_WORD = { admin: "Admin portal", learner: "Learner portal", trainer: "Trainer portal" };

/** The Manage Users table page size. Must stay ≤ the server's `limit` cap (100). */
const PAGE = 25;

const AVATAR_COLORS = [
  "bg-navy text-white",
  "bg-navy text-white",
  "bg-navy text-white",
  "bg-navy text-white",
  "bg-navy text-white",
  "bg-error text-white",
  "bg-navy text-white",
  "bg-navy text-white",
  "bg-navy text-white",
  "bg-navy text-white",
];

const DEPARTMENTS = [
  "Sales", "HR", "Technology", "Finance", "Marketing",
  "Operations", "Legal", "Customer Support", "Product", "Design",
];

const EMPTY_FORM = { first_name: "", last_name: "", email: "", password: "", department: "", location: "", job_role: "", job_level: "", role_id: "", manager_id: "" };

const HEADER_MAP = {
  "employee id": "employee_id", "employeeid": "employee_id", "employee_id": "employee_id",
  "first name": "first_name",  "firstname":  "first_name",  "first_name":  "first_name",
  "last name":  "last_name",   "lastname":   "last_name",   "last_name":   "last_name",
  "email": "email", "email address": "email",
  "department": "department", "dept": "department",
  "location": "location", "city": "location",
  "job role": "job_role", "job_role": "job_role", "jobrole": "job_role", "title": "job_role", "position": "job_role",
  "job level": "job_level", "job_level": "job_level", "joblevel": "job_level", "level": "job_level", "seniority": "job_level",
  // The column holds an EMAIL. Every spelling an admin might type for it maps
  // to the same field, including the bare word "manager" — somebody who
  // renames the header has still told us what they meant, and refusing the
  // column on a spelling is how a whole file's reporting lines go missing
  // with nothing on screen to say why.
  "manager email": "manager", "manager_email": "manager", "manageremail": "manager",
  "manager": "manager", "manager mail": "manager",
  "reports to": "manager", "reporting manager": "manager",
  "password": "password",
};

/**
 * What the preview prints in the Manager column, one entry per row.
 *
 * The file carries an EMAIL because that is the only thing an admin can type
 * that means exactly one person. A NAME is what they can actually check, so
 * the address is resolved here, before anything is sent — a typo caught in
 * the preview costs a correction, the same typo caught by the server costs a
 * failed row and a second upload.
 *
 * Three states, and the third is the reason this exists:
 *   found    an active account in this organization, shown by name
 *   pending  somebody created EARLIER IN THIS FILE. The server resolves
 *            these too (rows are processed in order), so flagging them as
 *            unknown would red-flag a row that is going to work
 *   self     the row names its own address. Its own state rather than
 *            `unknown`, because the fix is a different one and the server
 *            refuses it with a different sentence
 *   unknown  nothing matches. The row will fail, and it says so here first
 */
function managerPreview(rows, people) {
  const byEmail = new Map(
    (people ?? [])
      .filter((p) => p.is_active)
      .map((p) => [String(p.email).toLowerCase(), `${p.first_name} ${p.last_name}`]),
  );

  // Every email in the file, ANY position — not just rows above. The import
  // now creates a manager before their reports whatever the row order, so a
  // manager listed at the bottom resolves just like one at the top, and the
  // preview must not red-flag it as unknown.
  const inFile = new Map();
  (rows ?? []).forEach((row) => {
    const own = String(row.email ?? "").trim().toLowerCase();
    if (own) {
      inFile.set(own, `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim() || own);
    }
  });

  return (rows ?? []).map((row) => {
    const own = String(row.email ?? "").trim().toLowerCase();
    const email = String(row.manager ?? "").trim().toLowerCase();
    if (!email) return { state: "none", label: "—" };
    if (email === own) return { state: "self", label: "Cannot be their own manager" };
    const existing = byEmail.get(email);
    if (existing) return { state: "found", label: existing };
    const fileName = inFile.get(email);
    if (fileName) return { state: "pending", label: fileName };
    return { state: "unknown", label: email };
  });
}

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

/** Date plus time — a SCORM retake often happens the same day as the first go. */
function formatDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d)) return "—";
  return d.toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

/**
 * A SCORM package inside a course, rendered like an assessment.
 *
 * The one real difference is that SCORM may not grade at all: a package can
 * report completion without pass/fail, so `has_passed` is nullable and
 * "not graded" must not look like "failed".
 */
function ScormBlock({ scorm }) {
  const [expanded, setExpanded] = useState(false);
  const { title, version, attempt_count, best_score, has_passed, attempts } = scorm;
  const attempted = attempt_count > 0;

  const Icon = has_passed === true ? Trophy
    : has_passed === false ? XCircle
      : attempted ? CheckCircle2 : FileArchive;
  const iconTone = has_passed === false ? "text-error"
    : attempted ? "text-navy" : "text-ink/45";

  return (
    <Box className="rounded-xl border bg-background overflow-hidden">
      <Box className="flex items-center justify-between gap-4 px-4 py-3 flex-wrap">
        <Box className="flex items-center gap-3 flex-1 min-w-0">
          <Box className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
            has_passed === false ? "bg-error/10" : "bg-paper-cream"
          }`}>
            <Icon className={`h-4 w-4 ${iconTone}`} />
          </Box>
          <Box className="min-w-0">
            <Text as="p" className="text-sm font-semibold leading-tight truncate">{title}</Text>
            <Text as="span" className="text-xs text-muted-foreground">
              SCORM {version}
              {best_score !== null && <> &nbsp;·&nbsp; Best: {best_score}%</>}
            </Text>
          </Box>
        </Box>
        <Box className="flex items-center gap-3 shrink-0">
          {attempted ? (
            <Badge variant="secondary" className={`text-xs font-semibold px-2.5 py-1 ${
              has_passed === false ? "bg-error/10 text-error" : "bg-paper-cream text-navy"
            }`}>
              {best_score !== null
                ? `Best: ${best_score}%`
                : has_passed === true ? "Passed" : "Completed"}
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-xs px-2.5 py-1 bg-paper-cream text-ink/60">
              Not attempted
            </Badge>
          )}
          <Text as="span" className="text-xs text-muted-foreground whitespace-nowrap">
            {attempt_count} attempt{attempt_count !== 1 ? "s" : ""}
          </Text>
          {attempted && (
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
          {attempts.map((att) => (
            <Box key={att.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-background border flex-wrap">
              <Text as="span" className="text-xs font-medium text-muted-foreground w-6 shrink-0">
                #{att.attempt_number}
              </Text>
              {att.is_passed === true
                ? <CheckCircle2 className="h-4 w-4 text-navy shrink-0" />
                : att.is_passed === false
                  ? <XCircle className="h-4 w-4 text-error shrink-0" />
                  : <MinusCircle className="h-4 w-4 text-ink/35 shrink-0" />}
              {att.percentage !== null && (
                <Badge variant="secondary" className={`text-xs font-semibold px-2 ${
                  att.is_passed === false ? "bg-error/10 text-error" : "bg-paper-cream text-navy"
                }`}>
                  {att.percentage}%
                </Badge>
              )}
              <Text as="span" className="text-xs text-muted-foreground">
                {att.score_max !== null
                  ? `${att.score_raw ?? 0}/${att.score_max}`
                  : att.lesson_status || "no score reported"}
              </Text>
              <Box className="flex items-center gap-1.5 ml-auto shrink-0">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <Text as="span" className="text-xs text-muted-foreground">
                  {formatDateTime(att.submitted_at)}
                </Text>
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}

function AssessmentBlock({ assessment }) {
  const [expanded, setExpanded] = useState(false);
  const { title, passing_score, questions_count, attempt_count, best_score, has_passed, attempts } = assessment;

  return (
    <Box className="rounded-xl border bg-background overflow-hidden">
      <Box className="flex items-center justify-between gap-4 px-4 py-3 flex-wrap">
        <Box className="flex items-center gap-3 flex-1 min-w-0">
          <Box className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
            has_passed ? "bg-paper-cream" : attempt_count > 0 ? "bg-error/10" : "bg-paper-cream"
          }`}>
            {has_passed
              ? <Trophy className="h-4 w-4 text-navy" />
              : attempt_count > 0
                ? <XCircle className="h-4 w-4 text-error" />
                : <ClipboardList className="h-4 w-4 text-ink/45" />
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
              has_passed ? "bg-paper-cream text-navy" : "bg-error/10 text-error"
            }`}>
              Best: {best_score}%
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-xs px-2.5 py-1 bg-paper-cream text-ink/60">
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
                ? <CheckCircle2 className="h-4 w-4 text-navy shrink-0" />
                : <XCircle className="h-4 w-4 text-error shrink-0" />
              }
              <Badge variant="secondary" className={`text-xs font-semibold px-2 ${
                att.is_passed ? "bg-paper-cream text-navy" : "bg-error/10 text-error"
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

function UserDetailModal({ userId, open, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId || !open) return;
    setData(null);
    setLoading(true);
    apiClient(`/api/admin/users/${userId}`)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId, open]);

  const user    = data?.user;
  const summary = data?.summary;
  const courses = data?.courses ?? [];

  const initials = user ? `${(user.first_name || "")[0]}${(user.last_name || "")[0]}`.toUpperCase() : "?";

  const summaryCards = summary ? [
    { label: "Courses Assigned",    value: summary.coursesAssigned,                                          color: "text-navy",  bg: "bg-paper-cream"  },
    { label: "Completed",           value: summary.coursesCompleted,                                          color: "text-navy", bg: "bg-paper-cream" },
    { label: "Assessment Attempts", value: summary.totalAttempts,                                             color: "text-ink/70",   bg: "bg-paper-cream"   },
    { label: "Best Score",          value: summary.bestScore != null ? `${summary.bestScore}%` : "—",         color: summary.bestScore >= 60 ? "text-navy" : "text-error", bg: summary.bestScore >= 60 ? "bg-paper-cream" : "bg-error/10" },
  ] : [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[85dvh] overflow-y-auto">
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
            <Box className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
            </Box>
            {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-lg" />)}
          </Box>
        )}

        {!loading && user && (
          <Box className="space-y-6 pb-2">
            <Box className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 border">
              <Avatar className="h-14 w-14 shrink-0">
                <AvatarFallback className="bg-paper-cream text-navy text-xl font-bold">{initials}</AvatarFallback>
              </Avatar>
              <Box className="flex-1 min-w-0">
                <Box className="flex items-center gap-2 flex-wrap">
                  <Text as="h2" className="text-lg font-bold">{user.first_name} {user.last_name}</Text>
                  <Badge variant="secondary" className={`text-xs ${user.is_active ? "bg-paper-cream text-navy" : "bg-paper-cream text-ink/60"}`}>
                    {user.is_active ? "Active" : "Inactive"}
                  </Badge>
                </Box>
                <Text as="p" className="text-sm text-muted-foreground">{user.email}</Text>
                <Box className="flex items-center gap-3 mt-1.5 flex-wrap">
                  {user.department && (
                    <Badge variant="secondary" className="text-xs bg-paper-cream text-navy">{user.department}</Badge>
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

            <Box className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                  const accentBar    = isComplete ? "bg-navy" : isInProgress ? "bg-navy" : "bg-paper-cream";
                  const statusLabel  = isComplete ? "Completed" : isInProgress ? "In Progress" : "Not Started";
                  const statusClass  = isComplete
                    ? "bg-paper-cream text-navy"
                    : isInProgress
                      ? "bg-paper-cream text-navy"
                      : "bg-paper-cream text-ink/60";

                  return (
                    <Card key={c.course_id} className="overflow-hidden">
                      <Box className={`h-1.5 w-full ${accentBar}`} />
                      <CardContent className="p-5 space-y-4">
                        <Box className="flex items-start justify-between gap-3">
                          <Box className="flex items-center gap-3 flex-1 min-w-0">
                            <Box className="w-9 h-9 rounded-lg bg-paper-cream flex items-center justify-center shrink-0">
                              <BookOpen className="h-4 w-4 text-navy" />
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
                              <TrendingUp className="h-3.5 w-3.5 text-navy" />
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
                        {(c.scorm_packages?.length ?? 0) > 0 && (
                          <Box className="space-y-2.5">
                            <Text as="p" className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                              <FileArchive className="h-3.5 w-3.5" />
                              SCORM
                            </Text>
                            {c.scorm_packages.map((s) => (
                              <ScormBlock key={s.id} scorm={s} />
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

/**
 * Role key -> badge colours.
 *
 * Every hue is from the Spectra palette (TASTE §10.1). The badge says which
 * portal the account belongs to, not how it is doing, so these are identity
 * colours and nothing here means "good" or "bad".
 */
const ROLE_BADGE = {
  admin:   "bg-accent-tint text-accent-blue border-accent-blue/25",
  manager: "bg-[color-mix(in_oklab,var(--spectra-warning)_12%,transparent)] text-warning border-warning/25",
  trainer: "bg-[color-mix(in_oklab,var(--spectra-rust)_12%,transparent)] text-rust border-rust/25",
  learner: "bg-surface-3 text-text-2 border-line-strong",
};

/** `2026-09-15T…` -> `15 Sept 2026`. */
function formatDay(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * A square icon button for a table row action.
 *
 * `title` carries the label rather than a tooltip component: these sit inside
 * a scrolling table, and a portalled tooltip there fights the scroll
 * container for very little gain. `aria-label` carries the same string, so
 * the button is not a nameless glyph to a screen reader — which is the real
 * cost of replacing the words View / Edit / Deactivate / Delete with icons.
 *
 * A disabled action keeps its title, so hovering says WHY it is unavailable
 * instead of leaving the admin to guess.
 */
/**
 * Who this person reports to.
 *
 * **Everybody active is offered, minus the person being edited**, because a
 * reporting line is not confined to one department or one role — an admin or
 * a trainer manages people too, and restricting the list to Manager-role
 * accounts would mean recording the org chart only in a particular order.
 *
 * Excluding SELF is done here as well as on the server. The API refuses it
 * with a 422 regardless; leaving the option in the list would be offering a
 * choice that is always wrong (§10.3.1.2).
 *
 * A cycle (A reports to B who reports to A) is NOT filtered here — it needs a
 * walk up the chain, which is a query. The API refuses it with a sentence
 * naming both people, which is a better error than a silently shorter list.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * A labelled control with room for the two things a field often needs to
 * say: what it is FOR, and what is wrong with it.
 *
 * It exists because the add-user form repeated the same label/control/hint
 * markup nine times and drifted — some fields carried an explanation, most
 * did not, and none of the labels were associated with their input, so
 * clicking a label focused nothing.
 */
function Field({ id, label, required = false, hint, error, children }) {
  return (
    <Box className="space-y-1.5">
      <Label htmlFor={id}>
        {label}
        {required && <Text as="span" className="text-danger">*</Text>}
      </Label>
      {children}
      {/* An error REPLACES the hint rather than stacking under it — two
          lines of small print below one input is how a form starts looking
          broken. */}
      {error ? (
        <Text as="p" className="text-[11px] text-danger">{error}</Text>
      ) : hint ? (
        <Text as="p" className="text-[11px] text-text-3">{hint}</Text>
      ) : null}
    </Box>
  );
}

/** A titled group of fields, so nine inputs read as three questions. */
function FormSection({ title, hint, children }) {
  return (
    <Box className="space-y-3">
      <Box className="flex flex-wrap items-baseline gap-x-2 border-b border-line pb-1.5">
        <Text as="h4" className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-text-3">
          {title}
        </Text>
        {hint && <Text as="span" className="text-[11px] text-text-3">{hint}</Text>}
      </Box>
      {children}
    </Box>
  );
}

function ManagerField({ value, onChange, people, excludeId }) {
  const options = (people ?? []).filter(
    (p) => p.is_active && String(p.id) !== String(excludeId),
  );
  const picked = options.find((p) => String(p.id) === String(value)) ?? null;

  return (
    <Box className="space-y-1.5">
      <Label>Manager</Label>
      <Select
        value={value ? String(value) : "none"}
        onValueChange={(v) => onChange(v === "none" ? "" : v)}
      >
        <SelectTrigger className="w-full text-sm">
          <SelectValue>
            {picked ? `${picked.first_name} ${picked.last_name}` : "No manager"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-72">
          <SelectItem value="none">No manager</SelectItem>
          {options.map((p) => (
            <SelectItem key={p.id} value={String(p.id)}>
              {p.first_name} {p.last_name}
              <Text as="span" className="ml-1.5 text-[10.5px] text-text-3">
                {p.role_label}
              </Text>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Text as="p" className="text-[11px] text-text-3">
        Their manager sees this person&apos;s progress in Team Learning.
      </Text>
    </Box>
  );
}

function IconAction({ icon: Icon, label, onClick, disabled = false, danger = false, active = false }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex size-7 items-center justify-center border transition-colors",
        disabled
          ? "cursor-not-allowed border-line bg-surface-2 text-text-3/50"
          : danger
            ? "border-line bg-surface text-text-2 hover:border-danger hover:bg-danger/10 hover:text-danger"
            : active
              ? "border-success/30 bg-success/10 text-success hover:border-success"
              : "border-line bg-surface text-text-2 hover:border-accent-blue hover:bg-accent-tint hover:text-accent-blue",
      )}
    >
      <Icon className="size-3.5" />
    </button>
  );
}

export function AdminEmployeesContent() {
  const { user } = useAuth();
  const fileRef   = useRef(null);

  // The TABLE rows are a single server-paginated page; `people` is the full
  // lightweight identity list the Manager picker and bulk resolution need
  // (both of which want everybody, not a page). Keeping them apart is what
  // lets the heavy progress table be paged while the cheap picker list is not.
  const [pageUsers, setPageUsers]           = useState(null);
  const [people, setPeople]                 = useState(null);
  const [facets, setFacets]                 = useState(null);
  const [total, setTotal]                   = useState(0);
  const [hasMore, setHasMore]               = useState(false);
  const [offset, setOffset]                 = useState(0);
  const [pageLoading, setPageLoading]       = useState(false);

  const [search, setSearch]                 = useState("");
  // What is actually SENT — the search box debounced, so the table is not
  // refetched on every keystroke across an org.
  const [appliedSearch, setAppliedSearch]   = useState("");
  const [filterDept, setFilterDept]         = useState("all");
  const [filterStatus, setFilterStatus]     = useState("all");
  const [filterProgress, setFilterProgress] = useState("all");
  const [filterLocation, setFilterLocation] = useState("all");
  const [filterJobRole, setFilterJobRole]   = useState("all");
  const [filterRole, setFilterRole]         = useState("all");
  const [filterLevel, setFilterLevel]       = useState("all");
  const [stats, setStats]                   = useState(null);
  const [seatState, setSeatState]           = useState(null);
  const [orgOptions, setOrgOptions]         = useState(null);
  const [error, setError]                   = useState(null);
  const [dialogOpen, setDialogOpen]         = useState(false);
  const [showPassword, setShowPassword]     = useState(true);
  const [form, setForm]                     = useState(EMPTY_FORM);
  /* The org's own roles. An admin can now onboard somebody straight onto the
     trainer portal, which is the only way the session form's trainer picker
     ever gets an entry without shell access. */
  const [orgRoles, setOrgRoles]             = useState(null);
  const [roleTarget, setRoleTarget]         = useState(null);
  const [roleChoice, setRoleChoice]         = useState("");
  const [roleSaving, setRoleSaving]         = useState(false);
  const [roleError, setRoleError]           = useState(null);
  const [saving, setSaving]                 = useState(false);
  const [formError, setFormError]           = useState(null);
  const [confirmToggle, setConfirmToggle]   = useState(null);
  const [confirmDelete, setConfirmDelete]   = useState(null);
  const [actioning, setActioning]           = useState(false);
  const [exporting, setExporting]           = useState(false);

  // view detail modal
  const [detailUserId, setDetailUserId] = useState(null);

  // edit modal
  const [editUser, setEditUser]     = useState(null);
  const [editForm, setEditForm]     = useState({ first_name: "", last_name: "", email: "", department: "", location: "", job_role: "", job_level: "", manager_id: "" });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError]   = useState(null);

  // bulk upload
  const [bulkOpen, setBulkOpen]               = useState(false);
  const [bulkRows, setBulkRows]               = useState(null);
  const [bulkUploading, setBulkUploading]     = useState(false);
  const [bulkResult, setBulkResult]           = useState(null);
  /* Default ON — see the DTO's docblock. An import that creates accounts
   * nobody can sign into is the gap this closes; the tick is here so an
   * admin importing sample rows or staging a tenant can still opt out. */
  const [bulkWelcome, setBulkWelcome]         = useState(true);
  const [parseError, setParseError]           = useState(null);
  const [templateLoading, setTemplateLoading] = useState(false);

  /**
   * The paginated, filtered table page plus the org-wide KPI tiles and filter
   * facets that travel with it. This is the DIRECTORY, not `/admin/employees`:
   * the table shows every account in the organization — admins and trainers
   * included — while that endpoint is learners-only because it also feeds the
   * assign-learning picker and the session roster.
   */
  const loadPage = useCallback(async () => {
    if (!user) return;
    setPageLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", String(PAGE));
      params.set("offset", String(offset));
      if (appliedSearch)             params.set("search", appliedSearch);
      if (filterStatus   !== "all")  params.set("status", filterStatus);
      if (filterProgress !== "all")  params.set("progress", filterProgress);
      if (filterDept     !== "all")  params.set("department", filterDept);
      if (filterLocation !== "all")  params.set("location", filterLocation);
      if (filterJobRole  !== "all")  params.set("job_role", filterJobRole);
      if (filterLevel    !== "all")  params.set("job_level", filterLevel);
      if (filterRole     !== "all")  params.set("role", filterRole);

      const d = await apiClient(`/api/admin/users/directory?${params.toString()}`);
      setPageUsers(d.users || []);
      setStats(d.stats || null);
      setFacets(d.facets || null);
      setTotal(d.total ?? 0);
      setHasMore(Boolean(d.has_more));
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setPageLoading(false);
    }
  }, [user, offset, appliedSearch, filterStatus, filterProgress, filterDept,
      filterLocation, filterJobRole, filterLevel, filterRole]);

  /**
   * Everything that does NOT depend on the table's filters: the full identity
   * list for the pickers, seats, the org's branch/level options, and the org's
   * roles. Fetched once on mount and after any mutation.
   */
  const loadStatic = useCallback(async () => {
    if (!user) return;
    const [peopleRes, seats, options, roles] = await Promise.all([
      apiClient("/api/admin/users/people").catch(() => null),
      // Seats travel with every refetch: creating or deactivating somebody
      // moves the meter, and a stale one beside a table that just changed is
      // the two-numbers-disagreeing failure the KPI tiles already avoid.
      fetchSeatState().catch(() => null),
      // The branch locations and job levels this org may offer.
      fetchMyOrgOptions().catch(() => null),
      // The org's roles, for the Add User selector and Change role. A failure
      // leaves the selector out rather than blocking onboarding.
      fetchOrgRoles().catch(() => null),
    ]);
    setPeople(peopleRes?.people ?? []);
    setSeatState(seats);
    setOrgOptions(options);
    setOrgRoles(roles?.roles ?? null);
  }, [user]);

  /** A full reload after a mutation — the table page AND the picker list. */
  const load = useCallback(async () => {
    await Promise.all([loadPage(), loadStatic()]);
  }, [loadPage, loadStatic]);

  useEffect(() => { loadPage(); }, [loadPage]);
  useEffect(() => { loadStatic(); }, [loadStatic]);

  // Debounce the search box into what is actually sent, and return to the
  // first page whenever the query narrows — a filtered result shorter than the
  // current offset would otherwise show an empty page the admin did not ask for.
  useEffect(() => {
    const t = setTimeout(() => { setAppliedSearch(search.trim()); setOffset(0); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  // Any dropdown filter change also returns to the first page. Batched with the
  // setter in the same event, so this costs one fetch, not two.
  const withFirstPage = (setter) => (value) => { setter(value); setOffset(0); };

  const handleToggleStatus = async () => {
    if (!confirmToggle) return;
    setActioning(true);
    try {
      await toggleUserStatus({ userId: confirmToggle.id, is_active: !confirmToggle.is_active });
      // Refetch rather than patch the row in place. The KPI tiles above the
      // table are computed by the server from the same rows, so a local edit
      // moved the chip and left "Inactive users" saying 0 — two numbers on one
      // screen disagreeing about the click that had just happened.
      await load();
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
      await deleteUser({ userId: confirmDelete.id });
      await load();   // keeps the KPI tiles in step — see handleToggleStatus
      setConfirmDelete(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setActioning(false);
    }
  };

  /* Named rather than inlined so the footer hint and the button's title
     cannot describe different things. Order matches reading order, so the
     message points at the first field they have not filled. */
  const createBlockedReason = !form.first_name.trim()
    ? "First name is required."
    : !form.last_name.trim()
      ? "Last name is required."
      : !form.email.trim()
        ? "Email is required."
        : !EMAIL_RE.test(form.email.trim())
          ? "That does not look like an email address."
          : form.password.length < 6
            ? "A password of at least 6 characters is required."
            : null;

  const handleCreate = async () => {
    if (!form.first_name.trim()) { setFormError("First name is required"); return; }
    if (!form.last_name.trim())  { setFormError("Last name is required");  return; }
    if (!form.email.trim())      { setFormError("Email is required");       return; }
    if (form.password.length < 6){ setFormError("Password must be at least 6 characters"); return; }
    setSaving(true); setFormError(null);
    try {
      await createUser({
        data: {
          ...form,
          role_id: form.role_id ? Number(form.role_id) : undefined,
          manager_id: form.manager_id ? Number(form.manager_id) : null,
        },
      });
      setDialogOpen(false);
      setForm(EMPTY_FORM);
      load();
    } catch (e) {
      setFormError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAssignRole = async () => {
    if (!roleChoice) { setRoleError("Pick a role"); return; }
    setRoleSaving(true); setRoleError(null);
    try {
      await assignUserRole({ userId: roleTarget.id, roleId: Number(roleChoice) });
      setRoleTarget(null);
      // Refetch rather than patch: the role change moves role_label, the KPI
      // counts and the seat meter at once, and three numbers disagreeing with
      // the row that just changed is the failure §10.12 records.
      await load();
    } catch (e) {
      setRoleError(e.message);
    } finally {
      setRoleSaving(false);
    }
  };

  const handleEditSave = async () => {
    if (!editForm.first_name.trim()) { setEditError("First name is required"); return; }
    if (!editForm.last_name.trim())  { setEditError("Last name is required");  return; }
    if (!editForm.email.trim())      { setEditError("Email is required");       return; }
    setEditSaving(true); setEditError(null);
    try {
      await updateUser({
        userId: editUser.id,
        data: { ...editForm, manager_id: editForm.manager_id ? Number(editForm.manager_id) : null },
      });
      // `editForm` has no role/progress/last-activity fields, so spreading it
      // over the row would blank the columns this table now shows. Refetch.
      await load();
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
      const res  = await fetch(`${SERVER_URL}/api/admin/export`, { credentials: "include" });
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
      const res  = await fetch(`${SERVER_URL}/api/admin/users/template`, { credentials: "include" });
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
      const result = await bulkCreateUsers({ users: bulkRows, sendWelcomeEmail: bulkWelcome });
      setBulkResult(result);
      setBulkRows(null);
      if (result.created > 0) load();
    } catch (e) {
      setParseError(e.message);
    } finally {
      setBulkUploading(false);
    }
  };

  /**
   * Recomputed from the directory the table already loaded, so the preview
   * costs no request and cannot disagree with the Manager picker in the Add
   * User dialog beside it — both read `people`, both filter to active.
   */
  const managerCells = useMemo(
    () => managerPreview(bulkRows, people),
    [bulkRows, people],
  );
  const badManagers = managerCells.filter(
    (m) => m.state === "unknown" || m.state === "self",
  ).length;

  const closeBulk = () => {
    setBulkOpen(false);
    setBulkRows(null);
    setBulkResult(null);
    setBulkWelcome(true);
    setParseError(null);
    setTemplateLoading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  if (error) return (
    <Card className="p-6 text-center">
      <Text as="p" className="text-error text-sm">{error}</Text>
    </Card>
  );

  if (pageUsers === null) return (
    <Box className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
    </Box>
  );

  // `false` when seats could not be read, so a failed seat fetch never locks
  // an admin out of adding people — the API still enforces the real limit.
  const seatsFull = Boolean(seatState?.seats?.is_full);

  /* A seat is an ACTIVE LEARNER (`0028`), so only a learner-portal role costs
     one. That is why `+ Add User` stays enabled at the cap once a non-learner
     role is chosen: the API would accept it, and disabling a control the API
     would honour is the mirror of §10.3.1.2's screen that lies. */
  const selectedRole = (orgRoles ?? []).find((r) => String(r.id) === String(form.role_id)) ?? null;
  const rolePortal = selectedRole?.portal ?? "learner";
  const createCostsSeat = rolePortal === "learner";
  const blockedBySeats = seatsFull && createCostsSeat;

  // Active options only. An empty array is a real state, not a loading one:
  // a tenant Edstellar has not given branch locations to yet genuinely has
  // none to offer, and the forms say so rather than showing a blank dropdown.
  const locationOptions = (orgOptions?.locations ?? []).map((l) => l.name);
  const jobLevelOptions = (orgOptions?.job_levels ?? []).map((j) => j.name);

  // The filter dropdowns offer the org-wide distinct values the server sends in
  // `facets` — not whatever is on the current page, which would shrink the
  // options as you paged. Levels come from the closed list in seniority order
  // (`organization_job_levels.sort_order`), intersected with the ones actually
  // in use, so the dropdown reads Executive-to-Intern rather than alphabetically.
  const depts       = facets?.departments ?? [];
  const locations   = facets?.locations ?? [];
  const jobRoles    = facets?.job_roles ?? [];
  const roleOptions = facets?.roles ?? [];
  const levelsInUse = facets?.job_levels ?? [];
  const levelOptions = jobLevelOptions.filter((l) => levelsInUse.includes(l));

  // The table rows are already filtered and paginated by the server.
  const filtered = pageUsers;

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

      {/* ── Licensed seats ──
          Above the tiles because it is the one figure on this page that can
          STOP the admin: at the cap, "+ Add User" is refused by the API with a
          409. Showing the meter only after they have hit it would make the
          refusal read as a bug. */}
      <SeatUsagePanel state={seatState} onChanged={load} />

      {/* ── KPI tiles ──
          Counts come with the directory rather than from five COUNT queries
          beside it, so they can never disagree with the table below. */}
      {stats && (
        <Box className="mb-4 grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-3 xl:grid-cols-5">
          {[
            { label: "Total users",   value: stats.total,    hint: `${stats.active} active`,                    icon: Users,     tone: "tile-accent"  },
            { label: "Admins",        value: stats.admins,   hint: `${stats.trainers} trainer${stats.trainers === 1 ? "" : "s"}`, icon: ShieldCheck, tone: "tile-accent" },
            { label: "Learners",      value: stats.learners, hint: stats.managers ? `${stats.managers} manager${stats.managers === 1 ? "" : "s"}` : "Across the org", icon: GraduationCap, tone: "tile-success" },
            { label: "Trainers",      value: stats.trainers, hint: "Deliver live sessions",                     icon: Presentation, tone: "tile-warning" },
            { label: "Inactive users",value: stats.inactive, hint: stats.inactive ? "Needs review" : "None",    icon: UserX,     tone: stats.inactive ? "tile-rust" : "tile-accent" },
          ].map((tile) => (
            <Box key={tile.label} className="bg-surface px-3.5 py-3">
              <Box className={`mb-2 flex size-7 items-center justify-center ${tile.tone}`}>
                <tile.icon className="size-[15px]" />
              </Box>
              <Text as="p" className="text-xl font-bold leading-none text-ink">{tile.value}</Text>
              <Text as="p" className="mt-1 text-[10.5px] font-medium text-text-2">{tile.label}</Text>
              <Text as="p" className="mt-0.5 text-[10px] text-text-3">{tile.hint}</Text>
            </Box>
          ))}
        </Box>
      )}

      <Card className="overflow-hidden">

        {/* ── Header ── */}
        <Box className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-6 py-4 border-b">
          <Box>
            <Text as="h2" className="text-base font-bold">All Users</Text>
            <Text as="p" className="text-xs text-muted-foreground mt-0.5">
              {total === 0
                ? "No users match"
                : `Showing ${offset + 1}–${Math.min(offset + PAGE, total)} of ${total}${pageLoading ? " · loading…" : ""}`}
            </Text>
          </Box>
          <Box className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              disabled={seatsFull}
              title={seatsFull ? "All licensed seats are in use — free one or request more above" : undefined}
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
            {/* Disabled at the cap rather than enabled-and-refused: this form
                only ever creates LEARNERS, which is exactly what a seat is, so
                the API's 409 is certain. §10.3.1.2's rule — the title says
                why, and the seat panel above says what to do about it. */}
            <Button
              size="sm"
              disabled={seatsFull}
              title={seatsFull ? "All licensed seats are in use — free one or request more above" : undefined}
              className="h-8 text-xs gap-1.5 bg-navy hover:bg-navy-soft text-paper"
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink/45" />
            <Input
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoComplete="off"
              className="pl-10 h-10 text-sm bg-paper-cream border-border placeholder:text-ink/45 focus-visible:ring-1 focus-visible:ring-navy focus-visible:bg-white transition-colors"
            />
          </Box>
          {/* Filters row */}
          <Box className="flex flex-wrap items-center gap-2">
            <Text as="span" className="text-xs font-medium text-ink/45 mr-1">Filter by:</Text>
            <Select value={filterRole} onValueChange={withFirstPage(setFilterRole)}>
              <SelectTrigger className={`h-8 text-xs w-[150px] bg-paper-cream border-border hover:bg-paper-cream transition-colors ${filterRole === "all" ? "text-ink/45" : "text-ink font-medium"}`}>
                <SelectValue>{filterRole === "all" ? "All Roles" : filterRole}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {roleOptions.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterLevel} onValueChange={withFirstPage(setFilterLevel)}>
              <SelectTrigger className={`h-8 text-xs w-[150px] bg-paper-cream border-border hover:bg-paper-cream transition-colors ${filterLevel === "all" ? "text-ink/45" : "text-ink font-medium"}`}>
                <SelectValue>{filterLevel === "all" ? "All Levels" : filterLevel}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                {levelOptions.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterDept} onValueChange={withFirstPage(setFilterDept)}>
              <SelectTrigger className={`h-8 text-xs w-[150px] bg-paper-cream border-border hover:bg-paper-cream transition-colors ${filterDept === "all" ? "text-ink/45" : "text-ink font-medium"}`}>
                <SelectValue>{filterDept === "all" ? "All Departments" : filterDept}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {depts.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={withFirstPage(setFilterStatus)}>
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
            <Select value={filterProgress} onValueChange={withFirstPage(setFilterProgress)}>
              <SelectTrigger className={`h-8 text-xs w-[140px] bg-paper-cream border-border hover:bg-paper-cream transition-colors ${filterProgress === "all" ? "text-ink/45" : "text-ink font-medium"}`}>
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
            <Select value={filterLocation} onValueChange={withFirstPage(setFilterLocation)}>
              <SelectTrigger className={`h-8 text-xs w-[140px] bg-paper-cream border-border hover:bg-paper-cream transition-colors ${filterLocation === "all" ? "text-ink/45" : "text-ink font-medium"}`}>
                <SelectValue>{filterLocation === "all" ? "All Locations" : filterLocation}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locations.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterJobRole} onValueChange={withFirstPage(setFilterJobRole)}>
              <SelectTrigger className={`h-8 text-xs w-[160px] bg-paper-cream border-border hover:bg-paper-cream transition-colors ${filterJobRole === "all" ? "text-ink/45" : "text-ink font-medium"}`}>
                <SelectValue>{filterJobRole === "all" ? "All Job Roles" : filterJobRole}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Job Roles</SelectItem>
                {jobRoles.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
            {(search || filterRole !== "all" || filterLevel !== "all" || filterDept !== "all" || filterStatus !== "all" || filterProgress !== "all" || filterLocation !== "all" || filterJobRole !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-3 text-xs text-ink/45 hover:text-ink/70 hover:bg-paper-cream"
                onClick={() => {
                  setSearch(""); setFilterRole("all"); setFilterLevel("all");
                  setFilterDept("all"); setFilterStatus("all"); setFilterProgress("all");
                  setFilterLocation("all"); setFilterJobRole("all"); setOffset(0);
                }}
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
              {appliedSearch || filterRole !== "all" || filterLevel !== "all"
                || filterDept !== "all" || filterStatus !== "all" || filterProgress !== "all"
                || filterLocation !== "all" || filterJobRole !== "all"
                ? "No users match your filters."
                : "No learners yet. Add the first user."}
            </Text>
          </Box>
        ) : (
          <Box className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-sm">
              <thead>
                <tr className="border-b bg-muted/20">
                  {["User", "Role", "Department", "Location", "Level", "Status", "Courses", "Completion", "Last Activity", "Actions"].map((h) => (
                    <th key={h} className="text-left text-[11px] font-semibold text-muted-foreground tracking-wide uppercase px-3 py-3 whitespace-nowrap">
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

                      <td className="px-3 py-3">
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

                      {/* The RBAC role LABEL, not `users.role`: the portal
                          selector collapses a Manager into "learner", so this
                          column showed every Manager as a Learner. */}
                      <td className="px-3 py-3">
                        <Badge className={`text-[10px] font-bold tracking-widest uppercase px-2.5 py-0.5 border ${ROLE_BADGE[emp.role_key] ?? ROLE_BADGE.learner}`}>
                          {emp.role_label}
                        </Badge>
                        {/* Somebody with reports but no Manager role has a
                            team recorded that they cannot see — Team Learning
                            is gated on `view_team_learning`. Data nobody can
                            read is the silent half of the screen-that-lies
                            failure, so it is surfaced here where the Change
                            role action that fixes it already lives. */}
                        {emp.reports_count > 0 && emp.role_key !== "manager" && emp.role_key !== "admin" && (
                          <Text
                            as="p"
                            className="mt-1 text-[10px] leading-tight text-warning"
                            title="They have direct reports but no Manager role, so they cannot open Team Learning. Use Change role."
                          >
                            manages {emp.reports_count} · no Manager role
                          </Text>
                        )}
                        {emp.reports_count > 0 && (emp.role_key === "manager" || emp.role_key === "admin") && (
                          <Text as="p" className="mt-1 text-[10px] leading-tight text-text-3">
                            manages {emp.reports_count}
                          </Text>
                        )}
                      </td>

                      <td className="px-3 py-3">
                        <Text as="span" className="text-sm">{emp.department || "—"}</Text>
                      </td>

                      <td className="px-3 py-3 whitespace-nowrap">
                        <Text as="span" className="text-sm">{emp.location || "—"}</Text>
                      </td>

                      <td className="px-3 py-3 whitespace-nowrap">
                        <Text as="span" className="text-sm">{emp.job_level || "—"}</Text>
                      </td>

                      <td className="px-3 py-3">
                        {/* The shared status chips, so "active" looks the
                            same here as everywhere else in the product. */}
                        <Text as="span" className={emp.is_active ? "chip chip-complete" : "chip chip-idle"}>
                          <Box className={cn("size-1.5 shrink-0 rounded-full", emp.is_active ? "bg-success" : "bg-text-3")} />
                          {emp.is_active ? "Active" : "Inactive"}
                        </Text>
                      </td>

                      <td className="px-3 py-3">
                        <Text as="span" className="text-sm font-bold text-navy">{emp.assigned_courses}</Text>
                      </td>

                      <td className="px-3 py-3">
                        {/* Track always full width with the fill inside it, so
                            0% reads as empty rather than as a missing bar.
                            `progressFill` is the one place that decides what
                            colour a progress bar is (lib/brand.js). */}
                        <Box className="flex items-center gap-2 min-w-[120px]">
                          <Box className="h-1.5 w-20 shrink-0 bg-surface-3">
                            <Box
                              className="h-full"
                              style={{ width: `${emp.progress}%`, background: progressFill(emp.progress) }}
                            />
                          </Box>
                          <Text as="span" className="shrink-0 text-xs font-semibold text-text-2">{emp.progress}%</Text>
                        </Box>
                      </td>

                      {/* Last ACTIVITY. This printed `created_at` before, so
                          every row claimed the person had last been active on
                          the day they joined — a date that was always wrong
                          and never looked it. Null means they have done
                          nothing yet, which is worth seeing. */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        {emp.last_activity ? (
                          <Text as="span" className="text-sm">{formatDay(emp.last_activity)}</Text>
                        ) : (
                          <Text as="span" className="text-sm text-text-3">Never</Text>
                        )}
                      </td>

                      {/* Four icon actions. `can_manage` is false for an
                          admin or trainer — `assertMutableLearner` refuses to
                          edit, deactivate or delete one, so those three are
                          DISABLED rather than left enabled to fail with a 403.
                          View stays open for every row. */}
                      <td className="px-3 py-3">
                        <Box className="flex items-center gap-1">
                          <IconAction
                            icon={Eye}
                            label={`View ${emp.first_name} ${emp.last_name}`}
                            onClick={() => setDetailUserId(emp.id)}
                          />
                          <IconAction
                            icon={Pencil}
                            label={emp.can_manage ? "Edit" : `${emp.role_label} accounts are not editable here`}
                            disabled={!emp.can_manage}
                            onClick={() => {
                              setEditUser(emp);
                              setEditForm({ first_name: emp.first_name, last_name: emp.last_name, email: emp.email, department: emp.department || "", location: emp.location || "", job_role: emp.job_role || "", job_level: emp.job_level || "", manager_id: emp.manager_id ? String(emp.manager_id) : "" });
                              setEditError(null);
                            }}
                          />
                          <IconAction
                            icon={Power}
                            label={
                              !emp.can_manage
                                ? `${emp.role_label} accounts cannot be deactivated here`
                                : emp.is_active ? "Deactivate" : "Activate"
                            }
                            disabled={!emp.can_manage}
                            active={!emp.is_active}
                            onClick={() => setConfirmToggle({ id: emp.id, name: `${emp.first_name} ${emp.last_name}`, is_active: emp.is_active })}
                          />
                          {/* Change role is offered on EVERY row, unlike the
                              three beside it. `assertMutableLearner` refuses
                              to edit, deactivate or delete a non-learner, but
                              `RolesService.assign` has no such rule — moving
                              a trainer back to learner is exactly the thing an
                              admin needs and the only route out of a wrong
                              choice. Absent entirely when the roles fetch
                              failed, rather than opening an empty dialog. */}
                          {orgRoles && orgRoles.length > 0 && (
                            <IconAction
                              icon={ShieldCheck}
                              label={`Change role — currently ${emp.role_label}`}
                              onClick={() => {
                                setRoleTarget(emp);
                                setRoleChoice(emp.role_id ? String(emp.role_id) : "");
                                setRoleError(null);
                              }}
                            />
                          )}
                          <IconAction
                            icon={Trash2}
                            label={emp.can_manage ? "Delete" : `${emp.role_label} accounts cannot be deleted here`}
                            disabled={!emp.can_manage}
                            danger
                            onClick={() => setConfirmDelete({ id: emp.id, name: `${emp.first_name} ${emp.last_name}` })}
                          />
                        </Box>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Box>
        )}

        {/* ── Pagination ──
            Server-side offset paging (§7.6). Shown only when there is a second
            page to reach; Previous/Next move one page and the range line says
            which rows these are out of the whole matched set. */}
        {total > PAGE && (
          <Box className="px-6 py-3 border-t flex items-center justify-between">
            <Text as="p" className="text-xs text-text-3">
              {offset + 1}–{Math.min(offset + PAGE, total)} of {total}
            </Text>
            <Box className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1 text-xs"
                disabled={offset === 0 || pageLoading}
                onClick={() => setOffset(Math.max(offset - PAGE, 0))}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1 text-xs"
                disabled={!hasMore || pageLoading}
                onClick={() => setOffset(offset + PAGE)}
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </Box>
          </Box>
        )}
      </Card>

      {/* ── Change role ── */}
      <Dialog open={!!roleTarget} onOpenChange={(o) => { if (!o) setRoleTarget(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change role</DialogTitle>
          </DialogHeader>
          {roleTarget && (() => {
            const next = (orgRoles ?? []).find((r) => String(r.id) === String(roleChoice)) ?? null;
            const wasLearner = roleTarget.role === "learner";
            const becomesLearner = next?.portal === "learner";
            const movesPortal = next && next.portal !== roleTarget.role;
            /* The API refuses to leave an organization with no admin, and a
               refusal that certain belongs on the button rather than after
               Save (§10.3.1.2). Counted from the rows already on screen so it
               cannot disagree with the table — and if the count is ever wrong
               the API still refuses, so this only ever errs toward caution. */
            const activeAdmins = (people ?? []).filter((e) => e.role === "admin" && e.is_active).length;
            const strandsOrg =
              roleTarget.role === "admin" && next && next.portal !== "admin" && activeAdmins <= 1;
            return (
              <Box className="space-y-4">
                <Text as="p" className="text-sm text-muted-foreground">
                  {roleTarget.first_name} {roleTarget.last_name} is currently{" "}
                  <Text as="span" className="font-semibold text-foreground">{roleTarget.role_label}</Text>.
                </Text>

                <Box className="space-y-1.5">
                  <Label>New role</Label>
                  <Select value={roleChoice} onValueChange={setRoleChoice}>
                    <SelectTrigger className="w-full text-sm">
                      <SelectValue>
                        {next ? `${next.label} — ${PORTAL_WORD[next.portal] ?? next.portal}` : "Pick a role"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {(orgRoles ?? []).map((r) => (
                        <SelectItem key={r.id} value={String(r.id)}>
                          {r.label} — {PORTAL_WORD[r.portal] ?? r.portal}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Box>

                {/* Every consequence the API will apply, said before Save —
                    the portal move, the seat, and the forced sign-out. An
                    admin who does not know a role change signs somebody out
                    cannot consent to it. */}
                {movesPortal && (
                  <Box className="space-y-1 border border-line bg-surface-2 px-3 py-2.5">
                    <Text as="p" className="text-[11.5px] text-foreground">
                      They move to the <Text as="span" className="font-semibold">{PORTAL_WORD[next.portal]}</Text>{" "}
                      and will be signed out once.
                    </Text>
                    {becomesLearner && !wasLearner && (
                      <Text as="p" className="text-[11.5px] text-muted-foreground">
                        A learner uses a licensed seat. If none is free this will be refused.
                      </Text>
                    )}
                    {wasLearner && !becomesLearner && (
                      <Text as="p" className="text-[11.5px] text-muted-foreground">
                        This frees a licensed seat — only active learners count.
                      </Text>
                    )}
                    {next.portal === "trainer" && (
                      <Text as="p" className="text-[11.5px] text-muted-foreground">
                        They can then be picked as the trainer on a session.
                      </Text>
                    )}
                  </Box>
                )}

                {strandsOrg && (
                  <Text as="p" className="text-[11.5px] text-error">
                    This is the only active admin. Give somebody else an admin
                    role first — an organization with no admin cannot be signed
                    into or managed.
                  </Text>
                )}

                {roleError && <Text as="p" className="text-sm text-error">{roleError}</Text>}

                <DialogFooter>
                  <Button variant="outline" onClick={() => setRoleTarget(null)} disabled={roleSaving}>Cancel</Button>
                  <Button
                    onClick={handleAssignRole}
                    disabled={roleSaving || !roleChoice || strandsOrg || String(roleChoice) === String(roleTarget.role_id)}
                    title={strandsOrg ? "The organization would be left with no admin" : undefined}
                    className="bg-navy hover:bg-navy-soft text-paper"
                  >
                    {roleSaving ? "Saving…" : "Change role"}
                  </Button>
                </DialogFooter>
              </Box>
            );
          })()}
        </DialogContent>
      </Dialog>

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
              className="bg-error hover:bg-error text-white"
            >
              {actioning ? "Deleting…" : "Delete User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── User Detail Modal ── */}
      <UserDetailModal
        userId={detailUserId}
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
                  <AvatarFallback className="bg-paper-cream text-navy text-sm font-bold">
                    {`${(editUser.first_name || "")[0]}${(editUser.last_name || "")[0]}`.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <Box className="flex-1 min-w-0">
                  <Text as="p" className="text-sm font-semibold leading-tight">{editUser.first_name} {editUser.last_name}</Text>
                  <Text as="span" className="text-xs text-muted-foreground">{editUser.email}</Text>
                </Box>
                <Badge variant="secondary" className={`text-xs shrink-0 ${editUser.is_active ? "bg-paper-cream text-navy" : "bg-paper-cream text-ink/60"}`}>
                  {editUser.is_active ? "Active" : "Inactive"}
                </Badge>
              </Box>
              <Box className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Box className="space-y-1.5">
                  <Label>First Name <Text as="span" className="text-error">*</Text></Label>
                  <Input value={editForm.first_name} onChange={(e) => setEditForm((p) => ({ ...p, first_name: e.target.value }))} />
                </Box>
                <Box className="space-y-1.5">
                  <Label>Last Name <Text as="span" className="text-error">*</Text></Label>
                  <Input value={editForm.last_name} onChange={(e) => setEditForm((p) => ({ ...p, last_name: e.target.value }))} />
                </Box>
              </Box>
              <Box className="space-y-1.5">
                <Label>Email <Text as="span" className="text-error">*</Text></Label>
                <Input type="email" value={editForm.email} onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))} />
              </Box>
              {/* Location and Job level are SELECTS, not free text. Both are
                  Reports filter and comparison dimensions, and a dimension is
                  only useful if its values repeat across people — typing
                  produced two spellings of one office and left three learners
                  matching no filter value at all. Job role stays free text: it
                  is a job title, not a reporting axis (TASTE §10.3.1.1). */}
              <Box className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Box className="space-y-1.5">
                  <Label>Department</Label>
                  <Select value={editForm.department} onValueChange={(v) => setEditForm((p) => ({ ...p, department: v }))}>
                    <SelectTrigger className="w-full text-sm"><SelectValue placeholder="Select department" /></SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Box>
                <Box className="space-y-1.5">
                  <Label>Location</Label>
                  <Select value={editForm.location} onValueChange={(v) => setEditForm((p) => ({ ...p, location: v }))}>
                    <SelectTrigger className="w-full text-sm"><SelectValue placeholder="Select location" /></SelectTrigger>
                    <SelectContent>
                      {locationOptions.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Box>
                <Box className="space-y-1.5">
                  <Label>Job Role</Label>
                  <Input placeholder="e.g. Software Engineer" value={editForm.job_role} onChange={(e) => setEditForm((p) => ({ ...p, job_role: e.target.value }))} />
                </Box>
                <Box className="space-y-1.5">
                  <Label>Job Level</Label>
                  <Select value={editForm.job_level} onValueChange={(v) => setEditForm((p) => ({ ...p, job_level: v }))}>
                    <SelectTrigger className="w-full text-sm"><SelectValue placeholder="Select level" /></SelectTrigger>
                    <SelectContent>
                      {jobLevelOptions.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Box>
                {/* Everyone except this person — you cannot report to
                    yourself, and offering the option would be a choice the
                    API always refuses. */}
                <ManagerField
                  value={editForm.manager_id}
                  onChange={(v) => setEditForm((p) => ({ ...p, manager_id: v }))}
                  people={people}
                  excludeId={editUser?.id}
                />
              </Box>
              {editError && (
                <Box className="flex items-center gap-2 text-error text-sm">
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
              className="bg-navy hover:bg-navy-soft text-paper"
            >
              {editSaving ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add User Dialog ──────────────────────────────────────────
          Nine fields over three questions — who they are, where they sit,
          what they can reach. It was `sm:max-w-md` (448px), which forced a
          two-column grid into one column and stacked all nine as an
          undifferentiated list; the four-item grid in the middle also
          paired Location with Job role and Job level with Manager, which
          is not how anybody reads them. */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Add {selectedRole?.label ?? "a learner"}</DialogTitle>
            <DialogDescription>
              They can sign in as soon as you save. You will need to pass on
              the password yourself — this product sends no email.
            </DialogDescription>
          </DialogHeader>

          <Box className="space-y-5 py-1">
            <FormSection title="Who they are">
              <Box className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field id="nu-first" label="First name" required>
                  <Input id="nu-first" autoFocus placeholder="Alice" value={form.first_name}
                    onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))} />
                </Field>
                <Field id="nu-last" label="Last name" required>
                  <Input id="nu-last" placeholder="Johnson" value={form.last_name}
                    onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))} />
                </Field>
              </Box>
              <Field
                id="nu-email" label="Email" required
                hint="This is how they sign in. It cannot be changed afterwards."
                /* Shown only once there is something to be wrong about —
                   an error under an untouched field reads as the form
                   complaining before you have started. */
                error={form.email.trim() && !EMAIL_RE.test(form.email.trim())
                  ? "That does not look like an email address."
                  : null}
              >
                <Input id="nu-email" type="email" autoComplete="off" placeholder="alice@company.com"
                  value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
              </Field>
            </FormSection>

            <FormSection title="Where they sit" hint="All optional — these are the axes your reports group by.">
              <Box className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field id="nu-dept" label="Department">
                  <Select value={form.department} onValueChange={(v) => setForm((p) => ({ ...p, department: v }))}>
                    <SelectTrigger id="nu-dept" className="w-full text-sm"><SelectValue placeholder="Select department" /></SelectTrigger>
                    <SelectContent>{DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field id="nu-loc" label="Location">
                  <Select value={form.location} onValueChange={(v) => setForm((p) => ({ ...p, location: v }))}>
                    <SelectTrigger id="nu-loc" className="w-full text-sm"><SelectValue placeholder="Select location" /></SelectTrigger>
                    <SelectContent>{locationOptions.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                {/* Job role and job level belong NEXT to each other — they
                    are one question asked twice, and the old grid split
                    them across two rows. */}
                <Field id="nu-role" label="Job role" hint="Free text — a title, not a reporting axis.">
                  <Input id="nu-role" placeholder="e.g. Software Engineer" value={form.job_role}
                    onChange={(e) => setForm((p) => ({ ...p, job_role: e.target.value }))} />
                </Field>
                <Field id="nu-level" label="Job level">
                  <Select value={form.job_level} onValueChange={(v) => setForm((p) => ({ ...p, job_level: v }))}>
                    <SelectTrigger id="nu-level" className="w-full text-sm"><SelectValue placeholder="Select level" /></SelectTrigger>
                    <SelectContent>{jobLevelOptions.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
              </Box>
              {/* Full width: it is a grant of visibility over somebody's
                  record, not a label beside their city (§10.3.1.15). */}
              <ManagerField
                value={form.manager_id}
                onChange={(v) => setForm((p) => ({ ...p, manager_id: v }))}
                people={people}
              />
            </FormSection>

            <FormSection title="Access">
              <Box className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field
                  id="nu-pass" label="Temporary password" required
                  hint="You have to read this out to them, so it is shown rather than masked."
                  error={form.password && form.password.length < 6
                    ? "At least 6 characters."
                    : null}
                >
                  <Box className="relative">
                    <Input
                      id="nu-pass"
                      /* NOT masked by default, for the reason the tenant
                         form already records (§10.3.1.11): hiding a value
                         its author must transcribe helps nobody. The toggle
                         is there for anyone not alone at their desk. */
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Minimum 6 characters"
                      className="pr-9"
                      value={form.password}
                      onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      title={showPassword ? "Hide password" : "Show password"}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer p-1 text-text-3 hover:text-ink"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </Box>
                </Field>

                {orgRoles && orgRoles.length > 0 && (
                  <Field
                    id="nu-rolesel" label="Role"
                    hint={createCostsSeat
                      ? "Learners use a licensed seat."
                      : `${selectedRole?.label ?? "This role"} does not use a seat — only active learners count.`}
                  >
                    <Select
                      value={form.role_id ? String(form.role_id) : "default"}
                      onValueChange={(v) => setForm((p) => ({ ...p, role_id: v === "default" ? "" : v }))}
                    >
                      <SelectTrigger id="nu-rolesel" className="w-full text-sm">
                        <SelectValue>
                          {selectedRole ? `${selectedRole.label} — ${PORTAL_WORD[selectedRole.portal] ?? selectedRole.portal}` : "Learner (default)"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Learner (default)</SelectItem>
                        {orgRoles.map((r) => (
                          <SelectItem key={r.id} value={String(r.id)}>
                            {r.label} — {PORTAL_WORD[r.portal] ?? r.portal}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              </Box>
            </FormSection>

            {formError && (
              <Box className="border border-danger/30 bg-danger/[0.06] px-3 py-2">
                <Text as="p" className="text-sm text-danger">{formError}</Text>
              </Box>
            )}
          </Box>

          <DialogFooter className="flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end">
            {/* SAVE SAYS WHY IT IS OFF. The validation already existed and
                only fired on click, so an admin pressed a live-looking
                button and got a sentence back; now the button names what
                is still missing before they reach for it. */}
            {createBlockedReason && (
              <Text as="p" className="mr-auto text-[11.5px] text-text-3">{createBlockedReason}</Text>
            )}
            <Button variant="outline" className="cursor-pointer" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleCreate}
              disabled={saving || blockedBySeats || Boolean(createBlockedReason)}
              title={blockedBySeats
                ? "All licensed seats are in use. A trainer or admin role does not use a seat."
                : createBlockedReason || undefined}
              className="cursor-pointer bg-navy text-paper hover:bg-navy-soft"
            >
              {saving ? "Creating…" : `Add ${selectedRole?.label ?? "Learner"}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Bulk Upload Dialog ── */}
      <Dialog open={bulkOpen} onOpenChange={(o) => { if (!o) closeBulk(); }}>
        {/*
          Wider than the 2xl it was, because the preview now carries nine
          columns and Manager is the ninth. A column the admin has to scroll
          sideways to find is one they will not check, which would waste the
          whole point of resolving the address to a name.
        */}
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Bulk Upload Learners</DialogTitle>
          </DialogHeader>

          {bulkResult ? (
            /* Results screen */
            <Box className="space-y-4 py-2">
              <Box className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Box className="rounded-xl bg-paper-cream border border-navy/20 p-4 text-center">
                  <Text as="p" className="text-2xl font-bold text-navy">{bulkResult.created}</Text>
                  <Text as="p" className="text-xs text-muted-foreground mt-0.5">Users Created</Text>
                </Box>
                <Box className="rounded-xl bg-error/10 border border-error/30 p-4 text-center">
                  <Text as="p" className="text-2xl font-bold text-error">{bulkResult.failed?.length ?? 0}</Text>
                  <Text as="p" className="text-xs text-muted-foreground mt-0.5">Failed</Text>
                </Box>
                <Box className="rounded-xl bg-muted border p-4 text-center">
                  <Text as="p" className="text-2xl font-bold">{bulkResult.total}</Text>
                  <Text as="p" className="text-xs text-muted-foreground mt-0.5">Total Rows</Text>
                </Box>
              </Box>
              {/*
                Reported, not assumed. The whole reason this exists is that
                the previous answer to "were they emailed?" was silence —
                so the number comes from the server's own count of rows it
                queued, never from the row count the admin uploaded.
              */}
              {bulkResult.created > 0 && (
                <Box className={cn("flex items-start gap-2 rounded-xl border px-4 py-3 text-xs",
                  !bulkResult.welcome_emails_requested
                    ? "border-border bg-muted/40 text-text-2"
                    : bulkResult.welcome_emails_queued > 0
                      ? "border-success/30 bg-success/10 text-success"
                      : "border-warning/30 bg-warning/10 text-warning")}>
                  <Mail className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <Text as="span">
                    {!bulkResult.welcome_emails_requested
                      ? "No welcome emails were sent — you left that unticked. These learners hold the default password and have not been told it."
                      : bulkResult.welcome_emails_queued > 0
                        ? `${bulkResult.welcome_emails_queued} welcome email${bulkResult.welcome_emails_queued === 1 ? "" : "s"} queued. They go out over the next few minutes — track them on Email Delivery.`
                        : "No welcome emails were queued, although they were asked for. Check Email Delivery for the reason."}
                  </Text>
                </Box>
              )}

              {bulkResult.failed?.length > 0 && (
                <Box className="rounded-xl border overflow-hidden">
                  <Box className="px-4 py-2.5 bg-error/10 border-b">
                    <Text as="p" className="text-xs font-semibold text-error uppercase tracking-wide">Failed Rows</Text>
                  </Box>
                  <Box className="max-h-48 overflow-auto">
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
                            <td className="px-4 py-2 text-error">{f.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Box>
                </Box>
              )}
              <DialogFooter>
                <Button onClick={closeBulk} className="bg-navy hover:bg-navy-soft text-paper">Done</Button>
              </DialogFooter>
            </Box>
          ) : (
            /* Upload flow */
            /*
              `min-w-0`: DialogContent lays its children out as a grid, and a
              grid item's min-width is `auto` — so the preview table's
              intrinsic width stretched this past the dialog and everything
              beyond the edge was CLIPPED, including the warning's own words.
              The `overflow-x-auto` below can only scroll what it is allowed
              to be narrower than.
            */
            <Box className="space-y-5 py-2 min-w-0">

              {/* Step 1 — Download template */}
              <Box className="rounded-xl border p-4 space-y-3">
                <Box className="flex items-center gap-2">
                  <Box className="w-6 h-6 rounded-full bg-paper-cream text-navy flex items-center justify-center text-xs font-bold shrink-0">1</Box>
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
                  <Box className="w-6 h-6 rounded-full bg-paper-cream text-navy flex items-center justify-center text-xs font-bold shrink-0">2</Box>
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
                  <Box className="pl-8 flex items-center gap-2 text-error text-xs">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    {parseError}
                  </Box>
                )}
              </Box>

              {/* Preview table */}
              {bulkRows && bulkRows.length > 0 && (
                <Box className="rounded-xl border overflow-hidden min-w-0">
                  <Box className="px-4 py-2.5 bg-muted/40 border-b">
                    <Text as="p" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Preview — {bulkRows.length} row{bulkRows.length !== 1 ? "s" : ""}
                    </Text>
                  </Box>
                  <Box className="overflow-x-auto max-h-52 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/20 sticky top-0">
                        <tr>
                          {["Employee ID", "First Name", "Last Name", "Email", "Department", "Location", "Job Role", "Job Level", "Manager", "Password"].map((h) => (
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
                            <td className="px-3 py-2">{r.job_level || "—"}</td>
                            {/*
                              The file said an email; this says a NAME. That
                              swap is the whole point of the column — an
                              address is what an admin can type unambiguously
                              and a name is what they can actually verify.
                            */}
                            <td className={cn(
                              "px-3 py-2 whitespace-nowrap",
                              (managerCells[idx]?.state === "unknown"
                                || managerCells[idx]?.state === "self") && "text-error",
                              managerCells[idx]?.state === "none" && "text-muted-foreground",
                            )}>
                              {managerCells[idx]?.label ?? "—"}
                              {managerCells[idx]?.state === "pending" && (
                                <Text as="span" className="ml-1.5 text-[10.5px] text-text-3">· new in this file</Text>
                              )}
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">{r.password ? "••••••" : "(default)"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Box>
                </Box>
              )}

              {/*
                The one outward-facing consequence of pressing Upload, so
                it sits immediately above the button rather than in step 1.
                It names the COUNT, because "email everyone" and "email
                these 312 people" are read differently — and 312 messages
                to strangers is the accident this file has already caused
                once.
              */}
              {bulkRows && bulkRows.length > 0 && (
                <Box className="flex items-start gap-3 rounded-xl border p-4">
                  <Checkbox
                    id="bulk-welcome"
                    checked={bulkWelcome}
                    onCheckedChange={(v) => setBulkWelcome(v === true)}
                    className="mt-0.5"
                  />
                  <Box className="space-y-1">
                    <Label htmlFor="bulk-welcome" className="cursor-pointer text-sm font-medium">
                      Email {bulkRows.length} {bulkRows.length === 1 ? "person" : "people"} their sign-in link
                    </Label>
                    <Text as="p" className="text-[11px] text-text-3 leading-relaxed">
                      {bulkWelcome
                        ? "Each learner gets their own one-time link to set a password. It lasts 7 days, and the mail goes out over the next few minutes rather than all at once."
                        : "Accounts are created but nobody is told. They will hold the default password with no way to learn it — you will need to send the details yourself, or resend from Email Delivery later."}
                    </Text>
                  </Box>
                </Box>
              )}

              {/*
                Stated before the button, not after the upload. These rows
                WILL fail on the server with the same reason; saying so here
                turns a second upload into a correction.
              */}
              {badManagers > 0 && (
                <Box className="flex items-start gap-2 rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-xs text-error">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <Text as="span">
                    {badManagers} row{badManagers !== 1 ? "s" : ""} will fail on the Manager column —
                    the address is not an active user here, or it is the learner&apos;s own. Fix the
                    address, add the manager first, or clear the column.
                  </Text>
                </Box>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={closeBulk} disabled={bulkUploading}>Cancel</Button>
                <Button
                  onClick={handleBulkUpload}
                  disabled={!bulkRows?.length || bulkUploading}
                  className="bg-navy hover:bg-navy-soft text-paper"
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
