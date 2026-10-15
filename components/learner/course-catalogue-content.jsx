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
  Layers,
  MapPin,
  Plus,
  PlusCircle,
  Search,
  Users,
  Video,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { ApiError } from "@/lib/api-client";
import { categoryColor, categoryTint } from "@/lib/course-taxonomy";
import { sessionTypeLabel } from "@/lib/session-types";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CourseArt } from "@/components/shared/course-art";
import { KpiStatCard } from "@/components/shared/kpi-stat-card";

/**
 * The Course Catalogue — what this learner may add to their own learning,
 * restyled to the Harbor reference: a KPI stat-card row, a search + filter bar,
 * an "All Learning" grid, and a "Recommended for you" row.
 *
 * The decision records in screens-learner-learning.md §10.3.1.19 still hold and
 * are the reason this is a restyle, not a rewrite:
 *   - COURSES AND SESSIONS ARE DELIBERATELY NOT THE SAME CARD. Four signals
 *     separate them — the type chip, the stripe/mode colour, what the body
 *     reports, and what the button says.
 *   - NOTHING HERE DECIDES WHETHER SOMETHING IS JOINABLE. `is_enrolled`,
 *     `is_full`, `seats_left`, `waitlist_position` all arrive from the API,
 *     which enforces them.
 *   - A learner can leave a SESSION and not a COURSE; the absent control is the
 *     honest one.
 *   - After any action the page REFETCHES rather than patching the row.
 *
 * The reference's manager-approval / request-access, prerequisites and
 * pathways-in-catalogue are deliberately NOT built — this product has no such
 * backend, and a control that does nothing is the screen that lies (§10.3.1.2).
 */

/** Learning-type filter options (sessions carry Webinar as a delivery mode). */
const LEARN_TYPES = [
  { key: "all", label: "All learning types" },
  { key: "course", label: "Courses" },
  { key: "session", label: "Live sessions" },
  { key: "webinar", label: "Webinars" },
];

/** Delivery mode → the stripe and pill colour (§10.1 / §10.3.1.17). */
const SESSION_TONE = {
  ILT: { bar: "bg-accent-blue", text: "text-accent-blue", icon: MapPin, word: "In person" },
  Virtual: { bar: "bg-navy", text: "text-navy", icon: Video, word: "Virtual" },
  Webinar: { bar: "bg-success", text: "text-success", icon: Video, word: "Webinar" },
};

export function CourseCatalogueContent() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [learnType, setLearnType] = useState("all");
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [note, setNote] = useState(null);

  const load = useCallback(async () => {
    try {
      setData(await fetchCatalogue());
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load the catalogue");
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
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "That did not work");
    } finally {
      setBusyId(null);
    }
  }

  const courses = data?.courses ?? [];
  const sessions = data?.sessions ?? [];

  const categories = useMemo(
    () => [...new Set(courses.map((c) => c.category).filter(Boolean))].sort(),
    [courses],
  );

  const { shownCourses, shownSessions } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const match = (...fields) =>
      !q || fields.filter(Boolean).join(" ").toLowerCase().includes(q);
    const showCourses = learnType === "all" || learnType === "course";
    const showSessions = learnType === "all" || learnType === "session" || learnType === "webinar";
    return {
      shownCourses: !showCourses
        ? []
        : courses.filter(
            (c) =>
              (category === "all" || c.category === category) &&
              match(c.name, c.category, c.tags, c.description),
          ),
      shownSessions: !showSessions
        ? []
        : sessions.filter((s) => {
            const isWebinar = s.session_type === "Webinar";
            if (learnType === "webinar" && !isWebinar) return false;
            if (learnType === "session" && isWebinar) return false;
            return match(s.title, s.trainer, s.venue_url, s.description);
          }),
    };
  }, [courses, sessions, learnType, category, query]);

  if (!data) {
    return (
      <Box className="space-y-5">
        <Box className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </Box>
        <Box className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-72 w-full rounded-xl" />)}
        </Box>
      </Box>
    );
  }

  const total = courses.length + sessions.length;
  if (total === 0) return <EmptyCatalogue />;

  const joinedCourses = courses.filter((c) => c.is_enrolled).length;
  const joinedSessions = sessions.filter((s) => s.is_enrolled).length;
  const available =
    courses.filter((c) => !c.is_enrolled).length +
    sessions.filter((s) => !s.is_enrolled && !s.is_waitlisted).length;

  const filtered = shownCourses.length + shownSessions.length;
  const noFilter = !query.trim() && learnType === "all" && category === "all";
  const recommended = noFilter
    ? courses.filter((c) => !c.is_enrolled).slice(0, 6)
    : [];

  return (
    <Box className="space-y-5">
      {error && (
        <Box className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2">
          <Text as="p" className="text-[13px] text-danger">{error}</Text>
        </Box>
      )}
      {note && (
        <Box className="rounded-lg border border-success/40 bg-success/10 px-3 py-2">
          <Text as="p" className="text-[13px] text-success">{note}</Text>
        </Box>
      )}

      {/* KPI row */}
      <Box className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiStatCard icon={Layers} tone="accent" value={total} label="Open to join" sub={`${categories.length} categor${categories.length === 1 ? "y" : "ies"}`} />
        <KpiStatCard icon={CheckCircle2} tone="success" value={joinedCourses + joinedSessions} label="Already joined" sub={total ? `${Math.round(((joinedCourses + joinedSessions) / total) * 100)}% of catalogue` : "—"} />
        <KpiStatCard icon={PlusCircle} tone="warning" value={available} label="Available to join" sub="Ready to start" />
        <KpiStatCard icon={CalendarDays} tone="rust" value={sessions.length} label="Live sessions" sub={sessions.length ? "Keep a date free" : "None scheduled"} />
      </Box>

      {/* Search + filters */}
      <Box className="flex flex-wrap items-center gap-2">
        <Box className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-text-3" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search courses, tags…"
            className="h-9 pl-8 text-[13px]"
          />
        </Box>
        <Select value={learnType} onValueChange={setLearnType}>
          <SelectTrigger className="h-9 w-[170px] text-[13px]">
            <SelectValue>{LEARN_TYPES.find((t) => t.key === learnType)?.label}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {LEARN_TYPES.map((t) => (
              <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="h-9 w-[160px] text-[13px]">
            <SelectValue>{category === "all" ? "All categories" : category}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </Box>

      <SectionHeading>All learning</SectionHeading>

      {filtered === 0 ? (
        <Box className="rounded-xl border border-dashed border-line-strong bg-surface px-4 py-12 text-center">
          <Search className="mx-auto size-7 text-text-3" />
          <Text as="p" className="mt-2 text-[13px] font-semibold text-ink">No learning matches your search</Text>
          <Text as="p" className="mt-1 text-[12px] text-text-2">Try a different term or clear the filters.</Text>
        </Box>
      ) : (
        <Box className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shownCourses.map((c) => (
            <CourseCard
              key={`c${c.id}`}
              course={c}
              busy={busyId === `c${c.id}`}
              onEnrol={() => act(`c${c.id}`, () => enrolInCourse(c.id), () => `"${c.name}" is in My Courses.`)}
            />
          ))}
          {shownSessions.map((s) => (
            <SessionCard
              key={`s${s.id}`}
              session={s}
              busy={busyId === `s${s.id}`}
              onEnrol={() =>
                act(`s${s.id}`, () => enrolInSession(s.id), (r) =>
                  r.state === "waitlisted"
                    ? `You are number ${r.position} on the waitlist for "${s.title}". You will be enrolled if a place frees up.`
                    : `Your place on "${s.title}" is booked — it is in My Sessions.`,
                )
              }
              onLeave={() =>
                act(`s${s.id}`, () => leaveSession(s.id), (r) =>
                  r.was === "waitlisted"
                    ? `You have left the waitlist for "${s.title}".`
                    : `You have given up your place on "${s.title}".`,
                )
              }
            />
          ))}
        </Box>
      )}

      {recommended.length > 0 && (
        <Box className="space-y-3 pt-2">
          <SectionHeading accent>Recommended for you</SectionHeading>
          <Box className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {recommended.map((c) => (
              <CourseCard
                key={`r${c.id}`}
                course={c}
                busy={busyId === `c${c.id}`}
                onEnrol={() => act(`c${c.id}`, () => enrolInCourse(c.id), () => `"${c.name}" is in My Courses.`)}
              />
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}

function SectionHeading({ children, accent }) {
  return (
    <Box className="flex items-center gap-2">
      <Box className={cn("h-4 w-1 rounded-full", accent ? "bg-rust" : "bg-accent-blue")} />
      <Text as="h2" className="text-[15px] font-bold text-ink">{children}</Text>
    </Box>
  );
}

function EmptyCatalogue() {
  return (
    <Box className="rounded-xl border border-dashed border-line-strong bg-surface px-4 py-12 text-center">
      <BookOpen className="mx-auto size-8 text-text-3" />
      <Text as="p" className="mt-2 text-[13px] font-semibold text-ink">Nothing is open to join yet</Text>
      <Text as="p" className="mx-auto mt-1 max-w-md text-[12px] text-text-2">
        The catalogue lists courses and sessions your organization has opened to everyone. Anything assigned to you
        directly is already waiting in{" "}
        <Link href="/my-courses" className="text-accent-blue hover:underline">My Courses</Link>{" "}
        and{" "}
        <Link href="/my-sessions" className="text-accent-blue hover:underline">My Sessions</Link>.
      </Text>
    </Box>
  );
}

/* ───────────────────────────── Course card ─────────────────────────────── */

function CourseCard({ course, busy, onEnrol }) {
  const colour = categoryColor(course.category);
  return (
    <Box className="flex flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-[var(--shadow)] transition-transform hover:-translate-y-0.5">
      <Box className="relative h-32 w-full overflow-hidden">
        <CourseArt thumbnailUrl={course.thumbnail_url} contentType="MIXED" alt="" className="h-full w-full" />
        <Box className="h-[3px] w-full absolute top-0 left-0 z-10" style={{ backgroundColor: colour }} />
        <Box className="absolute left-2 top-2.5 z-10 flex items-center gap-1 rounded-md bg-white/85 px-1.5 py-0.5 backdrop-blur-sm">
          <BookOpen className="size-3 text-accent-blue" />
          <Text as="span" className="font-mono text-[9.5px] font-bold uppercase tracking-wide text-navy">Course</Text>
        </Box>
        {course.is_mandatory && (
          <Box className="absolute right-2 top-2.5 z-10 rounded-md bg-danger/90 px-1.5 py-0.5">
            <Text as="span" className="text-[9.5px] font-bold text-white">Mandatory</Text>
          </Box>
        )}
      </Box>

      <Box className="flex flex-1 flex-col p-3.5">
        {course.category && (
          <Text as="p" className="font-mono text-[10px] font-semibold uppercase tracking-wide" style={{ color: colour }}>
            {course.category}
          </Text>
        )}
        <Text as="h3" className="mt-1 line-clamp-2 text-[13.5px] font-bold text-ink">{course.name}</Text>
        <Text as="p" className="mt-1.5 line-clamp-2 min-h-[2.5rem] text-[12px] leading-relaxed text-text-2">
          {course.description || ""}
        </Text>

        <Box className="mt-auto flex items-center gap-3 border-t border-line pt-2.5 text-[11px] text-text-2">
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
          <Button size="sm" className="w-full cursor-pointer text-xs" disabled={busy} onClick={onEnrol}>
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
    <Box className="flex flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-[var(--shadow)] transition-transform hover:-translate-y-0.5">
      <Box className="relative h-32 w-full overflow-hidden">
        <CourseArt thumbnailUrl={session.thumbnail_url} contentType="session" alt="" className="h-full w-full" />
        <Box className={cn("absolute top-0 left-0 z-10 h-[3px] w-full", tone.bar)} />
        <Box className="absolute left-2 top-2.5 z-10 flex items-center gap-1 rounded-md bg-white/85 px-1.5 py-0.5 backdrop-blur-sm">
          <ToneIcon className={cn("size-3", tone.text)} />
          <Text as="span" className="font-mono text-[9.5px] font-bold uppercase tracking-wide text-navy">
            {sessionTypeLabel(session.session_type)}
          </Text>
        </Box>
      </Box>

      <Box className="flex flex-1 flex-col p-3.5">
        <Text as="p" className={cn("font-mono text-[10px] font-semibold uppercase tracking-wide", tone.text)}>
          {tone.word}
        </Text>
        <Text as="h3" className="mt-1 line-clamp-2 text-[13.5px] font-bold text-ink">{session.title}</Text>

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

        <Box className="mt-auto border-t border-line pt-2.5">
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
            <button type="button" onClick={onLeave} disabled={busy}
              className="w-full cursor-pointer text-[11px] text-text-3 underline-offset-2 hover:text-danger hover:underline disabled:cursor-not-allowed">
              {busy ? "Working…" : "Give up my place"}
            </button>
          </>
        ) : session.is_waitlisted ? (
          <>
            <Box className="flex items-center justify-center gap-1.5 rounded-md border border-warning/40 bg-warning/12 px-2 py-2">
              <Hourglass className="size-3.5 text-warning" />
              <Text as="span" className="text-[12px] font-semibold text-warning">
                {session.waitlist_position ? `Number ${session.waitlist_position} on the waitlist` : "On the waitlist"}
              </Text>
            </Box>
            <button type="button" onClick={onLeave} disabled={busy}
              className="w-full cursor-pointer text-[11px] text-text-3 underline-offset-2 hover:text-danger hover:underline disabled:cursor-not-allowed">
              {busy ? "Working…" : "Leave the waitlist"}
            </button>
          </>
        ) : session.is_full ? (
          <>
            <Button size="sm" variant="outline" disabled={busy} onClick={onEnrol}
              className="w-full cursor-pointer border-warning/50 text-xs text-warning hover:bg-warning hover:text-white">
              <Hourglass className="mr-1.5 size-3.5" />
              {busy ? "Joining…" : "Join the waitlist"}
            </Button>
            <Text as="p" className="text-center text-[11px] text-text-3">
              This session is full. You will be enrolled if a place frees up.
            </Text>
          </>
        ) : (
          <Button size="sm" className="w-full cursor-pointer text-xs" disabled={busy} onClick={onEnrol}>
            <CalendarDays className="mr-1.5 size-3.5" />
            {busy ? "Booking…" : "Book my place"}
          </Button>
        )}
      </Box>
    </Box>
  );
}

function SeatMeter({ session }) {
  const taken = session.roster_count;
  const cap = session.capacity;
  const pct = cap > 0 ? Math.min(100, Math.round((taken / cap) * 100)) : 0;
  return (
    <Box>
      <Box className="flex items-center justify-between text-[11px]">
        <Text as="span" className="text-text-2">{taken} / {cap} booked</Text>
        <Text as="span" className={cn("font-semibold", session.is_full ? "text-warning" : "text-text-2")}>
          {session.is_full
            ? session.waitlist_count > 0 ? `Full · ${session.waitlist_count} waiting` : "Full"
            : `${session.seats_left} left`}
        </Text>
      </Box>
      <Box className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
        <Box className={cn("h-full rounded-full", session.is_full ? "bg-warning" : "bg-accent-blue")} style={{ width: `${pct}%` }} />
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

function formatDate(value) {
  if (!value) return "Date to be confirmed";
  const [y, m, d] = String(value).slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return String(value);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}
