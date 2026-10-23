/**
 * The privacy-notice version this build displays. Mirrors
 * `CURRENT_PRIVACY_VERSION` on the server, which is what actually decides
 * whether a user must consent — this constant is for display only.
 */
export const CURRENT_PRIVACY_VERSION = "2026-10-22";

/**
 * Where the full privacy policy lives. A real, public page (`/privacy`) that
 * the consent screen, the My Data page and the data-request emails link to.
 * Mirrors `PRIVACY_POLICY_URL` on the server.
 */
export const PRIVACY_POLICY_URL = "/privacy";
