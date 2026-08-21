import Image from "next/image";

import Box from "@/components/ui/box";

/**
 * Course and lesson artwork, with a dependable fallback.
 *
 * Most courses have no uploaded thumbnail, and the previous placeholder was a
 * cream tile with the course initials in it — decoration that took the most
 * prominent slot on the page and told the learner nothing. These two
 * illustrations fill that slot instead.
 *
 * Which fallback is used is derived, not random: a course whose lessons are
 * video gets the video illustration, everything else gets the dashboard one.
 * The same course therefore always looks the same, and the picture says
 * something true about what is inside.
 *
 * The illustrations are green, which is outside the brand palette, so they are
 * always laid under a navy scrim. On the dark hero that reads as tinted
 * artwork rather than a foreign colour; on light cards the scrim is lighter and
 * the art stays quiet behind the type.
 */

const ART = {
  video: "/course-art/course-video.jpg",
  default: "/course-art/course-default.jpg",
};

/** Video-led content gets the video illustration. */
export function courseArtFor({ thumbnailUrl, contentType } = {}) {
  if (thumbnailUrl) return thumbnailUrl;
  const type = (contentType || "").toLowerCase();
  return type === "video" || type === "scorm" ? ART.video : ART.default;
}

/**
 * @param {string}  [thumbnailUrl] Uploaded thumbnail, when the course has one
 * @param {string}  [contentType]  Drives which fallback is chosen
 * @param {string}  alt            Describe the course, not the picture
 * @param {"dark"|"light"} [scrim] How strongly to tint it
 * @param {boolean} [priority]     Set on the hero image only
 */
export function CourseArt({
  thumbnailUrl,
  contentType,
  alt,
  scrim = "dark",
  priority = false,
  className = "",
  sizes = "(max-width: 768px) 100vw, 33vw",
}) {
  const src = courseArtFor({ thumbnailUrl, contentType });

  return (
    <Box className={`relative overflow-hidden ${className}`}>
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes={sizes}
        className="object-cover"
      />
      {/* The scrim is what keeps an off-palette illustration on-brand. */}
      <Box
        aria-hidden="true"
        className={
          scrim === "dark"
            ? "absolute inset-0 bg-navy/72 mix-blend-multiply"
            : "absolute inset-0 bg-navy/12"
        }
      />
    </Box>
  );
}
