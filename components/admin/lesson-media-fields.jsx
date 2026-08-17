"use client";

import { useRef } from "react";
import { Film, Subtitles, Upload, X, CheckCircle2 } from "lucide-react";

import Box from "@/components/ui/box";
import Text from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

/**
 * File pickers and progress readout for a lesson's video and captions.
 *
 * Presentation only — the upload itself is orchestrated by the parent dialog,
 * because the video can only be attached once the lesson has an id, and that
 * ordering belongs with the save flow rather than in here.
 */

function formatSize(bytes) {
  if (!bytes) return "";
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${Math.round(bytes / 1024 ** 2)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

/** Filled bar — no accent hue, fill weight carries the state (TASTE §10.3). */
function ProgressBar({ percent }) {
  return (
    <Box className="h-1.5 w-full rounded-full bg-paper-warm overflow-hidden">
      <Box
        className="h-full bg-navy transition-[width] duration-200 ease-out"
        style={{ width: `${percent}%` }}
      />
    </Box>
  );
}

function FileSlot({
  label, hint, accept, icon: Icon, file, attached, statusText,
  onSelect, onClear, disabled,
}) {
  const inputRef = useRef(null);
  const chosen = file || attached;

  return (
    <Box className="space-y-1.5">
      <Label className="text-sm font-medium text-ink/80">{label}</Label>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const picked = e.target.files?.[0];
          if (picked) onSelect(picked);
          e.target.value = "";
        }}
      />
      <Box
        onClick={() => !disabled && inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-4 flex items-center gap-3 transition-colors ${
          disabled
            ? "border-border bg-paper-warm cursor-not-allowed opacity-60"
            : chosen
              ? "border-navy/20 bg-paper-cream cursor-pointer"
              : "border-border bg-white hover:border-navy/20 hover:bg-paper-cream cursor-pointer"
        }`}
      >
        <Icon className="h-6 w-6 text-navy shrink-0" />
        <Box className="min-w-0 flex-1">
          {file ? (
            <>
              <Text as="p" className="text-sm font-semibold text-navy truncate">{file.name}</Text>
              <Text as="p" className="text-xs text-ink/60">
                {formatSize(file.size)} · {statusText}
              </Text>
            </>
          ) : attached ? (
            <Box className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-navy shrink-0" />
              <Text as="p" className="text-sm font-medium text-navy">Uploaded — click to replace</Text>
            </Box>
          ) : (
            <>
              <Text as="p" className="text-sm font-medium text-ink/80">Choose a file</Text>
              <Text as="p" className="text-xs text-ink/50">{hint}</Text>
            </>
          )}
        </Box>
        {chosen && !disabled && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={(e) => { e.stopPropagation(); onClear(); }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </Box>
    </Box>
  );
}

/**
 * Selection is reported through four explicit callbacks rather than a patch
 * object. A patch would have to name the parent's state keys, and this
 * component has no business knowing them — when those names disagree the
 * result is a silent no-op, not an error.
 */
export function LessonMediaFields({
  videoFile, captionFile, hasVideo, hasCaptions, videoUploaded,
  onVideoSelect, onVideoClear, onCaptionSelect, onCaptionClear,
  progress, disabled,
}) {
  const uploading = Boolean(progress?.stage);

  return (
    <Box className="space-y-4">
      <FileSlot
        label="Video file"
        hint="MP4, WebM or MOV — uploaded straight to R2"
        accept="video/mp4,video/webm,video/ogg,video/quicktime,.mp4,.webm,.mov"
        icon={Film}
        file={videoFile}
        attached={hasVideo}
        // The video is already in storage by the time this reads "uploaded" —
        // it goes up on selection, not on save.
        statusText={videoUploaded ? "uploaded" : "uploading…"}
        disabled={disabled || uploading}
        onSelect={onVideoSelect}
        onClear={onVideoClear}
      />

      <FileSlot
        label="Captions (optional)"
        hint="VTT or SRT — SRT is converted to WebVTT automatically"
        accept=".vtt,.srt,text/vtt"
        icon={Subtitles}
        file={captionFile}
        attached={hasCaptions}
        // Captions are kilobytes and ride along with the save request.
        statusText="ready to upload"
        disabled={disabled || uploading}
        onSelect={onCaptionSelect}
        onClear={onCaptionClear}
      />

      {uploading && (
        <Box className="space-y-1.5 rounded-xl bg-paper-warm border border-border p-3">
          <Box className="flex items-center justify-between gap-3">
            <Box className="flex items-center gap-2 min-w-0">
              <Upload className="h-3.5 w-3.5 text-navy shrink-0" />
              <Text as="span" className="text-xs font-mono uppercase tracking-wide text-ink/70 truncate">
                {progress.stage}
              </Text>
            </Box>
            <Text as="span" className="text-xs font-mono text-navy shrink-0">
              {progress.percent}%
            </Text>
          </Box>
          <ProgressBar percent={progress.percent} />
        </Box>
      )}
    </Box>
  );
}
