"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarCheck, CalendarDays, CheckCircle2, Clock, MapPin,
  MessageSquare, TrendingUp, UserCircle, Video,
} from "lucide-react";

import Box from "@/components/ui/box";
import Text from "@/components/ui/text";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CourseArt } from "@/components/shared/course-art";
import { SessionFeedbackDialog } from "@/components/learner/session-feedback-dialog";
import { fetchLearnerFeedbackSessions } from "@/services/api/feedback-api";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";
import { SESSION_TYPE_LABEL } from "@/lib/session-types";
import { cn } from "@/lib/utils";

/**
 * My Sessions — every live and in-person session this learner is booked on,
 * built to the reference: a four-tile strip, then Upcoming and Past as
 * separate card grids.
 *
 * **Sessions live here, not in My Courses.** A session is still a course
 * assignment underneath (§10.7) — that is what credits attendance, hours, the
 * leaderboard and certificates — but it never behaved like the rows beside
 * it: the learner cannot move its progress bar, the trainer marks them
 * present, so its only honest progress was "wait for the day".
 *
 * **Learning Hours is untouched.** That service reads
 * `user_lesson_completions` directly (§10.4), never this list, so which
 * module a session appears in cannot change what an hour is worth. The page
 * says so, because a learner who watched sessions leave My Courses has every
 * reason to assume their hours left too.
 *
 * TWO THINGS IN THE REFERENCE ARE DELIBERATELY NOT BUILT:
 *
 * - **"Open Sessions — Join Now".** The mock lets a learner self-enrol into
 *   open ILT/webinar sessions. There is no learner self-enrolment endpoint in
 *   this product — a roster is written by an admin — so a Register button
 *   would be a control that does nothing (§10.3.1.2). It belongs with the API
 *   that would honour it.
 * - **The mock's emoji.** Icons are lucide components here (§10.3.1.6).
 */

/** Past cards say how you attended; the three that credit the training read
 *  as attended, matching §10.7 rather than inventing a second rule. */
const ATTENDANCE = {
  present: { label: "Present", chip: "chip chip-complete", credited: true },
  late: { label: "Late", chip: "chip chip-warning", credited: true },
  partial: { label: "Partial", chip: "chip chip-warning", credited: true },
  absent: { label: "Absent", chip: "chip chip-error", credited: false },
  excused: { label: "Excused", chip: "chip chip-idle", credited: false },
};

function formatDate(iso) {
  if (!iso) return "Date to be confirmed";
  const [y, m, d] = String(iso).slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return "Date to be confirmed";
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function formatTime(t) {
  if (!t) return "";
  const [h, min] = String(t).split(":").map(Number);
  return `${h % 12 || 12}:${String(min || 0).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

/** Duration from start/end, as the reference shows beside the time. */
function duration(start, end) {
  if (!start || !end) return "";
  const [sh, sm] = String(start).split(":").map(Number);
  const [eh, em] = String(end).split(":").map(Number);
  let mins = eh * 60 + em - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h ? `${h}h` : ""}${m ? `${h ? " " : ""}${m}m` : ""}` || "";
}

function statusOf(s) {
  return s?.display_status || s?.status || "upcoming";
}

function Tile({ icon: Icon, value, label, tone = "tile-accent" }) {
  return (
    <Card className="gap-0 p-4">
      <Box className={cn("mb-2 flex size-8 items-center justify-center", tone)}>
        <Icon className="size-4" />
      </Box>
      <Text as="p" className="text-[20px] font-bold leading-none text-ink">{value}</Text>
      <Text as="p" className="mt-1 text-[11px] text-text-2">{label}</Text>
    </Card>
  );
}

function SessionCard({ session: s, mode, eligible, onGiveFeedback }) {
  const att = ATTENDANCE[s.attendance_status] ?? null;
  const isVirtual = s.session_type !== "ILT";
  const isLink = typeof s.venue_url === "string" && s.venue_url.startsWith("http");
  const dur = duration(s.start_time, s.end_time);

  return (
    <Card className="flex flex-col gap-0 overflow-hidden p-0">
      {/* A session's art IS its training course's (§10.10) — no second
          column, no separate upload. */}
      <Box className="relative h-[100px] shrink-0">
        <CourseArt
          thumbnailUrl={s.thumbnail_url}
          contentType="session"
          alt=""
          className="h-full w-full"
        />
        <Text
          as="span"
          className={cn(
            "absolute right-2 top-2 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-white",
            mode === "past" ? "bg-success" : "bg-accent-blue",
          )}
        >
          {mode === "past" ? "Completed" : "Scheduled"}
        </Text>
      </Box>

      <Box className="flex flex-1 flex-col p-3.5">
        <Box className="mb-2 flex flex-wrap items-center gap-1.5">
          <Text as="span" className="border border-line bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold text-text-2">
            {SESSION_TYPE_LABEL[s.session_type] ?? s.session_type}
          </Text>
          {/* Only once a trainer has marked it. An unmarked past session says
              nothing rather than implying absence. */}
          {mode === "past" && att && (
            <Text as="span" className={cn(att.chip, "text-[10px]")}>{att.label}</Text>
          )}
        </Box>

        <Text as="h3" className="mb-2 line-clamp-2 min-h-[2.25rem] text-[13.5px] font-bold leading-snug text-ink">
          {s.title}
        </Text>

        <Box className="flex-1 space-y-1">
          {s.trainer && <Row icon={UserCircle} text={s.trainer} />}
          <Row
            icon={CalendarDays}
            text={`${formatDate(s.date)}${s.start_time ? ` · ${formatTime(s.start_time)}–${formatTime(s.end_time)}` : ""}${dur ? ` · ${dur}` : ""}`}
          />
          <Row
            icon={isVirtual ? Video : MapPin}
            text={s.venue_url || "Venue to be confirmed"}
            href={isVirtual && isLink ? s.venue_url : null}
            linkLabel="Join virtual room →"
          />
        </Box>

        {/* One action per state, and nothing that the API would refuse. */}
        <Box className="mt-3 border-t border-line pt-2.5">
          {mode === "past" ? (
            eligible && !eligible.submitted ? (
              <Button
                size="sm"
                onClick={() => onGiveFeedback(eligible)}
                className="w-full cursor-pointer gap-1.5 text-[12px] font-semibold"
              >
                <MessageSquare className="size-3.5" />
                Give feedback
              </Button>
            ) : (
              <Text as="p" className="text-center text-[11px] text-text-3">
                {eligible?.submitted
                  ? "Feedback submitted"
                  : att && !att.credited
                    ? "Feedback is open to those who attended"
                    : "Attendance not marked yet"}
              </Text>
            )
          ) : isVirtual && isLink ? (
            <a
              href={s.venue_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full cursor-pointer bg-navy py-1.5 text-center text-[12.5px] font-bold text-white transition-colors hover:bg-navy-soft"
            >
              Join →
            </a>
          ) : (
            <Text as="p" className="text-center text-[11px] text-text-3">
              In-person session
            </Text>
          )}
        </Box>
      </Box>
    </Card>
  );
}

function Row({ icon: Icon, text, href, linkLabel }) {
  return (
    <Box className="flex items-start gap-1.5">
      <Icon className="mt-0.5 size-3.5 shrink-0 text-text-3" />
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="truncate text-[11.5px] font-semibold text-accent-blue underline-offset-2 hover:underline"
        >
          {linkLabel}
        </a>
      ) : (
        <Text as="span" className="line-clamp-1 text-[11.5px] text-text-2">{text}</Text>
      )}
    </Box>
  );
}

export function MySessionsContent() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState(null);
  const [feedback, setFeedback] = useState({});
  const [rating, setRating] = useState(null);
  const [error, setError] = useState(null);

  const loadFeedback = useCallback(() => {
    fetchLearnerFeedbackSessions()
      .then((d) => {
        const byId = {};
        for (const row of d.sessions || []) byId[row.session_id] = row;
        setFeedback(byId);
      })
      // Silent: feedback is an extra here, and an error banner over the list
      // would hide the thing the learner came for.
      .catch(() => setFeedback({}));
  }, []);

  useEffect(() => {
    if (!user) return;
    apiClient("/api/learner/sessions")
      .then((d) => setSessions(d.sessions || []))
      .catch((e) => setError(e.message));
    loadFeedback();
  }, [user, loadFeedback]);

  const { upcoming, past, counts } = useMemo(() => {
    const rows = sessions ?? [];
    const done = rows.filter((s) => statusOf(s) === "completed");
    const attended = rows.filter(
      (s) => ATTENDANCE[s.attendance_status]?.credited,
    ).length;
    return {
      upcoming: rows.filter((s) => statusOf(s) !== "completed" && statusOf(s) !== "cancelled"),
      past: done,
      counts: {
        total: rows.length,
        upcoming: rows.filter((s) => statusOf(s) === "upcoming").length,
        attended,
        // `—`, never 0%: "nothing has finished yet" and "you attended none of
        // them" are different facts (§10.3.1.8).
        rate: done.length > 0 ? `${Math.round((attended / done.length) * 100)}%` : "—",
      },
    };
  }, [sessions]);

  if (error) {
    return (
      <Card className="p-6">
        <Text as="p" className="text-[12.5px] text-danger">{error}</Text>
      </Card>
    );
  }

  if (!sessions) {
    return (
      <Box className="space-y-4">
        <Box className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
        </Box>
        <Box className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-72" />)}
        </Box>
      </Box>
    );
  }

  if (sessions.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center gap-2 border-dashed border-line-strong py-16 text-center">
        <CalendarCheck className="size-8 text-text-3" />
        <Text as="p" className="text-[13px] font-semibold text-ink">
          No sessions registered
        </Text>
        <Text as="p" className="max-w-md text-[11.5px] text-text-2">
          Your admin books you onto live and in-person sessions. They appear
          here and on your training calendar as soon as they do.
        </Text>
      </Card>
    );
  }

  return (
    <Box className="space-y-5">
      <Box className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile icon={CalendarCheck} value={counts.total} label="Total sessions" />
        <Tile icon={Clock} value={counts.upcoming} label="Upcoming" tone="tile-warning" />
        <Tile icon={CheckCircle2} value={counts.attended} label="Attended" tone="tile-success" />
        <Tile icon={TrendingUp} value={counts.rate} label="Attendance rate" tone="tile-success" />
      </Box>

      <Box className="flex items-start gap-2 border border-line bg-surface-2 px-3 py-2.5">
        <Clock className="mt-0.5 size-3.5 shrink-0 text-text-3" />
        <Text as="p" className="text-[11.5px] leading-snug text-text-2">
          Sessions you attend count toward your{" "}
          <Link href="/learning-hours" className="font-semibold text-accent-blue underline-offset-2 hover:underline">
            learning hours
          </Link>{" "}
          and leaderboard points, exactly as courses do. Only your trainer can
          mark you present.
        </Text>
      </Box>

      {upcoming.length > 0 && (
        <Box className="space-y-3">
          <Text as="h2" className="font-mono text-[11px] uppercase tracking-wider text-text-3">
            Upcoming sessions
          </Text>
          <Box className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
            {upcoming.map((s) => (
              <SessionCard key={s.id} session={s} mode="upcoming" />
            ))}
          </Box>
        </Box>
      )}

      {past.length > 0 && (
        <Box className="space-y-3">
          <Text as="h2" className="font-mono text-[11px] uppercase tracking-wider text-text-3">
            Past sessions
          </Text>
          <Box className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
            {past.map((s) => (
              <SessionCard
                key={s.id}
                session={s}
                mode="past"
                eligible={feedback[s.id] ?? null}
                onGiveFeedback={setRating}
              />
            ))}
          </Box>
        </Box>
      )}

      <SessionFeedbackDialog
        session={rating}
        open={!!rating}
        onOpenChange={(o) => !o && setRating(null)}
        onSaved={loadFeedback}
      />
    </Box>
  );
}
