/**
 * Turn the video link a person actually copies into one that will play.
 *
 * An admin pastes what is in their address bar — `vimeo.com/76979871`,
 * `loom.com/share/<id>` — and that page is NOT embeddable. Vimeo and Loom
 * both send `X-Frame-Options`/`frame-ancestors` on their watch pages, so an
 * iframe pointed at one renders an empty black box with the reason only in
 * the console. The learner sees a broken lesson and the admin sees a link
 * that works perfectly when they click it themselves.
 *
 * So the watch URL is translated to the player URL here, rather than asking
 * admins to know the difference. YouTube is handled separately by
 * `youtube-player.jsx`, which uses the IFrame API so it can report when the
 * video ENDS — that is what unlocks "mark complete", and a plain embed cannot
 * do it.
 *
 * Anything unrecognised is returned unchanged: it may already be an embed
 * URL, or a self-hosted player, and silently rewriting a URL we do not
 * understand would be worse than passing it through.
 */

const RULES = [
  // vimeo.com/76979871 · vimeo.com/channels/x/76979871 · with a privacy hash
  {
    test: /^https?:\/\/(?:www\.)?vimeo\.com\/(?:.*\/)?(\d+)(?:\/([0-9a-zA-Z]+))?/,
    build: (m) =>
      `https://player.vimeo.com/video/${m[1]}${m[2] ? `?h=${m[2]}` : ''}`,
  },
  // loom.com/share/<id> -> loom.com/embed/<id>
  {
    test: /^https?:\/\/(?:www\.)?loom\.com\/share\/([0-9a-zA-Z]+)/,
    build: (m) => `https://www.loom.com/embed/${m[1]}`,
  },
  // dailymotion.com/video/<id>
  {
    test: /^https?:\/\/(?:www\.)?dailymotion\.com\/video\/([0-9a-zA-Z]+)/,
    build: (m) => `https://www.dailymotion.com/embed/video/${m[1]}`,
  },
  // A Drive file's "view" page is not embeddable; its preview page is.
  {
    test: /^https?:\/\/drive\.google\.com\/file\/d\/([^/]+)/,
    build: (m) => `https://drive.google.com/file/d/${m[1]}/preview`,
  },
];

/** The embeddable form of `url`, or `url` itself when nothing matches. */
export function toEmbedUrl(url) {
  if (!url) return url;
  for (const { test, build } of RULES) {
    const m = url.match(test);
    if (m) return build(m);
  }
  return url;
}

/** Whether we recognise the host well enough to promise it will play. */
export function isKnownEmbedHost(url) {
  return Boolean(url) && RULES.some(({ test }) => test.test(url));
}
