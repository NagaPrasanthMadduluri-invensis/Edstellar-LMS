/**
 * Leaderboard name display (0064). Mirrors
 * `server/src/common/leaderboard-privacy.ts`, which is what validates the
 * value; this copy exists only so the settings form can offer the choices and
 * describe them. Change both.
 *
 * The browser never formats a colleague's name itself: the API sends names
 * already in the organization's chosen form.
 */
export const LEADERBOARD_NAME_DISPLAYS = [
  {
    value: "initial",
    label: "First name and last initial",
    example: "Priya S.",
  },
  {
    value: "full",
    label: "Full name",
    example: "Priya Sharma",
  },
];

export const DEFAULT_LEADERBOARD_NAME_DISPLAY = "initial";

export function nameDisplayLabel(value) {
  return (
    LEADERBOARD_NAME_DISPLAYS.find((d) => d.value === value)?.label ??
    LEADERBOARD_NAME_DISPLAYS[0].label
  );
}
