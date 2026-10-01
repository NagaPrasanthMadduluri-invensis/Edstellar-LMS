"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft, ArrowRight, Calendar, Check, CheckCircle2, ClipboardList, Clock,
  FileText, Layers, Lock, Map as MapIcon, Package, Pin, Play, Route, Trophy,
  Users, X,
} from "lucide-react";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { BRAND, LEARNING_TYPES } from "@/lib/brand";
import { CourseArt } from "@/components/shared/course-art";
import {
  fetchLearningPath, fetchLearningPaths,
} from "@/services/api/learning-paths-api";

/* A path's accent is the LEARNING-TYPE colour (§10.1.1), not the category
   hue of whichever course happens to be first. The reference picks the
   latter, which makes two paths built from Technical courses look like the
   same thing and makes one path change colour when its first step is
   reordered. Olive is what "learning path" means everywhere else in this
   product — the My Progress column, the yearly table, the stacked chart —
   so the module and the figure agree. */
const PATH = LEARNING_TYPES.path;

/* Three states a step can be in, plus the gate. Colours are the Spectra
   status vocabulary (§10.3) — no sixth hue. */
const STEP_CFG = {
  complete:    { label: "Completed",   dot: "bg-success text-white border-success",   chip: "chip-complete", rule: "border-success/30" },
  failed:      { label: "Failed",      dot: "bg-danger text-white border-danger",     chip: "chip-error",    rule: "border-danger/30" },
  in_progress: { label: "In progress", dot: "bg-accent-blue text-white border-accent-blue", chip: "chip-progress", rule: "border-accent-blue/30" },
  not_started: { label: "Not started", dot: "bg-surface-3 text-text-3 border-line-strong", chip: "chip-idle", rule: "border-line" },
};

const LOCKED_CFG = { label: "Locked", chip: "chip-idle", rule: "border-line" };

/* What a step is MADE OF, so a course that is three hours of video and a
   course that is three hours of a SCORM package do not look identical in a
   list of chips. The values are the API's `contentTypeOf` reduction (the same
   one the learner course cards use); the icons are the same lucide set
   `LESSON_TYPE` already uses on the course page, so a step and its course
   cannot disagree about what kind of thing it is. `MIXED` is the honest
   answer for a course holding more than one kind, and gets its own icon
   rather than being filed under video. */
const TYPE_ICON = {
  VIDEO:   { icon: Play,          label: "Video" },
  SCORM:   { icon: Package,       label: "eLearning" },
  SESSION: { icon: Users,         label: "Live session" },
  PDF:     { icon: FileText,      label: "Reading" },
  QUIZ:    { icon: ClipboardList, label: "Assessment" },
  MIXED:   { icon: Layers,        label: "Mixed content" },
};

function TypeIcon({ contentType, className = "h-4 w-4" }) {
  const cfg = TYPE_ICON[String(contentType ?? "").toUpperCase()] ?? TYPE_ICON.MIXED;
  const Icon = cfg.icon;
  return (
    <Box className="flex shrink-0 items-center" title={cfg.label}>
      <Icon className={cn(className, "text-text-2")} aria-label={cfg.label} />
    </Box>
  );
}

/* The compact version of the same four states, for the sequence chips on a
   list card. Same hues as the step rows below them, so the card and the
   detail cannot say different things about one course. */
const CHIP_CFG = {
  complete:    { marker: "bg-success",     border: "border-success/30",     text: "text-success" },
  failed:      { marker: "bg-danger",      border: "border-danger/30",      text: "text-danger" },
  in_progress: { marker: "bg-accent-blue", border: "border-accent-blue/30", text: "text-accent-blue" },
  not_started: { marker: "bg-line-strong", border: "border-line",           text: "text-text-3" },
};

function minutesLabel(mins) {
  const m = Number(mins) || 0;
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${h}h ${rest}m` : `${h}h`;
}

/** Postgres timestamps are not ISO (TASTE §10.3.1.15) — take the day part. */
function day(stamp) {
  const d = String(stamp ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  const [y, m, dd] = d.split("-").map(Number);
  return new Date(y, m - 1, dd).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function skillList(skills) {
  if (Array.isArray(skills)) return skills.filter(Boolean);
  return String(skills ?? "").split(",").map((s) => s.trim()).filter(Boolean);
}

/* ── Shared pieces ───────────────────────────────────────────────────── */

function Pill({ children, tone = "muted" }) {
  return (
    <Text
      as="span"
      className={cn(
        "px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap",
        tone === "accent" ? "" : "bg-surface-3 text-text-2",
      )}
      style={tone === "accent" ? { background: `${PATH.flat}1A`, color: PATH.flat } : undefined}
    >
      {children}
    </Text>
  );
}

function Meta({ icon: Icon, children }) {
  return (
    <Box className="flex items-center gap-1.5 text-[11px] text-text-3">
      <Icon className="h-3 w-3 shrink-0" />
      <Text as="span">{children}</Text>
    </Box>
  );
}

/**
 * The three counts, then a bar segmented the same way.
 *
 * Segmented rather than one fill, because a path has three states and a
 * single accent bar would say a half-finished course counts for nothing.
 * The segments read left to right in the order work moves through them.
 */
function PathProgress({ done, inProgress, notStarted, total, thick }) {
  const pct = (n) => (total > 0 ? (n / total) * 100 : 0);
  const stats = [
    { n: done,       label: "Completed",   cls: "text-success" },
    { n: inProgress, label: "In progress", cls: "text-accent-blue" },
    { n: notStarted, label: "Not started", cls: "text-text-2" },
  ];
  return (
    <>
      <Box className="flex items-center border-t border-line pt-3">
        {stats.map((s) => (
          <Box key={s.label} className="flex-1 text-center">
            <Text as="p" className={cn("text-lg font-bold leading-none", s.cls)}>{s.n}</Text>
            <Text as="p" className="mt-1 text-[8.5px] font-bold uppercase tracking-wider text-text-3">
              {s.label}
            </Text>
          </Box>
        ))}
      </Box>
      <Box className={cn("mt-2.5 flex overflow-hidden bg-surface-3", thick ? "h-[7px]" : "h-1.5")}>
        <Box className="bg-success" style={{ width: `${pct(done)}%` }} />
        <Box className="bg-accent-blue" style={{ width: `${pct(inProgress)}%` }} />
      </Box>
    </>
  );
}

/** Art, with the completion badge over it. */
function PathArt({ path, height }) {
  const done = path.percent >= 100;
  return (
    <Box className="relative shrink-0 overflow-hidden bg-surface-3" style={{ height }}>
      {/* `light` scrim: this art sits under type on a light card, not behind
          a navy hero, and the dark scrim would make the picture a slab. */}
      <CourseArt
        thumbnailUrl={path.thumbnail_url}
        alt={path.title}
        scrim="light"
        sizes="(max-width: 1024px) 100vw, 50vw"
        className="h-full w-full"
      />
      <Text
        as="span"
        className={cn(
          "absolute right-2 top-2 px-3 py-1 text-[10px] font-extrabold tracking-wide text-white",
          done ? "bg-success" : "bg-navy/85",
        )}
      >
        {done ? "COMPLETED" : `${path.percent}% COMPLETE`}
      </Text>
    </Box>
  );
}

function PathHeadline({ path, big }) {
  /* Skills EARNED — the tags of the courses this learner has completed, not
     the path's own tag list. The reference derives it the same way, and the
     difference is the whole point: a row of ticks that does not move until
     the path is finished tells a learner nothing they could not read off the
     title, and the half-finished path is exactly when somebody is comparing
     two of them. Empty until something is complete, which is the truth
     rather than a stand-in. */
  const skills = skillList(path.earned_skills);
  return (
    <>
      <Box className="mb-2.5 flex flex-wrap items-center gap-1.5">
        {path.tag && <Pill tone="accent">{path.tag}</Pill>}
        <Pill>{path.course_count} course{path.course_count === 1 ? "" : "s"}</Pill>
        {/* Only said when TRUE — a pill on every card claiming something
            that varies between paths is noise, not information. */}
        {path.all_required && path.course_count > 0 && <Pill>All required</Pill>}
        {path.badge_label && <Pill>Badge: {path.badge_label}</Pill>}
      </Box>

      <Text as={big ? "h2" : "h3"} className={cn("font-extrabold leading-snug", big ? "text-lg" : "text-[15px]")}>
        {path.title}
      </Text>

      <Box className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        <Meta icon={Clock}>{minutesLabel(path.total_minutes)} total</Meta>
        {day(path.assigned_at) && <Meta icon={Pin}>Assigned {day(path.assigned_at)}</Meta>}
        {day(path.due_date) && <Meta icon={Calendar}>Due {day(path.due_date)}</Meta>}
      </Box>

      {path.description && (
        <Text as="p" className={cn("mt-2.5 text-xs leading-relaxed text-text-2", !big && "line-clamp-2 min-h-[2.25rem]")}>
          {path.description}
        </Text>
      )}

      {/* EARNED, not advertised — the tags of steps already finished, so the
          row grows as the path is walked. Labelled, because a bare
          "data · analytics" reads as what the path is ABOUT rather than as
          something the learner now has. The path's own `skills` field is
          the other question and is deliberately not shown here. */}
      {skills.length > 0 && (
        <Box className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <Text as="span" className="text-[10px] text-text-3">Skills earned</Text>
          {skills.map((s) => (
            <Text
              as="span" key={s}
              className="flex items-center gap-1 border px-2 py-0.5 text-[10px]"
              style={{ borderColor: `${PATH.flat}33`, background: `${PATH.flat}12`, color: PATH.flat }}
            >
              <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
              {s}
            </Text>
          ))}
        </Box>
      )}
    </>
  );
}

/* ── List ────────────────────────────────────────────────────────────── */

function PathCard({ path, onOpen }) {
  return (
    <Card
      className="flex cursor-pointer flex-col gap-0 overflow-hidden p-0 transition-colors hover:border-line-strong"
      style={{ borderTop: `3px solid ${PATH.flat}` }}
      onClick={() => onOpen(path.id)}
    >
      <PathArt path={path} height={140} />
      <Box className="flex flex-1 flex-col px-4 py-4">
        <PathHeadline path={path} />
        <Box className="mt-auto pt-3">
          <PathProgress
            done={path.completed_count}
            inProgress={path.in_progress_count}
            notStarted={path.not_started_count}
            total={path.course_count}
          />
          {/* THE SEQUENCE, on the card. This is what makes a path a path
              rather than a bundle of courses, so it belongs where somebody
              decides whether to open it — not only behind a click. Arrows
              between the chips carry the order; the numbered square carries
              the position, and becomes a tick once that step is done. */}
          {path.courses?.length > 0 && (
            <Box className="mt-3 flex flex-wrap items-center gap-1.5">
              {path.courses.map((step, i) => {
                const cfg = CHIP_CFG[step.progress_status] || CHIP_CFG.not_started;
                return (
                  <Box key={step.course_id} className="flex items-center gap-1.5">
                    <Box className={cn("flex items-center gap-1.5 border bg-surface-2 px-2 py-1", cfg.border)}>
                      <Box className={cn(
                        "flex h-[15px] w-[15px] shrink-0 items-center justify-center text-[8px] font-extrabold text-white",
                        cfg.marker,
                      )}>
                        {step.progress_status === "complete"
                          ? <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
                          : i + 1}
                      </Box>
                      <TypeIcon contentType={step.content_type} className="h-3 w-3" />
                      <Text
                        as="span"
                        className={cn(
                          "max-w-[9rem] truncate text-[10.5px]",
                          cfg.text,
                          step.progress_status === "in_progress" && "font-semibold",
                        )}
                      >
                        {step.course_name}
                      </Text>
                    </Box>
                    {i < path.courses.length - 1 && (
                      <ArrowRight className="h-3 w-3 shrink-0 text-text-3" />
                    )}
                  </Box>
                );
              })}
            </Box>
          )}

          {path.current_step && path.percent < 100 && (
            <Text as="p" className="mt-3 truncate text-[11px] text-text-2">
              Next up: <Text as="span" className="font-semibold text-ink">{path.current_step}</Text>
            </Text>
          )}
          <Box
            className="mt-3 flex items-center justify-center gap-1 py-2 text-[11px] font-semibold"
            style={{ background: `${PATH.flat}0D`, color: PATH.flat }}
          >
            View full path <ArrowRight className="h-3 w-3" />
          </Box>
        </Box>
      </Box>
    </Card>
  );
}

/* ── Detail ──────────────────────────────────────────────────────────── */

function StepRow({ step, index, last }) {
  const locked = step.status === "locked";
  const cfg = STEP_CFG[step.progress_status] || STEP_CFG.not_started;
  const chip = locked ? LOCKED_CFG : cfg;
  const done = step.progress_status === "complete";
  const failed = step.progress_status === "failed";
  const current = step.progress_status === "in_progress";

  return (
    <Box className="flex items-stretch gap-3">
      {/* Rail */}
      <Box className="flex shrink-0 flex-col items-center">
        <Box className={cn(
          "flex h-6 w-6 items-center justify-center border text-[10px] font-extrabold",
          locked ? "border-line-strong bg-surface-3 text-text-3" : cfg.dot,
        )}>
          {locked ? <Lock className="h-3 w-3" />
            : done ? <CheckCircle2 className="h-3.5 w-3.5" />
            : failed ? <X className="h-3.5 w-3.5" />
            : index + 1}
        </Box>
        {!last && <Box className="w-px flex-1 bg-line" style={{ minHeight: 16 }} />}
      </Box>

      {/* Card */}
      <Box className={cn("mb-2.5 flex flex-1 flex-col gap-2 border bg-surface px-4 py-3", chip.rule)}>
        <Box className="flex flex-wrap items-center gap-2.5">
          <TypeIcon contentType={step.content_type} />
          <Text as="span" className="min-w-0 flex-1 truncate text-sm font-bold">{step.course_name}</Text>
          {!step.is_required && <Pill>Optional</Pill>}
          <Text as="span" className={cn("px-2 py-0.5 text-[11px] font-medium", chip.chip)}>{chip.label}</Text>
        </Box>

        {/* Facts on the left, the one action on the right — the row fills
            rather than leaving the button stranded under an empty line. */}
        <Box className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <Box className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <Meta icon={Clock}>{minutesLabel(step.duration_minutes)}</Meta>
            {day(step.due_date) && <Meta icon={Calendar}>Due {day(step.due_date)}</Meta>}
            {step.score !== null && step.score !== undefined && (
              <Box className={cn("flex items-center gap-1.5 text-[11px] font-semibold",
                step.has_passed === false ? "text-danger" : "text-success")}>
                <Trophy className="h-3 w-3" />
                <Text as="span">{step.score}% · {step.has_passed === false ? "Not passed" : "Passed"}</Text>
              </Box>
            )}
            {current && (
              <Box className="flex items-center gap-2">
                <Box className="h-1.5 w-24 overflow-hidden bg-surface-3">
                  <Box className="h-full bg-accent-blue" style={{ width: `${step.percent}%` }} />
                </Box>
                <Text as="span" className="text-[11px] font-bold tabular-nums text-accent-blue">
                  {step.percent}%
                </Text>
              </Box>
            )}
          </Box>

          {/* A locked step says WHY, and offers nothing. The API refuses it
              (§10.11), so a button here would be a control that 403s. */}
          {locked ? (
            <Text as="span" className="text-[11px] text-text-3">
              Finish the step before this one to unlock it.
            </Text>
          ) : (
            <Link href={`/my-courses/${step.course_id}`} className="shrink-0">
              <Button
                size="sm"
                className={cn(
                  "h-7 cursor-pointer px-3.5 text-[11.5px]",
                  failed ? "bg-danger text-white hover:bg-danger/90"
                    : done ? "border border-line bg-surface text-ink hover:bg-surface-2"
                    : "bg-navy text-white hover:bg-navy-soft",
                )}
              >
                {done ? "Review" : failed ? "Retake" : current ? "Continue" : "Start"}
              </Button>
            </Link>
          )}
        </Box>
      </Box>
    </Box>
  );
}

function PathDetail({ path, onBack }) {
  const next = path.courses.find((c) => c.status !== "complete" && c.status !== "locked");
  /* A COMPLETED path still gets a way in. The reference calls it "Review
     Journey"; the difference matters more than the wording — a finished path
     is the one somebody is most likely to come back to, because they want to
     re-read a step or show a colleague what they did, and a detail view
     whose only affordance is a sentence has nowhere to send them. It points
     at the FIRST course: with everything done there is no "next", and the
     start of the sequence is what "review the path" means. */
  const done = path.percent >= 100;
  const first = path.courses[0];
  const cta = done
    ? first
      ? { href: `/my-courses/${first.course_id}`, label: "Review path", review: true }
      : null
    : next
      ? { href: `/my-courses/${next.course_id}`, label: next.progress_status === "in_progress" ? "Continue learning" : "Start learning" }
      : null;

  return (
    <Box className="space-y-5">
      <Button
        variant="outline" size="sm"
        className="h-8 cursor-pointer gap-1.5 px-3 text-xs"
        onClick={onBack}
      >
        <ArrowLeft className="h-3.5 w-3.5" />Back to learning paths
      </Button>

      <Card className="flex flex-col gap-0 overflow-hidden p-0" style={{ borderTop: `3px solid ${PATH.flat}` }}>
        <PathArt path={path} height={170} />
        <Box className="px-5 py-4">
          <PathHeadline path={path} big />
          <Box className="mt-4">
            <PathProgress
              done={path.completed_count}
              inProgress={path.in_progress_count}
              notStarted={path.not_started_count}
              total={path.course_count}
              thick
            />
          </Box>
          {/* The completion sentence is kept when there IS a button to go
              with it — it is the payoff, not a substitute for one. */}
          {done && (
            <Box className="mt-4 border border-line bg-surface-2 px-3 py-2.5 text-center">
              <Text as="p" className="text-[11.5px] text-text-2">
                You have finished every required step on this path.
              </Text>
            </Box>
          )}
          {cta ? (
            <Link href={cta.href} className="mt-4 block">
              <Button className="h-10 w-full cursor-pointer bg-navy text-white hover:bg-navy-soft">
                {cta.label}
                {cta.review
                  ? <Trophy className="ml-1.5 h-4 w-4" />
                  : <ArrowRight className="ml-1.5 h-4 w-4" />}
              </Button>
            </Link>
          ) : (
            <Box className="mt-4 border border-line bg-surface-2 px-3 py-2.5 text-center">
              <Text as="p" className="text-[11.5px] text-text-2">
                Every step you can open is done — the rest unlock as earlier steps complete.
              </Text>
            </Box>
          )}
        </Box>
      </Card>

      <Box>
        <Text as="h3" className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-widest text-text-3">
          Course sequence
        </Text>
        {path.courses.map((step, i) => (
          <StepRow key={step.course_id} step={step} index={i} last={i === path.courses.length - 1} />
        ))}
      </Box>
    </Box>
  );
}

/* ── Page ────────────────────────────────────────────────────────────── */

export function LearningPathsContent() {
  const { user } = useAuth();
  const [paths, setPaths] = useState(null);
  const [error, setError] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailError, setDetailError] = useState(null);

  useEffect(() => {
    if (!user) return;
    fetchLearningPaths()
      .then((d) => setPaths(d.journeys || []))
      .catch((e) => setError(e.message));
  }, [user]);

  useEffect(() => {
    if (openId === null) return;
    setDetail(null);
    setDetailError(null);
    fetchLearningPath(openId)
      .then((d) => setDetail(d.journey))
      .catch((e) => setDetailError(e.message));
  }, [openId]);

  const back = useCallback(() => { setOpenId(null); setDetail(null); }, []);

  if (error) return (
    <Card className="p-8 text-center">
      <Text as="p" className="text-sm text-danger">{error}</Text>
    </Card>
  );

  if (!paths) return (
    <Box className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-[30rem]" />)}
    </Box>
  );

  if (openId !== null) {
    if (detailError) return (
      <Card className="p-8 text-center">
        <Text as="p" className="text-sm text-danger">{detailError}</Text>
        <Button size="sm" variant="outline" className="mt-3 cursor-pointer" onClick={back}>
          Back to learning paths
        </Button>
      </Card>
    );
    if (!detail) return <Skeleton className="h-[34rem]" />;
    return <PathDetail path={detail} onBack={back} />;
  }

  /* An empty module is not a broken one, and the difference has to be
     visible (§10.3.1.11). It also says who creates these, because a learner
     cannot make one themselves and would otherwise go looking. */
  if (paths.length === 0) return (
    <Card className="flex flex-col items-center justify-center gap-3 border-dashed py-20">
      <MapIcon className="h-9 w-9 text-line-strong" />
      <Text as="p" className="text-sm font-semibold">No learning paths yet</Text>
      <Text as="p" className="max-w-md text-center text-xs text-text-2">
        A learning path is a set of courses your L&amp;D team puts in a deliberate
        order. When one is assigned to you it appears here, and each step
        unlocks as you finish the one before it.
      </Text>
      <Link href="/my-courses" className="mt-1">
        <Button size="sm" variant="outline" className="cursor-pointer">Go to My Courses</Button>
      </Link>
    </Card>
  );

  const active = paths.filter((p) => p.percent < 100).length;

  return (
    <Box className="space-y-4">
      <Box className="flex flex-wrap items-center gap-3">
        <Route className="h-4 w-4" style={{ color: PATH.flat }} />
        <Text as="p" className="text-xs text-text-2">
          {paths.length} path{paths.length === 1 ? "" : "s"} assigned
          {active > 0 && <> · <Text as="span" className="font-semibold text-ink">{active} still in progress</Text></>}
        </Text>
      </Box>

      <Box className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {paths.map((p) => <PathCard key={p.id} path={p} onOpen={setOpenId} />)}
      </Box>
    </Box>
  );
}
