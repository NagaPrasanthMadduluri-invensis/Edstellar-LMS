"use client";

import Link from "next/link";
import Image from "next/image";
import { Play, Package, FileText, Users, ClipboardList, ArrowRight, Lock, Sparkles } from "lucide-react";

import Box from "@/components/ui/box";
import Text from "@/components/ui/text";
import { courseArtFor } from "@/components/shared/course-art";
import { cn } from "@/lib/utils";

/**
 * The course card, Harbor "spotlight" format (reference `.lx-card`).
 *
 * A large, clearly visible cover photo that zooms on hover, with the text on a
 * frosted-glass panel floating at the foot: a mono category·duration eyebrow, a
 * Fraunces title, and only the two things that matter — points and progress.
 * No badge nudges here. The gradient is weighted to the bottom so the top of
 * the photo reads cleanly while the panel stays legible.
 *
 * Colours stay in the Spectra palette (white type on the photo; the CTA, when
 * shown, is `accent-blue`, which follows the active theme). The whole card is a
 * link to `href`.
 */

const TYPE = {
  video:   { label: "Video",      Icon: Play },
  scorm:   { label: "E-learning", Icon: Package },
  session: { label: "Session",    Icon: Users },
  quiz:    { label: "Quiz",       Icon: ClipboardList },
  document:{ label: "Document",   Icon: FileText },
  pdf:     { label: "Document",   Icon: FileText },
  doc:     { label: "Document",   Icon: FileText },
  ppt:     { label: "Document",   Icon: FileText },
  xls:     { label: "Document",   Icon: FileText },
  image:   { label: "Document",   Icon: FileText },
};
const typeInfo = (t) => TYPE[(t || "").toLowerCase()] || { label: "Course", Icon: Play };

/**
 * A real cover photo per category, so a course with no uploaded thumbnail still
 * gets a large, attractive image (reference `CL_CAT_PHOTOS`). Served from
 * Unsplash (next.config allows https remote images). Falls through to the
 * derived illustration via `courseArtFor` for anything unmapped.
 */
const CATEGORY_PHOTO = {
  Technical:     "https://images.unsplash.com/photo-1518186285589-2f7649de83e0?auto=format&fit=crop&w=640&q=70",
  Leadership:    "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=640&q=70",
  Compliance:    "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=640&q=70",
  "Soft Skills": "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=640&q=70",
  Finance:       "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=640&q=70",
  Operations:    "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=640&q=70",
  HR:            "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=640&q=70",
};

const CTA_CLASS = {
  solid:  "bg-accent-blue text-white hover:brightness-110",
  ghost:  "bg-white/90 text-ink hover:bg-white",
  done:   "bg-white/85 text-success",
  locked: "bg-white/20 text-white/90",
};

export function CourseCard({
  href,
  title,
  category = "General",
  duration,
  eyebrow = null,       // overrides the default "category · duration" line
  contentType,
  thumbnailUrl,
  progress = null,
  points = null,        // e.g. "225 pts" — overall points gained / to be gained
  rating = null,
  flag = null,
  ctaLabel = null,      // optional; the whole card is already a link
  ctaVariant = "solid",
  topRight,
  sizes = "(max-width:640px) 100vw, (max-width:1050px) 50vw, 33vw",
  className,
}) {
  const { label: typeLabel, Icon } = typeInfo(contentType);
  const img =
    thumbnailUrl ||
    CATEGORY_PHOTO[category] ||
    courseArtFor({ contentType });
  const hasProgress = typeof progress === "number";
  const locked = ctaVariant === "locked";
  const meta = [duration].filter(Boolean).join("");

  return (
    <Link
      href={href || "#"}
      className={cn(
        "group relative block h-[22rem] overflow-hidden rounded-2xl border border-line text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl",
        className,
      )}
    >
      {/* Cover photo — large and clear, zooms on hover. */}
      <Image
        src={img}
        alt=""
        fill
        sizes={sizes}
        className="object-cover transition-transform duration-500 ease-out group-hover:scale-110"
      />
      {/* Gradient weighted to the bottom: top of the photo stays clear, the
          panel area darkens just enough for white type. */}
      <Box
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-navy/90 via-navy/25 to-transparent"
      />

      {/* Top chips */}
      <Box className="absolute inset-x-3 top-3 z-10 flex items-start justify-between gap-1.5">
        <Text
          as="span"
          className="inline-flex items-center gap-1.5 rounded-md bg-navy/55 px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.05em] text-white backdrop-blur-sm"
        >
          <Icon className="h-3 w-3" />
          {typeLabel}
        </Text>
        {topRight !== undefined ? (
          topRight
        ) : flag ? (
          <Text as="span" className="rounded-md bg-danger px-2 py-1 text-[8.5px] font-extrabold uppercase tracking-[0.04em] text-white">
            {flag}
          </Text>
        ) : rating ? (
          <Text as="span" className="rounded-md bg-accent-blue px-2 py-1 text-[10px] font-extrabold text-white">
            ★ {rating}
          </Text>
        ) : null}
      </Box>

      {/* Frosted glass panel — text over blur */}
      <Box className="absolute inset-x-3 bottom-3 z-10 rounded-xl border border-white/20 bg-white/15 p-3.5 backdrop-blur-md">
        <Text as="p" className="mb-1 font-mono text-[9px] uppercase tracking-[0.12em] text-white/85">
          {eyebrow ?? `${category}${meta ? ` · ${meta}` : ""}`}
        </Text>
        <Text as="h3" className="line-clamp-2 text-base font-semibold leading-tight text-white">
          {title}
        </Text>

        {/* Points + progress — the only facts shown. */}
        {(points != null || hasProgress) && (
          <Box className="mt-2.5 space-y-2">
            {points != null && (
              <Box className="flex items-center gap-1.5 text-white">
                <Sparkles className="h-3.5 w-3.5 shrink-0" />
                <Text as="span" className="font-mono text-[11px] font-bold tracking-tight">{points}</Text>
              </Box>
            )}
            {hasProgress && (
              <Box className="flex items-center gap-2.5">
                <Box className="h-[5px] flex-1 overflow-hidden rounded-full bg-white/30">
                  <Box className="h-full rounded-full bg-white" style={{ width: `${progress}%` }} />
                </Box>
                <Text as="span" className="text-[10px] font-extrabold text-white">{progress}%</Text>
              </Box>
            )}
          </Box>
        )}

        {ctaLabel && (
          <Box
            className={cn(
              "mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition",
              CTA_CLASS[ctaVariant] || CTA_CLASS.solid,
            )}
          >
            {locked && <Lock className="h-3.5 w-3.5" />}
            {ctaLabel}
            {!locked && ctaVariant !== "done" && <ArrowRight className="h-3.5 w-3.5" />}
          </Box>
        )}
      </Box>
    </Link>
  );
}

export default CourseCard;
