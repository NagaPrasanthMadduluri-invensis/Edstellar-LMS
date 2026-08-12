"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus, Pencil, Trash2, GripVertical, BookOpen, Eye, EyeOff, FileText,
} from "lucide-react";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { useAuth } from "@/hooks/use-auth";
import {
  fetchModules, createModule, updateModule, deleteModule,
} from "@/services/api/admin/admin-api";
import { ModuleLessons } from "@/components/admin/module-lessons";

const EMPTY_FORM = { title: "", description: "", sort_order: 0, is_active: true };

export function CourseModulesContent({ courseId }) {
  const { user } = useAuth();
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
    if (!user) return;
    try {
      const data = await fetchModules({ courseId });
      setModules(data.modules || []);
    } catch (e) { setError(e.message); }
  }, [user, courseId]);

  useEffect(() => { loadModules(); }, [loadModules]);

  const handleCreate = () => {
    setEditingModule(null);
    setForm({ ...EMPTY_FORM, sort_order: (modules?.length || 0) + 1 });
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleEdit = (mod, e) => {
    e.stopPropagation();
    setEditingModule(mod);
    setForm({ title: mod.title, description: mod.description || "", sort_order: mod.sort_order, is_active: mod.is_active });
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { setFormErrors({ title: ["Title is required"] }); return; }
    setSaving(true); setFormErrors({});
    try {
      if (editingModule) {
        await updateModule({ moduleId: editingModule.id, data: form });
      } else {
        await createModule({ courseId, data: form });
      }
      setDialogOpen(false);
      await loadModules();
    } catch (e) {
      if (e.errors) setFormErrors(e.errors);
      else setFormErrors({ _general: e.message });
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteModule({ moduleId: deleteTarget.id });
      setDeleteTarget(null);
      await loadModules();
    } catch (e) { setError(e.message); setDeleteTarget(null); } finally { setDeleting(false); }
  };

  const handleToggleActive = async (mod, e) => {
    e.stopPropagation();
    try {
      await updateModule({ moduleId: mod.id, data: { is_active: !mod.is_active } });
      await loadModules();
    } catch (e) { setError(e.message); }
  };

  if (error && !modules) return (
    <Card className="p-6">
      <Text as="p" className="text-sm text-error">Failed to load modules: {error}</Text>
    </Card>
  );

  if (!modules) return (
    <Box className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
    </Box>
  );

  return (
    <Box className="space-y-4">
      <Box className="flex items-center justify-between">
        <Text as="p" className="text-sm text-muted-foreground">
          {modules.length} module{modules.length !== 1 ? "s" : ""}
        </Text>
        <Button size="sm" onClick={handleCreate} className="bg-navy hover:bg-navy-soft text-paper h-9">
          <Plus className="h-4 w-4 mr-1.5" />
          Add Module
        </Button>
      </Box>

      {error && (
        <Box className="bg-error/10 border border-error/30 rounded-lg px-3 py-2">
          <Text as="p" className="text-sm text-error">{error}</Text>
        </Box>
      )}

      {modules.length === 0 ? (
        <Card className="p-12 text-center">
          <BookOpen className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
          <Text as="h3" className="text-sm font-medium">No modules yet</Text>
          <Text as="p" className="text-xs text-muted-foreground mt-1">Create modules to organise your course lessons.</Text>
          <Button size="sm" className="mt-4 bg-navy hover:bg-navy-soft text-paper" onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add Module
          </Button>
        </Card>
      ) : (
        <Accordion type="multiple" className="space-y-2">
          {modules.map((mod) => (
            <AccordionItem key={mod.id} value={`mod-${mod.id}`} className="border rounded-lg px-0">
              <AccordionTrigger className="w-full hover:no-underline px-4 py-3 [&>svg[data-slot=accordion-trigger-icon]]:hidden">
                <Box className="flex items-center justify-between w-full gap-3">
                  <Box className="flex items-center gap-3 flex-1 min-w-0">
                    <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0 cursor-grab" />
                    <Box className="flex-1 min-w-0">
                      <Box className="flex items-center gap-2">
                        <Text as="p" className="text-sm font-semibold truncate">{mod.title}</Text>
                        <Badge className={`text-[10px] border-0 shrink-0 ${mod.is_active ? "bg-paper-cream text-navy" : "bg-paper-cream text-ink/60"}`}>
                          {mod.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </Box>
                      <Box className="flex items-center gap-4 mt-0.5">
                        {mod.description && (
                          <Text as="span" className="text-xs text-muted-foreground truncate max-w-xs">{mod.description}</Text>
                        )}
                        <Box className="flex items-center gap-1 shrink-0">
                          <FileText className="h-3 w-3 text-muted-foreground/60" />
                          <Text as="span" className="text-xs text-muted-foreground">
                            {mod.lessons_count} lesson{mod.lessons_count !== 1 ? "s" : ""}
                          </Text>
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                  <Box className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => handleToggleActive(mod, e)}>
                      {mod.is_active
                        ? <Eye className="h-4 w-4 text-navy" />
                        : <EyeOff className="h-4 w-4 text-muted-foreground" />
                      }
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => handleEdit(mod, e)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-error hover:text-error hover:bg-error/10"
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(mod); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </Box>
                </Box>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 pt-0">
                <ModuleLessons moduleId={mod.id} />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      {/* ── Module Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md gap-0 p-0 overflow-hidden">
          <Box className="px-6 py-5 border-b bg-white">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">{editingModule ? "Edit Module" : "Add Module"}</DialogTitle>
              <Text as="p" className="text-sm text-muted-foreground mt-0.5">Modules group related lessons together inside a course.</Text>
            </DialogHeader>
          </Box>
          <Box className="px-6 py-5 space-y-4">
            <Box className="space-y-1.5">
              <Label className="text-sm font-medium text-ink/80">
                Title <Text as="span" className="text-error">*</Text>
              </Label>
              <Input
                placeholder="e.g. Introduction to the Course"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="h-10 bg-paper-warm border-border placeholder:text-ink/35 focus-visible:ring-2 focus-visible:ring-navy/20 focus-visible:border-navy/20 transition-colors"
              />
              {formErrors.title && <Text as="p" className="text-xs text-error mt-1">{formErrors.title[0]}</Text>}
            </Box>
            <Box className="space-y-1.5">
              <Label className="text-sm font-medium text-ink/80">Description</Label>
              <Textarea
                placeholder="What this module covers…"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
                className="bg-paper-warm border-border placeholder:text-ink/35 focus-visible:ring-2 focus-visible:ring-navy/20 focus-visible:border-navy/20 resize-none transition-colors"
              />
            </Box>
            <Box className="grid grid-cols-2 gap-4">
              <Box className="space-y-1.5">
                <Label className="text-sm font-medium text-ink/80">Sort Order</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.sort_order}
                  onChange={(e) => setForm((f) => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
                  className="h-10 bg-paper-warm border-border focus-visible:ring-2 focus-visible:ring-navy/20 focus-visible:border-navy/20 transition-colors"
                />
              </Box>
              <Box className="space-y-1.5">
                <Label className="text-sm font-medium text-ink/80">Visibility</Label>
                <Box className="flex items-center gap-2.5 h-10 px-3 rounded-lg bg-paper-warm border border-border">
                  <Switch
                    checked={form.is_active}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
                  />
                  <Text as="span" className="text-sm text-muted-foreground">{form.is_active ? "Active" : "Inactive"}</Text>
                </Box>
              </Box>
            </Box>
            {formErrors._general && (
              <Box className="bg-error/10 border border-error/30 rounded-xl px-4 py-3">
                <Text as="p" className="text-sm text-error">{formErrors._general}</Text>
              </Box>
            )}
          </Box>
          <Box className="px-6 py-4 border-t bg-paper-warm flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-navy hover:bg-navy-soft text-paper">
              {saving ? "Saving…" : editingModule ? "Update Module" : "Create Module"}
            </Button>
          </Box>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Module</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteTarget?.title}</strong> and all its lessons. Learner progress for this module will also be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-error hover:bg-error text-white">
              {deleting ? "Deleting…" : "Delete Module"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Box>
  );
}
