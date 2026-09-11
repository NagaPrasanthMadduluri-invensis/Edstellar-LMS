/**
 * Limits on free-text content fields, in one place.
 *
 * Mirrors `server/src/common/content-limits.ts`, which is what actually
 * enforces them — this copy exists so the form can stop the admin at the limit
 * while they type, rather than letting them write three paragraphs and refusing
 * the save afterwards. Change both.
 */
export const DESCRIPTION_MAX_LENGTH = 450;
