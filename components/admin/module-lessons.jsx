"use client";

import { useEffect, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus, Pencil, Trash2, GripVertical, PlayCircle, FileText,
  ExternalLink, HelpCircle, Eye, EyeOff, Clock, Sparkles,
  FileArchive, Upload, AlertCircle, Link2, Paperclip, X,
} from "lucide-react";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { useAuth } from "@/hooks/use-auth";
import {
  fetchLessons, createLesson, updateLesson, deleteLesson,
  presignLessonVideo, presignNewVideo, uploadToR2, confirmLessonVideo, deleteLessonVideo,
  uploadScormPackage, scormSizeError, deleteScormPackage,
  readVideoDuration,
  uploadLessonCaptions, deleteLessonCaptions,
  presignDocument, createLessonResource, deleteLessonResource,
} from "@/services/api/admin/admin-api";
import { LessonMediaFields, ProgressBar } from "@/components/admin/lesson-media-fields";
import {
  LessonResourcesFields, DOCUMENT_ACCEPT, documentMimeFor, formatBytes,
} from "@/components/admin/lesson-resources-fields";
import { useRef } from "react";

const CONTENT_TYPE_CONFIG = {
  video:    { label: "Video",    icon: PlayCircle,   color: "bg-paper-cream text-navy"      },
  document: { label: "Document", icon: FileText,     color: "bg-paper-cream text-navy"    },
  // Still in the data from before `document` existed, and it behaves the same.
  pdf:      { label: "PDF",      icon: FileText,     color: "bg-paper-cream text-ink/70"  },
  external: { label: "External", icon: ExternalLink, color: "bg-paper-cream text-navy"  },
  quiz:     { label: "Quiz",     icon: HelpCircle,   color: "bg-paper-cream text-navy" },
  scorm:    { label: "SCORM",    icon: FileArchive,  color: "bg-paper-cream text-navy"   },
};

/** Content types that ARE a document — mirrors DOCUMENT_TYPES on the API. */
const DOCUMENT_TYPES = new Set(["document", "pdf", "ppt", "doc", "xls"]);
const isDocumentType = (t) => DOCUMENT_TYPES.has((t || "").toLowerCase());

/** Shown when a lesson has no content source of the kind its type requires. */
const MISSING_CONTENT_MESSAGE = {
  video: "Add a video file or a content URL (for example a YouTube link) before saving.",
  document: "Upload the document or paste a link to it before saving.",
  pdf: "Upload the document or paste a link to it before saving.",
  external: "Add the external link before saving.",
  scorm: "Upload a SCORM package (.zip) before saving.",
  quiz: "Add the quiz content before saving.",
};

const EMPTY_LESSON = {
  title: "", description: "", content_type: "video", content_url: "",
  duration_minutes: "", sort_order: 0, is_preview: false, is_active: true,
  scorm_file: null, scorm_package_id: null, scorm_title: "",
  // The video uploads as soon as it is picked; video_key_pending holds the R2
  // key it landed on, and is attached to the lesson on save. Captions are tiny
  // and go up with the save itself.
  video_file: null, caption_file: null, video_key_pending: null,
  video_duration_seconds: null,
  has_video: false, has_captions: false,
  remove_video: false, remove_captions: false,
  // A primary document uploads the moment it is picked, like the video does;
  // document_key holds the R2 key it landed on until the lesson is saved.
  document_key: null, document_name: "", document_mime: "",
  document_size_bytes: null,
  // Supporting resources. Rows with an id already exist on the API; rows
  // without one are staged and created after the lesson row does.
  resources: [],
};

export function ModuleLessons({ moduleId }) {
  const { user } = useAuth();
  const fileRef = useRef(null);
  const documentRef = useRef(null);
  const [lessons, setLessons] = useState(null);
  const [error, setError] = useState(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const [form, setForm] = useState(EMPTY_LESSON);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploadingScorm, setUploadingScorm] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadLessons = useCallback(async () => {
    if (!user) return;
    try {
      const data = await fetchLessons({ moduleId });
      setLessons(data.lessons || []);
    } catch (e) { setError(e.message); }
  }, [user, moduleId]);

  useEffect(() => { loadLessons(); }, [loadLessons]);

  const handleCreate = () => {
    setEditingLesson(null);
    setForm({ ...EMPTY_LESSON, sort_order: (lessons?.length || 0) + 1 });
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleEdit = (lesson) => {
    setEditingLesson(lesson);
    setForm({
      title: lesson.title,
      description: lesson.description || "",
      content_type: lesson.content_type,
      content_url: lesson.content_url || "",
      duration_minutes: lesson.duration_minutes ?? "",
      sort_order: lesson.sort_order,
      is_preview: lesson.is_preview,
      is_active: lesson.is_active,
      scorm_file: null,
      scorm_package_id: lesson.scorm_package_id || null,
      scorm_title: lesson.scorm_title || "",
      video_file: null,
      caption_file: null,
      video_key_pending: null,
      // The lessons list selects every column, so the keys are already here —
      // only their presence matters, never the value.
      has_video: Boolean(lesson.videoKey ?? lesson.video_key),
      has_captions: Boolean(lesson.captionKey ?? lesson.caption_key),
      remove_video: false,
      remove_captions: false,
      // The stored key is carried back unchanged so a save that does not touch
      // the document leaves it exactly where it was.
      document_key: lesson.documentKey ?? lesson.document_key ?? null,
      document_name: lesson.documentName ?? lesson.document_name ?? "",
      document_mime: lesson.documentMime ?? lesson.document_mime ?? "",
      document_size_bytes:
        lesson.documentSizeBytes ?? lesson.document_size_bytes ?? null,
      resources: lesson.resources ?? [],
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  /**
   * Attaches (or clears) the lesson's video and captions.
   *
   * The video takes the presign → PUT → confirm path, so the file goes from the
   * browser to R2 directly and never through the API. Captions are posted to
   * the API instead: they are tiny, and the server converts SRT to WebVTT on
   * the way in.
   */
  const syncLessonMedia = async (lessonId) => {
    if (form.remove_video && !form.video_key_pending) {
      await deleteLessonVideo({ lessonId });
    }
    if (form.remove_captions && !form.caption_file) {
      await deleteLessonCaptions({ lessonId });
    }

    // The bytes are already in R2 — this only points the lesson at them.
    if (form.video_key_pending) {
      await confirmLessonVideo({
        lessonId,
        key: form.video_key_pending,
        durationSeconds: form.video_duration_seconds ?? undefined,
      });
    }

    if (form.caption_file) {
      await uploadLessonCaptions({ lessonId, file: form.caption_file });
    }
  };

  /**
   * Uploads the moment a file is chosen, rather than waiting for save.
   *
   * A large video takes as long as it takes, and the admin should watch that
   * happen and only then be able to add the lesson — instead of pressing Save
   * and staring at a frozen dialog. Save stays disabled while this runs, and
   * the resulting key is held until the lesson row exists to attach it to.
   */
  const startVideoUpload = async (file) => {
    const contentType = file.type || "video/mp4";
    setFormErrors({});
    setForm((f) => ({
      ...f, video_file: file, video_key_pending: null, remove_video: false,
    }));
    setUploadProgress({ stage: "Preparing upload", percent: 0 });

    try {
      // An existing lesson gets a key under its own prefix; a new one uses the
      // incoming prefix, since it has no id yet.
      const { uploadUrl, key } = editingLesson
        ? await presignLessonVideo({
            lessonId: editingLesson.id,
            filename: file.name, contentType, sizeBytes: file.size,
          })
        : await presignNewVideo({
            filename: file.name, contentType, sizeBytes: file.size,
          });

      setUploadProgress({ stage: `Uploading ${file.name}`, percent: 0 });
      await uploadToR2({
        uploadUrl, file, contentType,
        onProgress: (percent) =>
          setUploadProgress({ stage: `Uploading ${file.name}`, percent }),
      });

      // Real length, read from the file itself — no one has to type it.
      const durationSeconds = await readVideoDuration(file);
      setForm((f) => ({
        ...f,
        video_key_pending: key,
        video_duration_seconds: durationSeconds,
        duration_minutes:
          f.duration_minutes === "" && durationSeconds
            ? Math.max(1, Math.round(durationSeconds / 60))
            : f.duration_minutes,
      }));
      setUploadProgress(null);
    } catch (e) {
      // Clear the staged file so the form cannot claim to have a video that
      // never made it to storage.
      setForm((f) => ({ ...f, video_file: null, video_key_pending: null }));
      setUploadProgress(null);
      setFormErrors({ _general: e.message });
    }
  };

  /**
   * The primary document uploads the moment it is picked, for the same reason
   * the video does: the admin should not sit through a progress bar after
   * pressing Save. The key is claimed by the lesson row on save.
   */
  const startDocumentUpload = async (file) => {
    if (!file) return;
    setFormErrors({});

    const contentType = documentMimeFor(file);
    if (!contentType) {
      setFormErrors({ _general: `${file.name} is not a supported document type.` });
      return;
    }

    try {
      setUploadProgress({ stage: `Uploading ${file.name}`, percent: 0 });
      const { uploadUrl, key } = await presignDocument({
        filename: file.name, contentType, sizeBytes: file.size,
      });
      await uploadToR2({
        uploadUrl, file, contentType,
        onProgress: (percent) =>
          setUploadProgress({ stage: `Uploading ${file.name}`, percent }),
      });

      setForm((f) => ({
        ...f,
        document_key: key,
        document_name: file.name,
        document_mime: contentType,
        document_size_bytes: file.size,
        // An uploaded file and a link are alternatives, not a pair — keeping
        // both would leave it ambiguous which one the learner gets.
        content_url: "",
      }));
      setUploadProgress(null);
    } catch (e) {
      // Never leave the form claiming a document that never reached storage.
      setForm((f) => ({ ...f, document_key: null, document_name: "" }));
      setUploadProgress(null);
      setFormErrors({ _general: e.message });
    }
  };

  const clearDocument = () =>
    setForm((f) => ({
      ...f,
      document_key: null,
      document_name: "",
      document_mime: "",
      document_size_bytes: null,
    }));

  /**
   * Writes the staged resources once the lesson row exists.
   *
   * Rows that already have an id are untouched; removals are applied by id.
   * Reconciling here rather than as the admin clicks means closing the dialog
   * without saving discards the changes, which is what Cancel should do.
   */
  const syncResources = async (lessonId, original) => {
    const kept = new Set(
      form.resources.filter((r) => r.id).map((r) => r.id),
    );
    await Promise.all(
      original
        .filter((r) => r.id && !kept.has(r.id))
        .map((r) => deleteLessonResource({ resourceId: r.id })),
    );
    // Sequential: sort_order is assigned per insert from the current maximum,
    // so racing them would collapse the ordering the admin just chose.
    for (const resource of form.resources.filter((r) => !r.id)) {
      await createLessonResource({
        lessonId,
        data: {
          title: resource.title,
          source: resource.source,
          file_key: resource.file_key ?? null,
          file_name: resource.file_name ?? null,
          mime_type: resource.mime_type ?? null,
          url: resource.url ?? null,
          resource_type: resource.resource_type,
        },
      });
    }
  };

  const handleSave = async () => {
    if (!form.title.trim()) { setFormErrors({ title: ["Title is required"] }); return; }
    if (form.content_type === "scorm" && !editingLesson && !form.scorm_file) {
      setFormErrors({ _general: "Please upload a SCORM package (.zip)" });
      return;
    }
    if (uploadProgress) {
      setFormErrors({ _general: "Please wait for the video upload to finish." });
      return;
    }
    if (!contentReady) {
      setFormErrors({ _general: MISSING_CONTENT_MESSAGE[form.content_type] });
      return;
    }
    // SCORM is exempt while a package is being uploaded: the manifest may
    // declare the runtime, and refusing before reading it would ask the admin
    // for a number the package is about to supply.
    const scormWillDeclare = form.content_type === "scorm" && form.scorm_file;
    if (durationRequired && !scormWillDeclare && !(Number(form.duration_minutes) > 0)) {
      setFormErrors({
        duration_minutes: [
          isDocumentType(form.content_type)
            ? "Enter how long this document takes. It has no runtime to read, and this is the time it adds to learning hours."
            : "Enter how long this package takes, in minutes.",
        ],
      });
      return;
    }
    setSaving(true); setFormErrors({});
    try {
      let scormPackageId = form.scorm_package_id;
      // Filled from the SCORM manifest below, when it declares a runtime. Held
      // in a variable because the payload is built after the upload.
      let scormDuration = null;
      /**
       * Set only for a package THIS save uploaded, so the catch block can undo
       * it. The upload has to happen before the lesson save — we need the id
       * for the payload and the manifest's duration to prefill the field — so
       * a failed save would otherwise leave a package behind that no lesson
       * points at. Ten uploads on 2026-09-04 left eight of them.
       *
       * An existing lesson's already-saved package id is NOT put here: that one
       * is real, and rolling it back would delete content that is in use.
       */
      let uploadedPackageId = null;

      /* ── Upload SCORM zip first if a new file was selected ── */
      if (form.content_type === "scorm" && form.scorm_file) {
        // Percent, not just a spinner: a package can be hundreds of megabytes,
        // and without a moving number "uploading" and "hung" look the same.
        setUploadingScorm({ percent: 0, extracting: false });
        let data;
        try {
          data = await uploadScormPackage({
            file: form.scorm_file,
            title: form.title.trim() || undefined,
            // Provisional until the lesson below saves — see uploadedPackageId.
            provisional: true,
            onProgress: (percent) =>
              // At 100% the bytes are sent but the API is still unzipping, so
              // the label has to stop claiming to be uploading.
              setUploadingScorm({ percent, extracting: percent >= 100 }),
          });
        } finally {
          setUploadingScorm(false);
        }
        scormPackageId = data.package.id;
        uploadedPackageId = data.package.id;

        // The manifest's typicalLearningTime, when the package declares one.
        // Only fills a blank field — an admin who typed a number meant it.
        const declared =
          data.package.durationMinutes ?? data.package.duration_minutes;
        if (declared && form.duration_minutes === "") {
          scormDuration = Number(declared);
          setForm((f) => ({ ...f, duration_minutes: String(declared) }));
        }
      }

      const payload = {
        title: form.title.trim(),
        description: form.description || null,
        content_type: form.content_type,
        content_url: form.content_type === "scorm" ? null : (form.content_url || null),
        scorm_package_id: form.content_type === "scorm" ? scormPackageId : null,
        // Only meaningful for a document lesson; the API clears them for any
        // other type anyway, but sending null keeps the intent obvious.
        document_key: isDocumentType(form.content_type) ? form.document_key : null,
        document_name: isDocumentType(form.content_type) ? (form.document_name || null) : null,
        document_mime: isDocumentType(form.content_type) ? (form.document_mime || null) : null,
        duration_minutes:
          form.duration_minutes === ""
            ? scormDuration
            : Number(form.duration_minutes),
        sort_order: form.sort_order,
        is_preview: form.is_preview,
        is_active: form.is_active,
      };

      let lessonId = editingLesson?.id ?? null;
      if (editingLesson) {
        await updateLesson({ lessonId, data: payload });
      } else {
        const created = await createLesson({ moduleId, data: payload });
        lessonId = created?.lesson?.id ?? created?.id ?? null;
      }

      // Media is attached after the row exists, because the object key is
      // namespaced by lesson id. A new lesson is therefore saved first, then
      // its video uploaded — one Save from the admin's point of view.
      if (form.content_type === "video") {
        // Never skip quietly: if a file is staged but there is no id to attach
        // it to, say so rather than closing the dialog as though it worked.
        if (!lessonId && (form.video_file || form.caption_file)) {
          throw new Error(
            "The lesson was saved but its id was not returned, so the video could not be attached. Re-open the lesson and upload again.",
          );
        }
        if (lessonId) await syncLessonMedia(lessonId);
      }

      // Resources hang off the lesson id, so they are written after the row —
      // the same reason the video is.
      if (lessonId) {
        await syncResources(lessonId, editingLesson?.resources ?? []);
      } else if (form.resources.some((r) => !r.id)) {
        throw new Error(
          "The lesson was saved but its id was not returned, so its resources could not be attached. Re-open the lesson and add them again.",
        );
      }

      setDialogOpen(false);
      await loadLessons();
    } catch (e) {
      setUploadingScorm(false);
      setUploadProgress(null);
      /**
       * Roll back a package this save uploaded but never attached.
       *
       * The API sweeps provisional packages on its own, but only after hours —
       * it cannot know a browser gave up. Here we know immediately, so undo it
       * now and keep the admin's SCORM library clean. Failure to roll back is
       * not worth reporting over the error that actually caused this: the
       * sweep is the backstop.
       */
      if (uploadedPackageId) {
        try {
          await deleteScormPackage({ packageId: uploadedPackageId });
        } catch { /* the server-side sweep will collect it */ }
      }
      if (e.errors) setFormErrors(e.errors);
      else setFormErrors({ _general: e.message });
    } finally { setSaving(false); }
  };

  /**
   * A lesson must carry something to actually show the learner. Quizzes are the
   * exception — their content is the question set, held elsewhere.
   */
  /**
   * Duration is mandatory for documents and SCORM — and only for those. The
   * API enforces the same rule; this is so the admin hears it before pressing
   * Save rather than as a 422 afterwards.
   *
   * Video is exempt because the length is read from the uploaded file, and for
   * a linked video there is nothing to read — the hours come from measured
   * watch time either way.
   */
  const durationRequired =
    isDocumentType(form.content_type) || form.content_type === "scorm";

  const contentReady = (() => {
    const url = (form.content_url || "").trim();
    switch (form.content_type) {
      case "quiz":
        return true;
      case "scorm":
        return Boolean(form.scorm_file || form.scorm_package_id);
      case "video":
        return Boolean(form.video_key_pending || form.has_video || url);
      case "document":
      case "pdf":
        // Uploaded or linked — the two options are equivalent, but one of them
        // has to be there.
        return Boolean(form.document_key || url);
      default:
        return Boolean(url);
    }
  })();

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteLesson({ lessonId: deleteTarget.id });
      setDeleteTarget(null);
      await loadLessons();
    } catch (e) { setError(e.message); setDeleteTarget(null); } finally { setDeleting(false); }
  };

  const handleToggleActive = async (lesson) => {
    try {
      await updateLesson({ lessonId: lesson.id, data: { is_active: !lesson.is_active } });
      await loadLessons();
    } catch (e) { setError(e.message); }
  };

  if (error && !lessons) return (
    <Text as="p" className="text-xs text-error py-2">{error}</Text>
  );

  if (!lessons) return (
    <Box className="space-y-2 py-2">
      {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-11 w-full rounded-md" />)}
    </Box>
  );

  return (
    <Box className="space-y-2 pt-1">
      {error && <Text as="p" className="text-xs text-error">{error}</Text>}

      {lessons.length === 0 ? (
        <Box className="text-center py-4">
          <Text as="p" className="text-xs text-muted-foreground">No lessons yet. Add the first lesson below.</Text>
        </Box>
      ) : (
        <Box className="space-y-1.5">
          {lessons.map((lesson) => {
            const typeCfg = CONTENT_TYPE_CONFIG[lesson.content_type] || CONTENT_TYPE_CONFIG.video;
            const TypeIcon = typeCfg.icon;
            return (
              <Box
                key={lesson.id}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors"
              >
                <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0 cursor-grab" />
                <Box className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${typeCfg.color}`}>
                  <TypeIcon className="h-3.5 w-3.5" />
                </Box>

                <Box className="flex-1 min-w-0">
                  <Box className="flex items-center gap-1.5 flex-wrap">
                    <Text as="p" className="text-xs font-semibold truncate">{lesson.title}</Text>
                    <Badge className={`text-[9px] px-1.5 py-0 border-0 shrink-0 ${typeCfg.color}`}>
                      {typeCfg.label}
                    </Badge>
                    {lesson.is_preview && (
                      <Badge className="text-[9px] px-1.5 py-0 border-0 bg-paper-cream text-ink/70 shrink-0">
                        <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                        Preview
                      </Badge>
                    )}
                    {!lesson.is_active && (
                      <Badge className="text-[9px] px-1.5 py-0 border-0 bg-paper-cream text-ink/60 shrink-0">Inactive</Badge>
                    )}
                  </Box>
                  <Box className="flex items-center gap-3 mt-0.5 flex-wrap">
                    {lesson.duration_minutes && (
                      <Box className="flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5 text-muted-foreground/60" />
                        <Text as="span" className="text-[10px] text-muted-foreground">{lesson.duration_minutes} min</Text>
                      </Box>
                    )}
                    {lesson.content_type === "scorm" && lesson.scorm_package_id && (
                      <Text as="span" className="text-[10px] text-navy font-medium">
                        Package #{lesson.scorm_package_id} · Learners launch full-screen
                      </Text>
                    )}
                  </Box>
                </Box>

                <Box className="flex items-center gap-0.5 shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleToggleActive(lesson)}>
                    {lesson.is_active
                      ? <Eye className="h-3.5 w-3.5 text-navy" />
                      : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                    }
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(lesson)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-error hover:text-error hover:bg-error/10"
                    onClick={() => setDeleteTarget(lesson)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}

      <Button variant="outline" size="sm" className="w-full text-xs h-8 border-dashed" onClick={handleCreate}>
        <Plus className="h-3.5 w-3.5 mr-1.5" />
        Add Lesson
      </Button>

      {/* ── Lesson Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-6xl gap-0 p-0 overflow-hidden">
          <Box className="px-6 py-5 border-b bg-white shrink-0">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">{editingLesson ? "Edit Lesson" : "Add Lesson"}</DialogTitle>
              <Text as="p" className="text-sm text-muted-foreground mt-0.5">Add content to this module by filling in the fields below.</Text>
            </DialogHeader>
          </Box>

          <Box className="overflow-y-auto max-h-[70vh] px-6 py-5 space-y-5">

            {/* ── Section: Basic Info ── */}
            <Box className="rounded-xl bg-paper-warm border border-border p-4 space-y-4">
              <Text as="p" className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Basic Info</Text>
              <Box className="space-y-1.5">
                <Label className="text-sm font-medium text-ink/80">
                  Title <Text as="span" className="text-error">*</Text>
                </Label>
                <Input
                  placeholder="e.g. Introduction to Module 1"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="h-10 bg-white border-border placeholder:text-ink/35 focus-visible:ring-2 focus-visible:ring-navy/20 focus-visible:border-navy/20 transition-colors"
                />
                {formErrors.title && <Text as="p" className="text-xs text-error mt-1">{formErrors.title[0]}</Text>}
              </Box>
              <Box className="space-y-1.5">
                <Label className="text-sm font-medium text-ink/80">Description</Label>
                <Textarea
                  placeholder="What this lesson covers…"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="bg-white border-border placeholder:text-ink/35 focus-visible:ring-2 focus-visible:ring-navy/20 focus-visible:border-navy/20 resize-none transition-colors"
                />
              </Box>
            </Box>

            {/* ── Section: Content ── */}
            <Box className="rounded-xl bg-paper-warm border border-border p-4 space-y-4">
              <Text as="p" className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Content</Text>
              <Box className="grid grid-cols-2 gap-4">
                <Box className="space-y-1.5">
                  <Label className="text-sm font-medium text-ink/80">Content Type <Text as="span" className="text-error">*</Text></Label>
                  <Select value={form.content_type} onValueChange={(v) => setForm((f) => ({ ...f, content_type: v, content_url: "", scorm_file: null, scorm_package_id: f.content_type === "scorm" ? null : f.scorm_package_id, ...(isDocumentType(v) ? {} : { document_key: null, document_name: "", document_mime: "", document_size_bytes: null }) }))}>
                    <SelectTrigger className="h-10 bg-white border-border text-sm focus:ring-2 focus:ring-navy/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="document">Document (PDF, Word, PowerPoint, Excel)</SelectItem>
                      <SelectItem value="external">External Link</SelectItem>
                      <SelectItem value="quiz">Quiz</SelectItem>
                      <SelectItem value="scorm">SCORM Package</SelectItem>
                    </SelectContent>
                  </Select>
                  {formErrors.content_type && <Text as="p" className="text-xs text-error mt-1">{formErrors.content_type[0]}</Text>}
                </Box>
                <Box className="space-y-1.5">
                  <Label className="text-sm font-medium text-ink/80">
                    Duration (minutes)
                    {durationRequired && <Text as="span" className="text-error"> *</Text>}
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="e.g. 30"
                    value={form.duration_minutes}
                    onChange={(e) => setForm((f) => ({ ...f, duration_minutes: e.target.value }))}
                    className="h-10 bg-white border-border placeholder:text-ink/35 focus-visible:ring-2 focus-visible:ring-navy/20 focus-visible:border-navy/20 transition-colors"
                  />
                  {/* Say where the number comes from, so the required star on a
                      document and the auto-filled value on a video do not look
                      like the field behaving inconsistently. */}
                  {formErrors.duration_minutes && (
                    <Text as="p" className="text-xs text-error">
                      {formErrors.duration_minutes[0]}
                    </Text>
                  )}
                  <Text as="p" className="text-[11px] text-ink/50 leading-relaxed">
                    {form.content_type === "video"
                      ? "Read from the file when you upload one. Type it for a linked video."
                      : form.content_type === "scorm"
                        ? "Taken from the package manifest when it declares one — otherwise enter it."
                        : isDocumentType(form.content_type)
                          ? "A document has no runtime to read, so this is the time it contributes to learning hours."
                          : "Shown to the learner as the lesson's length."}
                  </Text>
                </Box>
              </Box>

              {form.content_type === "video" && (
                <>
                  <LessonMediaFields
                    videoFile={form.video_file}
                    captionFile={form.caption_file}
                    hasVideo={form.has_video}
                    hasCaptions={form.has_captions}
                    videoUploaded={Boolean(form.video_key_pending)}
                    progress={uploadProgress}
                    disabled={saving && !uploadProgress}
                    onVideoSelect={startVideoUpload}
                    onVideoClear={() => setForm((f) => ({ ...f, video_file: null, video_key_pending: null, remove_video: true }))}
                    onCaptionSelect={(file) => setForm((f) => ({ ...f, caption_file: file, remove_captions: false }))}
                    onCaptionClear={() => setForm((f) => ({ ...f, caption_file: null, remove_captions: true }))}
                  />
                  <Text as="p" className="text-xs text-ink/50">
                    Upload a file for hosted video, or paste a YouTube link below.
                    An uploaded file takes precedence.
                  </Text>
                </>
              )}

              {isDocumentType(form.content_type) && (
                <Box className="space-y-2">
                  <Label className="text-sm font-medium text-ink/80">
                    Document <Text as="span" className="text-error">*</Text>
                  </Label>

                  {form.document_key ? (
                    <Box className="flex items-center gap-3 rounded-lg border border-navy/15 bg-white px-3 py-2.5">
                      <Box className="w-9 h-9 rounded-lg bg-paper-cream border border-navy/10 flex items-center justify-center shrink-0">
                        <FileText className="h-4 w-4 text-navy" />
                      </Box>
                      <Box className="flex-1 min-w-0">
                        <Text as="p" className="text-sm font-medium truncate text-ink">
                          {form.document_name || "Uploaded document"}
                        </Text>
                        <Text as="p" className="text-[11px] text-ink/50">
                          {formatBytes(form.document_size_bytes) ?? "Stored"}
                        </Text>
                      </Box>
                      <Button
                        type="button" variant="ghost" size="icon"
                        className="h-7 w-7 text-error hover:bg-error/10 shrink-0"
                        onClick={clearDocument}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </Box>
                  ) : (
                    <Box>
                      <input
                        ref={documentRef}
                        type="file"
                        accept={DOCUMENT_ACCEPT}
                        className="hidden"
                        onChange={(e) => startDocumentUpload(e.target.files?.[0])}
                      />
                      <Button
                        type="button" variant="outline"
                        className="h-10 w-full text-sm gap-2 justify-start"
                        disabled={Boolean(uploadProgress)}
                        onClick={() => documentRef.current?.click()}
                      >
                        <Upload className="h-4 w-4" />
                        {uploadProgress
                          ? `${uploadProgress.stage} ${uploadProgress.percent}%`
                          : "Upload a PDF, Word, PowerPoint or Excel file"}
                      </Button>
                    </Box>
                  )}

                  <Text as="p" className="text-xs text-ink/50">
                    Upload the file, or link to it below. An uploaded file takes
                    precedence.
                  </Text>
                </Box>
              )}

              {form.content_type !== "quiz" && form.content_type !== "scorm" && (
                <Box className="space-y-1.5">
                  <Label className="text-sm font-medium text-ink/80">
                    {form.content_type === "video" || isDocumentType(form.content_type)
                      ? "Or link to it"
                      : "Content URL"}
                  </Label>
                  <Input
                    placeholder={
                      form.content_type === "video"          ? "https://youtu.be/..." :
                      isDocumentType(form.content_type)      ? "https://example.com/handbook.pdf" :
                                                               "https://portal.example.com/..."
                    }
                    value={form.content_url}
                    onChange={(e) => setForm((f) => ({ ...f, content_url: e.target.value }))}
                    className="h-10 bg-white border-border placeholder:text-ink/35 focus-visible:ring-2 focus-visible:ring-navy/20 focus-visible:border-navy/20 transition-colors"
                  />
                  {formErrors.content_url && <Text as="p" className="text-xs text-error mt-1">{formErrors.content_url[0]}</Text>}
                </Box>
              )}

              {form.content_type === "scorm" && (
                <Box className="space-y-2">
                  <Label className="text-sm font-medium text-ink/80">
                    SCORM Package (.zip) <Text as="span" className="text-error">{!editingLesson && "*"}</Text>
                  </Label>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".zip"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      // Refused here, not after pushing it across the network.
                      const tooBig = scormSizeError(f);
                      if (tooBig) {
                        setFormErrors({ _general: tooBig });
                        e.target.value = "";
                        return;
                      }
                      setFormErrors({});
                      setForm((prev) => ({ ...prev, scorm_file: f }));
                    }}
                  />
                  <Box
                    onClick={() => fileRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-5 flex flex-col items-center gap-2.5 cursor-pointer transition-colors ${
                      form.scorm_file ? "border-navy/20 bg-paper-cream" : "border-border bg-white hover:border-navy/20 hover:bg-paper-cream"
                    }`}
                  >
                    {form.scorm_file ? (
                      <>
                        <FileArchive className="h-7 w-7 text-navy" />
                        <Box className="text-center">
                          <Text as="p" className="text-sm font-semibold text-navy">{form.scorm_file.name}</Text>
                          <Text as="p" className="text-xs text-muted-foreground mt-0.5">
                            {(form.scorm_file.size / 1024 / 1024).toFixed(1)} MB · Click to change
                          </Text>
                        </Box>
                      </>
                    ) : form.scorm_package_id ? (
                      <>
                        <FileArchive className="h-7 w-7 text-navy/70" />
                        <Box className="text-center">
                          <Text as="p" className="text-sm font-medium text-navy">SCORM package already uploaded</Text>
                          <Text as="p" className="text-xs text-muted-foreground mt-0.5">Click to replace with a new .zip file</Text>
                        </Box>
                      </>
                    ) : (
                      <>
                        <Upload className="h-7 w-7 text-ink/35" />
                        <Box className="text-center">
                          <Text as="p" className="text-sm font-medium text-ink/80">Click to browse or drag & drop</Text>
                          <Text as="p" className="text-xs text-muted-foreground mt-0.5">.zip SCORM packages only</Text>
                        </Box>
                      </>
                    )}
                  </Box>
                  {uploadingScorm && (
                    <Box className="space-y-1.5">
                      <Box className="flex items-center justify-between text-xs text-navy">
                        <Box className="flex items-center gap-2">
                          <Box className="h-3 w-3 animate-spin rounded-full border-2 border-navy/20 border-t-transparent" />
                          {uploadingScorm.extracting
                            ? "Extracting package on the server…"
                            : `Uploading ${form.scorm_file?.name ?? "package"}…`}
                        </Box>
                        {!uploadingScorm.extracting && (
                          <Text as="span" className="font-mono">{uploadingScorm.percent}%</Text>
                        )}
                      </Box>
                      <ProgressBar percent={uploadingScorm.percent} />
                    </Box>
                  )}
                </Box>
              )}
            </Box>

            {/* ── Section: Resources ──
                Its own card, deliberately below Content: these sit alongside
                whatever the lesson's primary content is, and are available for
                every type — including a live session's slide deck. */}
            <Box className="rounded-xl bg-paper-warm border border-border p-4 space-y-4">
              <Text as="p" className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                Resources
              </Text>
              <LessonResourcesFields
                resources={form.resources}
                disabled={saving}
                onChange={(resources) => setForm((f) => ({ ...f, resources }))}
              />
            </Box>

            {/* ── Section: Settings ── */}
            <Box className="rounded-xl bg-paper-warm border border-border p-4 space-y-4">
              <Text as="p" className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Settings</Text>
              <Box className="grid grid-cols-3 gap-4">
                <Box className="space-y-1.5">
                  <Label className="text-sm font-medium text-ink/80">Sort Order</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.sort_order}
                    onChange={(e) => setForm((f) => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
                    className="h-10 bg-white border-border focus-visible:ring-2 focus-visible:ring-navy/20 focus-visible:border-navy/20 transition-colors"
                  />
                </Box>
                <Box className="space-y-1.5">
                  <Label className="text-sm font-medium text-ink/80">Free Preview</Label>
                  <Box className="flex items-center gap-2 h-10 px-3 rounded-lg bg-white border border-border">
                    <Switch checked={form.is_preview} onCheckedChange={(v) => setForm((f) => ({ ...f, is_preview: v }))} />
                    <Text as="span" className="text-xs text-muted-foreground">{form.is_preview ? "Yes" : "No"}</Text>
                  </Box>
                </Box>
                <Box className="space-y-1.5">
                  <Label className="text-sm font-medium text-ink/80">Active</Label>
                  <Box className="flex items-center gap-2 h-10 px-3 rounded-lg bg-white border border-border">
                    <Switch checked={form.is_active} onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))} />
                    <Text as="span" className="text-xs text-muted-foreground">{form.is_active ? "Yes" : "No"}</Text>
                  </Box>
                </Box>
              </Box>
            </Box>

          </Box>

          {/* Outside the scrolling body on purpose. A failed upload used to
              render at the bottom of a form the admin had scrolled away from,
              so the only visible change was the Save button reverting — which
              read as "nothing happened, and no error". */}
          {formErrors._general && (
            <Box className="mx-6 mt-4 bg-error/10 border border-error/30 rounded-xl px-4 py-3 shrink-0">
              <Text as="p" className="text-sm text-error">{formErrors._general}</Text>
            </Box>
          )}

          <Box className="px-6 py-4 border-t bg-paper-warm shrink-0 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button
              onClick={handleSave}
              // Blocked while the video is still going up, and until the lesson
              // has something to show — so the button itself states the rule
              // rather than the admin discovering it by pressing it.
              disabled={saving || Boolean(uploadProgress) || !contentReady}
              className="bg-navy hover:bg-navy-soft text-paper"
            >
              {uploadProgress
                ? `Uploading… ${uploadProgress.percent}%`
                : uploadingScorm
                  ? uploadingScorm.extracting
                    ? "Extracting SCORM…"
                    : `Uploading SCORM… ${uploadingScorm.percent}%`
                : saving ? "Saving…"
                : editingLesson ? "Update Lesson" : "Add Lesson"}
            </Button>
          </Box>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lesson</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteTarget?.title}</strong> and all learner progress for this lesson.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-error hover:bg-error text-white">
              {deleting ? "Deleting…" : "Delete Lesson"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Box>
  );
}
