"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  PlayCircle, CheckCircle2, ArrowLeft, BookOpen, ClipboardList,
  ChevronRight, Clock, Award, RotateCcw, Lock, FileArchive, Package,
} from "lucide-react";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { fetchCourseDetail } from "@/services/api/learner/learner-api";

/* ── Course thumbnail colors (hash-based) ── */
const PALETTES = [
  { bg: "#EDE9DD", accent: "#0A1628" },
  { bg: "#EDE9DD", accent: "#0A1628" },
  { bg: "#EDE9DD", accent: "#14233D" },
  { bg: "#EDE9DD", accent: "#14233D" },
  { bg: "#EDE9DD", accent: "#0A1628" },
  { bg: "#F2F0E8", accent: "#14233D" },
  { bg: "#EDE9DD", accent: "#0A1628" },
  { bg: "#EDE9DD", accent: "#14233D" },
];
function getCourseColors(name) {
  let h = 0;
  for (const c of (name || "A")) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return PALETTES[h % PALETTES.length];
}
function getInitials(name) {
  return (name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("");
}

function DetailSkeleton() {
  return (
    <Box className="space-y-4">
      <Skeleton className="h-36 w-full rounded-xl" />
      <Skeleton className="h-10 w-full rounded-xl" />
      <Skeleton className="h-52 w-full rounded-xl" />
      <Skeleton className="h-32 w-full rounded-xl" />
    </Box>
  );
}

export function CourseDetailContent({ courseId }) {
  const { user } = useAuth();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return;
    fetchCourseDetail({ courseId }).then(setData).catch((e) => setError(e.message));
  }, [user, user, courseId]);

  if (error) {
    return (
      <Card className="p-8 text-center">
        <Text as="p" className="text-error text-sm">{error}</Text>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => router.push("/my-courses")}>
          Back to My Courses
        </Button>
      </Card>
    );
  }

  if (!data) return <DetailSkeleton />;

  const { course, enrollment, modules = [], assessments = [], assessmentsUnlocked = false } = data;
  const totalLessons     = modules.reduce((s, m) => s + (m.total_count || 0), 0);
  const completedLessons = modules.reduce((s, m) => s + (m.completed_count || 0), 0);
  const progress         = enrollment?.progress_percentage ?? 0;
  const colors           = getCourseColors(course.name);
  const initials         = getInitials(course.name);
  const isComplete       = progress === 100;

  return (
    <Box className="space-y-5">
      {/* ── Back ── */}
      <Button variant="ghost" size="sm" onClick={() => router.push("/my-courses")} className="w-fit -ml-1 text-muted-foreground">
        <ArrowLeft className="h-4 w-4 mr-1.5" />
        Back to My Courses
      </Button>

      {/* ── Course Header ── */}
      <Card className="overflow-hidden">
        <Box className="flex items-stretch">
          {/* Accent panel with initials */}
          <Box
            style={{ background: colors.bg, width: 100, flexShrink: 0 }}
            className="flex items-center justify-center p-4"
          >
            <Box
              style={{ background: colors.accent, width: 56, height: 56, borderRadius: 14 }}
              className="flex items-center justify-center shadow-sm"
            >
              <Text as="span" style={{ color: "#fff", fontWeight: 700, fontSize: 20, lineHeight: 1 }}>
                {initials}
              </Text>
            </Box>
          </Box>

          {/* Course info */}
          <CardContent className="flex-1 p-5">
            <Box className="flex items-start justify-between gap-4 flex-wrap">
              <Box className="flex-1 min-w-0">
                <Text as="h1" className="text-xl font-bold leading-tight">{course.name}</Text>
                {course.description && (
                  <Text as="p" className="text-sm text-muted-foreground mt-1 leading-relaxed">
                    {course.description}
                  </Text>
                )}
              </Box>
              <Badge
                className={cn("shrink-0 text-xs font-semibold px-2.5 py-0.5",
                  isComplete
                    ? "bg-paper-cream text-navy border-navy/20"
                    : "bg-paper-cream text-navy border-navy/20"
                )}
              >
                {isComplete ? "Completed" : "In Progress"}
              </Badge>
            </Box>

            {/* Progress bar */}
            <Box className="mt-4">
              <Box className="flex items-center justify-between mb-1.5">
                <Text as="span" className="text-xs text-muted-foreground font-medium">Overall Progress</Text>
                <Text as="span" className="text-sm font-bold tabular-nums">{progress}%</Text>
              </Box>
              <Box className="h-2 bg-paper-cream rounded-full overflow-hidden">
                <Box
                  className={cn("h-full rounded-full transition-all", isComplete ? "bg-navy" : "bg-navy")}
                  style={{ width: `${progress}%` }}
                />
              </Box>
              <Text as="span" className="text-xs text-muted-foreground mt-1 block">
                {completedLessons} of {totalLessons} lessons completed
              </Text>
            </Box>

            {/* Stats row */}
            <Box className="flex items-center gap-5 mt-4 flex-wrap">
              <Box className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <BookOpen className="h-3.5 w-3.5" />
                <Text as="span">{modules.length} module{modules.length !== 1 ? "s" : ""}</Text>
              </Box>
              <Box className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <PlayCircle className="h-3.5 w-3.5" />
                <Text as="span">{totalLessons} lesson{totalLessons !== 1 ? "s" : ""}</Text>
              </Box>
              {assessments.length > 0 && (
                <Box className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ClipboardList className="h-3.5 w-3.5" />
                  <Text as="span">{assessments.length} assessment{assessments.length !== 1 ? "s" : ""}</Text>
                </Box>
              )}
            </Box>
          </CardContent>
        </Box>
      </Card>

      {/* ── Course Content ── */}
      {modules.length > 0 && (
        <Box>
          <Text as="h2" className="text-base font-semibold mb-3">Course Content</Text>
          <Accordion type="multiple" defaultValue={[`m-${modules[0]?.id}`]} className="space-y-2.5">
            {modules.map((module, mIdx) => {
              const moduleComplete = module.completed_count === module.total_count && module.total_count > 0;
              return (
                <AccordionItem
                  key={module.id}
                  value={`m-${module.id}`}
                  className="border rounded-xl overflow-hidden bg-white shadow-sm"
                >
                  <AccordionTrigger className="hover:no-underline hover:bg-paper-warm px-0 py-0 w-full">
                    <Box className="flex items-center gap-3 w-full px-4 py-3.5 text-left">
                      {/* Module number */}
                      <Box
                        className={cn(
                          "w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold",
                          moduleComplete ? "bg-navy text-white" : "bg-paper-cream text-ink/70"
                        )}
                      >
                        {moduleComplete ? <CheckCircle2 className="h-4 w-4" /> : mIdx + 1}
                      </Box>
                      {/* Module info */}
                      <Box className="flex-1 min-w-0">
                        <Text as="p" className="text-sm font-semibold truncate">{module.title}</Text>
                        <Text as="span" className="text-[11px] text-muted-foreground">
                          {module.completed_count} of {module.total_count} lesson{module.total_count !== 1 ? "s" : ""} completed
                        </Text>
                      </Box>
                      {/* Completion indicator */}
                      {moduleComplete ? (
                        <Text as="span" className="text-xs font-semibold text-navy mr-2 shrink-0">Done</Text>
                      ) : module.total_count > 0 ? (
                        <Text as="span" className="text-xs text-muted-foreground mr-2 shrink-0 tabular-nums">
                          {module.completed_count}/{module.total_count}
                        </Text>
                      ) : null}
                    </Box>
                  </AccordionTrigger>

                  <AccordionContent className="p-0">
                    <Box className="border-t divide-y divide-border/50">
                      {module.lessons.map((lesson, lIdx) => {
                        const done    = lesson.progress_status === "completed";
                        const locked  = lesson.is_locked;
                        const isScorm = lesson.content_type === "scorm";

                        const row = (
                          <Box
                            className={cn(
                              "flex items-center gap-3 px-4 py-3 transition-colors",
                              locked
                                ? "bg-paper-warm cursor-not-allowed opacity-60"
                                : "hover:bg-paper-cream cursor-pointer group"
                            )}
                          >
                            {/* Completion status */}
                            <Box className="w-5 h-5 flex items-center justify-center shrink-0">
                              {done ? (
                                <CheckCircle2 className="h-[18px] w-[18px] text-navy" />
                              ) : locked ? (
                                <Lock className="h-3.5 w-3.5 text-ink/35" />
                              ) : (
                                <Box className="w-4 h-4 rounded-full border-2 border-border" />
                              )}
                            </Box>

                            {/* Lesson index */}
                            <Text as="span" className="text-[11px] text-muted-foreground/40 w-5 shrink-0 font-mono text-right select-none">
                              {lIdx + 1}
                            </Text>

                            {/* Content type icon */}
                            <Box
                              className={cn(
                                "w-6 h-6 rounded flex items-center justify-center shrink-0",
                                locked ? "bg-paper-cream" : isScorm ? "bg-paper-cream" : "bg-paper-cream"
                              )}
                            >
                              {isScorm ? (
                                <Package className={cn("h-3 w-3", locked ? "text-ink/35" : "text-navy")} />
                              ) : (
                                <PlayCircle className={cn("h-3 w-3", locked ? "text-ink/35" : "text-navy")} />
                              )}
                            </Box>

                            {/* Title */}
                            <Text
                              as="span"
                              className={cn(
                                "flex-1 text-sm leading-snug",
                                done    ? "text-muted-foreground line-through decoration-muted-foreground/30" :
                                locked  ? "text-muted-foreground/40" :
                                          "group-hover:text-navy transition-colors"
                              )}
                            >
                              {lesson.title}
                            </Text>

                            {/* SCORM badge */}
                            {isScorm && !locked && (
                              <Badge className="text-[10px] px-1.5 h-4 bg-paper-cream text-navy border-0 shrink-0">
                                SCORM
                              </Badge>
                            )}

                            {/* Duration */}
                            {lesson.duration_minutes && (
                              <Box className="flex items-center gap-1 shrink-0">
                                <Clock className="h-3 w-3 text-muted-foreground/40" />
                                <Text as="span" className="text-[11px] text-muted-foreground tabular-nums">
                                  {lesson.duration_minutes}m
                                </Text>
                              </Box>
                            )}

                            {/* Arrow or lock */}
                            {locked ? (
                              <Lock className="h-3.5 w-3.5 text-paper shrink-0" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-ink/35 group-hover:text-navy transition-colors shrink-0" />
                            )}
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
              );
            })}
          </Accordion>
        </Box>
      )}

      {/* ── Assessments ── */}
      {assessments.length > 0 && (
        <Box>
          <Box className="flex items-center gap-2 mb-3">
            <Text as="h2" className="text-base font-semibold">Assessments</Text>
            {!assessmentsUnlocked && (
              <Badge variant="secondary" className="text-[10px] bg-paper-cream text-ink/70 flex items-center gap-1">
                <Lock className="h-2.5 w-2.5" />
                Complete all lessons to unlock
              </Badge>
            )}
          </Box>

          {!assessmentsUnlocked && (
            <Card className="p-4 mb-3 bg-paper-cream border-border">
              <Box className="flex items-center gap-3">
                <Box className="w-9 h-9 rounded-xl bg-paper-cream flex items-center justify-center shrink-0">
                  <Lock className="h-4 w-4 text-ink/70" />
                </Box>
                <Box>
                  <Text as="p" className="text-sm font-semibold text-ink/70">Assessments Locked</Text>
                  <Text as="p" className="text-xs text-ink/70 mt-0.5">
                    Complete all {totalLessons} lessons before taking the assessment. Currently at {completedLessons}/{totalLessons}.
                  </Text>
                </Box>
              </Box>
            </Card>
          )}

          <Box className="space-y-2.5">
            {assessments.map((a) => {
              const hasPassed    = a.last_attempt?.is_passed;
              const hasAttempted = (a.attempt_count || 0) > 0;
              return (
                <Card key={a.id} className={cn("overflow-hidden", !assessmentsUnlocked && "opacity-60")}>
                  <Box className="flex items-center gap-3 p-4">
                    <Box
                      className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                        !assessmentsUnlocked ? "bg-paper-cream" : hasPassed ? "bg-paper-cream" : "bg-paper-cream"
                      )}
                    >
                      {!assessmentsUnlocked
                        ? <Lock className="h-5 w-5 text-ink/45" />
                        : hasPassed
                          ? <Award className="h-5 w-5 text-navy" />
                          : <ClipboardList className="h-5 w-5 text-navy" />
                      }
                    </Box>

                    <Box className="flex-1 min-w-0">
                      <Text as="p" className="text-sm font-semibold truncate">{a.title}</Text>
                      <Box className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <Text as="span" className="text-[11px] text-muted-foreground">
                          Pass: {a.passing_score}% · {a.questions_count} questions
                        </Text>
                        {hasAttempted && assessmentsUnlocked && (
                          <Badge
                            variant="secondary"
                            className={cn("text-[10px]", hasPassed ? "bg-paper-cream text-navy" : "bg-error/10 text-error")}
                          >
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

                    {assessmentsUnlocked ? (
                      <Link href={`/my-courses/${courseId}/assessments/${a.id}`}>
                        <Button
                          size="sm"
                          className={cn(
                            "shrink-0 text-xs",
                            hasPassed
                              ? "bg-navy hover:bg-navy-soft text-paper"
                              : "bg-navy hover:bg-navy-soft text-paper"
                          )}
                        >
                          {hasAttempted
                            ? <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                            : <ClipboardList className="h-3.5 w-3.5 mr-1.5" />
                          }
                          {hasAttempted ? "Retake" : "Start"}
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
