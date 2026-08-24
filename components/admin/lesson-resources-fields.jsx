"use client";

import { useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  FileText, FileSpreadsheet, Presentation, Link2, Paperclip,
  Trash2, Upload, Plus, AlertCircle,
} from "lucide-react";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { cn } from "@/lib/utils";
import { presignDocument, uploadToR2 } from "@/services/api/admin/admin-api";

/**
 * Document formats the API will store. Kept in step with ALLOWED_DOCUMENT_TYPES
 * in `server/src/modules/media/dto/media.dto.ts` — the presigned URL is signed
 * with the declared content type, so anything absent there cannot be uploaded
 * and offering it here would only produce a rejection at the end of a wait.
 */
export const DOCUMENT_MIME = {
  pdf:  "application/pdf",
  doc:  "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ppt:  "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xls:  "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  txt:  "text/plain",
  csv:  "text/csv",
};

export const DOCUMENT_ACCEPT = Object.keys(DOCUMENT_MIME)
  .map((ext) => `.${ext}`)
  .join(",");

/**
 * A browser reports no type for plenty of Office files, so the extension is the
 * more reliable signal — and the type has to be right, because it is what the
 * upload URL is signed with.
 */
export function documentMimeFor(file) {
  const ext = (file?.name || "").split(".").pop()?.toLowerCase();
  return DOCUMENT_MIME[ext] ?? (file?.type || "");
}

const RESOURCE_ICON = {
  pdf: FileText,
  doc: FileText,
  ppt: Presentation,
  xls: FileSpreadsheet,
  link: Link2,
  other: Paperclip,
};

const RESOURCE_LABEL = {
  pdf: "PDF", doc: "Word", ppt: "Slides", xls: "Sheet",
  link: "Link", other: "File",
};

/** Coarse kind from a mime type — mirrors RESOURCE_TYPE_FOR_MIME on the API. */
function resourceTypeFor(mime) {
  const m = (mime || "").toLowerCase();
  if (m.includes("pdf")) return "pdf";
  if (m.includes("presentation") || m.includes("powerpoint")) return "ppt";
  if (m.includes("spreadsheet") || m.includes("excel") || m.includes("csv")) return "xls";
  if (m.includes("word") || m.includes("msword")) return "doc";
  return "other";
}

export function formatBytes(bytes) {
  if (!bytes) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Supporting resources on a lesson: slides beside a video, a handout beside a
 * live session, a link to a spec.
 *
 * Staged in the parent's form state rather than written straight to the API,
 * because a lesson being created has no id yet to hang them from. The parent
 * flushes them once the row exists — the same shape the video upload already
 * uses. Uploads DO happen immediately (the key is claimed later), so the admin
 * is never left waiting on a progress bar at save time.
 *
 * @param {Array}    resources  Saved rows (have an `id`) and staged ones (do not)
 * @param {Function} onChange   Receives the next array
 */
export function LessonResourcesFields({ resources, onChange, disabled = false }) {
  const fileRef = useRef(null);
  const [mode, setMode] = useState("upload");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);

  const reset = () => { setTitle(""); setUrl(""); setError(null); };

  const addUpload = async (file) => {
    if (!file) return;
    setError(null);
    const contentType = documentMimeFor(file);
    if (!contentType) {
      setError(`${file.name} is not a supported document type.`);
      return;
    }

    try {
      setBusy(`Uploading ${file.name}`);
      const { uploadUrl, key } = await presignDocument({
        filename: file.name, contentType, sizeBytes: file.size,
      });
      await uploadToR2({ uploadUrl, file, contentType });

      onChange([
        ...resources,
        {
          // No id: this row does not exist on the API yet. The parent creates
          // it after the lesson is saved.
          title: title.trim() || file.name,
          source: "upload",
          file_key: key,
          file_name: file.name,
          mime_type: contentType,
          file_size_bytes: file.size,
          resource_type: resourceTypeFor(contentType),
        },
      ]);
      reset();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const addLink = () => {
    const href = url.trim();
    if (!href) { setError("Enter the link to the resource."); return; }
    if (!/^https?:\/\//i.test(href)) {
      setError("The link must start with http:// or https://");
      return;
    }
    onChange([
      ...resources,
      {
        title: title.trim() || href,
        source: "link",
        url: href,
        resource_type: "link",
      },
    ]);
    reset();
  };

  const removeAt = (index) =>
    onChange(resources.filter((_, i) => i !== index));

  return (
    <Box className="space-y-3">
      <Box className="flex items-center justify-between gap-2">
        <Label className="text-sm font-medium">Supporting resources</Label>
        <Text as="span" className="text-[11px] text-ink/50">
          Optional · no effect on duration
        </Text>
      </Box>

      <Text as="p" className="text-xs text-ink/55 leading-relaxed -mt-1">
        Slides, handouts or links that go alongside this lesson&apos;s main
        content. They are reference material, so they do not count toward
        learning hours — only the lesson&apos;s own duration does.
      </Text>

      {/* Existing + staged */}
      {resources.length > 0 && (
        <Box className="space-y-2">
          {resources.map((resource, index) => {
            const Icon = RESOURCE_ICON[resource.resource_type] ?? Paperclip;
            const size = formatBytes(resource.file_size_bytes);
            return (
              <Box
                key={resource.id ?? `staged-${index}`}
                className="flex items-center gap-3 rounded-lg border border-border bg-paper-warm px-3 py-2.5"
              >
                <Box className="w-8 h-8 rounded-lg bg-paper-cream border border-navy/10 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-navy" />
                </Box>
                <Box className="flex-1 min-w-0">
                  <Text as="p" className="text-sm font-medium truncate text-ink">
                    {resource.title}
                  </Text>
                  <Text as="p" className="text-[11px] text-ink/50 truncate">
                    {resource.source === "link"
                      ? resource.url
                      : [resource.file_name, size].filter(Boolean).join(" · ")}
                  </Text>
                </Box>
                <Badge className="text-[10px] bg-paper-cream text-navy border-0 shrink-0">
                  {RESOURCE_LABEL[resource.resource_type] ?? "File"}
                </Badge>
                {!resource.id && (
                  // Staged rows have not been written yet, and saying so is
                  // better than an admin wondering why closing the dialog lost
                  // one.
                  <Badge className="text-[10px] bg-paper-warm text-ink/60 border border-border shrink-0">
                    Pending save
                  </Badge>
                )}
                <Button
                  type="button" variant="ghost" size="icon"
                  className="h-7 w-7 text-error hover:bg-error/10 shrink-0"
                  disabled={disabled}
                  onClick={() => removeAt(index)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </Box>
            );
          })}
        </Box>
      )}

      {/* Add one */}
      <Box className="rounded-lg border border-dashed border-border p-3 space-y-3">
        <Box className="flex gap-1.5">
          {[
            { key: "upload", label: "Upload file", icon: Upload },
            { key: "link", label: "External link", icon: Link2 },
          ].map((option) => (
            <Button
              key={option.key}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => { setMode(option.key); setError(null); }}
              className={cn(
                "h-8 text-xs gap-1.5",
                mode === option.key
                  ? "bg-navy text-paper hover:bg-navy-soft hover:text-paper"
                  : "text-ink/60",
              )}
            >
              <option.icon className="h-3.5 w-3.5" />
              {option.label}
            </Button>
          ))}
        </Box>

        <Input
          placeholder="Label shown to the learner (optional)"
          value={title}
          disabled={disabled || Boolean(busy)}
          onChange={(e) => setTitle(e.target.value)}
          className="h-9 text-sm"
        />

        {mode === "upload" ? (
          <Box>
            <input
              ref={fileRef}
              type="file"
              accept={DOCUMENT_ACCEPT}
              className="hidden"
              onChange={(e) => addUpload(e.target.files?.[0])}
            />
            <Button
              type="button" variant="outline" size="sm"
              className="h-9 text-xs gap-1.5 w-full"
              disabled={disabled || Boolean(busy)}
              onClick={() => fileRef.current?.click()}
            >
              <Plus className="h-3.5 w-3.5" />
              {busy ?? "Choose a PDF, Word, PowerPoint or Excel file"}
            </Button>
          </Box>
        ) : (
          <Box className="flex gap-2">
            <Input
              placeholder="https://example.com/handbook.pdf"
              value={url}
              disabled={disabled}
              onChange={(e) => setUrl(e.target.value)}
              className="h-9 text-sm flex-1"
            />
            <Button
              type="button" size="sm"
              className="h-9 text-xs bg-navy hover:bg-navy-soft text-paper shrink-0"
              disabled={disabled}
              onClick={addLink}
            >
              Add
            </Button>
          </Box>
        )}

        {error && (
          <Box className="flex items-start gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 text-error mt-0.5 shrink-0" />
            <Text as="p" className="text-xs text-error">{error}</Text>
          </Box>
        )}
      </Box>
    </Box>
  );
}
