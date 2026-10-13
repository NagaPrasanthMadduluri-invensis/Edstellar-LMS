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
  Play, FileText, Users, Star,
} from "lucide-react";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { fetchCourseDetail, fetchCourseReviews, fetchCatalogue } from "@/services/api/learner/learner-api";
import { CourseArt } from "@/components/shared/course-art";
import { CourseRewardHeroLine } from "@/components/learner/course-reward";
import { CourseFeedbackCard } from "@/components/learner/course-feedback-card";


/**
 * What a lesson actually is, at a glance.
 *
 * Every row used to carry the same play glyph regardless of content, so the
 * icon column told the learner nothing they could not already see. These are
 * the content types the API returns; anything unrecognised falls back to play,
 * which is what most lessons are.
 */
const LESSON_TYPE = {
  video:   { icon: Play,           label: "Video",        filled: true },
  scorm:   { icon: Package,        label: "SCORM",        filled: false },
  session: { icon: Users,          label: "Live session", filled: false },
  pdf:     { icon: FileText,       label: "Document",     filled: false },
  doc:     { icon: FileText,       label: "Document",     filled: false },
  document:{ icon: FileText,       label: "Document",     filled: false },
  quiz:    { icon: ClipboardList,  label: "Quiz",         filled: false },
};

function lessonTypeOf(contentType) {
  return LESSON_TYPE[(contentType || "").toLowerCase()] ?? LESSON_TYPE.video;
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
  // Reviews load on their own, after the page. A failure here leaves the
  // section absent — a broken reviews fetch must not take the course page with
  // it, the same call the feedback card makes.
  const [reviews, setReviews] = useState(null);
  // Self-enrol courses + sessions for the "Recommended" side panel. A failed
  // fetch leaves it absent, like reviews.
  const [catalogue, setCatalogue] = useState(null);

  useEffect(() => {
    if (!user) return;
    fetchCourseDetail({ courseId }).then(setData).catch((e) => setError(e.message));
  }, [user, user, courseId]);

  useEffect(() => {
    if (!user) return;
    fetchCourseReviews({ courseId }).then(setReviews).catch(() => setReviews(null));
  }, [user, courseId]);

  useEffect(() => {
    if (!user) return;
    fetchCatalogue().then(setCatalogue).catch(() => setCatalogue(null));
  }, [user]);

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

  const { course, enrollment, modules = [], assessments = [], assessmentsUnlocked = false, reward = null } = data;
  const totalLessons     = modules.reduce((s, m) => s + (m.total_count || 0), 0);
  const completedLessons = modules.reduce((s, m) => s + (m.completed_count || 0), 0);
  const progress         = enrollment?.progress_percentage ?? 0;
  const isComplete       = progress === 100;

  // The first lesson the learner can actually open, so the hero button goes
  // somewhere real instead of the page having no primary action at all.
  const allLessons  = modules.flatMap((m) => m.lessons || []);
  const nextLesson  =
    allLessons.find((l) => l.progress_status !== "completed" && !l.is_locked) ??
    allLessons[0] ??
    null;
  const firstContentType = allLessons[0]?.content_type ?? null;

  // Total runtime, when the lessons carry durations, for the hero meta and the
  // side card's "includes" list.
  const totalMinutes = modules.reduce(
    (s, m) => s + (m.lessons || []).reduce((t, l) => t + (l.duration_minutes || 0), 0),
    0,
  );
  const durationLabel =
    totalMinutes >= 60
      ? `${Math.floor(totalMinutes / 60)}h${totalMinutes % 60 ? ` ${totalMinutes % 60}m` : ""}`
      : totalMinutes > 0
        ? `${totalMinutes}m`
        : "";

  // Skills/tags — tolerate an array, a comma-separated string, or nothing.
  const skills = Array.isArray(course.tags)
    ? course.tags
    : typeof course.tags === "string" && course.tags.trim()
      ? course.tags.split(",").map((t) => t.trim()).filter(Boolean)
      : [];

  // Recommended — the self-enrol catalogue (courses + sessions), minus this
  // course, a few at a time. Courses first, then sessions.
  const recommended = [
    ...(catalogue?.courses ?? [])
      .filter((c) => c.id !== course.id && c.public_id !== course.public_id)
      .map((c) => ({
        key: `c-${c.id}`,
        kind: "course",
        title: c.name,
        meta: c.category || "Course",
        thumbnailUrl: c.thumbnail_url,
        contentType: null,
        href: c.is_enrolled && c.public_id ? `/my-courses/${c.public_id}` : "/catalogue",
      })),
    ...(catalogue?.sessions ?? []).map((s) => ({
      key: `s-${s.id}`,
      kind: "session",
      title: s.title,
      meta: s.session_type === "Virtual" ? "Live · Virtual" : "Live · In person",
      thumbnailUrl: s.thumbnail_url,
      contentType: "session",
      href: "/catalogue",
    })),
  ].slice(0, 5);

  return (
    <Box className="space-y-5">
      {/* ── Back ── */}
      <Button variant="ghost" size="sm" onClick={() => router.push("/my-courses")} className="w-fit -ml-1 text-muted-foreground">
        <ArrowLeft className="h-4 w-4 mr-1.5" />
        Back to My Courses
      </Button>

      {/* ── Course hero (edX-style gradient band) ── */}
      <Box className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-navy-deep via-navy to-navy-soft px-6 py-7 text-paper sm:px-9 sm:py-9">
        <Box className="flex flex-wrap items-center gap-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-accent-soft">
          {course.is_mandatory && (
            <Text as="span" className="rounded bg-accent-blue px-2 py-0.5 font-extrabold text-white">
              {course.category === "Compliance" ? "Compliance" : "Required"}
            </Text>
          )}
          <Text as="span" className="text-[length:inherit] text-inherit">{course.category || "General"}</Text>
        </Box>
        <Text as="h1" className="mt-3 max-w-3xl text-2xl font-semibold leading-tight text-paper sm:text-[30px]">
          {course.name}
        </Text>
        {course.description && (
          <Text as="p" className="mt-3 max-w-2xl text-sm leading-relaxed text-paper/85">
            {course.description}
          </Text>
        )}
        <Box className="mt-4 flex flex-wrap gap-x-5 gap-y-2 font-mono text-[12px] tracking-[0.02em] text-paper/85">
          <Text as="span" className="text-[length:inherit] text-inherit"><b className="text-paper">{modules.length}</b> module{modules.length !== 1 ? "s" : ""}</Text>
          <Text as="span" className="text-[length:inherit] text-inherit"><b className="text-paper">{totalLessons}</b> lesson{totalLessons !== 1 ? "s" : ""}</Text>
          {assessments.length > 0 && (
            <Text as="span" className="text-[length:inherit] text-inherit"><b className="text-paper">{assessments.length}</b> assessment{assessments.length !== 1 ? "s" : ""}</Text>
          )}
          {durationLabel && <Text as="span" className="text-[length:inherit] text-inherit"><b className="text-paper">{durationLabel}</b> total</Text>}
          <Text as="span" className="text-[length:inherit] uppercase text-accent-soft">{isComplete ? "Completed" : progress > 0 ? "In progress" : "Not started"}</Text>
        </Box>
        <CourseRewardHeroLine reward={reward} isComplete={isComplete} isSession={course.session_id != null} />
      </Box>

      {/* ── Two-column edX layout: main sections + sticky side card ── */}
      <Box className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <Box className="min-w-0 space-y-6">
          {skills.length > 0 && (
            <Box>
              <Text as="h2" className="mb-3 font-mono text-[12.5px] font-semibold uppercase tracking-[0.08em] text-ink">
                Skills you&apos;ll gain
              </Text>
              <Box className="flex flex-wrap gap-2">
                {skills.map((t) => (
                  <Text key={t} as="span" className="rounded-full bg-accent-tint px-3 py-1.5 text-xs font-semibold text-accent-blue">
                    {t}
                  </Text>
                ))}
              </Box>
            </Box>
          )}
      {/* ── Course Content ── */}
      {modules.length > 0 && (
        <Box>
          <Text as="h2" className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink/55 mb-3">
            Course content
          </Text>
          <Accordion type="multiple" defaultValue={[`m-${modules[0]?.id}`]} className="space-y-2.5">
            {modules.map((module, mIdx) => {
              const moduleComplete = module.completed_count === module.total_count && module.total_count > 0;
              return (
                <AccordionItem
                  key={module.id}
                  value={`m-${module.id}`}
                  className="border rounded-xl overflow-hidden glass shadow-sm"
                >
                  <AccordionTrigger className="hover:no-underline hover:bg-paper-warm px-0 py-0 w-full items-center [&>svg]:mr-4 [&>svg]:self-center">
                    <Box className="flex items-center gap-3.5 w-full px-4 sm:px-5 py-4 text-left">
                      {/* Module number. A tile rather than a bare digit, and it
                          carries the state: filled navy once the module is
                          finished, cream while it is not. */}
                      <Box
                        className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                          moduleComplete
                            ? "bg-navy text-paper"
                            : "bg-paper-cream text-navy border border-navy/10"
                        )}
                      >
                        {moduleComplete ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : (
                          <Text as="span" className="font-mono text-sm font-bold tabular-nums">
                            {mIdx + 1}
                          </Text>
                        )}
                      </Box>

                      {/* Module info. The "MODULE n" eyebrow is what tells the
                          learner where they are in the course — the title alone
                          never said which module it was. */}
                      <Box className="flex-1 min-w-0">
                        <Text
                          as="span"
                          className="block font-mono text-[10px] uppercase tracking-[0.18em] text-ink/50 mb-1"
                        >
                          Module {mIdx + 1}
                        </Text>
                        <Text as="p" className="text-base font-bold leading-snug truncate text-ink">
                          {module.title}
                        </Text>
                        <Text as="span" className="text-xs text-ink/55">
                          {module.completed_count} of {module.total_count} lesson{module.total_count !== 1 ? "s" : ""} completed
                        </Text>

                        {/* Progress reads faster than the count alone, and only
                            matters while there is progress left to make. */}
                        {module.total_count > 0 && !moduleComplete && (
                          <Box className="mt-2 h-1 w-full max-w-[220px] rounded-full bg-paper-cream overflow-hidden">
                            <Box
                              className="h-full rounded-full bg-navy transition-all duration-500"
                              style={{ width: `${Math.round((module.completed_count / module.total_count) * 100)}%` }}
                            />
                          </Box>
                        )}
                      </Box>

                      {/* Status chip, in the design system's fill weights. */}
                      {module.total_count > 0 && (
                        <Badge
                          className={cn(
                            "text-[11px] font-semibold px-2.5 py-0.5 mr-2 shrink-0 border",
                            moduleComplete
                              ? "bg-navy text-paper border-navy"
                              : module.completed_count > 0
                                ? "bg-paper-cream text-ink border-navy/25"
                                : "bg-paper-warm text-ink/60 border-border"
                          )}
                        >
                          {moduleComplete
                            ? "Done"
                            : `${module.completed_count}/${module.total_count}`}
                        </Badge>
                      )}
                    </Box>
                  </AccordionTrigger>

                  {/* `[&_a]:no-underline` undoes the prose default the accordion
                      primitive applies to every link inside it, which was
                      underlining each lesson title as though it were body copy. */}
                  <AccordionContent className="p-0 [&_a]:no-underline">
                    <Box className="border-t divide-y divide-border/40">
                      {module.lessons.map((lesson, lIdx) => {
                        const done    = lesson.progress_status === "completed";
                        const locked  = lesson.is_locked;
                        const isScorm = lesson.content_type === "scorm";
                        const type    = lessonTypeOf(lesson.content_type);
                        const TypeIcon = type.icon;

                        const row = (
                          <Box
                            className={cn(
                              "flex items-center gap-3.5 px-4 sm:px-5 py-3.5 transition-colors",
                              locked
                                ? "bg-paper-warm/60 cursor-not-allowed"
                                : "hover:bg-paper-warm cursor-pointer group"
                            )}
                          >
                            {/* Lesson number */}
                            <Text
                              as="span"
                              className="font-mono text-xs text-ink/40 w-4 shrink-0 text-right tabular-nums select-none"
                            >
                              {lIdx + 1}
                            </Text>

                            {/* One tile carrying both what the lesson is and
                                where the learner stands on it. Three separate
                                glyphs (a status ring, the index, a type icon)
                                used to compete for the same job.

                                The icon stays the content type throughout — a
                                finished video is still a video, and swapping in
                                a tick took away the one cue that said what the
                                lesson was. State is carried by the fill weight
                                instead, which is how every other status in the
                                system reads (TASTE 10.3): solid navy once done,
                                cream while it is open, flat warm when locked. */}
                            <Box
                              className={cn(
                                "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                                done
                                  ? "bg-navy text-paper border border-navy"
                                  : locked
                                    ? "bg-paper-warm text-ink/30 border border-border"
                                    // Hover deepens the hairline rather than
                                    // flipping the fill to navy: a hovered
                                    // unfinished lesson would otherwise look
                                    // exactly like a finished one.
                                    : "bg-paper-cream text-navy border border-navy/10 group-hover:border-navy/45"
                              )}
                            >
                              {locked ? (
                                <Lock className="h-4 w-4" />
                              ) : (
                                <TypeIcon
                                  className={cn("h-4 w-4", type.filled && "fill-current")}
                                />
                              )}
                            </Box>

                            {/* Title. Bigger than the meta around it — it is the
                                thing the learner is actually scanning for. */}
                            <Box className="flex-1 min-w-0">
                              <Text
                                as="span"
                                className={cn(
                                  "block text-[15px] leading-snug truncate",
                                  done
                                    ? "text-ink/50 font-medium"
                                    : locked
                                      ? "text-ink/35 font-medium"
                                      : "text-ink font-semibold group-hover:text-navy transition-colors"
                                )}
                              >
                                {lesson.title}
                              </Text>
                              <Box className="flex items-center gap-2 mt-0.5">
                                <Text as="span" className="text-[11px] text-ink/45">
                                  {type.label}
                                </Text>
                                {lesson.duration_minutes ? (
                                  <>
                                    <Text as="span" className="text-[11px] text-ink/25">·</Text>
                                    <Box className="flex items-center gap-1">
                                      <Clock className="h-3 w-3 text-ink/40" />
                                      <Text as="span" className="text-[11px] text-ink/45 tabular-nums">
                                        {lesson.duration_minutes} min
                                      </Text>
                                    </Box>
                                  </>
                                ) : null}
                              </Box>
                            </Box>

                            {/* State, then the affordance to open it. */}
                            {done && (
                              <Text
                                as="span"
                                className="hidden sm:inline text-[11px] font-semibold text-navy shrink-0"
                              >
                                Completed
                              </Text>
                            )}
                            {isScorm && !locked && (
                              <Badge className="text-[10px] px-1.5 h-4 bg-paper-cream text-navy border-0 shrink-0">
                                SCORM
                              </Badge>
                            )}
                            {locked ? (
                              // This was `text-paper` — white on a light row, so
                              // the one cue that a lesson was locked was invisible.
                              <Lock className="h-4 w-4 text-ink/30 shrink-0" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-ink/30 group-hover:text-navy group-hover:translate-x-0.5 transition-all shrink-0" />
                            )}
                          </Box>
                        );

                        return locked ? (
                          <Box key={lesson.id}>{row}</Box>
                        ) : (
                          <Link
                            key={lesson.id}
                            href={`/my-courses/${courseId}/lessons/${lesson.public_id ?? lesson.id}`}
                            className="block"
                          >
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
                      <Link href={`/my-courses/${courseId}/assessments/${a.public_id ?? a.id}`}>
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

      {/* ── About this course ── */}
      {course.description && (
        <Box>
          <Text as="h2" className="mb-3 font-mono text-[12.5px] font-semibold uppercase tracking-[0.08em] text-ink">
            About this course
          </Text>
          <Text as="p" className="text-sm leading-relaxed text-text-2">{course.description}</Text>
        </Box>
      )}

      {/* ── Instructor — only when the payload carries one. The courses table
          has no instructor column today, so this stays hidden until a course
          actually ships one; the heading never renders empty. ── */}
      {(course.instructor_name ?? course.instructor) && (
        <Box>
          <Text as="h2" className="mb-3 font-mono text-[12.5px] font-semibold uppercase tracking-[0.08em] text-ink">
            Instructor
          </Text>
          <Box className="flex items-start gap-3.5">
            <Box className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-tint">
              <Users className="h-5 w-5 text-accent-blue" />
            </Box>
            <Box className="min-w-0">
              <Text as="p" className="text-sm font-semibold text-ink">
                {course.instructor_name ?? course.instructor}
              </Text>
              {(course.instructor_title ?? course.instructor_role) && (
                <Text as="p" className="text-xs text-text-3">
                  {course.instructor_title ?? course.instructor_role}
                </Text>
              )}
              {(course.instructor_bio ?? course.instructor_about) && (
                <Text as="p" className="mt-1.5 text-sm leading-relaxed text-text-2">
                  {course.instructor_bio ?? course.instructor_about}
                </Text>
              )}
            </Box>
          </Box>
        </Box>
      )}

      {/* ── Learner reviews — the ratings and comments other learners left,
          derived from the course feedback they gave. Absent until at least one
          rated review exists, rather than an empty panel. ── */}
      {reviews && reviews.count > 0 && (
        <Box>
          <Text as="h2" className="mb-3 font-mono text-[12.5px] font-semibold uppercase tracking-[0.08em] text-ink">
            Learner reviews
          </Text>

          {/* Headline average + the 5★→1★ distribution. */}
          <Card className="mb-4 p-4 sm:p-5">
            <Box className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <Box className="shrink-0 text-center sm:w-36">
                <Text as="p" className="font-mono text-4xl font-bold leading-none text-ink tabular-nums">
                  {Number(reviews.average ?? 0).toFixed(1)}
                </Text>
                <Box className="mt-1.5 flex justify-center">
                  <Stars value={Math.round(reviews.average ?? 0)} />
                </Box>
                <Text as="p" className="mt-1 text-xs text-text-3">
                  {reviews.count} review{reviews.count !== 1 ? "s" : ""}
                </Text>
              </Box>

              <Box className="min-w-0 flex-1 space-y-1.5">
                {[5, 4, 3, 2, 1].map((star) => {
                  const n = reviews.distribution?.[String(star)] ?? 0;
                  const pct = reviews.count ? Math.round((n / reviews.count) * 100) : 0;
                  return (
                    <Box key={star} className="flex items-center gap-2.5">
                      <Text as="span" className="w-6 shrink-0 text-right font-mono text-[11px] text-text-3 tabular-nums">
                        {star}★
                      </Text>
                      <Box className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-3">
                        <Box className="h-full rounded-full bg-warning" style={{ width: `${pct}%` }} />
                      </Box>
                      <Text as="span" className="w-5 shrink-0 text-right font-mono text-[11px] text-text-3 tabular-nums">
                        {n}
                      </Text>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          </Card>

          {/* One card per rated response. */}
          <Box className="divide-y divide-line">
            {reviews.reviews.map((r) => (
              <Box key={r.id} className="py-4 first:pt-0">
                <Box className="flex items-start gap-3">
                  <Box className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-tint">
                    <Text as="span" className="font-mono text-[11px] font-bold text-accent-blue">
                      {r.initials}
                    </Text>
                  </Box>
                  <Box className="min-w-0 flex-1">
                    <Box className="flex items-start justify-between gap-3">
                      <Box className="min-w-0">
                        <Text as="p" className="text-sm font-semibold text-ink">{r.name}</Text>
                        <Box className="mt-0.5">
                          <Stars value={r.rating} size="sm" />
                        </Box>
                      </Box>
                      {r.date && (
                        <Text as="span" className="shrink-0 text-xs text-text-3">
                          {new Date(r.date).toLocaleDateString(undefined, {
                            day: "numeric", month: "short", year: "numeric",
                          })}
                        </Text>
                      )}
                    </Box>
                    {r.comment && (
                      <Text as="p" className="mt-2 text-sm leading-relaxed text-text-2">
                        {r.comment}
                      </Text>
                    )}
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* ── Feedback — the course's own feedback form; renders nothing when the
          course asks for none. ── */}
      <CourseFeedbackCard courseId={courseId} />
        </Box>

        {/* ── Sticky side column: the course card, then recommendations ── */}
        <Box className="space-y-5 lg:sticky lg:top-20">
          <Card className="gap-0 overflow-hidden p-0">
            <Box className="relative h-40">
              <CourseArt
                thumbnailUrl={course.thumbnail_url}
                contentType={firstContentType}
                alt={course.name}
                scrim="light"
                sizes="340px"
                className="absolute inset-0"
              />
            </Box>
            <Box className="p-4">
              {progress > 0 && (
                <Box className="mb-3">
                  <Box className="mb-1 flex justify-between text-[11px] text-text-3">
                    <Text as="span">Your progress</Text>
                    <Text as="span" className="font-bold text-accent-blue">{progress}%</Text>
                  </Box>
                  <Box className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                    <Box className="h-full rounded-full bg-accent-blue" style={{ width: `${progress}%` }} />
                  </Box>
                </Box>
              )}
              {nextLesson && (
                <Link href={`/my-courses/${courseId}/lessons/${nextLesson.public_id ?? nextLesson.id}`} className="block">
                  <Button className="w-full gap-1.5 bg-navy text-paper hover:bg-navy-soft">
                    {isComplete ? "Review course" : progress > 0 ? "Continue learning" : "Start course"}
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              )}
              <Text as="p" className="mt-2 text-center text-[11px] text-text-3">
                {isComplete ? "You have completed this course" : "Self-paced \u00b7 learn anytime"}
              </Text>
              <Box as="ul" className="mt-4 flex flex-col gap-2.5 border-t border-line pt-4">
                {durationLabel && <Include icon={Clock}>{durationLabel} of content</Include>}
                <Include icon={Package}>
                  {modules.length} module{modules.length !== 1 ? "s" : ""} · {totalLessons} lesson{totalLessons !== 1 ? "s" : ""}
                </Include>
                {assessments.length > 0 && <Include icon={ClipboardList}>Graded assessment</Include>}
                <Include icon={Award}>Certificate on completion</Include>
                <Include icon={Play}>Access on web &amp; mobile</Include>
              </Box>
            </Box>
          </Card>

          {/* ── Recommended — the self-enrol catalogue (courses + sessions),
              so a learner can pick up something else from right here. Absent
              when nothing is open to join. ── */}
          {recommended.length > 0 && (
            <Card className="p-4">
              <Text as="h2" className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/70">
                Recommended courses
              </Text>
              <Box className="space-y-1">
                {recommended.map((item) => (
                  <Link
                    key={item.key}
                    href={item.href}
                    className="group flex items-center gap-3 rounded-lg p-1.5 transition-colors hover:bg-surface-2"
                  >
                    <Box className="relative h-11 w-14 shrink-0 overflow-hidden rounded-md">
                      <CourseArt
                        thumbnailUrl={item.thumbnailUrl}
                        contentType={item.contentType}
                        alt={item.title}
                        scrim="light"
                        sizes="56px"
                        className="absolute inset-0"
                      />
                    </Box>
                    <Box className="min-w-0 flex-1">
                      <Text as="p" className="truncate text-[13px] font-semibold text-ink group-hover:text-accent-blue">
                        {item.title}
                      </Text>
                      <Text as="p" className="truncate text-[11px] text-text-3">
                        {item.meta}
                      </Text>
                    </Box>
                    <ChevronRight className="h-4 w-4 shrink-0 text-text-3 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                ))}
              </Box>
              <Link
                href="/catalogue"
                className="mt-2 block text-center text-[11px] font-semibold text-accent-blue hover:underline"
              >
                Browse the catalogue →
              </Link>
            </Card>
          )}
        </Box>
      </Box>
    </Box>
  );
}

/** Five stars, filled in the ochre the feedback pages already use for a
 *  rating (§10.3), up to `value`. */
function Stars({ value, size = "md" }) {
  const dim = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  return (
    <Box className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(dim, n <= value ? "fill-warning text-warning" : "text-line-strong")}
        />
      ))}
    </Box>
  );
}

/** One line in the course side-card's "includes" list. */
function Include({ icon: Icon, children }) {
  return (
    <Box as="li" className="flex items-center gap-2.5 text-[12.5px] text-text-2">
      <Icon className="h-[15px] w-[15px] shrink-0 text-accent-blue" />
      <Text as="span" className="text-[length:inherit] text-inherit">{children}</Text>
    </Box>
  );
}
