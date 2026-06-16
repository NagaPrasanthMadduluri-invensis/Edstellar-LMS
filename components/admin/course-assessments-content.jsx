"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  ClipboardList, Plus, Pencil, Trash2, CheckCircle2, BarChart3,
} from "lucide-react";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { useAuth } from "@/hooks/use-auth";
import {
  fetchAssessments, createAssessment, updateAssessment, deleteAssessment,
  fetchAssessmentDetail, addQuestion, updateQuestion, deleteQuestion,
} from "@/services/api/admin/admin-api";

const EMPTY_ASSESSMENT = { title: "", description: "", passing_score: 60 };
const EMPTY_QUESTION = {
  question_text: "",
  marks: 1,
  options: [
    { option_text: "", is_correct: true  },
    { option_text: "", is_correct: false },
    { option_text: "", is_correct: false },
    { option_text: "", is_correct: false },
  ],
};

export function CourseAssessmentsContent({ courseId }) {
  const { token } = useAuth();
  const [assessments, setAssessments] = useState(null);
  const [error, setError] = useState(null);

  const [aDialog, setADialog] = useState(false);
  const [aForm, setAForm] = useState(EMPTY_ASSESSMENT);
  const [editingA, setEditingA] = useState(null);
  const [aSaving, setASaving] = useState(false);
  const [aError, setAError] = useState(null);
  const [deleteAId, setDeleteAId] = useState(null);

  const [qDialog, setQDialog] = useState(false);
  const [qForm, setQForm] = useState(EMPTY_QUESTION);
  const [editingQ, setEditingQ] = useState(null);
  const [activeAId, setActiveAId] = useState(null);
  const [qSaving, setQSaving] = useState(false);
  const [qError, setQError] = useState(null);
  const [deleteQId, setDeleteQId] = useState(null);

  const loadAssessments = useCallback(async () => {
    if (!token) return;
    setError(null);
    try {
      const d = await fetchAssessments({ token, courseId });
      const list = d.assessments || [];
      const withQ = await Promise.all(list.map(async (a) => {
        try {
          const detail = await fetchAssessmentDetail({ token, assessmentId: a.id });
          return { ...a, questions: detail.questions || [] };
        } catch { return { ...a, questions: [] }; }
      }));
      setAssessments(withQ);
    } catch (e) { setError(e.message); }
  }, [token, courseId]);

  useEffect(() => { loadAssessments(); }, [loadAssessments]);

  const openCreateA = () => { setEditingA(null); setAForm(EMPTY_ASSESSMENT); setAError(null); setADialog(true); };
  const openEditA = (a) => {
    setEditingA(a);
    setAForm({ title: a.title, description: a.description || "", passing_score: a.passing_score });
    setAError(null); setADialog(true);
  };

  const handleSaveA = async () => {
    if (!aForm.title.trim()) { setAError("Title is required"); return; }
    setASaving(true); setAError(null);
    try {
      if (editingA) {
        await updateAssessment({ token, assessmentId: editingA.id, data: { ...aForm, is_active: editingA.is_active } });
      } else {
        await createAssessment({ token, courseId, data: aForm });
      }
      setADialog(false);
      loadAssessments();
    } catch (e) { setAError(e.message); } finally { setASaving(false); }
  };

  const handleDeleteA = async () => {
    if (!deleteAId) return;
    await deleteAssessment({ token, assessmentId: deleteAId }).catch(() => {});
    setDeleteAId(null);
    loadAssessments();
  };

  const openAddQ = (assessmentId) => {
    setActiveAId(assessmentId);
    setEditingQ(null);
    setQForm(EMPTY_QUESTION);
    setQError(null);
    setQDialog(true);
  };

  const openEditQ = (assessmentId, q) => {
    setActiveAId(assessmentId);
    setEditingQ(q);
    setQForm({
      question_text: q.question_text,
      marks: q.marks,
      options: q.options.map((o) => ({
        option_text: o.option_text,
        is_correct: o.is_correct === 1 || o.is_correct === true,
      })),
    });
    setQError(null);
    setQDialog(true);
  };

  const handleSaveQ = async () => {
    if (!qForm.question_text.trim()) { setQError("Question text is required"); return; }
    if (qForm.options.some((o) => !o.option_text.trim())) { setQError("All options must have text"); return; }
    if (!qForm.options.some((o) => o.is_correct)) { setQError("Select the correct answer"); return; }
    setQSaving(true); setQError(null);
    try {
      const payload = { question_text: qForm.question_text.trim(), marks: qForm.marks, options: qForm.options };
      if (editingQ) {
        await updateQuestion({ token, questionId: editingQ.id, data: payload });
      } else {
        await addQuestion({ token, assessmentId: activeAId, data: payload });
      }
      setQDialog(false);
      loadAssessments();
    } catch (e) { setQError(e.message); } finally { setQSaving(false); }
  };

  const handleDeleteQ = async () => {
    if (!deleteQId) return;
    await deleteQuestion({ token, questionId: deleteQId }).catch(() => {});
    setDeleteQId(null);
    loadAssessments();
  };

  if (error) return (
    <Card className="p-6 text-center">
      <Text as="p" className="text-red-500 text-sm">{error}</Text>
    </Card>
  );

  if (!assessments) return (
    <Box className="space-y-3">
      {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
    </Box>
  );

  return (
    <Box className="space-y-4">
      <Box className="flex items-center justify-between">
        <Text as="p" className="text-sm text-muted-foreground">
          {assessments.length} assessment{assessments.length !== 1 ? "s" : ""}
        </Text>
        <Button size="sm" onClick={openCreateA} className="bg-blue-500 hover:bg-blue-600 text-white h-9">
          <Plus className="h-4 w-4 mr-1.5" />
          Add Assessment
        </Button>
      </Box>

      {assessments.length === 0 ? (
        <Card className="p-12 text-center">
          <ClipboardList className="h-10 w-10 mx-auto text-muted-foreground/25 mb-3" />
          <Text as="p" className="text-sm text-muted-foreground">No assessments yet.</Text>
          <Button size="sm" onClick={openCreateA} className="mt-3 bg-blue-500 hover:bg-blue-600 text-white">
            <Plus className="h-4 w-4 mr-1.5" />
            Create Assessment
          </Button>
        </Card>
      ) : (
        <Box className="space-y-4">
          {assessments.map((a) => (
            <Card key={a.id} className="overflow-hidden border-l-4 border-l-violet-500">
              <CardHeader className="py-3 px-4 flex flex-row items-center justify-between gap-2">
                <Box className="flex items-center gap-3 flex-1 min-w-0">
                  <Box className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                    <ClipboardList className="h-5 w-5 text-violet-600" />
                  </Box>
                  <Box className="flex-1 min-w-0">
                    <Text as="p" className="text-sm font-bold truncate">{a.title}</Text>
                    <Box className="flex items-center gap-3 mt-0.5">
                      <Box className="flex items-center gap-1 text-muted-foreground">
                        <BarChart3 className="h-3 w-3" />
                        <Text as="span" className="text-xs">Pass: {a.passing_score}%</Text>
                      </Box>
                      <Badge className="text-[10px] border-0 bg-violet-100 text-violet-700">
                        {a.questions?.length ?? 0} question{(a.questions?.length ?? 0) !== 1 ? "s" : ""}
                      </Badge>
                      {a.attempts_count > 0 && (
                        <Badge className="text-[10px] border-0 bg-amber-100 text-amber-700">
                          {a.attempts_count} attempt{a.attempts_count !== 1 ? "s" : ""}
                        </Badge>
                      )}
                    </Box>
                  </Box>
                </Box>
                <Box className="flex items-center gap-1 shrink-0">
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openEditA(a)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={() => setDeleteAId(a.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </Box>
              </CardHeader>

              <CardContent className="px-4 pb-4 pt-0">
                <Box className="space-y-2 mb-3">
                  {(a.questions || []).map((q, idx) => (
                    <Box key={q.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border group hover:bg-muted/50 transition-colors">
                      <Box className="w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center text-[11px] font-bold text-violet-600 shrink-0 mt-0.5">
                        {idx + 1}
                      </Box>
                      <Box className="flex-1 min-w-0">
                        <Text as="p" className="text-sm font-medium leading-snug">{q.question_text}</Text>
                        <Box className="flex items-center gap-2 mt-2 flex-wrap">
                          {q.options.map((o) => (
                            <Box
                              key={o.id}
                              className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md border ${
                                o.is_correct
                                  ? "bg-emerald-50 border-emerald-200 text-emerald-700 font-semibold"
                                  : "bg-muted border-border text-muted-foreground"
                              }`}
                            >
                              {o.is_correct && <CheckCircle2 className="h-3 w-3 shrink-0" />}
                              {o.option_text}
                            </Box>
                          ))}
                        </Box>
                      </Box>
                      <Box className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEditQ(a.id, q)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:bg-red-50"
                          onClick={() => setDeleteQId(q.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </Box>
                    </Box>
                  ))}
                </Box>
                <Button size="sm" variant="outline" className="w-full h-9 text-sm border-dashed" onClick={() => openAddQ(a.id)}>
                  <Plus className="h-4 w-4 mr-1.5" />
                  Add Question
                </Button>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* ── Assessment Dialog ── */}
      <Dialog open={aDialog} onOpenChange={setADialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingA ? "Edit Assessment" : "Create Assessment"}</DialogTitle>
          </DialogHeader>
          <Box className="space-y-5 py-2">
            <Box className="space-y-2">
              <Label className="text-sm font-medium">
                Title <Text as="span" className="text-red-500">*</Text>
              </Label>
              <Input
                placeholder="e.g. Module 1 Quiz"
                value={aForm.title}
                onChange={(e) => setAForm((p) => ({ ...p, title: e.target.value }))}
                className="h-10"
              />
            </Box>
            <Box className="space-y-2">
              <Label className="text-sm font-medium">Description</Label>
              <Textarea
                placeholder="Brief description of this assessment..."
                rows={2}
                value={aForm.description}
                onChange={(e) => setAForm((p) => ({ ...p, description: e.target.value }))}
              />
            </Box>
            <Box className="space-y-2">
              <Label className="text-sm font-medium">Passing Score (%)</Label>
              <Input
                type="number"
                min="1"
                max="100"
                value={aForm.passing_score}
                onChange={(e) => setAForm((p) => ({ ...p, passing_score: Number(e.target.value) }))}
                className="h-10 w-32"
              />
              <Text as="p" className="text-xs text-muted-foreground">Learners must score at or above this to pass.</Text>
            </Box>
            {aError && (
              <Box className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <Text as="p" className="text-sm text-red-600">{aError}</Text>
              </Box>
            )}
          </Box>
          <DialogFooter>
            <Button variant="outline" onClick={() => setADialog(false)}>Cancel</Button>
            <Button onClick={handleSaveA} disabled={aSaving} className="bg-blue-500 hover:bg-blue-600 text-white">
              {aSaving ? "Saving…" : editingA ? "Save Changes" : "Create Assessment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Question Dialog ── */}
      <Dialog open={qDialog} onOpenChange={setQDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingQ ? "Edit Question" : "Add Question"}</DialogTitle>
          </DialogHeader>
          <Box className="space-y-5 py-2">
            <Box className="space-y-2">
              <Label className="text-sm font-medium">
                Question <Text as="span" className="text-red-500">*</Text>
              </Label>
              <Textarea
                placeholder="Enter the question text..."
                rows={2}
                value={qForm.question_text}
                onChange={(e) => setQForm((p) => ({ ...p, question_text: e.target.value }))}
              />
            </Box>

            <Box className="space-y-3">
              <Box>
                <Label className="text-sm font-medium">Answer Options</Label>
                <Text as="p" className="text-xs text-muted-foreground mt-0.5">Select the radio button next to the correct answer.</Text>
              </Box>
              <RadioGroup
                value={String(qForm.options.findIndex((o) => o.is_correct))}
                onValueChange={(val) => {
                  const idx = Number(val);
                  setQForm((p) => ({ ...p, options: p.options.map((o, i) => ({ ...o, is_correct: i === idx })) }));
                }}
              >
                {qForm.options.map((opt, i) => (
                  <Box
                    key={i}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      opt.is_correct ? "border-emerald-300 bg-emerald-50" : "border-border bg-muted/20"
                    }`}
                  >
                    <RadioGroupItem value={String(i)} id={`opt-${i}`} className="shrink-0" />
                    <Input
                      placeholder={`Option ${i + 1}`}
                      value={opt.option_text}
                      onChange={(e) => {
                        const newOpts = [...qForm.options];
                        newOpts[i] = { ...newOpts[i], option_text: e.target.value };
                        setQForm((p) => ({ ...p, options: newOpts }));
                      }}
                      className={`flex-1 h-9 border-0 bg-transparent shadow-none focus-visible:ring-0 p-0 text-sm ${opt.is_correct ? "font-medium text-emerald-700" : ""}`}
                    />
                    {opt.is_correct && <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />}
                  </Box>
                ))}
              </RadioGroup>
            </Box>

            {qError && (
              <Box className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <Text as="p" className="text-sm text-red-600">{qError}</Text>
              </Box>
            )}
          </Box>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveQ} disabled={qSaving} className="bg-blue-500 hover:bg-blue-600 text-white">
              {qSaving ? "Saving…" : editingQ ? "Save Changes" : "Add Question"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Assessment ── */}
      <AlertDialog open={!!deleteAId} onOpenChange={(o) => !o && setDeleteAId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Assessment?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the assessment and all its questions and attempt history.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteA} className="bg-red-500 hover:bg-red-600 text-white">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Delete Question ── */}
      <AlertDialog open={!!deleteQId} onOpenChange={(o) => !o && setDeleteQId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Question?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the question and all its answer options.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteQ} className="bg-red-500 hover:bg-red-600 text-white">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Box>
  );
}
