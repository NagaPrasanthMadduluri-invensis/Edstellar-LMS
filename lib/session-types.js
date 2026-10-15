/**
 * How a session's type reads to a human.
 *
 * The stored values stay `ILT` and `Virtual` — that is the column's enum and
 * what the API validates against, so only the label changes here.
 *
 * "ILT" on its own was ambiguous: both kinds are instructor-led training, so a
 * classroom in Bangalore and a Zoom call showed the same word in the same
 * position and the only way to tell them apart was to open the session and
 * look at the venue. Saying which kind of ILT it is puts that back in the list.
 *
 * Defined once because it is rendered in four places — the sessions list, the
 * admin calendar, the learner calendar, and the session form. It was three
 * copies of the same map before, which is how they came to disagree.
 */
export const SESSION_TYPE_LABEL = {
  ILT: "ILT-In-person",
  Virtual: "ILT-Virtual",
  // A webinar is a virtual sitting (its venue is a meeting URL); the enum now
  // accepts it (session_type: ILT | Virtual | Webinar) and admins can pick it
  // when creating a session.
  Webinar: "Webinar",
};

/** Falls back to the raw value, so an unknown type is visible, not blank. */
export function sessionTypeLabel(type) {
  return SESSION_TYPE_LABEL[type] ?? type ?? SESSION_TYPE_LABEL.ILT;
}
