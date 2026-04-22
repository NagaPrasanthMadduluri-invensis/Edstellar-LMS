"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { BookOpen, Layers, ClipboardList, Users, Pencil, CheckCircle2, XCircle } from "lucide-react";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { useAuth } from "@/hooks/use-auth";
import { CourseModulesContent } from "@/components/admin/course-modules-content";
import { CourseAssessmentsContent } from "@/components/admin/course-assessments-content";
import { CourseAssignmentsContent } from "@/components/admin/course-assignments-content";
import { updateCourse } from "@/services/api/admin/admin-api";
import { apiClient } from "@/lib/api-client";

export function AdminCourseTabsContent({ courseId }) {
  const { token } = useAuth();
  const [course, setCourse] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    if (!token) return;
    apiClient(`/api/admin/courses/${courseId}`, { token })
      .then((d) => setCourse(d.course))
      .catch(() => {});
  }, [token, courseId]);

  const openEdit = () => {
    setForm({ name: course.name, description: course.description || "", is_active: !!course.is_active });
    setFormError(null);
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!form.name?.trim()) { setFormError("Name is required"); return; }
    setSaving(true); setFormError(null);
    try {
      const d = await updateCourse({ token, courseId, data: form });
      setCourse(d.course);
      setEditOpen(false);
    } catch (e) { setFormError(e.message); } finally { setSaving(false); }
  };

  return (
    <Box className="space-y-5">
      {/* ── Course Info Card ── */}
      {!course ? (
        <Skeleton className="h-24 w-full rounded-xl" />
      ) : (
        <Card className="overflow-hidden">
          <Box className="h-1.5 bg-gradient-to-r from-indigo-500 to-purple-600" />
          <CardContent className="p-5">
            <Box className="flex items-start justify-between gap-4 flex-wrap">
              <Box className="flex items-start gap-3 flex-1 min-w-0">
                <Box className="w-11 h-11 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                  <BookOpen className="h-5 w-5 text-indigo-600" />
                </Box>
                <Box className="flex-1 min-w-0">
                  <Box className="flex items-center gap-2 flex-wrap">
                    <Text as="h2" className="text-base font-bold">{course.name}</Text>
                    <Badge variant="secondary" className={`text-[10px] ${course.is_active ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                      {course.is_active ? <><CheckCircle2 className="h-3 w-3 mr-0.5 inline" />Active</> : <><XCircle className="h-3 w-3 mr-0.5 inline" />Inactive</>}
                    </Badge>
                  </Box>
                  {course.description && (
                    <Text as="p" className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{course.description}</Text>
                  )}
                </Box>
              </Box>
              <Button size="sm" variant="outline" onClick={openEdit} className="shrink-0">
                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                Edit
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* ── Tabs ── */}
      <Tabs defaultValue="modules">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="modules" className="flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5" />
            Modules & Lessons
          </TabsTrigger>
          <TabsTrigger value="assessments" className="flex items-center gap-1.5">
            <ClipboardList className="h-3.5 w-3.5" />
            Assessments
          </TabsTrigger>
          <TabsTrigger value="assignments" className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Enrolled Users
          </TabsTrigger>
        </TabsList>

        <TabsContent value="modules" className="mt-4">
          <CourseModulesContent courseId={courseId} />
        </TabsContent>

        <TabsContent value="assessments" className="mt-4">
          <CourseAssessmentsContent courseId={courseId} />
        </TabsContent>

        <TabsContent value="assignments" className="mt-4">
          <CourseAssignmentsContent courseId={courseId} />
        </TabsContent>
      </Tabs>

      {/* ── Edit Course Dialog ── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Course</DialogTitle>
          </DialogHeader>
          <Box className="space-y-4 py-2">
            <Box className="space-y-1.5">
              <Label>Course Name <Text as="span" className="text-red-500">*</Text></Label>
              <Input value={form.name || ""} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            </Box>
            <Box className="space-y-1.5">
              <Label>Description</Label>
              <Textarea rows={3} value={form.description || ""} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
            </Box>
            <Box className="flex items-center gap-3">
              <Switch
                id="course-active"
                checked={!!form.is_active}
                onCheckedChange={(v) => setForm((p) => ({ ...p, is_active: v }))}
              />
              <Label htmlFor="course-active">Active (visible to learners)</Label>
            </Box>
            {formError && <Text as="p" className="text-sm text-red-500">{formError}</Text>}
          </Box>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white">
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
