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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  PlayCircle,
  FileText,
  ExternalLink,
  HelpCircle,
  Eye,
  EyeOff,
  Clock,
  Sparkles,
} from "lucide-react";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { useAuth } from "@/hooks/use-auth";
import {
  fetchLessons,
  createLesson,
  updateLesson,
  deleteLesson,
} from "@/services/api/admin/admin-api";

const CONTENT_TYPE_CONFIG = {
  video: { label: "Video", icon: PlayCircle, color: "bg-blue-100 text-blue-600" },
  pdf: { label: "PDF", icon: FileText, color: "bg-orange-100 text-orange-600" },
  external: { label: "External", icon: ExternalLink, color: "bg-violet-100 text-violet-600" },
  quiz: { label: "Quiz", icon: HelpCircle, color: "bg-emerald-100 text-emerald-600" },
};

const EMPTY_LESSON = {
  title: "",
  description: "",
  content_type: "video",
  content_url: "",
  duration_minutes: "",
  sort_order: 0,
  is_preview: false,
  is_active: true,
};

export function ModuleLessons({ moduleId }) {
  const { token } = useAuth();
  const [lessons, setLessons] = useState(null);
  const [error, setError] = useState(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const [form, setForm] = useState(EMPTY_LESSON);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadLessons = useCallback(async () => {
    if (!token) return;
    try {
      const data = await fetchLessons({ token, moduleId });
      setLessons(data.lessons || []);
    } catch (err) {
      setError(err.message);
    }
  }, [token, moduleId]);

  useEffect(() => {
    loadLessons();
  }, [loadLessons]);

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
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setFormErrors({});

    const payload = {
      ...form,
      duration_minutes: form.duration_minutes === "" ? null : Number(form.duration_minutes),
      content_url: form.content_url || null,
      description: form.description || null,
    };

    try {
      if (editingLesson) {
        await updateLesson({ token, lessonId: editingLesson.id, data: payload });
      } else {
        await createLesson({ token, moduleId, data: payload });
      }
      setDialogOpen(false);
      await loadLessons();
    } catch (err) {
      if (err.errors) {
        setFormErrors(err.errors);
      } else {
        setFormErrors({ _general: err.message });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteLesson({ token, lessonId: deleteTarget.id });
      setDeleteTarget(null);
      await loadLessons();
    } catch (err) {
      setError(err.message);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleActive = async (lesson) => {
    try {
      await updateLesson({
        token,
        lessonId: lesson.id,
        data: { is_active: !lesson.is_active },
      });
      await loadLessons();
    } catch (err) {
      setError(err.message);
    }
  };

  if (error && !lessons) {
    return <Text as="p" className="text-xs text-red-600 py-2 px-2">{error}</Text>;
  }

  if (!lessons) {
    return (
      <Box className="space-y-2 py-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-md" />
        ))}
      </Box>
    );
  }

  return (
    <Box className="space-y-2 pt-1">
      {error && <Text as="p" className="text-xs text-red-600">{error}</Text>}

      {/* Lessons list */}
      {lessons.length === 0 ? (
        <Box className="text-center py-4">
          <Text as="p" className="text-xs text-muted-foreground">No lessons in this module.</Text>
        </Box>
      ) : (
        <Box className="space-y-1">
          {lessons.map((lesson) => {
            const typeCfg = CONTENT_TYPE_CONFIG[lesson.content_type] || CONTENT_TYPE_CONFIG.video;
            const TypeIcon = typeCfg.icon;

            return (
              <Box
                key={lesson.id}
                className="flex items-center gap-2 px-3 py-2 rounded-md border bg-muted/30 hover:bg-muted/60 transition-colors"
              >
                <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0 cursor-grab" />
                <TypeIcon className="h-4 w-4 shrink-0 text-muted-foreground" />

                <Box className="flex-1 min-w-0">
                  <Box className="flex items-center gap-1.5">
                    <Text as="p" className="text-xs font-semibold truncate">{lesson.title}</Text>
                    <Badge variant="secondary" className={`text-[9px] px-1 h-4 shrink-0 ${typeCfg.color}`}>
                      {typeCfg.label}
                    </Badge>
                    {lesson.is_preview && (
                      <Badge variant="secondary" className="text-[9px] px-1 h-4 bg-amber-100 text-amber-700 shrink-0">
                        <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                        Preview
                      </Badge>
                    )}
                    {!lesson.is_active && (
                      <Badge variant="secondary" className="text-[9px] px-1 h-4 bg-gray-100 text-gray-500 shrink-0">
                        Inactive
                      </Badge>
                    )}
                  </Box>
                  <Box className="flex items-center gap-2 mt-0.5">
                    {lesson.duration_minutes && (
                      <Box className="flex items-center gap-0.5">
                        <Clock className="h-2.5 w-2.5 text-muted-foreground" />
                        <Text as="span" className="text-[10px] text-muted-foreground">{lesson.duration_minutes} min</Text>
                      </Box>
                    )}
                    <Text as="span" className="text-[10px] text-muted-foreground">Order: {lesson.sort_order}</Text>
                  </Box>
                </Box>

                <Box className="flex items-center gap-0.5 shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleToggleActive(lesson)}>
                    {lesson.is_active ? <Eye className="h-3.5 w-3.5 text-emerald-600" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(lesson)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => setDeleteTarget(lesson)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}

      {/* Add lesson button */}
      <Button variant="outline" size="sm" className="w-full text-xs h-7" onClick={handleCreate}>
        <Plus className="h-3.5 w-3.5 mr-1" />
        Add Lesson
      </Button>

      {/* ── Create / Edit Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingLesson ? "Edit Lesson" : "Create Lesson"}</DialogTitle>
            <DialogDescription>
              {editingLesson ? "Update the lesson details." : "Add a new lesson to this module."}
            </DialogDescription>
          </DialogHeader>

          <Box className="space-y-4 py-2">
            <Box className="space-y-2">
              <Label htmlFor="les-title">Title *</Label>
              <Input
                id="les-title"
                placeholder="Lesson title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
              {formErrors.title && <Text as="p" className="text-xs text-red-600">{formErrors.title[0]}</Text>}
            </Box>

            <Box className="space-y-2">
              <Label htmlFor="les-desc">Description</Label>
              <Textarea
                id="les-desc"
                placeholder="Optional description"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
              />
            </Box>

            <Box className="grid grid-cols-2 gap-4">
              <Box className="space-y-2">
                <Label>Content Type *</Label>
                <Select
                  value={form.content_type}
                  onValueChange={(val) => setForm((f) => ({ ...f, content_type: val }))}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="video">Video</SelectItem>
                  </SelectContent>
                </Select>
                {formErrors.content_type && <Text as="p" className="text-xs text-red-600">{formErrors.content_type[0]}</Text>}
              </Box>

              <Box className="space-y-2">
                <Label htmlFor="les-duration">Duration (minutes)</Label>
                <Input
                  id="les-duration"
                  type="number"
                  min={0}
                  placeholder="e.g. 30"
                  value={form.duration_minutes}
                  onChange={(e) => setForm((f) => ({ ...f, duration_minutes: e.target.value }))}
                />
              </Box>
            </Box>

            {form.content_type !== "quiz" && (
              <Box className="space-y-2">
                <Label htmlFor="les-url">Content URL</Label>
                <Input
                  id="les-url"
                  placeholder={
                    form.content_type === "video"
                      ? "https://youtu.be/... or https://www.youtube.com/watch?v=..."
                      : form.content_type === "pdf"
                      ? "https://s3.amazonaws.com/..."
                      : "https://portal.example.com/..."
                  }
                  value={form.content_url}
                  onChange={(e) => setForm((f) => ({ ...f, content_url: e.target.value }))}
                />
                {formErrors.content_url && <Text as="p" className="text-xs text-red-600">{formErrors.content_url[0]}</Text>}
              </Box>
            )}

            <Box className="grid grid-cols-3 gap-4">
              <Box className="space-y-2">
                <Label htmlFor="les-order">Sort Order</Label>
                <Input
                  id="les-order"
                  type="number"
                  min={0}
                  value={form.sort_order}
                  onChange={(e) => setForm((f) => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
                />
              </Box>
              <Box className="space-y-2">
                <Label>Preview</Label>
                <Box className="flex items-center gap-2 pt-1.5">
                  <Switch
                    checked={form.is_preview}
                    onCheckedChange={(checked) => setForm((f) => ({ ...f, is_preview: checked }))}
                  />
                  <Text as="span" className="text-xs">{form.is_preview ? "Yes" : "No"}</Text>
                </Box>
              </Box>
              <Box className="space-y-2">
                <Label>Active</Label>
                <Box className="flex items-center gap-2 pt-1.5">
                  <Switch
                    checked={form.is_active}
                    onCheckedChange={(checked) => setForm((f) => ({ ...f, is_active: checked }))}
                  />
                  <Text as="span" className="text-xs">{form.is_active ? "Yes" : "No"}</Text>
                </Box>
              </Box>
            </Box>

            {formErrors._general && <Text as="p" className="text-sm text-red-600">{formErrors._general}</Text>}
          </Box>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editingLesson ? "Update Lesson" : "Create Lesson"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lesson</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.title}&quot;?
              This will also delete any learner progress for this lesson.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? "Deleting..." : "Delete Lesson"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Box>
  );
}
