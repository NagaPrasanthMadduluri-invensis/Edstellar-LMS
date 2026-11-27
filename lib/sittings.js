/**
 * A session's SITTINGS, as the API derives them (`sessions[].sittings`).
 *
 * A sitting is one run of a session: each batch is a sitting, and a session
 * with no batches is a single sitting of its own. Every view (the three
 * calendars, the catalogue, My Sessions) renders from this list so a seat
 * count cannot differ from one screen to the next.
 *
 * Nothing here decides whether a sitting is full or how many seats are left:
 * `registered`, `available` and `is_full` arrive from the server. The fallback
 * for a payload without `sittings` only reshapes the old single-date fields.
 */

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "YYYY-MM-DD" (or a longer timestamp) to { y, m (0-based), d }, or null. */
export function parseIso(value) {
  const [y, m, d] = String(value || "").slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return null;
  return { y, m: m - 1, d };
}

export function formatTime(t) {
  if (!t) return "";
  const [h, min] = String(t).split(":").map(Number);
  return `${h % 12 || 12}:${String(min || 0).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

/** "9:00 AM to 12:00 PM", or "" when there is no start time. */
export function formatTimeRange(start, end) {
  if (!start) return "";
  return end ? `${formatTime(start)} to ${formatTime(end)}` : formatTime(start);
}

/** "March 4, 2030". */
export function formatLongDate(iso) {
  const p = parseIso(iso);
  return p ? `${MONTHS_LONG[p.m]} ${p.d}, ${p.y}` : "";
}

/**
 * "1 Dec 2030" for one day, "1 Dec to 3 Dec 2030" for a run in one year,
 * "30 Dec 2030 to 2 Jan 2031" across a year end, "Date to be set" for none.
 */
export function formatDateRange(start, end) {
  const a = parseIso(start);
  if (!a) return "Date to be set";
  const b = parseIso(end);
  if (!b || (b.y === a.y && b.m === a.m && b.d === a.d)) {
    return `${a.d} ${MONTHS_SHORT[a.m]} ${a.y}`;
  }
  if (b.y === a.y) return `${a.d} ${MONTHS_SHORT[a.m]} to ${b.d} ${MONTHS_SHORT[b.m]} ${b.y}`;
  return `${a.d} ${MONTHS_SHORT[a.m]} ${a.y} to ${b.d} ${MONTHS_SHORT[b.m]} ${b.y}`;
}

/** The sittings of a session, falling back to its one old-style date. */
export function sittingsOf(session) {
  if (!session) return [];
  if (Array.isArray(session.sittings) && session.sittings.length > 0) return session.sittings;
  const stored = session.display_status || session.status;
  const registered = session.roster_count ?? null;
  const capacity = Number(session.capacity) || 0;
  return [{
    batch_id: null,
    batch_no: null,
    name: session.title,
    label: null,
    start_date: session.date || null,
    end_date: session.end_date || session.date || null,
    dates: session.date ? [String(session.date).slice(0, 10)] : [],
    start_time: session.start_time || null,
    end_time: session.end_time || null,
    capacity,
    registered,
    available: registered == null ? null : Math.max(0, capacity - registered),
    is_full: registered == null ? false : capacity > 0 && registered >= capacity,
    waitlist: session.waitlist_count ?? 0,
    status: stored === "cancelled" ? "cancelled"
      : stored === "completed" ? "completed"
      : session.date ? "scheduled" : "pending",
    trainer_name: session.trainer || null,
    total_minutes: null,
  }];
}

/** "1 / 3 · 2 seats left", "1 / 1 · Full", "1 / 1 · Full · 2 waiting"; "" when unknown. */
export function seatsText(sitting) {
  if (!sitting || sitting.registered == null) return "";
  const base = `${sitting.registered} / ${sitting.capacity}`;
  if (sitting.status === "cancelled") return `${base} · Cancelled`;
  if (sitting.is_full) {
    return `${base} · Full${sitting.waitlist > 0 ? ` · ${sitting.waitlist} waiting` : ""}`;
  }
  const left = sitting.available ?? Math.max(0, sitting.capacity - sitting.registered);
  return `${base} · ${left} seat${left === 1 ? "" : "s"} left`;
}

/**
 * Is this the learner's own batch? Since 0076 a learner has one batch on each
 * date (`my_batch_ids`); `my_batch_id` is the older single value.
 */
export function isMyBatch(session, sitting) {
  if (sitting?.batch_id == null) return false;
  const mine = Array.isArray(session?.my_batch_ids) && session.my_batch_ids.length
    ? session.my_batch_ids
    : session?.my_batch_id != null ? [session.my_batch_id] : [];
  return mine.some((id) => Number(id) === Number(sitting.batch_id));
}

/* ── Session dates (0076) ──────────────────────────────────────────────── */

function ordinal(n) {
  const r = n % 100;
  if (r >= 11 && r <= 13) return `${n}th`;
  return `${n}${({ 1: "st", 2: "nd", 3: "rd" })[n % 10] || "th"}`;
}

/**
 * "5th, 6th November and 2nd December 2026": the same words the server puts
 * on certificates (`formatSessionDates` in server/src/common/session-schedule.ts).
 * Prefer the API's `dates_text` when it is there.
 */
export function formatSessionDates(dates) {
  const list = [...new Set((dates || []).map((d) => String(d).slice(0, 10)).filter((d) => parseIso(d)))].sort();
  if (list.length === 0) return "";
  const groups = [];
  for (const d of list) {
    const p = parseIso(d);
    const last = groups[groups.length - 1];
    if (last && last.y === p.y && last.m === p.m) last.days.push(p.d);
    else groups.push({ y: p.y, m: p.m, days: [p.d] });
  }
  const crosses = groups.some((g) => g.y !== groups[0].y);
  const parts = groups.map((g) => {
    const text = `${g.days.map(ordinal).join(", ")} ${MONTHS_LONG[g.m]}`;
    return crosses ? `${text} ${g.y}` : text;
  });
  const joined = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
  return crosses ? joined : `${joined} ${groups[0].y}`;
}

/** "Thu 5 Nov 2026" for one date in a list. */
export function formatDayDate(iso) {
  const p = parseIso(iso);
  if (!p) return "";
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date(Date.UTC(p.y, p.m, p.d)).getUTCDay()];
  return `${wd} ${p.d} ${MONTHS_SHORT[p.m]} ${p.y}`;
}

/** "Postponed" / "Preponed" / "" for a schedule entry's `change`. */
export function dateChangeLabel(change) {
  return change === "postponed" ? "Postponed" : change === "preponed" ? "Preponed" : "";
}

/** The session's dates in order, from `schedule`, or from its sittings. */
export function scheduleOf(session) {
  if (Array.isArray(session?.schedule) && session.schedule.length) return session.schedule;
  const dates = [...new Set(sittingsOf(session).flatMap((x) => x.dates || []))].sort();
  return dates.map((date) => ({ id: null, date, original_date: date, previous_date: null, change: null }));
}

/**
 * One calendar entry per DAY of every sitting. A three-day sitting yields three
 * entries (Day 1 of 3 ...); two batches on one day yield two entries on it.
 */
export function calendarEntries(sessions) {
  const out = [];
  for (const session of sessions || []) {
    // "Day 2 of 3" counts the SESSION's dates (0076): each batch runs on one.
    const sessionDays = scheduleOf(session).map((d) => d.date);
    for (const sitting of sittingsOf(session)) {
      const dates = (sitting.dates || []).filter((d) => parseIso(d));
      dates.forEach((date, i) => {
        const p = parseIso(date);
        const at = sessionDays.indexOf(date);
        const change = (session.schedule || []).find((d) => d.date === date)?.change || null;
        out.push({
          key: `${session.id}:${sitting.batch_id ?? "s"}:${date}`,
          session, sitting, date, change,
          y: p.y, m: p.m, d: p.d,
          dayNo: at >= 0 ? at + 1 : i + 1,
          dayCount: sessionDays.length > 1 ? sessionDays.length : dates.length,
        });
      });
    }
  }
  out.sort((a, b) => (a.sitting.start_time || "").localeCompare(b.sitting.start_time || ""));
  return out;
}

/** Sittings that have no date yet (and are not cancelled): "Date to be set". */
export function pendingEntries(sessions) {
  const out = [];
  for (const session of sessions || []) {
    for (const sitting of sittingsOf(session)) {
      if (sitting.status === "cancelled") continue;
      if ((sitting.dates || []).some((d) => parseIso(d))) continue;
      if (sitting.status === "pending" || !sitting.start_date) out.push({ session, sitting });
    }
  }
  return out;
}

/** Open for booking: scheduled and has a start date. */
export function isBookable(sitting) {
  return sitting?.status === "scheduled" && !!sitting?.start_date;
}

/**
 * What saving a new set of dates will do, the server's rule mirrored for the
 * preview (`planSchedule` in server/src/common/session-schedule.ts): a removed
 * and an added date are paired in order as a MOVE, labelled postponed or
 * preponed; the rest are plain adds and removes.
 */
export function planSchedule(current, desired) {
  const want = new Set(desired);
  const have = new Set(current);
  const removed = [...have].filter((d) => !want.has(d)).sort();
  const added = [...want].filter((d) => !have.has(d)).sort();
  const pairs = Math.min(removed.length, added.length);
  return {
    moves: removed.slice(0, pairs).map((from, i) => ({
      from, to: added[i], change: added[i] > from ? "postponed" : "preponed",
    })),
    added: added.slice(pairs),
    removed: removed.slice(pairs),
  };
}

/** Every date from start to end inclusive ("YYYY-MM-DD"), capped at 62. */
export function datesInRange(start, end) {
  const a = parseIso(start);
  if (!a) return [];
  const b = parseIso(end) || a;
  const out = [];
  let t = Date.UTC(a.y, a.m, a.d);
  const last = Math.max(t, Date.UTC(b.y, b.m, b.d));
  for (; t <= last && out.length < 62; t += 86400000) out.push(new Date(t).toISOString().slice(0, 10));
  return out;
}
