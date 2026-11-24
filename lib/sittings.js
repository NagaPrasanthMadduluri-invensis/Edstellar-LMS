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

/** Is this the learner's own batch? A single un-batched sitting is never "a batch". */
export function isMyBatch(session, sitting) {
  return sitting?.batch_id != null && session?.my_batch_id != null
    && Number(sitting.batch_id) === Number(session.my_batch_id);
}

/**
 * One calendar entry per DAY of every sitting. A three-day sitting yields three
 * entries (Day 1 of 3 ...); two batches on one day yield two entries on it.
 */
export function calendarEntries(sessions) {
  const out = [];
  for (const session of sessions || []) {
    for (const sitting of sittingsOf(session)) {
      const dates = (sitting.dates || []).filter((d) => parseIso(d));
      dates.forEach((date, i) => {
        const p = parseIso(date);
        out.push({
          key: `${session.id}:${sitting.batch_id ?? "s"}:${date}`,
          session, sitting, date,
          y: p.y, m: p.m, d: p.d,
          dayNo: i + 1, dayCount: dates.length,
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
