"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowRight, Check, ClipboardList, GraduationCap, Star,
} from "lucide-react";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api-client";
import { FeedbackDialog } from "@/components/learner/course-feedback-card";
import { SessionFeedbackDialog } from "@/components/learner/session-feedback-dialog";
import { fetchCourseFeedbackForm } from "@/services/api/surveys-api";
import { fetchLearnerFeedbackSessions } from "@/services/api/feedback-api";
import { sessionTypeLabel } from "@/lib/session-types";

/**
 * THE TWO KINDS OF FEEDBACK THIS PRODUCT ASKS FOR, in one inbox.
 *
 * Course feedback is whatever form the admin wrote for that course
 * (BACKEND_STRUCTURE §10.24); session feedback is three fixed ratings about
 * a sitting and its trainer, read anonymously by that trainer (§10.20).
 * Different tables, different audiences, different questions — so they are
 * kept as separate kinds with their own chip rather than flattened into one
 * list that would have to lie about one of them.
 *
 * The reference design also shows an ORGANISATION SURVEY ("Q3 Employee
 * Engagement Pulse"). There is no such feature here — no table, no admin
 * authoring, no distribution — so it is not rendered. A section headed
 * "Surveys to do" that can never contain anything is the empty-column
 * failure §10.3.1.21 records, and worse: it implies the org has sent
 * something and the page has lost it.
 */
const KIND = {
  course: {
    chip: "Course feedback",
    icon: Star,
    rule: "border-l-warning",
    chipCls: "chip-warning",
  },
  session: {
    chip: "Session feedback",
    icon: GraduationCap,
    rule: "border-l-accent-blue",
    chipCls: "chip-progress",
  },
};

function day(stamp) {
  const d = String(stamp ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  const [y, m, dd] = d.split("-").map(Number);
  return new Date(y, m - 1, dd).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

/** A section heading that carries its own count, so an empty one is absent. */
function SectionHead({ label, count, tone }) {
  return (
    <Box className="flex items-center gap-2">
      <Text as="h3" className="font-mono text-[11px] font-semibold uppercase tracking-widest text-text-3">
        {label}
      </Text>
      <Text as="span" className={cn("px-1.5 py-0.5 text-[10px] font-bold", tone)}>{count}</Text>
    </Box>
  );
}

/**
 * One row. The left rule carries the kind, the chip names it, and the
 * action is the only thing on the right — so a column of these reads as a
 * queue rather than as a table.
 */
function Row({ kind, title, meta, chips = [], action }) {
  const cfg = KIND[kind];
  const Icon = cfg.icon;
  return (
    <Card className={cn("flex flex-row items-center gap-4 border-l-[3px] p-0 py-3 pl-4 pr-3", cfg.rule)}>
      <Box className="min-w-0 flex-1">
        <Box className="flex flex-wrap items-center gap-2">
          <Text as="p" className="text-sm font-bold">{title}</Text>
          <Text as="span" className={cn("flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold", cfg.chipCls)}>
            <Icon className="h-2.5 w-2.5" />{cfg.chip}
          </Text>
          {chips.map((c) => (
            <Text key={c} className="bg-surface-3 px-2 py-0.5 text-[10px] font-semibold text-text-2" as="span">
              {c}
            </Text>
          ))}
        </Box>
        <Text as="p" className="mt-1 text-[11px] text-text-3">{meta}</Text>
      </Box>
      <Box className="shrink-0">{action}</Box>
    </Card>
  );
}

function SubmittedMark() {
  return (
    <Box className="flex items-center gap-1.5 pr-2 text-success">
      <Check className="h-3.5 w-3.5" strokeWidth={3} />
      <Text as="span" className="text-[11.5px] font-semibold">Submitted</Text>
    </Box>
  );
}

function GoButton({ children, onClick }) {
  return (
    <Button
      size="sm" onClick={onClick}
      className="h-8 cursor-pointer gap-1.5 bg-navy px-4 text-xs text-white hover:bg-navy-soft"
    >
      {children}<ArrowRight className="h-3.5 w-3.5" />
    </Button>
  );
}

export function SurveysContent() {
  const { user } = useAuth();
  const [courses, setCourses] = useState(null);
  const [sessions, setSessions] = useState(null);
  const [error, setError] = useState(null);

  /* The open course form, and the open session form. Two dialogs because
     they are two different forms — both reused from where they already
     live, so the questions here are the questions everywhere else. */
  const [courseForm, setCourseForm] = useState(null);
  const [ratingSession, setRatingSession] = useState(null);
  const [opening, setOpening] = useState(null);

  const load = useCallback(() => {
    Promise.all([
      apiClient("/api/learner/surveys"),
      fetchLearnerFeedbackSessions().catch(() => ({ sessions: [] })),
    ])
      .then(([c, s]) => { setCourses(c); setSessions(s.sessions || []); })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => { if (user) load(); }, [user, load]);

  async function openCourse(courseId) {
    setOpening(courseId);
    try {
      const data = await fetchCourseFeedbackForm(courseId);
      setCourseForm({ courseId, form: data.feedback });
    } catch (e) {
      setError(e.message);
    } finally {
      setOpening(null);
    }
  }

  if (error) return (
    <Card className="p-8 text-center">
      <Text as="p" className="text-sm text-danger">{error}</Text>
      <Button size="sm" variant="outline" className="mt-3 cursor-pointer" onClick={() => window.location.reload()}>
        Retry
      </Button>
    </Card>
  );

  if (!courses || !sessions) return (
    <Box className="space-y-5">
      {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20" />)}
    </Box>
  );

  const pendingSessions = sessions.filter((s) => !s.submitted);
  const doneSessions = sessions.filter((s) => s.submitted);
  const pendingCourses = courses.pending ?? [];
  const doneCourses = courses.submitted ?? [];
  const doneCount = doneCourses.length + doneSessions.length;
  const owed = pendingCourses.length + pendingSessions.length;

  if (owed === 0 && doneCount === 0) return (
    <Card className="flex flex-col items-center justify-center gap-3 border-dashed py-20">
      <ClipboardList className="h-9 w-9 text-line-strong" />
      <Text as="p" className="text-sm font-semibold">Nothing to rate yet</Text>
      <Text as="p" className="max-w-md text-center text-xs text-text-2">
        When you finish a course that asks for feedback, or attend a live session,
        the form appears here. None of it affects your progress or your certificate.
      </Text>
    </Card>
  );

  return (
    <Box className="space-y-6">
      {/* A queue is only meaningful if its size is stated up front. */}
      <Text as="p" className="text-xs text-text-2">
        {owed > 0
          ? <>You have <Text as="span" className="font-semibold text-ink">{owed} form{owed === 1 ? "" : "s"}</Text> waiting. Answering is optional — nothing here changes your progress, hours or certificates.</>
          : <>Nothing waiting. Everything you have been asked is below.</>}
      </Text>

      {/* ── Course feedback owed ─────────────────────────────────────── */}
      {pendingCourses.length > 0 && (
        <Box className="space-y-2">
          <SectionHead label="Pending course feedback" count={pendingCourses.length} tone="chip-warning" />
          {pendingCourses.map((c) => (
            <Row
              key={c.course_id}
              kind="course"
              title={c.course_name}
              /* NOT "Required". Course feedback never affects completion
                 (§10.24) and every other surface says so — a Required chip
                 here would contradict the card on the course page. */
              chips={["Optional"]}
              meta={`${c.template_name} · ${c.question_count} question${c.question_count === 1 ? "" : "s"}${
                day(c.completed_at) ? ` · finished ${day(c.completed_at)}` : ""}`}
              action={
                <GoButton onClick={() => openCourse(c.course_id)}>
                  {opening === c.course_id ? "Opening…" : "Rate course"}
                </GoButton>
              }
            />
          ))}
        </Box>
      )}

      {/* ── Session feedback owed ────────────────────────────────────── */}
      {pendingSessions.length > 0 && (
        <Box className="space-y-2">
          <SectionHead label="Session feedback to give" count={pendingSessions.length} tone="chip-progress" />
          {pendingSessions.map((s) => (
            <Row
              key={s.session_id}
              kind="session"
              title={s.title}
              meta={`${sessionTypeLabel(s.session_type)} · ${s.trainer_name}${
                day(s.date) ? ` · ${day(s.date)}` : ""} · your trainer never sees your name`}
              action={<GoButton onClick={() => setRatingSession(s)}>Respond</GoButton>}
            />
          ))}
        </Box>
      )}

      {/* ── Already sent ─────────────────────────────────────────────── */}
      {doneCount > 0 && (
        <Box className="space-y-2">
          <SectionHead label="Already submitted" count={doneCount} tone="chip-complete" />
          {doneCourses.map((c) => (
            <Row
              key={`c${c.course_id}`}
              kind="course"
              title={c.course_name}
              meta={`${c.template_name} · ${c.question_count} question${c.question_count === 1 ? "" : "s"}${
                day(c.answered_at) ? ` · sent ${day(c.answered_at)}` : ""}`}
              action={
                <Box className="flex items-center gap-2">
                  <SubmittedMark />
                  {/* Revising is allowed — the API upserts (§10.24) — so the
                      way back in is offered rather than left to be guessed. */}
                  <Button
                    size="sm" variant="outline"
                    className="h-8 cursor-pointer px-3 text-xs"
                    onClick={() => openCourse(c.course_id)}
                  >
                    Change
                  </Button>
                </Box>
              }
            />
          ))}
          {doneSessions.map((s) => (
            <Row
              key={`s${s.session_id}`}
              kind="session"
              title={s.title}
              meta={`${sessionTypeLabel(s.session_type)} · ${s.trainer_name}${
                day(s.feedback?.submitted_at) ? ` · sent ${day(s.feedback.submitted_at)}` : ""}`}
              action={
                <Box className="flex items-center gap-2">
                  <SubmittedMark />
                  <Button
                    size="sm" variant="outline"
                    className="h-8 cursor-pointer px-3 text-xs"
                    onClick={() => setRatingSession(s)}
                  >
                    Change
                  </Button>
                </Box>
              }
            />
          ))}
        </Box>
      )}

      {/* The same two forms the course page and the calendar open. */}
      {courseForm && (
        <FeedbackDialog
          courseId={courseForm.courseId}
          form={courseForm.form}
          onClose={() => setCourseForm(null)}
          onSaved={() => { setCourseForm(null); load(); }}
        />
      )}
      <SessionFeedbackDialog
        session={ratingSession}
        open={!!ratingSession}
        onOpenChange={(o) => !o && setRatingSession(null)}
        onSaved={() => { setRatingSession(null); load(); }}
      />
    </Box>
  );
}
