"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  ClipboardList,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  HelpCircle,
} from "lucide-react";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { useAuth } from "@/hooks/use-auth";
import {
  fetchAssessments,
  createAssessment,
  updateAssessment,
  deleteAssessment,
  fetchAssessmentDetail,
  addQuestion,
  updateQuestion,
  deleteQuestion,
} from "@/services/api/admin/admin-api";

const EMPTY_ASSESSMENT = { title: "", description: "", passing_score: 60 };
const EMPTY_QUESTION = { question_text: "", marks: 1, options: [{ option_text: "", is_correct: true }, { option_text: "", is_correct: false }, { option_text: "", is_correct: false }, { option_text: "", is_correct: false }] };

function AssessmentsSkeleton() {
  return (
    <Box className="space-y-3">
      {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
    </Box>
  );
}

export function CourseAssessmentsContent({ courseId }) {
  const { token } = useAuth();
  const [assessments, setAssessments] = useState(null);
  const [expandedQuestions, setExpandedQuestions] = useState({});
  const [error, setError] = useState(null);

  // Assessment dialog
  const [aDialog, setADialog] = useState(false);
  const [aForm, setAForm] = useState(EMPTY_ASSESSMENT);
  const [editingA, setEditingA] = useState(null);
  const [aSaving, setASaving] = useState(false);
  const [aError, setAError] = useState(null);
  const [deleteAId, setDeleteAId] = useState(null);

  // Question dialog
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
      // Load questions for all assessments
      const withQ = await Promise.all(list.map(async (a) => {
        try {
          const detail = await fetchAssessmentDetail({ token, assessmentId: a.id });
          return { ...a, questions: detail.questions || [] };
        } catch {
          return { ...a, questions: [] };
        }
      }));
      setAssessments(withQ);
    } catch (e) {
      setError(e.message);
    }
  }, [token, courseId]);

  useEffect(() => { loadAssessments(); }, [loadAssessments]);

  /* ── Assessment CRUD ── */

  const openCreateA = () => { setEditingA(null); setAForm(EMPTY_ASSESSMENT); setAError(null); setADialog(true); };
  const openEditA = (a) => { setEditingA(a); setAForm({ title: a.title, description: a.description || "", passing_score: a.passing_score }); setAError(null); setADialog(true); };

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

  /* ── Question CRUD ── */

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
      options: q.options.map((o) => ({ option_text: o.option_text, is_correct: o.is_correct === 1 || o.is_correct === true })),
    });
    setQError(null);
    setQDialog(true);
  };

  const handleSaveQ = async () => {
    if (!qForm.question_text.trim()) { setQError("Question text is required"); return; }
    if (qForm.options.some((o) => !o.option_text.trim())) { setQError("All options must have text"); return; }
    if (!qForm.options.some((o) => o.is_correct)) { setQError("One option must be correct"); return; }
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

  if (error) return <Card className="p-6 text-center"><Text as="p" className="text-red-500 text-sm">{error}</Text></Card>;
  if (!assessments) return <AssessmentsSkeleton />;

  return (
    <Box className="space-y-4">
      <Box className="flex items-center justify-between">
        <Text as="p" className="text-sm text-muted-foreground">{assessments.length} assessment{assessments.length !== 1 ? "s" : ""}</Text>
        <Button size="sm" onClick={openCreateA} className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white">
          <Plus className="h-4 w-4 mr-1.5" />
          Add Assessment
        </Button>
      </Box>

      {assessments.length === 0 ? (
        <Card className="p-10 text-center">
          <ClipboardList className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
          <Text as="p" className="text-sm text-muted-foreground">No assessments yet.</Text>
          <Button size="sm" onClick={openCreateA} className="mt-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white">
            <Plus className="h-4 w-4 mr-1.5" />
            Create First Assessment
          </Button>
        </Card>
      ) : (
        <Box className="space-y-3">
          {assessments.map((a) => (
            <Card key={a.id} className="overflow-hidden">
              <CardHeader className="py-3 px-4 flex flex-row items-center justify-between gap-2">
                <Box className="flex items-center gap-3 flex-1 min-w-0">
                  <Box className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                    <ClipboardList className="h-4 w-4 text-indigo-600" />
                  </Box>
                  <Box className="flex-1 min-w-0">
                    <Text as="p" className="text-sm font-semibold truncate">{a.title}</Text>
                    <Box className="flex items-center gap-2 mt-0.5">
                      <Text as="span" className="text-[11px] text-muted-foreground">Pass: {a.passing_score}%</Text>
                      <Badge variant="secondary" className="text-[10px] bg-indigo-100 text-indigo-700">
                        {a.questions?.length ?? 0} questions
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-700">
                        {a.attempts_count} attempts
                      </Badge>
                    </Box>
                  </Box>
                </Box>
                <Box className="flex items-center gap-1.5 shrink-0">
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openEditA(a)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => setDeleteAId(a.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </Box>
              </CardHeader>

              <CardContent className="px-4 pb-4 pt-0">
                {/* Questions */}
                <Box className="space-y-2 mb-3">
                  {(a.questions || []).map((q, idx) => (
                    <Box key={q.id} className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/30 group">
                      <Box className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-600 shrink-0 mt-0.5">{idx + 1}</Box>
                      <Box className="flex-1 min-w-0">
                        <Text as="p" className="text-xs font-medium">{q.question_text}</Text>
                        <Box className="flex items-center gap-2 mt-1 flex-wrap">
                          {q.options.map((o) => (
                            <Box key={o.id} className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded ${o.is_correct ? "bg-emerald-100 text-emerald-700 font-semibold" : "bg-muted text-muted-foreground"}`}>
                              {o.is_correct && <CheckCircle2 className="h-3 w-3" />}
                              {o.option_text}
                            </Box>
                          ))}
                        </Box>
                      </Box>
                      <Box className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => openEditQ(a.id, q)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-500 hover:bg-red-50" onClick={() => setDeleteQId(q.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </Box>
                    </Box>
                  ))}
                </Box>
                <Button size="sm" variant="outline" className="w-full h-8 text-xs border-dashed" onClick={() => openAddQ(a.id)}>
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
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
          <Box className="space-y-4 py-2">
            <Box className="space-y-1.5">
              <Label>Title <Text as="span" className="text-red-500">*</Text></Label>
              <Input placeholder="e.g. PM Fundamentals Quiz" value={aForm.title} onChange={(e) => setAForm((p) => ({ ...p, title: e.target.value }))} />
            </Box>
            <Box className="space-y-1.5">
              <Label>Description</Label>
              <Textarea placeholder="Brief description..." rows={2} value={aForm.description} onChange={(e) => setAForm((p) => ({ ...p, description: e.target.value }))} />
            </Box>
            <Box className="space-y-1.5">
              <Label>Passing Score (%)</Label>
              <Input type="number" min="1" max="100" value={aForm.passing_score} onChange={(e) => setAForm((p) => ({ ...p, passing_score: Number(e.target.value) }))} />
            </Box>
            {aError && <Text as="p" className="text-sm text-red-500">{aError}</Text>}
          </Box>
          <DialogFooter>
            <Button variant="outline" onClick={() => setADialog(false)}>Cancel</Button>
            <Button onClick={handleSaveA} disabled={aSaving} className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white">
              {aSaving ? "Saving..." : editingA ? "Save Changes" : "Create"}
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
          <Box className="space-y-4 py-2">
            <Box className="space-y-1.5">
              <Label>Question <Text as="span" className="text-red-500">*</Text></Label>
              <Textarea placeholder="Enter the question..." rows={2} value={qForm.question_text} onChange={(e) => setQForm((p) => ({ ...p, question_text: e.target.value }))} />
            </Box>
            <Box className="space-y-2">
              <Label>Answer Options (select the correct one)</Label>
              <RadioGroup
                value={String(qForm.options.findIndex((o) => o.is_correct))}
                onValueChange={(val) => {
                  const idx = Number(val);
                  setQForm((p) => ({ ...p, options: p.options.map((o, i) => ({ ...o, is_correct: i === idx })) }));
                }}
              >
                {qForm.options.map((opt, i) => (
                  <Box key={i} className="flex items-center gap-2">
                    <RadioGroupItem value={String(i)} id={`opt-${i}`} />
                    <Input
                      placeholder={`Option ${i + 1}`}
                      value={opt.option_text}
                      onChange={(e) => {
                        const newOpts = [...qForm.options];
                        newOpts[i] = { ...newOpts[i], option_text: e.target.value };
                        setQForm((p) => ({ ...p, options: newOpts }));
                      }}
                      className="flex-1"
                    />
                    {opt.is_correct && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
                  </Box>
                ))}
              </RadioGroup>
              <Text as="p" className="text-xs text-muted-foreground">Select the radio button next to the correct answer.</Text>
            </Box>
            {qError && <Text as="p" className="text-sm text-red-500">{qError}</Text>}
          </Box>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveQ} disabled={qSaving} className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white">
              {qSaving ? "Saving..." : editingQ ? "Save Changes" : "Add Question"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Assessment Confirm ── */}
      <AlertDialog open={!!deleteAId} onOpenChange={(o) => !o && setDeleteAId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Assessment?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the assessment and all its questions.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteA} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Delete Question Confirm ── */}
      <AlertDialog open={!!deleteQId} onOpenChange={(o) => !o && setDeleteQId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Question?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the question and its options.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteQ} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Box>
  );
}
