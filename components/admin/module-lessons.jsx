"use client";

import { useEffect, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus, Pencil, Trash2, GripVertical, PlayCircle, FileText,
  ExternalLink, HelpCircle, Eye, EyeOff, Clock, Sparkles,
  FileArchive, Upload, AlertCircle,
} from "lucide-react";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { useAuth } from "@/hooks/use-auth";
import {
  fetchLessons, createLesson, updateLesson, deleteLesson,
} from "@/services/api/admin/admin-api";
import { useRef } from "react";

const CONTENT_TYPE_CONFIG = {
  video:    { label: "Video",    icon: PlayCircle,   color: "bg-blue-100 text-blue-600"      },
  pdf:      { label: "PDF",      icon: FileText,     color: "bg-orange-100 text-orange-600"  },
  external: { label: "External", icon: ExternalLink, color: "bg-violet-100 text-violet-600"  },
  quiz:     { label: "Quiz",     icon: HelpCircle,   color: "bg-emerald-100 text-emerald-600" },
  scorm:    { label: "SCORM",    icon: FileArchive,  color: "bg-indigo-100 text-indigo-600"   },
};

const EMPTY_LESSON = {
  title: "", description: "", content_type: "video", content_url: "",
  duration_minutes: "", sort_order: 0, is_preview: false, is_active: true,
  scorm_file: null, scorm_package_id: null, scorm_title: "",
};

export function ModuleLessons({ moduleId }) {
  const { token } = useAuth();
  const fileRef = useRef(null);
  const [lessons, setLessons] = useState(null);
  const [error, setError] = useState(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const [form, setForm] = useState(EMPTY_LESSON);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploadingScorm, setUploadingScorm] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadLessons = useCallback(async () => {
    if (!token) return;
    try {
      const data = await fetchLessons({ token, moduleId });
      setLessons(data.lessons || []);
    } catch (e) { setError(e.message); }
  }, [token, moduleId]);

  useEffect(() => { loadLessons(); }, [loadLessons]);

  const handleCreate = () => {
    setEditingLesson(null);
    setForm({ ...EMPTY_LESSON, sort_order: (lessons?.length || 0) + 1 });
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleEdit = (lesson) => {
    setEditingLesson(lesson);
    setForm({
      title: lesson.title,
      description: lesson.description || "",
      content_type: lesson.content_type,
      content_url: lesson.content_url || "",
      duration_minutes: lesson.duration_minutes ?? "",
      sort_order: lesson.sort_order,
      is_preview: lesson.is_preview,
      is_active: lesson.is_active,
      scorm_file: null,
      scorm_package_id: lesson.scorm_package_id || null,
      scorm_title: lesson.scorm_title || "",
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { setFormErrors({ title: ["Title is required"] }); return; }
    if (form.content_type === "scorm" && !editingLesson && !form.scorm_file) {
      setFormErrors({ _general: "Please upload a SCORM package (.zip)" });
      return;
    }
    setSaving(true); setFormErrors({});
    try {
      let scormPackageId = form.scorm_package_id;

      /* ── Upload SCORM zip first if a new file was selected ── */
      if (form.content_type === "scorm" && form.scorm_file) {
        setUploadingScorm(true);
        const fd = new FormData();
        fd.append("scorm_package", form.scorm_file);
        if (form.title.trim()) fd.append("title", form.title.trim());
        const res = await fetch("/api/admin/scorm/upload", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
        const data = await res.json();
        setUploadingScorm(false);
        if (!res.ok) throw new Error(data.message || "SCORM upload failed");
        scormPackageId = data.package.id;
      }

      const payload = {
        title: form.title.trim(),
        description: form.description || null,
        content_type: form.content_type,
        content_url: form.content_type === "scorm" ? null : (form.content_url || null),
        scorm_package_id: form.content_type === "scorm" ? scormPackageId : null,
        duration_minutes: form.duration_minutes === "" ? null : Number(form.duration_minutes),
        sort_order: form.sort_order,
        is_preview: form.is_preview,
        is_active: form.is_active,
      };

      if (editingLesson) {
        await updateLesson({ token, lessonId: editingLesson.id, data: payload });
      } else {
        await createLesson({ token, moduleId, data: payload });
      }
      setDialogOpen(false);
      await loadLessons();
    } catch (e) {
      setUploadingScorm(false);
      if (e.errors) setFormErrors(e.errors);
      else setFormErrors({ _general: e.message });
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteLesson({ token, lessonId: deleteTarget.id });
      setDeleteTarget(null);
      await loadLessons();
    } catch (e) { setError(e.message); setDeleteTarget(null); } finally { setDeleting(false); }
  };

  const handleToggleActive = async (lesson) => {
    try {
      await updateLesson({ token, lessonId: lesson.id, data: { is_active: !lesson.is_active } });
      await loadLessons();
    } catch (e) { setError(e.message); }
  };

  if (error && !lessons) return (
    <Text as="p" className="text-xs text-red-600 py-2">{error}</Text>
  );

  if (!lessons) return (
    <Box className="space-y-2 py-2">
      {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-11 w-full rounded-md" />)}
    </Box>
  );

  return (
    <Box className="space-y-2 pt-1">
      {error && <Text as="p" className="text-xs text-red-600">{error}</Text>}

      {lessons.length === 0 ? (
        <Box className="text-center py-4">
          <Text as="p" className="text-xs text-muted-foreground">No lessons yet. Add the first lesson below.</Text>
        </Box>
      ) : (
        <Box className="space-y-1.5">
          {lessons.map((lesson) => {
            const typeCfg = CONTENT_TYPE_CONFIG[lesson.content_type] || CONTENT_TYPE_CONFIG.video;
            const TypeIcon = typeCfg.icon;
            return (
              <Box
                key={lesson.id}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors"
              >
                <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0 cursor-grab" />
                <Box className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${typeCfg.color}`}>
                  <TypeIcon className="h-3.5 w-3.5" />
                </Box>

                <Box className="flex-1 min-w-0">
                  <Box className="flex items-center gap-1.5 flex-wrap">
                    <Text as="p" className="text-xs font-semibold truncate">{lesson.title}</Text>
                    <Badge className={`text-[9px] px-1.5 py-0 border-0 shrink-0 ${typeCfg.color}`}>
                      {typeCfg.label}
                    </Badge>
                    {lesson.is_preview && (
                      <Badge className="text-[9px] px-1.5 py-0 border-0 bg-amber-100 text-amber-700 shrink-0">
                        <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                        Preview
                      </Badge>
                    )}
                    {!lesson.is_active && (
                      <Badge className="text-[9px] px-1.5 py-0 border-0 bg-gray-100 text-gray-500 shrink-0">Inactive</Badge>
                    )}
                  </Box>
                  <Box className="flex items-center gap-3 mt-0.5 flex-wrap">
                    {lesson.duration_minutes && (
                      <Box className="flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5 text-muted-foreground/60" />
                        <Text as="span" className="text-[10px] text-muted-foreground">{lesson.duration_minutes} min</Text>
                      </Box>
                    )}
                    {lesson.content_type === "scorm" && lesson.scorm_package_id && (
                      <Text as="span" className="text-[10px] text-indigo-500 font-medium">
                        Package #{lesson.scorm_package_id} · Learners launch full-screen
                      </Text>
                    )}
                  </Box>
                </Box>

                <Box className="flex items-center gap-0.5 shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleToggleActive(lesson)}>
                    {lesson.is_active
                      ? <Eye className="h-3.5 w-3.5 text-emerald-600" />
                      : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                    }
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(lesson)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={() => setDeleteTarget(lesson)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}

      <Button variant="outline" size="sm" className="w-full text-xs h-8 border-dashed" onClick={handleCreate}>
        <Plus className="h-3.5 w-3.5 mr-1.5" />
        Add Lesson
      </Button>

      {/* ── Lesson Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg gap-0 p-0 overflow-hidden">
          <Box className="px-6 py-5 border-b bg-white shrink-0">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">{editingLesson ? "Edit Lesson" : "Add Lesson"}</DialogTitle>
              <Text as="p" className="text-sm text-muted-foreground mt-0.5">Add content to this module by filling in the fields below.</Text>
            </DialogHeader>
          </Box>

          <Box className="overflow-y-auto max-h-[70vh] px-6 py-5 space-y-5">

            {/* ── Section: Basic Info ── */}
            <Box className="rounded-xl bg-gray-50 border border-gray-100 p-4 space-y-4">
              <Text as="p" className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Basic Info</Text>
              <Box className="space-y-1.5">
                <Label className="text-sm font-medium text-gray-700">
                  Title <Text as="span" className="text-red-400">*</Text>
                </Label>
                <Input
                  placeholder="e.g. Introduction to Module 1"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="h-10 bg-white border-gray-200 placeholder:text-gray-300 focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-400 transition-colors"
                />
                {formErrors.title && <Text as="p" className="text-xs text-red-500 mt-1">{formErrors.title[0]}</Text>}
              </Box>
              <Box className="space-y-1.5">
                <Label className="text-sm font-medium text-gray-700">Description</Label>
                <Textarea
                  placeholder="What this lesson covers…"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="bg-white border-gray-200 placeholder:text-gray-300 focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-400 resize-none transition-colors"
                />
              </Box>
            </Box>

            {/* ── Section: Content ── */}
            <Box className="rounded-xl bg-gray-50 border border-gray-100 p-4 space-y-4">
              <Text as="p" className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Content</Text>
              <Box className="grid grid-cols-2 gap-4">
                <Box className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">Content Type <Text as="span" className="text-red-400">*</Text></Label>
                  <Select value={form.content_type} onValueChange={(v) => setForm((f) => ({ ...f, content_type: v, content_url: "", scorm_file: null, scorm_package_id: f.content_type === "scorm" ? null : f.scorm_package_id }))}>
                    <SelectTrigger className="h-10 bg-white border-gray-200 text-sm focus:ring-2 focus:ring-blue-500/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="pdf">PDF Document</SelectItem>
                      <SelectItem value="external">External Link</SelectItem>
                      <SelectItem value="quiz">Quiz</SelectItem>
                      <SelectItem value="scorm">SCORM Package</SelectItem>
                    </SelectContent>
                  </Select>
                  {formErrors.content_type && <Text as="p" className="text-xs text-red-500 mt-1">{formErrors.content_type[0]}</Text>}
                </Box>
                <Box className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">Duration (minutes)</Label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="e.g. 30"
                    value={form.duration_minutes}
                    onChange={(e) => setForm((f) => ({ ...f, duration_minutes: e.target.value }))}
                    className="h-10 bg-white border-gray-200 placeholder:text-gray-300 focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-400 transition-colors"
                  />
                </Box>
              </Box>

              {form.content_type !== "quiz" && form.content_type !== "scorm" && (
                <Box className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">Content URL</Label>
                  <Input
                    placeholder={
                      form.content_type === "video"    ? "https://youtu.be/..." :
                      form.content_type === "pdf"      ? "https://example.com/file.pdf" :
                                                         "https://portal.example.com/..."
                    }
                    value={form.content_url}
                    onChange={(e) => setForm((f) => ({ ...f, content_url: e.target.value }))}
                    className="h-10 bg-white border-gray-200 placeholder:text-gray-300 focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-400 transition-colors"
                  />
                  {formErrors.content_url && <Text as="p" className="text-xs text-red-500 mt-1">{formErrors.content_url[0]}</Text>}
                </Box>
              )}

              {form.content_type === "scorm" && (
                <Box className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    SCORM Package (.zip) <Text as="span" className="text-red-400">{!editingLesson && "*"}</Text>
                  </Label>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".zip"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) setForm((prev) => ({ ...prev, scorm_file: f }));
                    }}
                  />
                  <Box
                    onClick={() => fileRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-5 flex flex-col items-center gap-2.5 cursor-pointer transition-colors ${
                      form.scorm_file ? "border-indigo-400 bg-indigo-50" : "border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/30"
                    }`}
                  >
                    {form.scorm_file ? (
                      <>
                        <FileArchive className="h-7 w-7 text-indigo-500" />
                        <Box className="text-center">
                          <Text as="p" className="text-sm font-semibold text-indigo-700">{form.scorm_file.name}</Text>
                          <Text as="p" className="text-xs text-muted-foreground mt-0.5">
                            {(form.scorm_file.size / 1024 / 1024).toFixed(1)} MB · Click to change
                          </Text>
                        </Box>
                      </>
                    ) : form.scorm_package_id ? (
                      <>
                        <FileArchive className="h-7 w-7 text-indigo-400" />
                        <Box className="text-center">
                          <Text as="p" className="text-sm font-medium text-indigo-600">SCORM package already uploaded</Text>
                          <Text as="p" className="text-xs text-muted-foreground mt-0.5">Click to replace with a new .zip file</Text>
                        </Box>
                      </>
                    ) : (
                      <>
                        <Upload className="h-7 w-7 text-gray-300" />
                        <Box className="text-center">
                          <Text as="p" className="text-sm font-medium text-gray-700">Click to browse or drag & drop</Text>
                          <Text as="p" className="text-xs text-muted-foreground mt-0.5">.zip SCORM packages only</Text>
                        </Box>
                      </>
                    )}
                  </Box>
                  {uploadingScorm && (
                    <Box className="flex items-center gap-2 text-xs text-indigo-600">
                      <Box className="h-3 w-3 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
                      Uploading and extracting SCORM package…
                    </Box>
                  )}
                </Box>
              )}
            </Box>

            {/* ── Section: Settings ── */}
            <Box className="rounded-xl bg-gray-50 border border-gray-100 p-4 space-y-4">
              <Text as="p" className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Settings</Text>
              <Box className="grid grid-cols-3 gap-4">
                <Box className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">Sort Order</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.sort_order}
                    onChange={(e) => setForm((f) => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
                    className="h-10 bg-white border-gray-200 focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-400 transition-colors"
                  />
                </Box>
                <Box className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">Free Preview</Label>
                  <Box className="flex items-center gap-2 h-10 px-3 rounded-lg bg-white border border-gray-200">
                    <Switch checked={form.is_preview} onCheckedChange={(v) => setForm((f) => ({ ...f, is_preview: v }))} />
                    <Text as="span" className="text-xs text-muted-foreground">{form.is_preview ? "Yes" : "No"}</Text>
                  </Box>
                </Box>
                <Box className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">Active</Label>
                  <Box className="flex items-center gap-2 h-10 px-3 rounded-lg bg-white border border-gray-200">
                    <Switch checked={form.is_active} onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))} />
                    <Text as="span" className="text-xs text-muted-foreground">{form.is_active ? "Yes" : "No"}</Text>
                  </Box>
                </Box>
              </Box>
            </Box>

            {formErrors._general && (
              <Box className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <Text as="p" className="text-sm text-red-600">{formErrors._general}</Text>
              </Box>
            )}
          </Box>

          <Box className="px-6 py-4 border-t bg-gray-50/60 shrink-0 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
              {uploadingScorm ? "Uploading SCORM…" : saving ? "Saving…" : editingLesson ? "Update Lesson" : "Add Lesson"}
            </Button>
          </Box>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lesson</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteTarget?.title}</strong> and all learner progress for this lesson.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-red-500 hover:bg-red-600 text-white">
              {deleting ? "Deleting…" : "Delete Lesson"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Box>
  );
}
