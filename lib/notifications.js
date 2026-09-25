/**
 * The browser's mirror of `server/src/common/notifications.ts`.
 *
 * Only what is stable lives here — the icon and the group. The wording comes
 * down ON the row, composed when the notification was written, because it
 * names a course or a person that may since have been renamed and a
 * notification describing what happened then must keep saying that.
 *
 * Icons are lucide component NAMES, mapped to components in the bell
 * (§10.3.1.6) — that keeps this file plain data.
 */

export const NOTIFICATION_GROUPS = {
  learning: { label: "Learning", tone: "text-accent-blue" },
  recognition: { label: "Recognition", tone: "text-success" },
  sessions: { label: "Sessions", tone: "text-warning" },
  people: { label: "People", tone: "text-accent-blue" },
  commercial: { label: "Edstellar", tone: "text-rust" },
};

/** How many the badge counts to before it reads "9+". Mirrors the API. */
export const UNREAD_BADGE_CAP = 9;

/** "just now", "3h ago", "12 Jan" — a bell is scanned, not read. */
export function relativeTime(value) {
  if (!value) return "";
  const then = new Date(value);
  if (Number.isNaN(then.getTime())) return "";
  const seconds = Math.floor((Date.now() - then.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return then.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
