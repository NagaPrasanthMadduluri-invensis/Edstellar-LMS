"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  BookOpen, Layers, ClipboardList, Users, Pencil, PlayCircle,
  Clock, CheckCircle2, XCircle, BarChart3, CalendarCheck,
} from "lucide-react";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { useAuth } from "@/hooks/use-auth";
import { CourseModulesContent } from "@/components/admin/course-modules-content";
import { CourseAssessmentsContent } from "@/components/admin/course-assessments-content";
import { CourseAssignmentsContent } from "@/components/admin/course-assignments-content";
import {
  updateCourse, uploadCourseThumbnail, discardCourseThumbnail,
} from "@/services/api/admin/admin-api";
import { ThumbnailField } from "@/components/admin/thumbnail-field";
import { DescriptionField } from "@/components/shared/description-field";
import { CourseArt } from "@/components/shared/course-art";
import { apiClient } from "@/lib/api-client";

export function AdminCourseTabsContent({ courseId }) {
  const router = useRouter();
  const { user } = useAuth();
  const [course, setCourse] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  // A newly picked file, and whether the admin asked to drop the existing
  // picture. Both are needed: "no new file" is not the same as "no picture".
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailCleared, setThumbnailCleared] = useState(false);

  useEffect(() => {
    if (!user) return;
    apiClient(`/api/admin/courses/${courseId}`)
      .then((d) => setCourse(d.course))
      .catch(() => {});
  }, [user, courseId]);

  const openEdit = () => {
    setForm({ name: course.name, description: course.description || "", is_active: !!course.is_active });
    setThumbnailFile(null);
    setThumbnailCleared(false);
    setFormError(null);
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!form.name?.trim()) { setFormError("Course name is required"); return; }
    setSaving(true); setFormError(null);

    /**
     * `thumbnail_url` is sent only when the admin actually changed the
     * picture: a new file becomes its URL, an explicit removal becomes null,
     * and leaving it alone omits the field entirely so the API keeps what the
     * course already has.
     */
    let uploadedUrl = null;
    try {
      if (thumbnailFile) {
        const uploaded = await uploadCourseThumbnail({ file: thumbnailFile });
        uploadedUrl = uploaded.url;
      }
      const data = { ...form };
      if (uploadedUrl) data.thumbnail_url = uploadedUrl;
      else if (thumbnailCleared) data.thumbnail_url = null;

      const d = await updateCourse({ courseId, data });
      setCourse(d.course);
      setEditOpen(false);
    } catch (e) {
      if (uploadedUrl) await discardCourseThumbnail({ url: uploadedUrl });
      setFormError(e.message);
    } finally { setSaving(false); }
  };

  return (
    <Box className="space-y-5">

      {/* ── Course Info Card ── */}
      {!course ? (
        <Skeleton className="h-36 w-full rounded-xl" />
      ) : (
        // py-0 — CardContent below supplies the padding; the Card's own py-4
        // sat on top of it.
        <Card className="py-0 overflow-hidden border-l-4 border-l-blue-500">
          <CardContent className="p-4 sm:p-5">
            <Box className="flex items-start justify-between gap-4 flex-wrap">

              {/* Icon + title */}
              <Box className="flex min-w-0 flex-1 basis-[16rem] items-start gap-4">
                {/* The uploaded picture when there is one — the admin should
                    see what a learner sees without leaving the page. */}
                {course.thumbnail_url ? (
                  <CourseArt
                    thumbnailUrl={course.thumbnail_url}
                    alt={course.name}
                    scrim="light"
                    sizes="56px"
                    className="w-14 h-14 rounded-xl border border-navy/20 shrink-0"
                  />
                ) : (
                  <Box className="w-14 h-14 rounded-xl bg-paper-cream border border-navy/20 flex items-center justify-center shrink-0">
                    <BookOpen className="h-6 w-6 text-navy" />
                  </Box>
                )}
                <Box className="flex-1 min-w-0">
                  <Box className="flex items-center gap-2.5 flex-wrap">
                    <Text as="h2" className="text-lg font-bold">{course.name}</Text>
                    <Badge className={`text-[11px] font-medium ${course.is_active ? "bg-paper-cream text-navy border-0" : "bg-paper-cream text-ink/60 border-0"}`}>
                      {course.is_active
                        ? <><CheckCircle2 className="h-3 w-3 mr-1 inline" />Published</>
                        : <><XCircle className="h-3 w-3 mr-1 inline" />Draft</>
                      }
                    </Badge>
                  </Box>
                  {course.description && (
                    <Text as="p" className="text-sm text-muted-foreground mt-1 line-clamp-2">{course.description}</Text>
                  )}

                  {/* Quick stats row */}
                  <Box className="flex items-center gap-5 flex-wrap mt-3">
                    {[
                      { icon: Layers,       val: course.modules_count,    label: "Modules"    },
                      { icon: PlayCircle,   val: course.lessons_count,    label: "Lessons"    },
                      { icon: ClipboardList,val: course.assessments_count,label: "Assessments"},
                      { icon: Users,        val: course.enrollments_count,label: "Enrolled"   },
                    ].map(({ icon: Icon, val, label }) => (
                      <Box key={label} className="flex items-center gap-1.5">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground/60" />
                        <Text as="span" className="text-sm font-semibold">{val ?? 0}</Text>
                        <Text as="span" className="text-xs text-muted-foreground">{label}</Text>
                      </Box>
                    ))}
                    {course.total_duration_minutes > 0 && (
                      <Box className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground/60" />
                        <Text as="span" className="text-xs text-muted-foreground">
                          {Math.floor(course.total_duration_minutes / 60) > 0
                            ? `${Math.floor(course.total_duration_minutes / 60)}h ${course.total_duration_minutes % 60}m`
                            : `${course.total_duration_minutes}m`
                          }
                        </Text>
                      </Box>
                    )}
                    {course.passing_score != null && (
                      <Box className="flex items-center gap-1.5">
                        <BarChart3 className="h-3.5 w-3.5 text-muted-foreground/60" />
                        <Text as="span" className="text-xs text-muted-foreground">Pass: {course.passing_score}%</Text>
                      </Box>
                    )}
                  </Box>
                </Box>
              </Box>

              {/* A live session's companion training is generated from the
                  session and kept in step with it, so editing it here would be
                  overwritten on the next save — the API refuses it (422). The
                  page stays readable for tracking; the action points at the
                  place that owns it. `sessionId` is camelCase because this
                  detail route returns the row as Drizzle selects it. */}
              {course.sessionId ? (
                <Button size="sm" variant="outline" className="shrink-0 h-9"
                  onClick={() => router.push("/admin/sessions")}>
                  <CalendarCheck className="h-3.5 w-3.5 mr-1.5" />
                  Manage in Sessions
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={openEdit} className="shrink-0 h-9">
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />
                  Edit Course
                </Button>
              )}
            </Box>
          </CardContent>
        </Card>
      )}

      {course?.sessionId && (
        <Card className="p-4 bg-paper-warm border-navy/15">
          <Box className="flex items-start gap-2.5">
            <CalendarCheck className="h-4 w-4 text-navy mt-0.5 shrink-0" />
            <Text as="p" className="text-sm text-ink/70 leading-relaxed">
              This training belongs to a live session. Its lesson, title and
              schedule come from the session, and its enrolment is the session
              roster — change them in Sessions. Certificates for a session are
              issued by an admin by hand.
            </Text>
          </Box>
        </Card>
      )}

      {/* ── Tabs ── */}
      <Tabs defaultValue="modules">
        <TabsList className="h-11 w-full max-w-full justify-start overflow-x-auto sm:grid sm:grid-cols-3 sm:justify-center">
          <TabsTrigger value="modules" className="flex shrink-0 items-center gap-1.5 text-sm">
            <Layers className="h-4 w-4" />
            Modules & Lessons
          </TabsTrigger>
          <TabsTrigger value="assessments" className="flex shrink-0 items-center gap-1.5 text-sm">
            <ClipboardList className="h-4 w-4" />
            Assessments
          </TabsTrigger>
          <TabsTrigger value="assignments" className="flex shrink-0 items-center gap-1.5 text-sm">
            <Users className="h-4 w-4" />
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
          <Box className="space-y-5 py-2">
            <Box className="space-y-2">
              <Label className="text-sm font-medium">
                Course Name <Text as="span" className="text-error">*</Text>
              </Label>
              <Input
                placeholder="Course name"
                value={form.name || ""}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="h-10"
              />
            </Box>
            <DescriptionField
              placeholder="Brief course description..."
              value={form.description || ""}
              onChange={(v) => setForm((p) => ({ ...p, description: v }))}
            />
            <ThumbnailField
              value={thumbnailCleared ? null : course?.thumbnail_url || null}
              file={thumbnailFile}
              onSelect={(f) => { setThumbnailFile(f); setThumbnailCleared(false); }}
              onClear={() => {
                // Clearing a pending file goes back to the stored picture;
                // clearing again removes that too.
                if (thumbnailFile) setThumbnailFile(null);
                else setThumbnailCleared(true);
              }}
              disabled={saving}
            />
            <Box className="flex items-center justify-between rounded-lg border p-4">
              <Box>
                <Text as="p" className="text-sm font-medium">Published</Text>
                <Text as="p" className="text-xs text-muted-foreground">Off = Draft; only published courses appear in Assign Learning</Text>
              </Box>
              <Switch
                id="course-active"
                checked={!!form.is_active}
                onCheckedChange={(v) => setForm((p) => ({ ...p, is_active: v }))}
              />
            </Box>
            {formError && (
              <Box className="bg-error/10 border border-error/30 rounded-lg px-3 py-2">
                <Text as="p" className="text-sm text-error">{formError}</Text>
              </Box>
            )}
          </Box>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-navy hover:bg-navy-soft text-paper">
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
