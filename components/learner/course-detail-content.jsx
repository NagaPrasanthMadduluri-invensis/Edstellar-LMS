"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  PlayCircle,
  CheckCircle2,
  Circle,
  ArrowLeft,
  BookOpen,
  ClipboardList,
  ChevronRight,
  Clock,
  Award,
  RotateCcw,
  Lock,
} from "lucide-react";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { useAuth } from "@/hooks/use-auth";
import { fetchCourseDetail } from "@/services/api/learner/learner-api";

function DetailSkeleton() {
  return (
    <Box className="space-y-4">
      <Skeleton className="h-28 w-full rounded-xl" />
      <Skeleton className="h-12 w-full rounded-xl" />
      <Skeleton className="h-48 w-full rounded-xl" />
      <Skeleton className="h-32 w-full rounded-xl" />
    </Box>
  );
}

export function CourseDetailContent({ courseId }) {
  const { user, token } = useAuth();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token || !user) return;
    fetchCourseDetail({ token, courseId }).then(setData).catch((e) => setError(e.message));
  }, [token, user, courseId]);

  if (error) {
    return (
      <Card className="p-8 text-center">
        <Text as="p" className="text-red-500 text-sm">{error}</Text>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => router.push("/my-courses")}>
          Back to My Courses
        </Button>
      </Card>
    );
  }

  if (!data) return <DetailSkeleton />;

  const { course, enrollment, modules = [], assessments = [], assessmentsUnlocked = false } = data;
  const totalLessons = modules.reduce((s, m) => s + (m.total_count || 0), 0);
  const completedLessons = modules.reduce((s, m) => s + (m.completed_count || 0), 0);
  const progress = enrollment?.progress_percentage ?? 0;

  return (
    <Box className="space-y-5">
      {/* ── Back ── */}
      <Button variant="ghost" size="sm" onClick={() => router.push("/my-courses")} className="w-fit">
        <ArrowLeft className="h-4 w-4 mr-1.5" />
        Back to My Courses
      </Button>

      {/* ── Course Header ── */}
      <Card className="overflow-hidden">
        <Box className="h-3 bg-gradient-to-r from-indigo-500 to-purple-600" />
        <CardContent className="p-5">
          <Box className="flex items-start justify-between gap-4 flex-wrap">
            <Box className="flex-1 min-w-0">
              <Text as="h1" className="text-xl font-bold">{course.name}</Text>
              {course.description && (
                <Text as="p" className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  {course.description}
                </Text>
              )}
            </Box>
            <Badge variant="secondary" className={`shrink-0 ${progress === 100 ? "bg-emerald-100 text-emerald-700" : "bg-indigo-100 text-indigo-700"}`}>
              {progress === 100 ? "Completed" : "In Progress"}
            </Badge>
          </Box>

          {/* Progress */}
          <Box className="mt-4">
            <Box className="flex items-center justify-between mb-2">
              <Text as="span" className="text-sm font-medium">Overall Progress</Text>
              <Text as="span" className="text-sm font-bold">{progress}%</Text>
            </Box>
            <Progress value={progress} className="h-2.5" />
            <Text as="span" className="text-xs text-muted-foreground mt-1.5 block">
              {completedLessons} of {totalLessons} lessons completed
            </Text>
          </Box>

          {/* Stats */}
          <Box className="flex items-center gap-4 mt-4 flex-wrap">
            <Box className="flex items-center gap-1.5">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <Text as="span" className="text-xs text-muted-foreground">{modules.length} modules</Text>
            </Box>
            <Box className="flex items-center gap-1.5">
              <PlayCircle className="h-4 w-4 text-muted-foreground" />
              <Text as="span" className="text-xs text-muted-foreground">{totalLessons} video lessons</Text>
            </Box>
            <Box className="flex items-center gap-1.5">
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
              <Text as="span" className="text-xs text-muted-foreground">{assessments.length} assessments</Text>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* ── Modules ── */}
      {modules.length > 0 && (
        <Box>
          <Text as="h2" className="text-base font-semibold mb-3">Course Content</Text>
          <Accordion type="multiple" defaultValue={[`m-${modules[0]?.id}`]} className="space-y-2">
            {modules.map((module) => (
              <AccordionItem key={module.id} value={`m-${module.id}`} className="border rounded-xl overflow-hidden">
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/30 transition-colors">
                  <Box className="flex items-center gap-3 flex-1 text-left">
                    <Box className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                      <BookOpen className="h-4 w-4 text-indigo-600" />
                    </Box>
                    <Box className="flex-1 min-w-0">
                      <Text as="p" className="text-sm font-semibold">{module.title}</Text>
                      <Text as="span" className="text-[11px] text-muted-foreground">
                        {module.completed_count}/{module.total_count} completed
                      </Text>
                    </Box>
                    {module.completed_count === module.total_count && module.total_count > 0 && (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mr-2" />
                    )}
                  </Box>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-3 pt-0">
                  <Box className="space-y-1 mt-1">
                    {module.lessons.map((lesson) => {
                      const done = lesson.progress_status === "completed";
                      const locked = lesson.is_locked;

                      const row = (
                        <Box className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors ${
                          locked ? "opacity-50 cursor-not-allowed" : "hover:bg-muted/50 group cursor-pointer"
                        }`}>
                          {done
                            ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                            : locked
                              ? <Lock className="h-4 w-4 text-muted-foreground/30 shrink-0" />
                              : <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                          }
                          <PlayCircle className={`h-3.5 w-3.5 shrink-0 ${locked ? "text-muted-foreground/20" : "text-indigo-400"}`} />
                          <Text as="span" className={`flex-1 text-sm truncate ${
                            done ? "text-muted-foreground" :
                            locked ? "text-muted-foreground/50" :
                            "group-hover:text-indigo-600 transition-colors"
                          }`}>
                            {lesson.title}
                          </Text>
                          {lesson.duration_minutes && (
                            <Box className="flex items-center gap-1 shrink-0">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <Text as="span" className="text-[11px] text-muted-foreground">{lesson.duration_minutes}m</Text>
                            </Box>
                          )}
                          {locked
                            ? <Lock className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
                            : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          }
                        </Box>
                      );

                      return locked ? (
                        <Box key={lesson.id}>{row}</Box>
                      ) : (
                        <Link key={lesson.id} href={`/my-courses/${courseId}/lessons/${lesson.id}`} className="block">
                          {row}
                        </Link>
                      );
                    })}
                  </Box>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Box>
      )}

      {/* ── Assessments ── */}
      {assessments.length > 0 && (
        <Box>
          <Box className="flex items-center gap-2 mb-3">
            <Text as="h2" className="text-base font-semibold">Assessments</Text>
            {!assessmentsUnlocked && (
              <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-700 flex items-center gap-1">
                <Lock className="h-2.5 w-2.5" />
                Complete all lessons to unlock
              </Badge>
            )}
          </Box>

          {/* Locked banner */}
          {!assessmentsUnlocked && (
            <Card className="p-4 mb-3 bg-amber-50 border-amber-200">
              <Box className="flex items-center gap-3">
                <Box className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                  <Lock className="h-4 w-4 text-amber-600" />
                </Box>
                <Box>
                  <Text as="p" className="text-sm font-semibold text-amber-800">Assessments Locked</Text>
                  <Text as="p" className="text-xs text-amber-700 mt-0.5">
                    You need to complete all {totalLessons} lessons in this course before you can take the assessment.
                    Currently at {completedLessons}/{totalLessons} lessons.
                  </Text>
                </Box>
              </Box>
            </Card>
          )}

          <Box className="space-y-3">
            {assessments.map((a) => {
              const hasPassed = a.last_attempt?.is_passed;
              const hasAttempted = (a.attempt_count || 0) > 0;
              return (
                <Card key={a.id} className={`p-4 ${!assessmentsUnlocked ? "opacity-60" : ""}`}>
                  <Box className="flex items-center justify-between gap-4 flex-wrap">
                    <Box className="flex items-center gap-3 flex-1 min-w-0">
                      <Box className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        !assessmentsUnlocked ? "bg-gray-100" : hasPassed ? "bg-emerald-100" : "bg-indigo-100"
                      }`}>
                        {!assessmentsUnlocked
                          ? <Lock className="h-5 w-5 text-gray-400" />
                          : hasPassed
                            ? <Award className="h-5 w-5 text-emerald-600" />
                            : <ClipboardList className="h-5 w-5 text-indigo-600" />
                        }
                      </Box>
                      <Box className="flex-1 min-w-0">
                        <Text as="p" className="text-sm font-semibold truncate">{a.title}</Text>
                        <Box className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <Text as="span" className="text-[11px] text-muted-foreground">
                            Pass: {a.passing_score}% · {a.questions_count} questions
                          </Text>
                          {hasAttempted && assessmentsUnlocked && (
                            <Badge variant="secondary" className={`text-[10px] ${hasPassed ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                              Best: {a.best_score}%
                            </Badge>
                          )}
                          {assessmentsUnlocked && (
                            <Text as="span" className="text-[11px] text-muted-foreground">
                              {a.attempt_count} attempt{a.attempt_count !== 1 ? "s" : ""}
                            </Text>
                          )}
                        </Box>
                      </Box>
                    </Box>
                    {assessmentsUnlocked ? (
                      <Link href={`/my-courses/${courseId}/assessments/${a.id}`}>
                        <Button
                          size="sm"
                          className={`shrink-0 text-xs ${hasPassed
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                            : "bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white"
                          }`}
                        >
                          {hasAttempted ? <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> : <ClipboardList className="h-3.5 w-3.5 mr-1.5" />}
                          {hasAttempted ? "Retake" : "Start Assessment"}
                        </Button>
                      </Link>
                    ) : (
                      <Button size="sm" disabled className="shrink-0 text-xs opacity-50 cursor-not-allowed">
                        <Lock className="h-3.5 w-3.5 mr-1.5" />
                        Locked
                      </Button>
                    )}
                  </Box>
                </Card>
              );
            })}
          </Box>
        </Box>
      )}
    </Box>
  );
}
