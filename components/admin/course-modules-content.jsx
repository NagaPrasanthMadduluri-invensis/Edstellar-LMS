"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
  BookOpen,
  Eye,
  EyeOff,
  FileText,
} from "lucide-react";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { useAuth } from "@/hooks/use-auth";
import {
  fetchModules,
  createModule,
  updateModule,
  deleteModule,
} from "@/services/api/admin/admin-api";
import { ModuleLessons } from "@/components/admin/module-lessons";

function ModulesSkeleton() {
  return (
    <Box className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-20 w-full rounded-lg" />
      ))}
    </Box>
  );
}

const EMPTY_FORM = { title: "", description: "", sort_order: 0, is_active: true };

export function CourseModulesContent({ courseId }) {
  const { token } = useAuth();
  const [modules, setModules] = useState(null);
  const [error, setError] = useState(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadModules = useCallback(async () => {
    if (!token) return;
    try {
      const data = await fetchModules({ token, courseId });
      setModules(data.modules || []);
    } catch (err) {
      setError(err.message);
    }
  }, [token, courseId]);

  useEffect(() => {
    loadModules();
  }, [loadModules]);

  const handleCreate = () => {
    setEditingModule(null);
    setForm({ ...EMPTY_FORM, sort_order: (modules?.length || 0) + 1 });
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleEdit = (mod, e) => {
    e.stopPropagation();
    setEditingModule(mod);
    setForm({
      title: mod.title,
      description: mod.description || "",
      sort_order: mod.sort_order,
      is_active: mod.is_active,
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setFormErrors({});
    try {
      if (editingModule) {
        await updateModule({ token, moduleId: editingModule.id, data: form });
      } else {
        await createModule({ token, courseId, data: form });
      }
      setDialogOpen(false);
      await loadModules();
    } catch (err) {
      if (err.errors) setFormErrors(err.errors);
      else setFormErrors({ _general: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteModule({ token, moduleId: deleteTarget.id });
      setDeleteTarget(null);
      await loadModules();
    } catch (err) {
      setError(err.message);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleActive = async (mod, e) => {
    e.stopPropagation();
    try {
      await updateModule({ token, moduleId: mod.id, data: { is_active: !mod.is_active } });
      await loadModules();
    } catch (err) {
      setError(err.message);
    }
  };

  if (error && !modules) {
    return (
      <Card className="p-6">
        <Text as="p" className="text-red-600">Failed to load modules: {error}</Text>
      </Card>
    );
  }

  if (!modules) return <ModulesSkeleton />;

  return (
    <Box className="space-y-4">
      {/* Header */}
      <Box className="flex items-center justify-between">
        <Text as="p" className="text-sm text-muted-foreground">
          {modules.length} module{modules.length !== 1 ? "s" : ""}
        </Text>
        <Button size="sm" onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-1" />
          Add Module
        </Button>
      </Box>

      {error && <Text as="p" className="text-sm text-red-600">{error}</Text>}

      {/* Modules */}
      {modules.length === 0 ? (
        <Card className="p-12 text-center">
          <BookOpen className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <Text as="h3" className="text-base">No modules yet</Text>
          <Text as="p" className="text-sm text-muted-foreground mt-1">
            Create the first module for this course.
          </Text>
          <Button size="sm" className="mt-4" onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-1" />
            Add Module
          </Button>
        </Card>
      ) : (
        <Accordion type="multiple" className="space-y-2">
          {modules.map((mod) => (
            <AccordionItem key={mod.id} value={`mod-${mod.id}`} className="border rounded-lg px-0 not-last:border-b-0">
              <AccordionTrigger className="w-full hover:no-underline px-4 py-3 [&>svg[data-slot=accordion-trigger-icon]]:hidden">
                <Box className="flex items-center justify-between w-full gap-3">
                  <Box className="flex items-center gap-3 flex-1 min-w-0">
                    <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0 cursor-grab" />
                    <Box className="flex-1 min-w-0">
                      <Box className="flex items-center gap-2">
                        <Text as="p" className="text-sm font-semibold truncate">{mod.title}</Text>
                        <Badge
                          variant="secondary"
                          className={`text-[10px] shrink-0 ${mod.is_active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}
                        >
                          {mod.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </Box>
                      <Box className="flex items-center gap-3 mt-0.5">
                        {mod.description && (
                          <Text as="span" className="text-[11px] text-muted-foreground truncate max-w-xs">
                            {mod.description}
                          </Text>
                        )}
                        <Box className="flex items-center gap-1">
                          <FileText className="h-3 w-3 text-muted-foreground" />
                          <Text as="span" className="text-[11px] text-muted-foreground shrink-0">
                            {mod.lessons_count} lesson{mod.lessons_count !== 1 ? "s" : ""}
                          </Text>
                        </Box>
                        <Text as="span" className="text-[11px] text-muted-foreground shrink-0">
                          Order: {mod.sort_order}
                        </Text>
                      </Box>
                    </Box>
                  </Box>

                  <Box className="flex items-center gap-0.5 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => handleToggleActive(mod, e)}>
                      {mod.is_active ? <Eye className="h-4 w-4 text-emerald-600" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => handleEdit(mod, e)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(mod); }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </Box>
                </Box>
              </AccordionTrigger>

              <AccordionContent className="px-4 pb-3 pt-0">
                <ModuleLessons moduleId={mod.id} />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      {/* ── Module Create/Edit Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingModule ? "Edit Module" : "Create Module"}</DialogTitle>
            <DialogDescription>
              {editingModule ? "Update the module details below." : "Fill in the details to create a new module."}
            </DialogDescription>
          </DialogHeader>
          <Box className="space-y-4 py-2">
            <Box className="space-y-2">
              <Label htmlFor="mod-title">Title *</Label>
              <Input
                id="mod-title"
                placeholder="Module title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
              {formErrors.title && <Text as="p" className="text-xs text-red-600">{formErrors.title[0]}</Text>}
            </Box>
            <Box className="space-y-2">
              <Label htmlFor="mod-desc">Description</Label>
              <Textarea
                id="mod-desc"
                placeholder="Optional description"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </Box>
            <Box className="grid grid-cols-2 gap-4">
              <Box className="space-y-2">
                <Label htmlFor="mod-order">Sort Order</Label>
                <Input
                  id="mod-order"
                  type="number"
                  min={0}
                  value={form.sort_order}
                  onChange={(e) => setForm((f) => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
                />
              </Box>
              <Box className="space-y-2">
                <Label>Visible to Learners</Label>
                <Box className="flex items-center gap-2 pt-1.5">
                  <Switch
                    checked={form.is_active}
                    onCheckedChange={(checked) => setForm((f) => ({ ...f, is_active: checked }))}
                  />
                  <Text as="span" className="text-sm">{form.is_active ? "Active" : "Inactive"}</Text>
                </Box>
              </Box>
            </Box>
            {formErrors._general && <Text as="p" className="text-sm text-red-600">{formErrors._general}</Text>}
          </Box>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editingModule ? "Update Module" : "Create Module"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Module Delete Confirmation ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Module</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.title}&quot;?
              This will permanently delete all lessons within this module and any learner progress records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? "Deleting..." : "Delete Module"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Box>
  );
}
