"use client";

import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Upload, Trash2, Users, Play, FileArchive,
  CheckCircle2, Clock, AlertCircle, Package, BookOpen, History,
} from "lucide-react";
import { ScormAttemptsDialog } from "@/components/admin/scorm-attempts-dialog";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api-client";
import { uploadScormPackage, scormSizeError } from "@/services/api/admin/admin-api";

const VERSION_CFG = {
  "1.2":  { label: "SCORM 1.2", cls: "bg-paper-cream text-navy border-0"   },
  "2004": { label: "SCORM 2004", cls: "bg-paper-cream text-navy border-0" },
};

const STATUS_CFG = {
  "not attempted": { label: "Not Started",  cls: "bg-paper-warm text-ink/60 border-border"    },
  incomplete:      { label: "In Progress",  cls: "bg-navy text-paper border-navy"    },
  completed:       { label: "Completed",    cls: "bg-navy text-paper border-navy" },
  passed:          { label: "Passed",       cls: "bg-navy text-paper border-navy" },
  failed:          { label: "Failed",       cls: "bg-error/10 text-error border-error/30"      },
  unknown:         { label: "Unknown",      cls: "bg-paper-warm text-ink/60 border-border"    },
};

function StatCard({ icon: Icon, iconBg, value, label }) {
  return (
    <Card className="p-4 flex items-center gap-3">
      <Box className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", iconBg)}>
        <Icon className="h-5 w-5" />
      </Box>
      <Box>
        <Text as="p" className="text-xl font-bold leading-none">{value}</Text>
        <Text as="p" className="text-xs text-muted-foreground mt-0.5">{label}</Text>
      </Box>
    </Card>
  );
}

export function AdminScormContent() {
  const { user } = useAuth();
  const fileRef = useRef(null);

  const [packages,    setPackages]    = useState(null);
  const [courses,     setCourses]     = useState([]);
  const [learners,    setLearners]    = useState([]);

  /* Upload dialog */
  const [uploadOpen,   setUploadOpen]   = useState(false);
  const [uploadFile,   setUploadFile]   = useState(null);
  const [uploadTitle,  setUploadTitle]  = useState("");
  const [uploadCourse, setUploadCourse] = useState("none");
  const [uploading,    setUploading]    = useState(false);
  const [uploadError,  setUploadError]  = useState("");

  /* Assign dialog */
  const [assignPkg,   setAssignPkg]   = useState(null);
  /** The assignment row whose attempt history is open, or null. */
  const [attemptsFor, setAttemptsFor] = useState(null);
  const [assignDept,  setAssignDept]  = useState("all");
  const [assignIds,   setAssignIds]   = useState([]);
  const [assigning,   setAssigning]   = useState(false);
  const [assigned,    setAssigned]    = useState(null); // { assignments }

  /* Delete dialog */
  const [deletePkg, setDeletePkg] = useState(null);
  const [deleting,  setDeleting]  = useState(false);

  /* Learner filter for assign */
  const [learnerSearch, setLearnerSearch] = useState("");

  useEffect(() => {
    if (!user) return;
    apiClient("/api/admin/scorm").then((d) => setPackages(d.packages || [])).catch(() => setPackages([]));
    // A session training holds one session lesson and the API refuses new
    // ones, so SCORM cannot be attached to it.
    apiClient("/api/admin/courses").then((d) => setCourses((d.courses || []).filter(c => c.is_active && !c.session_id)));
  }, [user]);

  const loadAssignees = async (pkgId) => {
    const d = await apiClient(`/api/admin/scorm/${pkgId}`);
    setAssigned(d.assignments || []);
    const all = await apiClient("/api/admin/users");
    setLearners(all.users || []);
  };

  /* ── Upload ── */
  const handleUpload = async () => {
    if (!uploadFile) return;
    const tooBig = scormSizeError(uploadFile);
    if (tooBig) {
      setUploadError(tooBig);
      return;
    }
    // Percent, not a bare spinner — a package runs to hundreds of megabytes,
    // and a still spinner cannot be told apart from a stalled request.
    setUploading({ percent: 0, extracting: false });
    setUploadError("");
    try {
      const data = await uploadScormPackage({
        file: uploadFile,
        title: uploadTitle.trim() || undefined,
        courseId: uploadCourse !== "none" ? uploadCourse : undefined,
        onProgress: (percent) =>
          setUploading({ percent, extracting: percent >= 100 }),
      });

      setPackages((prev) => [data.package, ...(prev || [])]);
      setUploadOpen(false);
      setUploadFile(null);
      setUploadTitle("");
      setUploadCourse("none");
    } catch (e) {
      setUploadError(e.message);
    } finally {
      setUploading(false);
    }
  };

  /* ── Assign ── */
  const openAssign = async (pkg) => {
    setAssignPkg(pkg);
    setAssignDept("all");
    setAssignIds([]);
    setLearnerSearch("");
    await loadAssignees(pkg.id);
  };

  const handleAssign = async () => {
    if (!assignPkg) return;
    setAssigning(true);
    try {
      await apiClient(`/api/admin/scorm/${assignPkg.id}/assign`, {
        method: "POST",
        body: { user_ids: assignIds, department: assignDept === "all" ? "" : assignDept },
      });
      await loadAssignees(assignPkg.id);
      setAssignIds([]);
      // Refresh package count
      setPackages((prev) =>
        prev.map((p) =>
          p.id === assignPkg.id ? { ...p, assigned_count: (p.assigned_count ?? 0) + assignIds.length } : p
        )
      );
    } finally {
      setAssigning(false);
    }
  };

  const handleUnassign = async (userId) => {
    await apiClient(`/api/admin/scorm/${assignPkg.id}/assign`, {
      method: "DELETE",
      body: { user_id: userId },
    });
    setAssigned((prev) => prev.filter((a) => a.user_id !== userId));
  };

  /* ── Delete ── */
  const handleDelete = async () => {
    if (!deletePkg) return;
    setDeleting(true);
    try {
      await apiClient(`/api/admin/scorm/${deletePkg.id}`, { method: "DELETE" });
      setPackages((prev) => prev.filter((p) => p.id !== deletePkg.id));
      setDeletePkg(null);
    } finally {
      setDeleting(false);
    }
  };

  /* ── Derived ── */
  const departments = [...new Set((learners || []).map((l) => l.department).filter(Boolean))];
  const filteredLearners = (learners || [])
    .filter((l) => assignDept === "all" || l.department === assignDept)
    .filter((l) => {
      const s = learnerSearch.toLowerCase();
      return !s || `${l.first_name} ${l.last_name} ${l.email}`.toLowerCase().includes(s);
    });
  const assignedIds = new Set((assigned || []).map((a) => a.user_id));

  if (!packages) {
    return (
      <Box className="space-y-4">
        {[1,2,3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </Box>
    );
  }

  const totalAssigned  = packages.reduce((s, p) => s + (p.assigned_count ?? 0), 0);
  const totalCompleted = packages.reduce((s, p) => s + (p.completed_count ?? 0), 0);

  return (
    <Box className="space-y-5">

      {/* ── Stats ── */}
      <Box className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={Package}      iconBg="bg-paper-cream text-navy"  value={packages.length} label="Packages"         />
        <StatCard icon={Users}        iconBg="bg-paper-cream text-navy"      value={totalAssigned}   label="Learners Assigned" />
        <StatCard icon={CheckCircle2} iconBg="bg-paper-cream text-navy" value={totalCompleted} label="Completions"       />
        <StatCard icon={Clock}        iconBg="bg-paper-cream text-ink/70"    value={packages.filter(p => p.is_active).length} label="Active Packages" />
      </Box>

      {/* ── Header ── */}
      <Box className="flex items-center justify-between gap-3">
        <Text as="h2" className="text-base font-bold">SCORM Packages</Text>
        <Button size="sm" className="gap-1.5 h-9" onClick={() => setUploadOpen(true)}>
          <Upload className="h-4 w-4" />Upload SCORM Package
        </Button>
      </Box>

      {/* ── Empty ── */}
      {packages.length === 0 && (
        <Card className="flex flex-col items-center justify-center py-20 gap-4">
          <Box className="w-14 h-14 rounded-2xl bg-paper-cream flex items-center justify-center">
            <FileArchive className="h-7 w-7 text-navy/70" />
          </Box>
          <Box className="text-center">
            <Text as="h3" className="text-sm font-semibold">No SCORM packages yet</Text>
            <Text as="p" className="text-xs text-muted-foreground mt-1">Upload a .zip SCORM package to get started.</Text>
          </Box>
          <Button size="sm" onClick={() => setUploadOpen(true)} className="gap-1.5">
            <Upload className="h-4 w-4" />Upload your first package
          </Button>
        </Card>
      )}

      {/* ── Package list ── */}
      <Box className="space-y-3">
        {packages.map((pkg) => {
          const vCfg = VERSION_CFG[pkg.version] || VERSION_CFG["1.2"];
          const pct  = pkg.assigned_count > 0
            ? Math.round((pkg.completed_count / pkg.assigned_count) * 100)
            : 0;

          return (
            <Card key={pkg.id} className="p-4">
              <Box className="flex items-start justify-between gap-4 flex-wrap">
                <Box className="flex-1 min-w-0 space-y-1.5">
                  <Box className="flex items-center gap-2 flex-wrap">
                    <Badge className={`text-[11px] font-medium ${vCfg.cls}`}>{vCfg.label}</Badge>
                    {pkg.course_name && (
                      <Badge className="text-[11px] border-0 bg-paper-cream text-navy gap-1">
                        <BookOpen className="h-3 w-3" />{pkg.course_name}
                      </Badge>
                    )}
                    {!pkg.is_active && (
                      <Badge className="text-[11px] border-0 bg-paper-cream text-ink/60">Inactive</Badge>
                    )}
                  </Box>
                  <Text as="h3" className="text-[15px] font-bold">{pkg.title}</Text>
                  <Text as="p" className="text-xs text-muted-foreground truncate">
                    Entry: {pkg.entry_point}
                  </Text>
                  <Box className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                    <Box className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {pkg.assigned_count ?? 0} learners assigned
                    </Box>
                    <Box className="flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {pkg.completed_count ?? 0} completed
                    </Box>
                    {pkg.assigned_count > 0 && (
                      <Box className="flex items-center gap-1.5">
                        <Box className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                          <Box
                            className="h-full rounded-full bg-navy"
                            style={{ width: `${pct}%` }}
                          />
                        </Box>
                        <Text as="span" className="font-semibold">{pct}%</Text>
                      </Box>
                    )}
                  </Box>
                </Box>

                {/* Actions */}
                <Box className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline" size="sm" className="h-8 gap-1.5 text-xs"
                    onClick={() => openAssign(pkg)}
                  >
                    <Users className="h-3.5 w-3.5" />Assign
                  </Button>
                  <Button
                    variant="ghost" size="icon" className="h-8 w-8 text-error hover:text-error hover:bg-error/10"
                    onClick={() => setDeletePkg(pkg)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </Box>
              </Box>
            </Card>
          );
        })}
      </Box>

      {/* ── Upload Dialog ── */}
      <Dialog open={uploadOpen} onOpenChange={(o) => { if (!uploading) setUploadOpen(o); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload SCORM Package</DialogTitle>
          </DialogHeader>
          <Box className="space-y-4 py-2">

            {/* Drop zone */}
            <Box
              className={cn(
                "border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-3 cursor-pointer transition-colors",
                uploadFile ? "border-navy/20 bg-paper-cream" : "border-muted hover:border-navy/20"
              )}
              onClick={() => fileRef.current?.click()}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".zip"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) { setUploadFile(f); setUploadTitle(""); }
                }}
              />
              {uploadFile ? (
                <>
                  <FileArchive className="h-8 w-8 text-navy" />
                  <Box className="text-center">
                    <Text as="p" className="text-sm font-semibold text-navy">{uploadFile.name}</Text>
                    <Text as="p" className="text-xs text-muted-foreground mt-0.5">
                      {(uploadFile.size / 1024 / 1024).toFixed(1)} MB · Click to change
                    </Text>
                  </Box>
                </>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-muted-foreground/40" />
                  <Box className="text-center">
                    <Text as="p" className="text-sm font-medium">Click to browse or drag & drop</Text>
                    <Text as="p" className="text-xs text-muted-foreground mt-0.5">.zip SCORM packages only</Text>
                  </Box>
                </>
              )}
            </Box>

            {/* Title override */}
            <Box className="space-y-1.5">
              <Label htmlFor="upload-title">Package Title <Text as="span" className="text-muted-foreground">(optional — auto-detected from manifest)</Text></Label>
              <Input
                id="upload-title"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder="Leave blank to use title from imsmanifest.xml"
              />
            </Box>

            {/* Link to course */}
            <Box className="space-y-1.5">
              <Label>Link to Course <Text as="span" className="text-muted-foreground">(optional)</Text></Label>
              <Select value={uploadCourse} onValueChange={setUploadCourse}>
                <SelectTrigger><SelectValue placeholder="Select a course" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Box>

            {uploadError && (
              <Box className="flex items-start gap-2 rounded-lg bg-error/10 border border-error/30 px-3 py-2.5">
                <AlertCircle className="h-4 w-4 text-error mt-0.5 shrink-0" />
                <Text as="p" className="text-sm text-error">{uploadError}</Text>
              </Box>
            )}
          </Box>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)} disabled={uploading}>Cancel</Button>
            <Button onClick={handleUpload} disabled={!uploadFile || uploading} className="gap-1.5">
              {uploading ? (
                <>
                  <Box className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  {uploading.extracting ? "Extracting…" : `Uploading… ${uploading.percent}%`}
                </>
              ) : (
                <><Upload className="h-4 w-4" />Upload & Process</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Assign Dialog ── */}
      <Dialog open={!!assignPkg} onOpenChange={(o) => { if (!o) setAssignPkg(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Assign — {assignPkg?.title}</DialogTitle>
          </DialogHeader>
          <Box className="flex-1 overflow-y-auto space-y-4 pr-1">

            {/* Assigned learners */}
            {assigned && assigned.length > 0 && (
              <Box className="space-y-2">
                <Text as="p" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Currently Assigned ({assigned.length})
                </Text>
                <Box className="space-y-1.5">
                  {assigned.map((a) => {
                    const sc  = STATUS_CFG[a.lesson_status ?? a.completion_status ?? "not attempted"];
                    return (
                      <Box key={a.user_id} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
                        <Box className="min-w-0">
                          <Text as="p" className="text-sm font-medium truncate">{a.first_name} {a.last_name}</Text>
                          <Text as="p" className="text-xs text-muted-foreground">{a.department}</Text>
                        </Box>
                        <Box className="flex items-center gap-2 shrink-0">
                          <Badge className={`text-[10px] ${sc.cls} border-0`}>{sc.label}</Badge>
                          {a.score_raw !== null && (
                            <Text as="span" className="text-xs font-semibold">{Math.round(a.score_raw)}%</Text>
                          )}
                          {Number(a.attempt_count) > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-[11px] font-medium text-navy hover:bg-paper-cream"
                              onClick={() => setAttemptsFor(a)}
                            >
                              <History className="h-3 w-3 mr-1" />
                              {a.attempt_count} {Number(a.attempt_count) === 1 ? "attempt" : "attempts"}
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-error"
                            onClick={() => handleUnassign(a.user_id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            )}

            {/* Add learners */}
            <Box className="space-y-2">
              <Text as="p" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Add Learners</Text>
              <Box className="flex gap-2">
                <Select value={assignDept} onValueChange={setAssignDept}>
                  <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Search learners…"
                  value={learnerSearch}
                  onChange={(e) => setLearnerSearch(e.target.value)}
                  className="flex-1"
                />
              </Box>
              <Box className="space-y-1 max-h-48 overflow-y-auto border rounded-lg p-1">
                {filteredLearners.filter((l) => !assignedIds.has(l.id)).map((l) => (
                  <Box
                    key={l.id}
                    className={cn(
                      "flex items-center justify-between px-3 py-2 rounded-md cursor-pointer hover:bg-muted/50 transition-colors",
                      assignIds.includes(l.id) && "bg-paper-cream"
                    )}
                    onClick={() =>
                      setAssignIds((prev) =>
                        prev.includes(l.id) ? prev.filter((x) => x !== l.id) : [...prev, l.id]
                      )
                    }
                  >
                    <Box>
                      <Text as="p" className="text-sm font-medium">{l.first_name} {l.last_name}</Text>
                      <Text as="p" className="text-xs text-muted-foreground">{l.department}</Text>
                    </Box>
                    {assignIds.includes(l.id) && <CheckCircle2 className="h-4 w-4 text-navy" />}
                  </Box>
                ))}
                {filteredLearners.filter((l) => !assignedIds.has(l.id)).length === 0 && (
                  <Text as="p" className="text-xs text-muted-foreground text-center py-4">
                    All learners already assigned or no matches
                  </Text>
                )}
              </Box>
            </Box>
          </Box>
          <DialogFooter className="pt-3 border-t">
            <Button variant="outline" onClick={() => setAssignPkg(null)}>Close</Button>
            <Button
              onClick={handleAssign}
              disabled={assignIds.length === 0 || assigning}
              className="gap-1.5"
            >
              {assigning ? "Assigning…" : `Assign ${assignIds.length > 0 ? assignIds.length : ""} Learner${assignIds.length !== 1 ? "s" : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm ── */}
      <AlertDialog open={!!deletePkg} onOpenChange={(o) => { if (!o) setDeletePkg(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete SCORM Package?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deletePkg?.title}</strong> will be permanently deleted along with all files, assignments, and tracking data. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-error hover:bg-error"
            >
              {deleting ? "Deleting…" : "Delete Package"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Attempt history ── */}
      <ScormAttemptsDialog
        packageId={assignPkg?.id}
        learner={attemptsFor}
        open={Boolean(attemptsFor)}
        onClose={() => setAttemptsFor(null)}
      />

    </Box>
  );
}
