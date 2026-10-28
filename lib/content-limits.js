/**
 * Limits on free-text content fields, in one place.
 *
 * Mirrors `server/src/common/content-limits.ts`, which is what actually
 * enforces them — this copy exists so the form can stop the admin at the limit
 * while they type, rather than letting them write three paragraphs and refusing
 * the save afterwards. Change both.
 */
export const DESCRIPTION_MAX_LENGTH = 450;

/** Learning Community free text. Mirrors server/src/common/content-limits.ts. */
export const COMMUNITY_TITLE_MAX = 160;
export const COMMUNITY_BODY_MAX = 4000;

// Hashtags on a community post (mirror server/src/common/content-limits.ts).
export const COMMUNITY_HASHTAG_MAX = 50;
export const COMMUNITY_HASHTAGS_PER_POST_MAX = 8;

// A kudos message.
export const KUDOS_MESSAGE_MAX = 500;

/** Direct message body. Mirrors server/src/common/content-limits.ts. */
export const MESSAGE_MAX_LENGTH = 2000;

/** Data-subject request details. Mirrors server/src/common/content-limits.ts. */
export const DATA_REQUEST_DETAILS_MAX = 450;
