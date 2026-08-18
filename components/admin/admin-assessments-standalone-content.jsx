"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import { ClipboardList, Plus, Pencil, Trash2, BookOpen, HelpCircle } from "lucide-react";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api-client";
import {
  fetchAdminCourses,
  createAssessment,
  fetchAssessmentDetail,
  updateAssessment,
  deleteAssessment,
  addQuestion,
  updateQuestion,
  deleteQuestion,
} from "@/services/api/admin/admin-api";

export function AdminAssessmentsStandaloneContent() {
  const { user } = useAuth();
  const [assessments, setAssessments] = useState(null);
  const [error, setError] = useState(null);

  // Create dialog. A course must be chosen before an assessment can exist —
  // assessments are authored under a course, never free-floating.
  const [courses, setCourses] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    course_id: "", title: "", description: "", passing_score: 60,
  });
  const [creating, setCreating] = useState(false);

  // Edit assessment meta dialog
  const [editMeta, setEditMeta] = useState(null);
  const [metaForm, setMetaForm] = useState({});
  const [metaSaving, setMetaSaving] = useState(false);

  // Question builder dialog
  const [qDialog, setQDialog] = useState(null); // { assessmentId, question?: existingQ }
  const [qForm, setQForm] = useState({ question_text: "", options: ["", "", "", ""], correct_index: 0 });
  const [qSaving, setQSaving] = useState(false);
  const [qError, setQError] = useState("");

  // Delete dialogs
  const [deleteAssessTarget, setDeleteAssessTarget] = useState(null);
  const [deleteQTarget, setDeleteQTarget] = useState(null);

  // Expanded assessment (to show questions inline)
  const [expanded, setExpanded] = useState(null);
  const [expandedData, setExpandedData] = useState({});

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const d = await apiClient("/api/admin/all-assessments");
      setAssessments(d.assessments || []);
    } catch (e) {
      setError(e.message);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!user) return;
    fetchAdminCourses().then((d) => setCourses(d.courses || [])).catch(() => {});
  }, [user]);

  const handleCreate = async () => {
    if (!createForm.course_id) { setError("Pick a course for this assessment."); return; }
    if (!createForm.title.trim()) { setError("Title is required."); return; }
    setCreating(true);
    try {
      await createAssessment({
        courseId: Number(createForm.course_id),
        data: {
          title: createForm.title.trim(),
          description: createForm.description || null,
          passing_score: Number(createForm.passing_score) || 60,
        },
      });
      setCreateOpen(false);
      setCreateForm({ course_id: "", title: "", description: "", passing_score: 60 });
      setError(null);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  };

  /** Header + create dialog, shown whether or not any assessments exist yet. */
  const CreateBar = () => (
    <Box className="flex items-center justify-between gap-3 flex-wrap">
      <Text as="p" className="text-xs text-ink/55">
        Assessments are built here against a course, then attached on that
        course&apos;s Assessments tab before learners can see them.
      </Text>
      <Button
        onClick={() => setCreateOpen(true)}
        className="bg-navy hover:bg-navy-soft text-paper shrink-0"
        size="sm"
      >
        <Plus className="h-4 w-4 mr-1.5" />
        New Assessment
      </Button>
    </Box>
  );

  const createDialog = (
    <Dialog open={createOpen} onOpenChange={(o) => { if (!creating) setCreateOpen(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Assessment</DialogTitle>
          <DialogDescription>
            Choose the course it belongs to. It stays detached until you attach
            it on that course, so learners will not see it yet.
          </DialogDescription>
        </DialogHeader>

        <Box className="space-y-4">
          <Box className="space-y-1.5">
            <Label className="text-sm font-medium text-ink/80">
              Course <Text as="span" className="text-error">*</Text>
            </Label>
            <Select
              value={String(createForm.course_id || "")}
              onValueChange={(v) => setCreateForm((f) => ({ ...f, course_id: v }))}
            >
              <SelectTrigger className="h-10 bg-white"><SelectValue placeholder="Select a course" /></SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Box>

          <Box className="space-y-1.5">
            <Label className="text-sm font-medium text-ink/80">
              Title <Text as="span" className="text-error">*</Text>
            </Label>
            <Input
              value={createForm.title}
              placeholder="e.g. Leadership Fundamentals Quiz"
              onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
              className="h-10 bg-white"
            />
          </Box>

          <Box className="space-y-1.5">
            <Label className="text-sm font-medium text-ink/80">Description</Label>
            <Input
              value={createForm.description}
              onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
              className="h-10 bg-white"
            />
          </Box>

          <Box className="space-y-1.5">
            <Label className="text-sm font-medium text-ink/80">Pass mark (%)</Label>
            <Input
              type="number" min={1} max={100}
              value={createForm.passing_score}
              onChange={(e) => setCreateForm((f) => ({ ...f, passing_score: e.target.value }))}
              className="h-10 bg-white"
            />
          </Box>
        </Box>

        <DialogFooter>
          <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>Cancel</Button>
          <Button
            onClick={handleCreate}
            disabled={creating || !createForm.course_id || !createForm.title.trim()}
            className="bg-navy hover:bg-navy-soft text-paper"
          >
            {creating ? "Creating…" : "Create Assessment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const loadExpandedDetail = async (assessmentId) => {
    try {
      const d = await fetchAssessmentDetail({ assessmentId });
      setExpandedData((prev) => ({ ...prev, [assessmentId]: d.assessment }));
    } catch {}
  };

  const toggleExpand = (id) => {
    if (expanded === id) {
      setExpanded(null);
    } else {
      setExpanded(id);
      loadExpandedDetail(id);
    }
  };

  const openEditMeta = (a) => {
    setMetaForm({ title: a.title, description: a.description || "", passing_score: a.passing_score });
    setEditMeta(a);
  };

  const handleSaveMeta = async () => {
    if (!metaForm.title?.trim()) return;
    setMetaSaving(true);
    try {
      await updateAssessment({ assessmentId: editMeta.id, data: metaForm });
      setEditMeta(null);
      load();
      if (expanded === editMeta.id) loadExpandedDetail(editMeta.id);
    } catch (e) {
      setError(e.message);
    } finally {
      setMetaSaving(false);
    }
  };

  const handleDeleteAssessment = async () => {
    if (!deleteAssessTarget) return;
    try {
      await deleteAssessment({ assessmentId: deleteAssessTarget.id });
      setDeleteAssessTarget(null);
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  const openAddQuestion = (assessmentId) => {
    setQError("");
    setQForm({ question_text: "", options: ["", "", "", ""], correct_index: 0 });
    setQDialog({ assessmentId });
  };

  const openEditQuestion = (assessmentId, q) => {
    setQError("");
    const options = q.options?.map((o) => o.option_text) || ["", "", "", ""];
    const correct_index = q.options?.findIndex((o) => o.is_correct) ?? 0;
    setQForm({ question_text: q.question_text, options, correct_index });
    setQDialog({ assessmentId, question: q });
  };

  const handleSaveQuestion = async () => {
    setQError("");
    if (!qForm.question_text.trim()) {
      setQError("Question text is required.");
      return;
    }
    const filledOptions = qForm.options
      .map((text, i) => ({ text, originalIndex: i }))
      .filter((o) => o.text.trim());
    if (filledOptions.length < 2) {
      setQError("Please fill in at least 2 options.");
      return;
    }
    const hasCorrect = filledOptions.some((o) => o.originalIndex === qForm.correct_index);
    if (!hasCorrect) {
      setQError("Please select the correct answer from the filled options.");
      return;
    }
    setQSaving(true);
    const savedAssessmentId = qDialog.assessmentId;
    try {
      const payload = {
        question_text: qForm.question_text.trim(),
        options: filledOptions.map((o) => ({
          option_text: o.text.trim(),
          is_correct: o.originalIndex === qForm.correct_index,
        })),
      };
      if (qDialog.question) {
        await updateQuestion({ questionId: qDialog.question.id, data: payload });
      } else {
        await addQuestion({ assessmentId: qDialog.assessmentId, data: payload });
      }
      setQDialog(null);
      load();
      loadExpandedDetail(savedAssessmentId);
    } catch (e) {
      setQError(e.message);
    } finally {
      setQSaving(false);
    }
  };

  const handleDeleteQuestion = async () => {
    if (!deleteQTarget) return;
    try {
      await deleteQuestion({ questionId: deleteQTarget.id });
      setDeleteQTarget(null);
      load();
      if (expanded) loadExpandedDetail(expanded);
    } catch (e) {
      setError(e.message);
    }
  };

  if (error) return <Card className="p-6 text-center"><Text as="p" className="text-error text-sm">{error}</Text></Card>;
  if (!assessments) return (
    <Box className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</Box>
  );

  if (assessments.length === 0) return (
    <Box className="space-y-3">
      <CreateBar />
      <Card className="p-16 text-center">
        <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
        <Text as="p" className="text-sm text-muted-foreground">
          No assessments yet. Create one against a course to get started.
        </Text>
      </Card>
      {createDialog}
    </Box>
  );

  return (
    <Box className="space-y-3">
      {error && <Text as="p" className="text-sm text-error mb-2">{error}</Text>}
      <CreateBar />
      {createDialog}

      {assessments.map((a) => {
        const isExpanded = expanded === a.id;
        const detail = expandedData[a.id];
        return (
          <Card key={a.id} className="overflow-hidden">
            <Box className="flex items-start justify-between gap-4 px-5 py-4">
              <Box className="flex items-start gap-3 flex-1 min-w-0">
                <Box className="w-9 h-9 rounded-xl bg-paper-cream flex items-center justify-center shrink-0">
                  <ClipboardList className="h-4 w-4 text-navy" />
                </Box>
                <Box className="flex-1 min-w-0">
                  <Text as="p" className="text-sm font-semibold">{a.title}</Text>
                  <Box className="flex flex-wrap items-center gap-2 mt-1">
                    <Box className="flex items-center gap-1">
                      <BookOpen className="h-3 w-3 text-muted-foreground" />
                      <Text as="span" className="text-[10px] text-muted-foreground">{a.course_name}</Text>
                    </Box>
                    <Badge variant="secondary" className="text-[10px] bg-paper-cream text-navy px-1.5">
                      <HelpCircle className="h-2.5 w-2.5 mr-0.5" />
                      {a.question_count} question{a.question_count !== 1 ? "s" : ""}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px] bg-paper-cream text-ink/70 px-1.5">
                      Pass: {a.passing_score}%
                    </Badge>
                    {/* Fill weight carries the state — attached is the heavy one. */}
                    <Badge className={`text-[10px] px-1.5 border-0 ${
                      a.is_active ? "bg-navy text-paper" : "bg-paper-warm text-ink/55"
                    }`}>
                      {a.is_active ? "Attached" : "Not attached"}
                    </Badge>
                  </Box>
                </Box>
              </Box>
              <Box className="flex items-center gap-1.5 shrink-0">
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => toggleExpand(a.id)}>
                  {isExpanded ? "Hide" : "Edit Questions"}
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditMeta(a)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-error hover:text-error hover:bg-error/10"
                  onClick={() => setDeleteAssessTarget(a)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </Box>
            </Box>

            {/* Expanded questions */}
            {isExpanded && (
              <Box className="border-t px-5 py-4 space-y-3 bg-muted/20">
                <Box className="flex items-center justify-between">
                  <Text as="p" className="text-xs font-semibold">Questions</Text>
                  <Button size="sm" className="h-7 text-xs" onClick={() => openAddQuestion(a.id)}>
                    <Plus className="h-3 w-3 mr-1" /> Add Question
                  </Button>
                </Box>
                {!detail ? (
                  <Box className="space-y-2">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</Box>
                ) : detail.questions?.length === 0 ? (
                  <Text as="p" className="text-xs text-muted-foreground py-3 text-center">No questions yet. Add the first one.</Text>
                ) : (
                  <Box className="space-y-2">
                    {detail.questions?.map((q, qi) => {
                      const correctOpt = q.options?.find((o) => o.is_correct);
                      return (
                        <Box key={q.id} className="flex items-start justify-between gap-3 bg-background rounded-lg p-3 border">
                          <Box className="flex-1 min-w-0">
                            <Text as="p" className="text-xs font-medium">
                              <Text as="span" className="text-muted-foreground mr-1">Q{qi + 1}.</Text>
                              {q.question_text}
                            </Text>
                            {correctOpt && (
                              <Text as="p" className="text-[10px] text-navy mt-0.5">
                                ✓ {correctOpt.option_text}
                              </Text>
                            )}
                          </Box>
                          <Box className="flex items-center gap-0.5 shrink-0">
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditQuestion(a.id, q)}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-error hover:text-error hover:bg-error/10"
                              onClick={() => setDeleteQTarget(q)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                )}
              </Box>
            )}
          </Card>
        );
      })}

      {/* ── Edit Assessment Meta Dialog ── */}
      <Dialog open={!!editMeta} onOpenChange={(open) => !open && setEditMeta(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Assessment</DialogTitle>
            <DialogDescription>Update the assessment title, description, and passing score.</DialogDescription>
          </DialogHeader>
          <Box className="space-y-3 py-2">
            <Box className="space-y-1.5">
              <Label>Title <Text as="span" className="text-error">*</Text></Label>
              <Input value={metaForm.title || ""} onChange={(e) => setMetaForm((p) => ({ ...p, title: e.target.value }))} />
            </Box>
            <Box className="space-y-1.5">
              <Label>Description</Label>
              <Textarea rows={2} value={metaForm.description || ""} onChange={(e) => setMetaForm((p) => ({ ...p, description: e.target.value }))} />
            </Box>
            <Box className="space-y-1.5">
              <Label>Passing Score (%)</Label>
              <Input type="number" min={0} max={100} value={metaForm.passing_score || 60} onChange={(e) => setMetaForm((p) => ({ ...p, passing_score: parseInt(e.target.value) || 60 }))} />
            </Box>
          </Box>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMeta(null)}>Cancel</Button>
            <Button onClick={handleSaveMeta} disabled={metaSaving}>{metaSaving ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add/Edit Question Dialog ── */}
      <Dialog open={!!qDialog} onOpenChange={(open) => { if (!open) { setQDialog(null); setQError(""); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{qDialog?.question ? "Edit Question" : "Add Question"}</DialogTitle>
          </DialogHeader>
          <Box className="space-y-4 py-2">
            <Box className="space-y-1.5">
              <Label>Question Text <Text as="span" className="text-error">*</Text></Label>
              <Textarea
                rows={2}
                placeholder="Enter the question..."
                value={qForm.question_text}
                onChange={(e) => setQForm((p) => ({ ...p, question_text: e.target.value }))}
              />
            </Box>
            <Box className="space-y-2">
              <Label>Options <Text as="span" className="text-xs text-muted-foreground">(radio = correct answer)</Text></Label>
              {qForm.options.map((opt, i) => (
                <Box key={i} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="correct"
                    checked={qForm.correct_index === i}
                    onChange={() => setQForm((p) => ({ ...p, correct_index: i }))}
                    className="h-4 w-4 accent-indigo-500 shrink-0"
                  />
                  <Input
                    placeholder={`Option ${["A", "B", "C", "D"][i]}`}
                    value={opt}
                    onChange={(e) => {
                      const opts = [...qForm.options];
                      opts[i] = e.target.value;
                      setQForm((p) => ({ ...p, options: opts }));
                    }}
                    className="h-8 text-sm"
                  />
                </Box>
              ))}
              <Text as="p" className="text-[10px] text-muted-foreground">Fill at least 2 options. Select the radio button next to the correct answer.</Text>
            </Box>
            {qError && <Text as="p" className="text-sm text-error">{qError}</Text>}
          </Box>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setQDialog(null); setQError(""); }}>Cancel</Button>
            <Button onClick={handleSaveQuestion} disabled={qSaving}>{qSaving ? "Saving..." : qDialog?.question ? "Update" : "Add Question"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Assessment Confirmation ── */}
      <AlertDialog open={!!deleteAssessTarget} onOpenChange={(open) => !open && setDeleteAssessTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Assessment</AlertDialogTitle>
            <AlertDialogDescription>
              Delete &quot;{deleteAssessTarget?.title}&quot;? All questions and learner attempts will also be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAssessment} className="bg-error hover:bg-error text-white">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Delete Question Confirmation ── */}
      <AlertDialog open={!!deleteQTarget} onOpenChange={(open) => !open && setDeleteQTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Question</AlertDialogTitle>
            <AlertDialogDescription>Remove this question and all associated learner answers?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteQuestion} className="bg-error hover:bg-error text-white">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Box>
  );
}
