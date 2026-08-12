"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
  BookOpen, Search, Plus, Clock, CalendarDays, Settings2, Link2,
  Pencil, Eye, PowerOff, Power, Trash2, Layers, Users, TrendingUp,
  CheckCircle, ClipboardList, GripVertical,
} from "lucide-react";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/use-auth";
import {
  fetchAdminCourses, createCourse, deleteCourse, updateCourse,
} from "@/services/api/admin/admin-api";

function formatDuration(minutes) {
  if (!minutes) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function CourseSelector() {
  const { user } = useAuth();
  const router = useRouter();
  const [courses, setCourses] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");
  const [error, setError] = useState(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", is_active: false });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(null);

  const load = useCallback(() => {
    if (!user) return;
    fetchAdminCourses()
      .then((d) => setCourses(d.courses || []))
      .catch((e) => setError(e.message));
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.name.trim()) { setFormError("Course name is required"); return; }
    setSaving(true); setFormError(null);
    try {
      await createCourse({ data: { name: form.name.trim(), description: form.description.trim() || null, is_active: form.is_active } });
      setDialogOpen(false);
      setForm({ name: "", description: "", is_active: false });
      load();
    } catch (e) { setFormError(e.message); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await deleteCourse({ courseId: confirmDelete.id });
      setCourses((prev) => prev.filter((c) => c.id !== confirmDelete.id));
      setConfirmDelete(null);
    } catch (e) { setError(e.message); } finally { setDeleting(false); }
  };

  const handleToggleActive = async (course, e) => {
    e.stopPropagation();
    setToggling(course.id);
    try {
      await updateCourse({ courseId: course.id, data: { is_active: !course.is_active } });
      setCourses((prev) => prev.map((c) => c.id === course.id ? { ...c, is_active: !c.is_active } : c));
    } catch (e) { setError(e.message); } finally { setToggling(null); }
  };

  if (error) return (
    <Card className="p-6 text-center">
      <Text as="p" className="text-error text-sm">{error}</Text>
      <Button size="sm" variant="outline" className="mt-3" onClick={load}>Retry</Button>
    </Card>
  );

  if (!courses) return (
    <Box className="space-y-4">
      <Box className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
      </Box>
      <Skeleton className="h-10 w-full rounded-lg" />
      <Box className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-56 w-full rounded-xl" />)}
      </Box>
    </Box>
  );

  const totalCourses  = courses.length;
  const published     = courses.filter((c) => c.is_active).length;
  const drafts        = totalCourses - published;
  const totalEnrolled = courses.reduce((s, c) => s + Number(c.enrollments_count || 0), 0);
  const avgCompletion = totalCourses > 0
    ? Math.round(courses.reduce((s, c) => s + Number(c.completion_pct || 0), 0) / totalCourses)
    : 0;

  const statCards = [
    { label: "Total Courses",  value: totalCourses,        sub: null,                           icon: Layers,       iconBg: "bg-paper-cream",    iconColor: "text-navy",    circle: "bg-paper-cream"    },
    { label: "Published",      value: published,           sub: `${drafts} draft${drafts !== 1 ? "s" : ""}`, icon: CheckCircle,  iconBg: "bg-paper-cream", iconColor: "text-navy", circle: "bg-paper-cream" },
    { label: "Total Enrolled", value: totalEnrolled,       sub: null,                           icon: Users,        iconBg: "bg-paper-cream",  iconColor: "text-ink/70",  circle: "bg-paper-cream"  },
    { label: "Avg Completion", value: `${avgCompletion}%`, sub: null,                           icon: TrendingUp,   iconBg: "bg-paper-cream",    iconColor: "text-navy",    circle: "bg-paper-cream"    },
  ];

  let filtered = courses.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch = !q
      || c.name.toLowerCase().includes(q)
      || (c.description || "").toLowerCase().includes(q);
    const matchStatus = filterStatus === "all"
      || (filterStatus === "active" && c.is_active)
      || (filterStatus === "inactive" && !c.is_active);
    return matchSearch && matchStatus;
  });

  if (sortOrder === "newest")   filtered = [...filtered].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  if (sortOrder === "oldest")   filtered = [...filtered].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  if (sortOrder === "name")     filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
  if (sortOrder === "enrolled") filtered = [...filtered].sort((a, b) => b.enrollments_count - a.enrollments_count);

  return (
    <Box className="space-y-5">

      {/* ── Stat Cards ── */}
      <Box className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <Card key={s.label} className="relative overflow-hidden p-5">
            <Box className="flex items-start gap-3">
              <Box className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${s.iconBg}`}>
                <s.icon className={`h-5 w-5 ${s.iconColor}`} />
              </Box>
              <Box>
                <Text as="h2" className="text-3xl font-bold leading-tight">{s.value}</Text>
                <Text as="p" className="text-sm text-muted-foreground">{s.label}</Text>
                {s.sub && <Text as="p" className="text-xs text-muted-foreground/70">{s.sub}</Text>}
              </Box>
            </Box>
            <Box className={`absolute -right-5 -top-5 w-24 h-24 rounded-full opacity-60 ${s.circle}`} />
          </Card>
        ))}
      </Box>

      {/* ── Toolbar ── */}
      <Box className="flex flex-wrap items-center gap-3">
        <Box className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search title, description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11 bg-white border-border shadow-sm text-sm"
          />
        </Box>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-11 w-[140px] text-sm bg-white border-border shadow-sm">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Published</SelectItem>
            <SelectItem value="inactive">Draft</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortOrder} onValueChange={setSortOrder}>
          <SelectTrigger className="h-11 w-[155px] text-sm bg-white border-border shadow-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
            <SelectItem value="name">Name A–Z</SelectItem>
            <SelectItem value="enrolled">Most Enrolled</SelectItem>
          </SelectContent>
        </Select>
        <Button
          className="h-11 bg-navy hover:bg-navy-soft text-paper gap-1.5 shrink-0 px-5 text-sm font-medium"
          onClick={() => { setForm({ name: "", description: "", is_active: false }); setFormError(null); setDialogOpen(true); }}
        >
          <Plus className="h-4 w-4" />
          Add Course
        </Button>
      </Box>

      <Text as="p" className="text-sm text-muted-foreground -mt-1">
        {filtered.length} of {totalCourses} course{totalCourses !== 1 ? "s" : ""}
      </Text>

      {/* ── Course List ── */}
      {filtered.length === 0 ? (
        <Card className="p-14 text-center">
          <BookOpen className="h-10 w-10 mx-auto text-muted-foreground/25 mb-3" />
          <Text as="p" className="text-sm text-muted-foreground">
            {search || filterStatus !== "all"
              ? "No courses match your filters."
              : "No courses yet. Create your first course."}
          </Text>
        </Card>
      ) : (
        <Box className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filtered.map((course) => {
            const duration = formatDuration(course.total_duration_minutes);
            return (
              <Card
                key={course.id}
                className="cursor-pointer hover:shadow-md transition-shadow group overflow-hidden border-l-4 border-l-blue-500"
                onClick={() => router.push(`/admin/courses/${course.id}`)}
              >
                <Box className="p-6 space-y-4">

                  {/* ── Top row: icon + title + action buttons ── */}
                  <Box className="flex items-start gap-3">
                    <Box className="w-12 h-12 rounded-xl bg-paper-cream border border-navy/20 flex items-center justify-center shrink-0">
                      <Settings2 className="h-5.5 w-5.5 text-navy" />
                    </Box>

                    <Box className="flex-1 min-w-0">
                      {/* Badges row */}
                      <Box className="flex items-center gap-1.5 flex-wrap mb-1.5">
                        {course.assessments_count > 0 && (
                          <Badge className="text-[11px] bg-paper-cream text-ink/70 border-0 font-medium px-2 py-0.5">
                            <ClipboardList className="h-3 w-3 mr-1" />Assessment
                          </Badge>
                        )}
                        <Badge className="text-[11px] bg-paper-cream text-ink/70 border-0 font-medium px-2 py-0.5">
                          <Layers className="h-3 w-3 mr-1" />
                          {course.modules_count} Module{course.modules_count !== 1 ? "s" : ""}
                        </Badge>
                        <Box className="flex items-center gap-1.5">
                          <Box className={`w-2 h-2 rounded-full ${course.is_active ? "bg-navy" : "bg-ink/45"}`} />
                          <Text as="span" className={`text-xs font-semibold ${course.is_active ? "text-navy" : "text-ink/60"}`}>
                            {course.is_active ? "Published" : "Draft"}
                          </Text>
                        </Box>
                      </Box>

                      {/* Title */}
                      <Text as="h3" className="text-[17px] font-extrabold leading-snug group-hover:text-navy transition-colors">
                        {course.name}
                      </Text>
                    </Box>

                    {/* Action buttons — horizontal row at top right */}
                    <Box className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit"
                        onClick={(e) => { e.stopPropagation(); router.push(`/admin/courses/${course.id}`); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="View"
                        onClick={(e) => { e.stopPropagation(); router.push(`/admin/courses/${course.id}`); }}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        className={`h-8 w-8 ${course.is_active ? "text-ink/70 hover:bg-paper-cream" : "text-navy hover:bg-paper-cream"}`}
                        title={course.is_active ? "Deactivate" : "Activate"}
                        disabled={toggling === course.id}
                        onClick={(e) => handleToggleActive(course, e)}
                      >
                        {course.is_active ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        className="h-8 w-8 text-error hover:bg-error/10"
                        title="Delete"
                        onClick={(e) => { e.stopPropagation(); setConfirmDelete({ id: course.id, name: course.name }); }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </Box>
                  </Box>

                  {/* Meta row */}
                  <Box className="flex items-center gap-4 flex-wrap text-sm text-muted-foreground">
                    {duration && (
                      <Box className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        <Text as="span">{duration}</Text>
                      </Box>
                    )}
                    <Box className="flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5" />
                      <Text as="span">{formatDate(course.created_at)}</Text>
                    </Box>
                    {course.first_assessment_title && (
                      <Box className="flex items-center gap-1.5 text-navy">
                        <Link2 className="h-3.5 w-3.5" />
                        <Text as="span" className="font-medium truncate max-w-[160px]">{course.first_assessment_title}</Text>
                      </Box>
                    )}
                  </Box>

                  {/* Description */}
                  {course.description && (
                    <Text as="p" className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                      {course.description}
                    </Text>
                  )}

                  {/* Divider */}
                  <Box className="h-px bg-border" />

                  {/* Bottom stats */}
                  <Box className="flex items-center gap-5 flex-wrap">
                    <Box>
                      <Text as="p" className="text-xl font-extrabold text-navy leading-none">{course.enrollments_count}</Text>
                      <Text as="p" className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">Enrolled</Text>
                    </Box>
                    <Box>
                      <Text as="p" className="text-xl font-extrabold text-ink/70 leading-none">{course.completion_pct ?? 0}%</Text>
                      <Text as="p" className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">Completion</Text>
                    </Box>
                    {course.avg_score != null && (
                      <Box>
                        <Text as="p" className="text-xl font-extrabold text-navy leading-none">{course.avg_score}%</Text>
                        <Text as="p" className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">Avg Score</Text>
                      </Box>
                    )}
                    <Box className="flex-1 flex items-center gap-2.5 min-w-[80px]">
                      <Progress value={course.completion_pct ?? 0} className="h-2 flex-1" />
                      <Text as="span" className="text-xs font-semibold text-muted-foreground shrink-0">{course.completion_pct ?? 0}%</Text>
                    </Box>
                  </Box>
                </Box>
              </Card>
            );
          })}
        </Box>
      )}

      {/* ── Delete Confirmation ── */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => { if (!o) setConfirmDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Course</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{confirmDelete?.name}</strong> along with all its modules, lessons, and assessments. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-error hover:bg-error text-white">
              {deleting ? "Deleting…" : "Delete Course"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Create Course Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md gap-0 p-0 overflow-hidden">
          <Box className="px-6 py-5 border-b bg-white">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Create New Course</DialogTitle>
              <Text as="p" className="text-sm text-muted-foreground mt-0.5">Fill in the details to set up your course structure.</Text>
            </DialogHeader>
          </Box>
          <Box className="px-6 py-5 space-y-4">
            <Box className="space-y-1.5">
              <Label htmlFor="course-name" className="text-sm font-medium text-ink/80">
                Course Name <Text as="span" className="text-error">*</Text>
              </Label>
              <Input
                id="course-name"
                placeholder="e.g. Project Management Fundamentals"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="h-10 bg-paper-warm border-border placeholder:text-ink/35 focus-visible:ring-2 focus-visible:ring-navy/20 focus-visible:border-navy/20 transition-colors"
              />
            </Box>
            <Box className="space-y-1.5">
              <Label htmlFor="course-desc" className="text-sm font-medium text-ink/80">Description</Label>
              <Textarea
                id="course-desc"
                placeholder="Brief description of what learners will achieve..."
                rows={3}
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                className="bg-paper-warm border-border placeholder:text-ink/35 focus-visible:ring-2 focus-visible:ring-navy/20 focus-visible:border-navy/20 resize-none transition-colors"
              />
            </Box>
            <Box className="flex items-center justify-between rounded-xl border border-border bg-paper-warm px-4 py-3.5">
              <Box>
                <Text as="p" className="text-sm font-medium text-ink">Publish immediately</Text>
                <Text as="p" className="text-xs text-muted-foreground mt-0.5">Off = saved as Draft; only published courses appear in Assign Learning</Text>
              </Box>
              <Switch
                checked={!!form.is_active}
                onCheckedChange={(v) => setForm((p) => ({ ...p, is_active: v }))}
              />
            </Box>
            {formError && (
              <Box className="bg-error/10 border border-error/30 rounded-xl px-4 py-3">
                <Text as="p" className="text-sm text-error">{formError}</Text>
              </Box>
            )}
          </Box>
          <Box className="px-6 py-4 border-t bg-paper-warm flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving} className="bg-navy hover:bg-navy-soft text-paper">
              {saving ? "Creating…" : form.is_active ? "Create & Publish" : "Save as Draft"}
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
