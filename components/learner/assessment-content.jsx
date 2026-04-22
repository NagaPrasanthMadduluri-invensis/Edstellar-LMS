"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  ClipboardList,
  CheckCircle2,
  XCircle,
  Trophy,
  RotateCcw,
  Send,
  Clock,
} from "lucide-react";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { useAuth } from "@/hooks/use-auth";
import {
  fetchAssessment,
  submitAssessmentAttempt,
  fetchAssessmentAttempts,
} from "@/services/api/learner/learner-api";

function LoadingSkeleton() {
  return (
    <Box className="space-y-4">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-28 w-full rounded-xl" />
      {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
    </Box>
  );
}

function ResultView({ result, assessment, questions, optionMap, onRetake, courseId }) {
  const router = useRouter();
  const passed = result.is_passed;

  return (
    <Box className="space-y-5">
      {/* ── Result Hero ── */}
      <Card className={`overflow-hidden`}>
        <Box className={`h-2 ${passed ? "bg-gradient-to-r from-emerald-500 to-teal-500" : "bg-gradient-to-r from-red-500 to-orange-500"}`} />
        <CardContent className="p-6 text-center">
          <Box className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-4 ${passed ? "bg-emerald-100" : "bg-red-100"}`}>
            {passed
              ? <Trophy className="h-10 w-10 text-emerald-600" />
              : <XCircle className="h-10 w-10 text-red-500" />
            }
          </Box>
          <Text as="h2" className="text-2xl font-bold mb-1">
            {passed ? "Congratulations!" : "Keep Trying!"}
          </Text>
          <Text as="p" className="text-muted-foreground text-sm mb-4">
            {passed
              ? "You passed the assessment successfully."
              : `You need ${assessment.passing_score}% to pass. Keep learning and try again.`
            }
          </Text>

          <Box className="flex items-center justify-center gap-6 mb-5">
            <Box className="text-center">
              <Text as="h3" className="text-3xl font-bold">{result.percentage}%</Text>
              <Text as="span" className="text-xs text-muted-foreground">Your Score</Text>
            </Box>
            <Separator orientation="vertical" className="h-10" />
            <Box className="text-center">
              <Text as="h3" className="text-3xl font-bold">{result.score}/{result.total_questions}</Text>
              <Text as="span" className="text-xs text-muted-foreground">Correct</Text>
            </Box>
            <Separator orientation="vertical" className="h-10" />
            <Box className="text-center">
              <Text as="h3" className="text-3xl font-bold">{assessment.passing_score}%</Text>
              <Text as="span" className="text-xs text-muted-foreground">Pass Mark</Text>
            </Box>
          </Box>

          <Box className="flex items-center justify-center gap-3 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => router.push(`/my-courses/${courseId}`)}>
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
              Back to Course
            </Button>
            <Button
              size="sm"
              onClick={onRetake}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Retake Assessment
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* ── Answer Review (only on pass) ── */}
      {passed ? (
        <Box>
          <Text as="h3" className="text-base font-semibold mb-3">Answer Review</Text>
          <Box className="space-y-3">
            {result.questions_review.map((qr, idx) => {
              const question = questions.find((q) => q.id === qr.question_id);
              if (!question) return null;
              const selectedOpt = optionMap[qr.selected_option_id];
              const correctOpt = question.options.find((o) => o.id === qr.correct_option_id);

              return (
                <Card key={qr.question_id} className={`border-l-4 ${qr.is_correct ? "border-l-emerald-500" : "border-l-red-500"}`}>
                  <CardContent className="p-4">
                    <Box className="flex items-start gap-2 mb-3">
                      {qr.is_correct
                        ? <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                        : <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                      }
                      <Text as="p" className="text-sm font-semibold">Q{idx + 1}. {question.question_text}</Text>
                    </Box>
                    <Box className="space-y-1.5 ml-7">
                      {question.options.map((opt) => {
                        const isSelected = opt.id === qr.selected_option_id;
                        const isCorrectOpt = correctOpt && opt.id === correctOpt.id;
                        return (
                          <Box
                            key={opt.id}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                              isCorrectOpt ? "bg-emerald-50 text-emerald-800 font-medium" :
                              isSelected && !isCorrectOpt ? "bg-red-50 text-red-800" :
                              "bg-muted/30 text-muted-foreground"
                            }`}
                          >
                            {isCorrectOpt && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
                            {isSelected && !isCorrectOpt && <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                            {!isCorrectOpt && !isSelected && <Box className="w-3.5 h-3.5 shrink-0" />}
                            {opt.option_text}
                            {isSelected && <Badge className="ml-auto text-[10px]">{isCorrectOpt ? "Your answer ✓" : "Your answer"}</Badge>}
                          </Box>
                        );
                      })}
                    </Box>
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        </Box>
      ) : (
        <Card className="p-6 bg-amber-50 border-amber-200">
          <Box className="flex flex-col items-center text-center gap-3">
            <Box className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
              <RotateCcw className="h-7 w-7 text-amber-600" />
            </Box>
            <Text as="h3" className="text-base font-semibold text-amber-800">Don&apos;t give up!</Text>
            <Text as="p" className="text-sm text-amber-700 max-w-md">
              Re-watch the course videos to strengthen your understanding, then retake the assessment to improve your score.
            </Text>
            <Box className="flex items-center gap-3 mt-2 flex-wrap justify-center">
              <Button variant="outline" size="sm" onClick={() => router.push(`/my-courses/${courseId}`)}>
                <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
                Back to Course
              </Button>
              <Button
                size="sm"
                onClick={onRetake}
                className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                Retake Assessment
              </Button>
            </Box>
          </Box>
        </Card>
      )}
    </Box>
  );
}

export function AssessmentContent({ courseId, assessmentId }) {
  const { user, token } = useAuth();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [optionMap, setOptionMap] = useState({});
  const [attempts, setAttempts] = useState([]);

  const loadData = () => {
    if (!token || !user) return;
    setData(null);
    setResult(null);
    setAnswers({});
    setError(null);
    fetchAssessment({ token, assessmentId })
      .then((d) => {
        setData(d);
        const map = {};
        d.questions.forEach((q) => q.options.forEach((o) => { map[o.id] = o; }));
        setOptionMap(map);
      })
      .catch((e) => setError(e.message));
    fetchAssessmentAttempts({ token, assessmentId })
      .then((d) => setAttempts(d.attempts || []))
      .catch(() => {});
  };

  useEffect(() => { loadData(); }, [token, user, assessmentId]);

  const handleSubmit = async () => {
    const unanswered = data.questions.filter((q) => !answers[q.id]);
    if (unanswered.length > 0) {
      setError(`Please answer all questions. ${unanswered.length} unanswered.`);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const answerList = Object.entries(answers).map(([question_id, selected_option_id]) => ({
        question_id: Number(question_id),
        selected_option_id: Number(selected_option_id),
      }));
      const res = await submitAssessmentAttempt({ token, assessmentId, answers: answerList });
      setResult(res.result);
      setAttempts((prev) => [{ id: Date.now(), percentage: res.result.percentage, is_passed: res.result.is_passed, submitted_at: new Date().toISOString() }, ...prev]);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!data && !error) return <LoadingSkeleton />;

  if (error && !data) {
    return (
      <Card className="p-8 text-center">
        <Text as="p" className="text-red-500 text-sm">{error}</Text>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => router.push(`/my-courses/${courseId}`)}>
          Back to Course
        </Button>
      </Card>
    );
  }

  if (result) {
    return (
      <ResultView
        result={result}
        assessment={data.assessment}
        questions={data.questions}
        optionMap={optionMap}
        onRetake={loadData}
        courseId={courseId}
      />
    );
  }

  const { assessment, questions, attempt_count } = data;
  const answered = Object.keys(answers).length;

  return (
    <Box className="space-y-5">
      {/* ── Back ── */}
      <Button variant="ghost" size="sm" onClick={() => router.push(`/my-courses/${courseId}`)} className="w-fit">
        <ArrowLeft className="h-4 w-4 mr-1.5" />
        Back to Course
      </Button>

      {/* ── Assessment Header ── */}
      <Card>
        <Box className="h-1.5 bg-gradient-to-r from-indigo-500 to-purple-600" />
        <CardContent className="p-5">
          <Box className="flex items-start justify-between gap-4 flex-wrap">
            <Box className="flex items-start gap-3">
              <Box className="w-11 h-11 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                <ClipboardList className="h-5 w-5 text-indigo-600" />
              </Box>
              <Box>
                <Text as="h1" className="text-lg font-bold">{assessment.title}</Text>
                {assessment.description && (
                  <Text as="p" className="text-sm text-muted-foreground mt-0.5">{assessment.description}</Text>
                )}
                <Box className="flex items-center gap-3 mt-1.5 flex-wrap">
                  <Text as="span" className="text-xs text-muted-foreground">{questions.length} questions</Text>
                  <Text as="span" className="text-xs text-muted-foreground">Pass: {assessment.passing_score}%</Text>
                  {attempt_count > 0 && (
                    <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-700">
                      Attempt #{attempt_count + 1}
                    </Badge>
                  )}
                </Box>
              </Box>
            </Box>
            <Box className="text-right shrink-0">
              <Text as="p" className="text-2xl font-bold text-indigo-600">{answered}/{questions.length}</Text>
              <Text as="span" className="text-xs text-muted-foreground">Answered</Text>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* ── Previous attempts ── */}
      {attempts.length > 0 && (
        <Card className="p-4">
          <Text as="p" className="text-sm font-semibold mb-2">Previous Attempts</Text>
          <Box className="flex items-center gap-2 flex-wrap">
            {attempts.map((att, i) => (
              <Box key={att.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/50 text-xs">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <Text as="span">#{attempts.length - i}</Text>
                <Badge className={`text-[10px] ${att.is_passed ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                  {att.percentage}%
                </Badge>
              </Box>
            ))}
          </Box>
        </Card>
      )}

      {/* ── Questions ── */}
      <Box className="space-y-4">
        {questions.map((q, idx) => (
          <Card key={q.id} className={`transition-all ${answers[q.id] ? "border-indigo-200 shadow-sm" : ""}`}>
            <CardContent className="p-5">
              <Box className="flex items-start gap-3 mb-4">
                <Box className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${answers[q.id] ? "bg-indigo-500 text-white" : "bg-muted text-muted-foreground"}`}>
                  {idx + 1}
                </Box>
                <Text as="p" className="text-sm font-semibold leading-relaxed">{q.question_text}</Text>
              </Box>
              <RadioGroup
                value={answers[q.id] ? String(answers[q.id]) : ""}
                onValueChange={(val) => setAnswers((prev) => ({ ...prev, [q.id]: Number(val) }))}
                className="space-y-2 ml-10"
              >
                {q.options.map((opt) => (
                  <Box key={opt.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all hover:border-indigo-300 hover:bg-indigo-50/50 ${String(answers[q.id]) === String(opt.id) ? "border-indigo-500 bg-indigo-50" : "border-border"}`}>
                    <RadioGroupItem value={String(opt.id)} id={`q${q.id}-o${opt.id}`} />
                    <Label htmlFor={`q${q.id}-o${opt.id}`} className="text-sm cursor-pointer flex-1 font-normal">
                      {opt.option_text}
                    </Label>
                  </Box>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* ── Submit ── */}
      {error && (
        <Card className="p-3 border-red-200 bg-red-50">
          <Text as="p" className="text-sm text-red-600">{error}</Text>
        </Card>
      )}

      <Card className="p-4">
        <Box className="flex items-center justify-between gap-4 flex-wrap">
          <Text as="p" className="text-sm text-muted-foreground">
            {answered} of {questions.length} questions answered
          </Text>
          <Button
            onClick={handleSubmit}
            disabled={submitting || answered < questions.length}
            className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white"
          >
            <Send className="h-4 w-4 mr-2" />
            {submitting ? "Submitting..." : "Submit Assessment"}
          </Button>
        </Box>
      </Card>
    </Box>
  );
}
