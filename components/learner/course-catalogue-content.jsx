"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock,
  Hourglass,
  MapPin,
  Plus,
  Search,
  Users,
  Video,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { ApiError } from "@/lib/api-client";
import { categoryColor, categoryTint } from "@/lib/course-taxonomy";
import {
  enrolInCourse,
  enrolInSession,
  fetchCatalogue,
  leaveSession,
} from "@/services/api/catalogue-api";

import Box from "@/components/ui/box";
import Text from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CourseArt } from "@/components/shared/course-art";

/**
 * The Course Catalogue: what this learner may add to their own learning.
 *
 * COURSES AND SESSIONS ARE DELIBERATELY NOT THE SAME CARD, because joining
 * them means different things. A course starts when the learner opens it; a
 * session is a date they have to keep free, with a finite number of seats and
 * a queue behind them. Four things separate the two at a glance — the eyebrow
 * word, the stripe colour, what the body reports, and what the button says —
 * because one of those alone is a detail somebody skims past.
 *
 * NOTHING HERE DECIDES WHETHER SOMETHING IS JOINABLE. `is_enrolled`,
 * `is_full`, `seats_left` and `waitlist_position` all arrive from the API,
 * which is also what enforces them: a browser that recomputed "full" from
 * capacity and headcount would be a second definition of full, free to
 * disagree with the one the Book button actually hits.
 *
 * A learner can leave a SESSION and not a COURSE, and the absent control is
 * the honest one — leaving a course would delete lesson completions they have
 * genuinely earned. The empty state says where to go instead.
 */

const FILTERS = [
  { key: "all", label: "Everything" },
  { key: "courses", label: "Courses" },
  { key: "sessions", label: "Live sessions" },
];

/** Delivery mode → the stripe and pill colour, from the palette (§10.1). */
const SESSION_TONE = {
  ILT: { bar: "bg-accent-blue", text: "text-accent-blue", icon: MapPin },
  Virtual: { bar: "bg-navy", text: "text-navy", icon: Video },
};

export function CourseCatalogueContent() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [note, setNote] = useState(null);

  const load = useCallback(async () => {
    try {
      setData(await fetchCatalogue());
      setError(null);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not load the catalogue",
      );
      setData({ courses: [], sessions: [] });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function act(key, fn, said) {
    setBusyId(key);
    setNote(null);
    try {
      const res = await fn();
      setNote(said(res));
      // Refetch rather than patching the row: enrolling moves a seat count
      // and a waitlist position that other people also move, and a locally
      // patched card would quietly disagree with the next person's view.
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "That did not work");
    } finally {
      setBusyId(null);
    }
  }

  const courses = data?.courses ?? [];
  const sessions = data?.sessions ?? [];

  const { shownCourses, shownSessions } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const match = (...fields) =>
      !q || fields.filter(Boolean).join(" ").toLowerCase().includes(q);
    return {
      shownCourses:
        filter === "sessions"
          ? []
          : courses.filter((c) => match(c.name, c.category, c.tags, c.description)),
      shownSessions:
        filter === "courses"
          ? []
          : sessions.filter((s) =>
              match(s.title, s.trainer, s.venue_url, s.description),
            ),
    };
  }, [courses, sessions, filter, query]);

  if (!data) {
    return (
      <Box className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-64 w-full" />
        ))}
      </Box>
    );
  }

  const total = courses.length + sessions.length;

  return (
    <Box className="space-y-4">
      {error && (
        <Box className="border border-danger/40 bg-danger/10 px-3 py-2">
          <Text as="p" className="text-[13px] text-danger">{error}</Text>
        </Box>
      )}
      {note && (
        <Box className="border border-success/40 bg-success/10 px-3 py-2">
          <Text as="p" className="text-[13px] text-success">{note}</Text>
        </Box>
      )}

      {total === 0 ? (
        <EmptyCatalogue />
      ) : (
        <>
          <Box className="flex flex-wrap items-center gap-2">
            <Box className="flex border border-line bg-surface-2">
              {FILTERS.map((f) => {
                const count =
                  f.key === "courses"
                    ? courses.length
                    : f.key === "sessions"
                      ? sessions.length
                      : total;
                return (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setFilter(f.key)}
                    className={cn(
                      "cursor-pointer border-b-2 px-3 py-2 text-[13px] transition-colors",
                      filter === f.key
                        ? "border-navy bg-surface font-bold text-ink"
                        : "border-transparent font-semibold text-text-3 hover:bg-surface hover:text-ink",
                    )}
                  >
                    {f.label}
                    <Text as="span" className="ml-1.5 text-[11px] text-text-3">
                      {count}
                    </Text>
                  </button>
                );
              })}
            </Box>

            <Box className="relative ml-auto w-full sm:w-72">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-text-3" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search the catalogue…"
                className="h-9 pl-8 text-[13px]"
              />
            </Box>
          </Box>

          {shownCourses.length + shownSessions.length === 0 ? (
            <Box className="border border-dashed border-line-strong bg-surface px-4 py-10 text-center">
              <Text as="p" className="text-[13px] text-text-2">
                Nothing matches &ldquo;{query}&rdquo;.
              </Text>
            </Box>
          ) : (
            <Box className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {shownCourses.map((c) => (
                <CourseCard
                  key={`c${c.id}`}
                  course={c}
                  busy={busyId === `c${c.id}`}
                  onEnrol={() =>
                    act(
                      `c${c.id}`,
                      () => enrolInCourse(c.id),
                      () => `"${c.name}" is in My Courses.`,
                    )
                  }
                />
              ))}
              {shownSessions.map((s) => (
                <SessionCard
                  key={`s${s.id}`}
                  session={s}
                  busy={busyId === `s${s.id}`}
                  onEnrol={() =>
                    act(
                      `s${s.id}`,
                      () => enrolInSession(s.id),
                      (r) =>
                        r.state === "waitlisted"
                          ? `You are number ${r.position} on the waitlist for "${s.title}". You will be enrolled if a place frees up.`
                          : `Your place on "${s.title}" is booked — it is in My Sessions.`,
                    )
                  }
                  onLeave={() =>
                    act(
                      `s${s.id}`,
                      () => leaveSession(s.id),
                      (r) =>
                        r.was === "waitlisted"
                          ? `You have left the waitlist for "${s.title}".`
                          : `You have given up your place on "${s.title}".`,
                    )
                  }
                />
              ))}
            </Box>
          )}
        </>
      )}
    </Box>
  );
}

function EmptyCatalogue() {
  return (
    <Box className="border border-dashed border-line-strong bg-surface px-4 py-12 text-center">
      <BookOpen className="mx-auto size-8 text-text-3" />
      <Text as="p" className="mt-2 text-[13px] font-semibold text-ink">
        Nothing is open to join yet
      </Text>
      <Text as="p" className="mx-auto mt-1 max-w-md text-[12px] text-text-2">
        The catalogue lists courses and sessions your organization has opened to
        everyone. Anything assigned to you directly is already waiting in{" "}
        <Link href="/my-courses" className="text-accent-blue hover:underline">
          My Courses
        </Link>{" "}
        and{" "}
        <Link href="/my-sessions" className="text-accent-blue hover:underline">
          My Sessions
        </Link>
        .
      </Text>
    </Box>
  );
}

/* ───────────────────────────── Course card ─────────────────────────────── */

function CourseCard({ course, busy, onEnrol }) {
  const colour = categoryColor(course.category);

  return (
    <Box className="flex flex-col border border-line bg-surface">
      {/* The category stripe — the one coloured axis (§10.3.1.3). The seven
          hues are data, not palette tokens, so they cannot be a Tailwind
          class: the admin library sets them the same way. */}
      <Box className="h-[3px] w-full" style={{ backgroundColor: colour }} />

      <Box className="relative h-28 w-full overflow-hidden border-b border-line">
        <CourseArt
          thumbnailUrl={course.thumbnail_url}
          contentType="MIXED"
          alt=""
          className="h-full w-full"
        />
      </Box>

      <Box className="flex flex-1 flex-col p-3">
        <Text
          as="p"
          className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-3"
        >
          Course
        </Text>
        <Text as="h3" className="mt-1 line-clamp-2 text-[13px] font-bold text-ink">
          {course.name}
        </Text>

        <Box className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {course.category && (
            <Text
              as="span"
              className="px-1.5 py-0.5 text-[10px] font-semibold"
              style={{ backgroundColor: categoryTint(course.category), color: colour }}
            >
              {course.category}
            </Text>
          )}
          {course.is_mandatory && (
            <Text
              as="span"
              className="bg-danger/12 px-1.5 py-0.5 text-[10px] font-semibold text-danger"
            >
              Mandatory
            </Text>
          )}
        </Box>

        {/* Reserved two lines, so cards in a row keep their dividers level
            even when one has no description (§10.3.2). */}
        <Text
          as="p"
          className="mt-2 line-clamp-2 min-h-[2.75rem] text-[12px] leading-relaxed text-text-2"
        >
          {course.description || ""}
        </Text>

        <Box className="mt-auto flex items-center gap-3 border-t border-line pt-2 text-[11px] text-text-2">
          <Text as="span" className="flex items-center gap-1">
            <BookOpen className="size-3.5 text-text-3" />
            {course.lessons_count} lesson{course.lessons_count === 1 ? "" : "s"}
          </Text>
          {course.duration_minutes > 0 && (
            <Text as="span" className="flex items-center gap-1">
              <Clock className="size-3.5 text-text-3" />
              {formatMinutes(course.duration_minutes)}
            </Text>
          )}
          <Text as="span" className="ml-auto flex items-center gap-1 text-text-3">
            <Users className="size-3.5" />
            {course.enrolled_count}
          </Text>
        </Box>
      </Box>

      <Box className="border-t border-line p-3 pt-2.5">
        {course.is_enrolled ? (
          <Link href={`/my-courses/${course.public_id ?? course.id}`} className="block">
            <Button variant="outline" size="sm" className="w-full cursor-pointer text-xs">
              <CheckCircle2 className="mr-1.5 size-3.5 text-success" />
              Already yours — open it
              <ArrowRight className="ml-1.5 size-3.5" />
            </Button>
          </Link>
        ) : (
          <Button
            size="sm"
            className="w-full cursor-pointer text-xs"
            disabled={busy}
            onClick={onEnrol}
          >
            <Plus className="mr-1.5 size-3.5" />
            {busy ? "Adding…" : "Add to my learning"}
          </Button>
        )}
      </Box>
    </Box>
  );
}

/* ───────────────────────────── Session card ────────────────────────────── */

function SessionCard({ session, busy, onEnrol, onLeave }) {
  const tone = SESSION_TONE[session.session_type] ?? SESSION_TONE.ILT;
  const ToneIcon = tone.icon;

  return (
    <Box className="flex flex-col border border-line bg-surface">
      <Box className={cn("h-[3px] w-full", tone.bar)} />

      <Box className="relative h-28 w-full overflow-hidden border-b border-line">
        <CourseArt
          thumbnailUrl={session.thumbnail_url}
          contentType="session"
          alt=""
          className="h-full w-full"
        />
      </Box>

      <Box className="flex flex-1 flex-col p-3">
        <Box className="flex items-center justify-between gap-2">
          <Text
            as="p"
            className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-3"
          >
            Live session
          </Text>
          <Text
            as="span"
            className={cn(
              "flex items-center gap-1 border px-1.5 py-0.5 text-[10px] font-semibold",
              tone.text,
            )}
          >
            <ToneIcon className="size-3" />
            {session.session_type === "Virtual" ? "Virtual" : "In person"}
          </Text>
        </Box>

        <Text as="h3" className="mt-1 line-clamp-2 text-[13px] font-bold text-ink">
          {session.title}
        </Text>

        {/* What a session IS, in place of a course's lesson count: the date
            somebody has to keep free, and who is running it. */}
        <Box className="mt-2 space-y-1 text-[11px] text-text-2">
          <Text as="p" className="flex items-center gap-1.5">
            <CalendarDays className="size-3.5 shrink-0 text-text-3" />
            {formatDate(session.date)} · {session.start_time}–{session.end_time}
          </Text>
          <Text as="p" className="flex items-center gap-1.5">
            <ToneIcon className="size-3.5 shrink-0 text-text-3" />
            <Text as="span" className="truncate">{session.venue_url}</Text>
          </Text>
          <Text as="p" className="flex items-center gap-1.5">
            <Users className="size-3.5 shrink-0 text-text-3" />
            {session.trainer}
          </Text>
        </Box>

        <Box className="mt-auto border-t border-line pt-2">
          <SeatMeter session={session} />
        </Box>
      </Box>

      <Box className="space-y-1.5 border-t border-line p-3 pt-2.5">
        {session.is_enrolled ? (
          <>
            <Link href="/my-sessions" className="block">
              <Button variant="outline" size="sm" className="w-full cursor-pointer text-xs">
                <CheckCircle2 className="mr-1.5 size-3.5 text-success" />
                Booked — see My Sessions
                <ArrowRight className="ml-1.5 size-3.5" />
              </Button>
            </Link>
            <button
              type="button"
              onClick={onLeave}
              disabled={busy}
              className="w-full cursor-pointer text-[11px] text-text-3 underline-offset-2 hover:text-danger hover:underline disabled:cursor-not-allowed"
            >
              {busy ? "Working…" : "Give up my place"}
            </button>
          </>
        ) : session.is_waitlisted ? (
          <>
            <Box className="flex items-center justify-center gap-1.5 border border-warning/40 bg-warning/12 px-2 py-2">
              <Hourglass className="size-3.5 text-warning" />
              <Text as="span" className="text-[12px] font-semibold text-warning">
                {session.waitlist_position
                  ? `Number ${session.waitlist_position} on the waitlist`
                  : "On the waitlist"}
              </Text>
            </Box>
            <button
              type="button"
              onClick={onLeave}
              disabled={busy}
              className="w-full cursor-pointer text-[11px] text-text-3 underline-offset-2 hover:text-danger hover:underline disabled:cursor-not-allowed"
            >
              {busy ? "Working…" : "Leave the waitlist"}
            </button>
          </>
        ) : session.is_full ? (
          <>
            <Button
              size="sm"
              variant="outline"
              className="w-full cursor-pointer border-warning/50 text-xs text-warning hover:bg-warning hover:text-white"
              disabled={busy}
              onClick={onEnrol}
            >
              <Hourglass className="mr-1.5 size-3.5" />
              {busy ? "Joining…" : "Join the waitlist"}
            </Button>
            {/* Said before the click, not after: joining a queue is a
                different thing from booking a place, and the card should not
                let anybody discover that from the result. */}
            <Text as="p" className="text-center text-[11px] text-text-3">
              This session is full. You will be enrolled if a place frees up.
            </Text>
          </>
        ) : (
          <Button
            size="sm"
            className="w-full cursor-pointer text-xs"
            disabled={busy}
            onClick={onEnrol}
          >
            <CalendarDays className="mr-1.5 size-3.5" />
            {busy ? "Booking…" : "Book my place"}
          </Button>
        )}
      </Box>
    </Box>
  );
}

/**
 * How full the session is. The numbers come from the API, so the meter and
 * the button can never disagree about whether there is room.
 */
function SeatMeter({ session }) {
  const taken = session.roster_count;
  const cap = session.capacity;
  const pct = cap > 0 ? Math.min(100, Math.round((taken / cap) * 100)) : 0;

  return (
    <Box>
      <Box className="flex items-center justify-between text-[11px]">
        <Text as="span" className="text-text-2">
          {taken} / {cap} booked
        </Text>
        <Text
          as="span"
          className={cn(
            "font-semibold",
            session.is_full ? "text-warning" : "text-text-2",
          )}
        >
          {session.is_full
            ? session.waitlist_count > 0
              ? `Full · ${session.waitlist_count} waiting`
              : "Full"
            : `${session.seats_left} left`}
        </Text>
      </Box>
      <Box className="mt-1 h-1.5 w-full bg-surface-3">
        <Box
          className={cn("h-full", session.is_full ? "bg-warning" : "bg-accent-blue")}
          style={{ width: `${pct}%` }}
        />
      </Box>
    </Box>
  );
}

function formatMinutes(total) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** Postgres `date` is a plain `YYYY-MM-DD` here, so it is built from its own
 *  parts rather than handed to `new Date()` (§10.3.1.15). */
function formatDate(value) {
  if (!value) return "Date to be confirmed";
  const [y, m, d] = String(value).slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return String(value);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
