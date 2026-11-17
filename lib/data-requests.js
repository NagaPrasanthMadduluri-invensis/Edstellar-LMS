/**
 * The browser's mirror of `server/src/common/data-requests.ts` — the two kinds
 * of data-subject request and the four states they move through, with the chip
 * each state reads as. Change both.
 *
 * Tones come from the closed status vocabulary, never a new hue: `open` is
 * waiting (idle), `in_progress` is being worked (progress), `resolved` is done
 * (complete) and `rejected` is refused (error).
 */
export const DATA_REQUEST_TYPES = [
  { key: "correction", label: "Correction" },
  { key: "deletion", label: "Deletion" },
  { key: "withdrawal", label: "Consent withdrawal" },
];

/**
 * The consent log's events (server `CONSENT_EVENTS`, 0065), as the My Data
 * privacy record names them.
 */
export const CONSENT_EVENT_LABELS = {
  acknowledged: "Acknowledged the privacy notice",
  choice_changed: "Changed a privacy choice",
  withdrawal_requested: "Asked to withdraw consent",
  withdrawal_resolved: "Withdrawal request actioned",
  withdrawal_rejected: "Withdrawal request declined",
};

/** Where a consent-log event came from, in words. */
export const CONSENT_SOURCE_LABELS = {
  notice_screen: "Privacy notice screen",
  profile: "My Profile",
  email_preferences: "Email preferences",
  unsubscribe_link: "Unsubscribe link in an email",
  my_data: "My Data",
  admin_data_requests: "Your administrator",
  backfill: "Recorded before the consent log existed",
};

export const DATA_REQUEST_STATUSES = [
  { key: "open", label: "Open", chip: "chip-idle" },
  { key: "in_progress", label: "In progress", chip: "chip-progress" },
  { key: "resolved", label: "Resolved", chip: "chip-complete" },
  { key: "rejected", label: "Rejected", chip: "chip-error" },
];

export function typeLabel(key) {
  return DATA_REQUEST_TYPES.find((t) => t.key === key)?.label ?? key;
}

export function statusLabel(key) {
  return DATA_REQUEST_STATUSES.find((s) => s.key === key)?.label ?? key;
}

/** The chip class for a status. */
export function statusTone(key) {
  return DATA_REQUEST_STATUSES.find((s) => s.key === key)?.chip ?? "chip-idle";
}

/** Friendly names for the `counts` of GET /api/my-data. */
export const DATA_COUNT_LABELS = {
  course_assignments: "Course assignments",
  lesson_completions: "Lesson completions",
  video_progress: "Video progress records",
  assessment_attempts: "Assessment attempts",
  scorm_assignments: "SCORM assignments",
  scorm_attempts: "SCORM attempts",
  certificates: "Certificates",
  journey_enrollments: "Learning path enrolments",
  badges: "Badges",
  external_certifications: "External certifications",
  session_roster: "Session bookings",
  session_attendance: "Session attendance records",
  session_feedback: "Session feedback",
  course_feedback: "Course feedback",
  community_posts: "Community posts",
  community_replies: "Community replies",
  direct_messages: "Direct messages",
  notifications: "Notifications",
  emails: "Emails sent to you",
  consent_events: "Consent history entries",
};
