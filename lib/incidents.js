/**
 * The browser's mirror of `server/src/common/incidents.ts`: LABELS and chip
 * tones only. Deadlines are never computed here; the API sends each clock's
 * state, so the register cannot disagree with the server about what is late.
 *
 * Tones come from the closed status vocabulary (§10.3), never a new hue.
 */
export const INCIDENT_SEVERITIES = [
  { key: "low", label: "Low", chip: "chip-idle" },
  { key: "medium", label: "Medium", chip: "chip-progress" },
  { key: "high", label: "High", chip: "chip-warning" },
  { key: "critical", label: "Critical", chip: "chip-error" },
];

export const INCIDENT_STATUSES = [
  { key: "open", label: "Open", chip: "chip-error" },
  { key: "assessing", label: "Assessing", chip: "chip-warning" },
  { key: "contained", label: "Contained", chip: "chip-progress" },
  { key: "closed", label: "Closed", chip: "chip-complete" },
];

export const INCIDENT_ASSESSMENTS = [
  { key: "undecided", label: "Not yet assessed" },
  { key: "notifiable", label: "Notifiable" },
  { key: "not_notifiable", label: "Not notifiable" },
];

/** How a deadline's state reads. */
export const DEADLINE_STATES = {
  done: { label: "Done", chip: "chip-complete" },
  overdue: { label: "Overdue", chip: "chip-error" },
  due_soon: { label: "Due soon", chip: "chip-warning" },
  pending: { label: "Pending", chip: "chip-idle" },
};

export const pick = (list, key) => list.find((x) => x.key === key) ?? list[0];

/**
 * A timestamp for display, from ISO or Postgres (`+00` repaired), in the
 * reader's local time. Deadlines are minutes-sensitive, so the time is shown.
 */
export function formatWhen(value) {
  if (!value) return "—";
  const t = Date.parse(String(value).replace(" ", "T").replace(/([+-]\d{2})$/, "$1:00"));
  if (Number.isNaN(t)) return String(value);
  return new Date(t).toLocaleString(undefined, {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

/** "in 5 h" / "3 h ago", for a clock beside its absolute time. */
export function relativeTo(value, now = Date.now()) {
  if (!value) return "";
  const t = Date.parse(String(value).replace(" ", "T").replace(/([+-]\d{2})$/, "$1:00"));
  if (Number.isNaN(t)) return "";
  const mins = Math.round((t - now) / 60000);
  const abs = Math.abs(mins);
  const span = abs < 90 ? `${abs} min` : abs < 48 * 60 ? `${Math.round(abs / 60)} h` : `${Math.round(abs / 1440)} days`;
  return mins >= 0 ? `in ${span}` : `${span} ago`;
}

/** A `datetime-local` input value for an ISO/Postgres timestamp, local time. */
export function toLocalInput(value) {
  if (!value) return "";
  const t = Date.parse(String(value).replace(" ", "T").replace(/([+-]\d{2})$/, "$1:00"));
  if (Number.isNaN(t)) return "";
  const d = new Date(t);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** A `datetime-local` value back to ISO (UTC). Empty stays empty. */
export function fromLocalInput(value) {
  if (!value) return "";
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? "" : new Date(t).toISOString();
}
