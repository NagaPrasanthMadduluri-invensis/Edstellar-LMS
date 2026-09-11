"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, X } from "lucide-react";

import Box from "@/components/ui/box";
import Text from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { courseArtFor } from "@/components/shared/course-art";
import {
  THUMBNAIL_ACCEPT,
  THUMBNAIL_MAX_BYTES,
  formatBytes,
  thumbnailError,
} from "@/services/api/admin/admin-api";

/**
 * Optional cover picture for a course or a session.
 *
 * One component for both, because it is one picture: a session's thumbnail is
 * stored on its companion training course (BACKEND_STRUCTURE.md §10.7), so the
 * destination really is `courses.thumbnail_url` in both cases.
 *
 * Presentation and validation only — the upload itself is run by the parent on
 * save, the same division as `lesson-media-fields.jsx`. Nothing is uploaded
 * while the admin is still filling the form, so abandoning the dialog leaves
 * no file behind.
 *
 * An invalid file never reaches the parent: the size and type are checked here
 * and the picker refuses them with the reason, so `file` is always something
 * the API will accept. The API checks both again — this is the courtesy, not
 * the enforcement.
 *
 * The three states the preview shows are the three the feature has:
 *   a newly picked file · the picture the course already has · no picture at
 *   all, where the generated artwork is shown and labelled as the fallback.
 */
export function ThumbnailField({
  value,          // thumbnail_url already stored on the course, or null
  file,           // File the admin just picked, or null
  onSelect,
  onClear,
  disabled = false,
  label = "Thumbnail",
}) {
  const inputRef = useRef(null);
  const [error, setError] = useState(null);
  const [objectUrl, setObjectUrl] = useState(null);

  // Revoked when the file changes or the field unmounts — an object URL pins
  // the whole file in memory until it is.
  useEffect(() => {
    if (!file) { setObjectUrl(null); return undefined; }
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handlePick = (picked) => {
    const reason = thumbnailError(picked);
    if (reason) { setError(reason); return; }
    setError(null);
    onSelect(picked);
  };

  const hasOwnImage = Boolean(objectUrl || value);
  const src = objectUrl || value || courseArtFor({});

  return (
    <Box className="space-y-1.5">
      <Label className="text-sm font-medium text-ink/80">
        {label}{" "}
        <Text as="span" className="font-normal text-ink/50">— optional</Text>
      </Label>

      <input
        ref={inputRef}
        type="file"
        accept={THUMBNAIL_ACCEPT}
        className="hidden"
        onChange={(e) => {
          const picked = e.target.files?.[0];
          if (picked) handlePick(picked);
          // Cleared so re-picking the same file still fires a change event.
          e.target.value = "";
        }}
      />

      <Box
        onClick={() => !disabled && inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-3 flex items-center gap-3 transition-colors ${
          disabled
            ? "border-border bg-paper-warm cursor-not-allowed opacity-60"
            : hasOwnImage
              ? "border-navy/20 bg-paper-cream cursor-pointer"
              : "border-border bg-white hover:border-navy/20 hover:bg-paper-cream cursor-pointer"
        }`}
      >
        <Box className="relative h-14 w-24 shrink-0 overflow-hidden rounded-lg bg-paper-warm">
          <Image
            src={src}
            alt={hasOwnImage ? "Selected course thumbnail" : "Default course artwork"}
            fill
            sizes="96px"
            // A blob: URL has nothing for the optimizer to fetch, and the
            // stored path is already a small file served immutable.
            unoptimized
            className="object-cover"
          />
          {!hasOwnImage && (
            <Box aria-hidden="true" className="absolute inset-0 bg-navy/12" />
          )}
        </Box>

        <Box className="min-w-0 flex-1">
          {file ? (
            <>
              <Text as="p" className="text-sm font-semibold text-navy truncate">{file.name}</Text>
              <Text as="p" className="text-xs text-ink/60">
                {formatBytes(file.size)} · uploads when you save
              </Text>
            </>
          ) : value ? (
            <>
              <Text as="p" className="text-sm font-medium text-navy">Current image</Text>
              <Text as="p" className="text-xs text-ink/60">Click to replace it</Text>
            </>
          ) : (
            <>
              <Text as="p" className="text-sm font-medium text-ink/80">Upload an image</Text>
              <Text as="p" className="text-xs text-ink/50">
                JPG, PNG, WebP or GIF · up to {formatBytes(THUMBNAIL_MAX_BYTES)}.
                Leave it empty to keep the default artwork.
              </Text>
            </>
          )}
        </Box>

        {hasOwnImage && !disabled && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            title={file ? "Discard this image" : "Remove the thumbnail"}
            onClick={(e) => { e.stopPropagation(); setError(null); onClear(); }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
        {!hasOwnImage && <ImagePlus className="h-5 w-5 text-navy shrink-0" />}
      </Box>

      {error && <Text as="p" className="text-xs text-error">{error}</Text>}
    </Box>
  );
}
