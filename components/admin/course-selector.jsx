"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  BookOpen,
  ChevronRight,
  Search,
  Layers,
  PlayCircle,
  ClipboardList,
  Users,
  Plus,
  Clock,
  Award,
  GraduationCap,
  ShieldCheck,
} from "lucide-react";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { useAuth } from "@/hooks/use-auth";
import { fetchAdminCourses, createCourse } from "@/services/api/admin/admin-api";

function formatDuration(minutes) {
  if (!minutes) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

export function CourseSelector() {
  const { token } = useAuth();
  const router = useRouter();
  const [courses, setCourses] = useState(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const load = () => {
    if (!token) return;
    fetchAdminCourses({ token })
      .then((d) => setCourses(d.courses || []))
      .catch((e) => setError(e.message));
  };

  useEffect(() => { load(); }, [token]);

  const handleCreate = async () => {
    if (!form.name.trim()) { setFormError("Course name is required"); return; }
    setSaving(true);
    setFormError(null);
    try {
      await createCourse({ token, data: { name: form.name.trim(), description: form.description.trim() || null } });
      setDialogOpen(false);
      setForm({ name: "", description: "" });
      load();
    } catch (e) {
      setFormError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (error) {
    return (
      <Card className="p-6 text-center">
        <Text as="p" className="text-red-500 text-sm">{error}</Text>
        <Button size="sm" variant="outline" className="mt-3" onClick={load}>Retry</Button>
      </Card>
    );
  }

  if (!courses) {
    return (
      <Box className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
      </Box>
    );
  }

  const filtered = courses.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box className="space-y-4">
      {/* ── Toolbar ── */}
      <Box className="flex items-center gap-3">
        <Box className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search courses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </Box>
        <Button
          size="sm"
          onClick={() => setDialogOpen(true)}
          className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shrink-0"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          New Course
        </Button>
      </Box>

      <Text as="p" className="text-sm text-muted-foreground">
        {filtered.length} course{filtered.length !== 1 ? "s" : ""}
      </Text>

      {filtered.length === 0 ? (
        <Card className="p-10 text-center">
          <BookOpen className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
          <Text as="p" className="text-sm text-muted-foreground">
            {search ? "No courses match your search." : "No courses yet. Create your first course."}
          </Text>
        </Card>
      ) : (
        <Box className="space-y-3">
          {filtered.map((course) => {
            const duration = formatDuration(course.total_duration_minutes);
            const hasCert = course.assessments_count > 0;
            return (
              <Card
                key={course.id}
                className="cursor-pointer hover:shadow-md hover:border-indigo-200 transition-all group overflow-hidden"
                onClick={() => router.push(`/admin/courses/${course.id}`)}
              >
                <Box className="flex gap-0">
                  {/* Color accent bar */}
                  <Box className="w-1 shrink-0 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-l-lg" />

                  <Box className="flex-1 px-4 py-4">
                    {/* Top row: name + status badges */}
                    <Box className="flex items-start justify-between gap-3">
                      <Box className="flex items-center gap-2.5 flex-1 min-w-0">
                        <Box className="w-9 h-9 rounded-xl bg-indigo-50 group-hover:bg-indigo-100 flex items-center justify-center shrink-0 transition-colors">
                          <BookOpen className="h-4 w-4 text-indigo-600" />
                        </Box>
                        <Box className="min-w-0">
                          <Text as="p" className="text-sm font-bold group-hover:text-indigo-600 transition-colors leading-tight">
                            {course.name}
                          </Text>
                          {course.description && (
                            <Text as="p" className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                              {course.description}
                            </Text>
                          )}
                        </Box>
                      </Box>
                      <Box className="flex items-center gap-1.5 shrink-0">
                        {!course.is_active && (
                          <Badge variant="secondary" className="text-[10px] bg-red-100 text-red-700">Inactive</Badge>
                        )}
                        {course.is_active && (
                          <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-700">Active</Badge>
                        )}
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-indigo-500 transition-colors" />
                      </Box>
                    </Box>

                    {/* Divider */}
                    <Box className="h-px bg-border my-3" />

                    {/* Stats row */}
                    <Box className="flex items-center flex-wrap gap-x-4 gap-y-2">
                      <Box className="flex items-center gap-1.5">
                        <Layers className="h-3.5 w-3.5 text-indigo-400" />
                        <Text as="span" className="text-xs text-muted-foreground">
                          <Text as="span" className="font-semibold text-foreground">{course.modules_count}</Text> Module{course.modules_count !== 1 ? "s" : ""}
                        </Text>
                      </Box>
                      <Box className="flex items-center gap-1.5">
                        <PlayCircle className="h-3.5 w-3.5 text-violet-400" />
                        <Text as="span" className="text-xs text-muted-foreground">
                          <Text as="span" className="font-semibold text-foreground">{course.lessons_count}</Text> Lesson{course.lessons_count !== 1 ? "s" : ""}
                        </Text>
                      </Box>
                      {duration && (
                        <Box className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-amber-400" />
                          <Text as="span" className="text-xs text-muted-foreground">
                            <Text as="span" className="font-semibold text-foreground">{duration}</Text> Duration
                          </Text>
                        </Box>
                      )}
                      <Box className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-emerald-400" />
                        <Text as="span" className="text-xs text-muted-foreground">
                          <Text as="span" className="font-semibold text-foreground">{course.enrollments_count}</Text> Enrolled
                        </Text>
                      </Box>
                    </Box>

                    {/* Tags row */}
                    <Box className="flex items-center flex-wrap gap-2 mt-3">
                      {course.assessments_count > 0 && (
                        <Box className="flex items-center gap-1 bg-violet-50 text-violet-700 border border-violet-200 rounded-full px-2.5 py-0.5">
                          <ClipboardList className="h-3 w-3" />
                          <Text as="span" className="text-[10px] font-medium">
                            {course.assessments_count} Assessment{course.assessments_count !== 1 ? "s" : ""}
                          </Text>
                        </Box>
                      )}
                      {course.passing_score != null && (
                        <Box className="flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2.5 py-0.5">
                          <ShieldCheck className="h-3 w-3" />
                          <Text as="span" className="text-[10px] font-medium">Pass: {course.passing_score}%</Text>
                        </Box>
                      )}
                      {hasCert && (
                        <Box className="flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2.5 py-0.5">
                          <GraduationCap className="h-3 w-3" />
                          <Text as="span" className="text-[10px] font-medium">Certificate on Completion</Text>
                        </Box>
                      )}
                      {course.assessments_count === 0 && (
                        <Box className="flex items-center gap-1 bg-gray-50 text-gray-500 border border-gray-200 rounded-full px-2.5 py-0.5">
                          <Award className="h-3 w-3" />
                          <Text as="span" className="text-[10px] font-medium">No Assessment</Text>
                        </Box>
                      )}
                    </Box>
                  </Box>
                </Box>
              </Card>
            );
          })}
        </Box>
      )}

      {/* ── Create Course Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Course</DialogTitle>
          </DialogHeader>
          <Box className="space-y-4 py-2">
            <Box className="space-y-1.5">
              <Label htmlFor="course-name">Course Name <Text as="span" className="text-red-500">*</Text></Label>
              <Input
                id="course-name"
                placeholder="e.g. Project Management Fundamentals"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
            </Box>
            <Box className="space-y-1.5">
              <Label htmlFor="course-desc">Description</Label>
              <Textarea
                id="course-desc"
                placeholder="Brief description of the course..."
                rows={3}
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
            </Box>
            {formError && <Text as="p" className="text-sm text-red-500">{formError}</Text>}
          </Box>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleCreate}
              disabled={saving}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white"
            >
              {saving ? "Creating..." : "Create Course"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
