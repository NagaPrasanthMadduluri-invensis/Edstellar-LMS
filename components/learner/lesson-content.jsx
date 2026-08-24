"use client";

import { apiClient } from "@/lib/api-client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft, CheckCircle2, Clock, PlayCircle, Lock,
  FileArchive, Trophy, RefreshCw, ExternalLink,
  CalendarDays, MapPin, Video, UserCircle, Users,
  FileText, FileSpreadsheet, Presentation, Link2, Paperclip, Download,
} from "lucide-react";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { useAuth } from "@/hooks/use-auth";
import { fetchLessonContent, markLessonComplete } from "@/services/api/learner/learner-api";
import { YoutubePlayer, isYouTubeUrl, extractYouTubeId } from "@/components/learner/youtube-player";
import { LocalVideoPlayer, isVideoFile } from "@/components/learner/local-video-player";

/* These chips sit on the navy panel below, so the light-surface fill weights do
   not apply: on a dark surface the heaviest state is lime on navy, and the
   lighter states are paper at decreasing opacity. */
const SESSION_STATE = {
  upcoming: {
    label: "Upcoming",
    chip: "bg-paper/10 text-paper/70 border-paper/20",
    note: "This session has not started yet. Your trainer marks it complete once it has taken place.",
  },
  in_progress: {
    label: "In progress",
    chip: "bg-paper/15 text-paper border-paper/30",
    note: "This session is under way. Your trainer marks it complete once it has taken place.",
  },
  completed: {
    label: "Completed",
    chip: "bg-lime text-navy border-lime",
    note: "Your trainer recorded you as having attended. The session's hours count toward your learning hours.",
  },
  cancelled: {
    label: "Cancelled",
    chip: "bg-error/25 text-paper border-error/40",
    note: "This session was cancelled.",
  },
};

function formatSessionTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h)) return "";
  return `${h % 12 || 12}:${String(m || 0).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

/**
 * A live or in-person session has nothing to play and nothing the learner can
 * mark done, so this replaces the player entirely: where and when the sitting
 * is, who is running it, and who closes it out. Dark surface because it is the
 * one thing on the page, and an empty video frame would read as a broken lesson.
 */
function SessionLessonView({ session }) {
  const state = SESSION_STATE[session.status] ?? SESSION_STATE.upcoming;
  const isVirtual = session.type === "Virtual";
  const timeRange = [
    formatSessionTime(session.start_time),
    formatSessionTime(session.end_time),
  ]
    .filter(Boolean)
    .join(" – ");

  const rows = [
    {
      icon: <CalendarDays className="h-4 w-4 shrink-0 text-lime" />,
      label: "When",
      value: [session.date_label, timeRange].filter(Boolean).join(" · "),
    },
    {
      icon: isVirtual
        ? <Video className="h-4 w-4 shrink-0 text-lime" />
        : <MapPin className="h-4 w-4 shrink-0 text-lime" />,
      label: isVirtual ? "Joining link" : "Venue",
      value: session.venue,
    },
    {
      icon: <UserCircle className="h-4 w-4 shrink-0 text-lime" />,
      label: "Trainer",
      value: session.trainer,
    },
  ].filter((row) => row.value);

  return (
    // `surface-dark` goes on the inner Box, not the Card: it is defined in the
    // components layer, so Card's own `bg-card` utility beats it and the panel
    // renders light — with paper-coloured text on it, i.e. invisible.
    <Card className="overflow-hidden border-0 p-0">
      <Box className="surface-dark p-8 space-y-6">
        <Box className="flex items-center gap-3 flex-wrap">
          <Users className="h-5 w-5 text-lime shrink-0" />
          <Text as="span" className="font-mono text-[11px] uppercase tracking-widest text-paper/60">
            {isVirtual ? "Virtual session" : "In-person session"}
          </Text>
          <Badge className={`text-[10px] font-semibold px-2 py-0.5 border ${state.chip}`}>
            {state.label}
          </Badge>
        </Box>

        <Box className="grid gap-4 sm:grid-cols-3">
          {rows.map((row) => (
            <Box key={row.label} className="space-y-1.5">
              <Box className="flex items-center gap-2">
                {row.icon}
                <Text as="span" className="font-mono text-[11px] uppercase tracking-widest text-paper/50">
                  {row.label}
                </Text>
              </Box>
              <Text as="p" className="text-sm text-paper break-words">
                {row.value}
              </Text>
            </Box>
          ))}
        </Box>

        {isVirtual && session.venue && (
          <Box>
            <a href={session.venue} target="_blank" rel="noopener noreferrer">
              {/* cta-lime is the house primary CTA on a dark surface. */}
              <Button size="sm" className="cta-lime font-semibold">
                Join session
                <ExternalLink className="h-4 w-4 ml-1.5" />
              </Button>
            </a>
          </Box>
        )}

        <Text as="p" className="text-sm text-paper/70 leading-relaxed border-t border-paper/10 pt-5">
          {state.note}
        </Text>
      </Box>
    </Card>
  );
}

const RESOURCE_ICON = {
  pdf: FileText,
  doc: FileText,
  ppt: Presentation,
  xls: FileSpreadsheet,
  link: Link2,
  other: Paperclip,
};

function formatBytes(bytes) {
  if (!bytes) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * The lesson's primary document.
 *
 * A PDF is shown inline, because that is what the learner came for and making
 * them download it first is a worse read. Everything else — Word, PowerPoint,
 * Excel — has no reliable in-browser viewer, so it gets an honest download
 * card rather than an iframe that renders a grey box.
 *
 * An uploaded file arrives as a signed URL from `GET /learner/lessons/:id/media`
 * and expires; a linked one is just the admin's URL. Both are opened the same
 * way from here.
 */
function DocumentLessonView({ lesson, media }) {
  const url = media?.documentUrl ?? lesson.content_url ?? null;
  const isLinked = !lesson.has_document && Boolean(lesson.content_url);
  const mime = (lesson.document_mime || "").toLowerCase();
  const looksPdf =
    mime.includes("pdf") || /\.pdf($|\?)/i.test(url || "");

  // Only an UPLOADED document waits on a signed URL. A linked one already has
  // its URL, and would otherwise sit on "Preparing…" forever, because nothing
  // is ever fetched for it.
  if (lesson.has_document && media === undefined) {
    return (
      <Card className="p-10 text-center">
        <Text as="p" className="text-sm text-muted-foreground font-mono">
          Preparing document…
        </Text>
      </Card>
    );
  }

  if (!url) {
    return (
      <Card className="p-10 text-center">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
        <Text as="p" className="text-sm text-muted-foreground">
          This document could not be loaded. Please refresh, or contact your
          administrator.
        </Text>
      </Card>
    );
  }

  if (looksPdf) {
    return (
      <Card className="overflow-hidden h-[80vh] p-0">
        <iframe
          src={url}
          title={lesson.title}
          className="w-full h-full border-0 bg-paper-warm"
        />
      </Card>
    );
  }

  return (
    <Card className="p-0 overflow-hidden">
      <Box className="surface-dark p-8 flex items-center gap-5 flex-wrap">
        <Box className="w-14 h-14 rounded-xl bg-paper/10 flex items-center justify-center shrink-0">
          <FileText className="h-6 w-6 text-lime" />
        </Box>
        <Box className="flex-1 min-w-0">
          <Text as="p" className="text-base font-bold text-paper truncate">
            {lesson.document_name || lesson.title}
          </Text>
          <Text as="p" className="text-sm text-paper/60 mt-0.5">
            {[
              isLinked ? "External document" : "Document",
              formatBytes(lesson.document_size_bytes),
            ]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        </Box>
        <a href={url} target="_blank" rel="noopener noreferrer" className="shrink-0">
          <Button size="sm" className="cta-lime font-semibold">
            Open document
            <ExternalLink className="h-4 w-4 ml-1.5" />
          </Button>
        </a>
      </Box>
    </Card>
  );
}

/**
 * Supporting material listed under whatever the lesson's primary content is.
 *
 * An uploaded resource's URL is fetched on click rather than handed out with
 * the lesson — the storage key never reaches the browser, and an unopened
 * resource costs nothing. A linked one already has its URL and opens straight
 * away.
 */
function LessonResources({ resources }) {
  const [opening, setOpening] = useState(null);
  const [error, setError] = useState(null);

  if (!resources?.length) return null;

  const open = async (resource) => {
    if (resource.url) {
      window.open(resource.url, "_blank", "noopener,noreferrer");
      return;
    }
    setError(null);
    setOpening(resource.id);
    try {
      const { url } = await apiClient(`/api/learner/resources/${resource.id}/url`);
      if (url) window.open(url, "_blank", "noopener,noreferrer");
      else setError("That resource could not be opened.");
    } catch (e) {
      setError(e.message);
    } finally {
      setOpening(null);
    }
  };

  return (
    <Card className="p-5">
      <Box className="flex items-center gap-2 mb-3">
        <Paperclip className="h-4 w-4 text-navy shrink-0" />
        <Text as="h2" className="text-sm font-bold text-ink">
          Resources
        </Text>
        <Text as="span" className="text-[11px] text-ink/45">
          {resources.length} item{resources.length !== 1 ? "s" : ""}
        </Text>
      </Box>

      <Box className="space-y-2">
        {resources.map((resource) => {
          const Icon = RESOURCE_ICON[resource.resource_type] ?? Paperclip;
          const size = formatBytes(resource.file_size_bytes);
          const isLink = resource.source === "link";
          return (
            <Box
              key={resource.id}
              role="button"
              tabIndex={0}
              onClick={() => open(resource)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  open(resource);
                }
              }}
              className="group flex items-center gap-3.5 rounded-lg border border-border bg-paper-warm hover:bg-paper-cream px-3.5 py-3 cursor-pointer transition-colors"
            >
              <Box className="w-9 h-9 rounded-xl bg-paper-cream border border-navy/10 group-hover:border-navy/40 flex items-center justify-center shrink-0 transition-colors">
                <Icon className="h-4 w-4 text-navy" />
              </Box>
              <Box className="flex-1 min-w-0">
                <Text as="p" className="text-[15px] font-semibold text-ink truncate group-hover:text-navy transition-colors">
                  {resource.title}
                </Text>
                <Text as="p" className="text-[11px] text-ink/45 truncate">
                  {isLink
                    ? "External link"
                    : [resource.file_name, size].filter(Boolean).join(" · ")}
                </Text>
              </Box>
              {opening === resource.id ? (
                <Text as="span" className="text-[11px] text-ink/50 shrink-0">
                  Opening…
                </Text>
              ) : isLink ? (
                <ExternalLink className="h-4 w-4 text-ink/30 group-hover:text-navy transition-colors shrink-0" />
              ) : (
                <Download className="h-4 w-4 text-ink/30 group-hover:text-navy transition-colors shrink-0" />
              )}
            </Box>
          );
        })}
      </Box>

      {error && (
        <Text as="p" className="text-xs text-error mt-3">{error}</Text>
      )}
    </Card>
  );
}

function LessonSkeleton() {
  return (
    <Box className="space-y-4">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-8 w-full rounded-xl" />
      <Skeleton className="aspect-video w-full rounded-xl" />
    </Box>
  );
}

// Handles both ISO 8601 (PT1H2M3S) and SCORM 1.2 HH:MM:SS.SS formats
function parseScormTime(t) {
  if (!t) return null;
  if (t.startsWith("PT")) {
    const m = t.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?/);
    if (!m) return null;
    const parts = [];
    if (m[1]) parts.push(`${m[1]}h`);
    if (m[2]) parts.push(`${m[2]}m`);
    if (m[3]) parts.push(`${Math.floor(parseFloat(m[3]))}s`);
    return parts.join(" ") || null;
  }
  const parts = t.split(":");
  if (parts.length < 2) return null;
  const h = parseInt(parts[0], 10);
  const min = parseInt(parts[1], 10);
  const s = Math.floor(parseFloat(parts[2] || "0"));
  const out = [];
  if (h > 0) out.push(`${h}h`);
  if (min > 0) out.push(`${min}m`);
  if (s > 0) out.push(`${s}s`);
  return out.join(" ") || null;
}

function ScormLessonView({ lesson, courseId, progressStatus, onStatusRefresh }) {
  const router = useRouter();
  const { user } = useAuth();
  const [tracking, setTracking] = useState(undefined);
  const [refreshing, setRefreshing] = useState(false);

  const loadTracking = useCallback(async () => {
    if (!user || !lesson.scorm_package_id) return;
    try {
      const d = await apiClient(`/api/learner/scorm/${lesson.scorm_package_id}/tracking`);
      setTracking(d.tracking ?? null);
    } catch {
      setTracking(null);
    }
  }, [user, lesson.scorm_package_id]);

  useEffect(() => { if (user) loadTracking(); }, [user, loadTracking]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadTracking();
    if (onStatusRefresh) onStatusRefresh();
    setRefreshing(false);
  };

  const isCompleted = progressStatus === "completed";
  const isPassed = tracking?.success_status === "passed" || tracking?.lesson_status === "passed";
  const isFailed = tracking?.success_status === "failed" || tracking?.lesson_status === "failed";
  const isAttempted = tracking && tracking.lesson_status !== "not attempted";
  const scoreRaw = tracking?.score_raw != null ? Number(tracking.score_raw) : null;
  const scoreMax = tracking?.score_max != null ? Number(tracking.score_max) : null;
  const scorePct = scoreRaw !== null && scoreMax ? Math.round((scoreRaw / scoreMax) * 100) : null;
  const timeSpent = parseScormTime(tracking?.total_time);

  const launchLabel = !isAttempted ? "Launch Course" : isCompleted ? "Review Course" : "Resume Course";

  return (
    <Box className="space-y-4">
      {/* Results card — shown once there is tracking data */}
      {tracking === undefined ? (
        <Skeleton className="h-28 rounded-xl" />
      ) : tracking ? (
        <Card className="p-5">
          <Box className="flex items-start justify-between gap-4 flex-wrap">
            <Box className="space-y-3 flex-1 min-w-0">
              <Box className="flex items-center gap-2 flex-wrap">
                <Text as="p" className="text-sm font-semibold">Your Results</Text>
                {isPassed && (
                  <Badge className="text-[10px] bg-paper-cream text-navy border-0">
                    <CheckCircle2 className="h-3 w-3 mr-1" />Passed
                  </Badge>
                )}
                {isFailed && (
                  <Badge className="text-[10px] bg-error/10 text-error border-0">Failed</Badge>
                )}
                {!isPassed && !isFailed && isAttempted && (
                  <Badge className="text-[10px] bg-paper-cream text-navy border-0">
                    {tracking.completion_status === "completed" ? "Completed" : "In Progress"}
                  </Badge>
                )}
              </Box>

              <Box className="flex items-center gap-5 flex-wrap">
                {scoreRaw !== null && (
                  <Box className="flex items-center gap-1.5">
                    <Trophy className="h-4 w-4 text-ink/70 shrink-0" />
                    <Text as="span" className="text-sm font-bold">
                      {Math.round(scoreRaw)}{scoreMax ? `/${Math.round(scoreMax)}` : ""}
                    </Text>
                    {scorePct !== null && (
                      <Text as="span" className="text-xs text-muted-foreground">({scorePct}%)</Text>
                    )}
                  </Box>
                )}
                {timeSpent && (
                  <Box className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-navy/70 shrink-0" />
                    <Text as="span" className="text-xs text-muted-foreground">Time: {timeSpent}</Text>
                  </Box>
                )}
              </Box>
            </Box>

            <Button
              size="sm"
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}
              className="shrink-0"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </Box>
        </Card>
      ) : (
        <Card className="p-5 text-center border-dashed">
          <FileArchive className="h-10 w-10 mx-auto bg-navy mb-2" />
          <Text as="p" className="text-sm font-medium text-muted-foreground">No results yet</Text>
          <Text as="p" className="text-xs text-muted-foreground mt-1">Launch the course to begin.</Text>
        </Card>
      )}

      {/* Launch button */}
      <Card className="p-5">
        <Box className="flex items-center justify-between gap-4 flex-wrap">
          <Box>
            <Text as="p" className="text-sm font-medium">
              {isCompleted ? "Course completed — you can still review it." : "Ready to start?"}
            </Text>
            <Text as="p" className="text-xs text-muted-foreground mt-0.5">
              The course opens in a full-screen player.
            </Text>
          </Box>
          <Button
            onClick={() => router.push(`/scorm-player/${lesson.scorm_package_id}`)}
            className="shrink-0 bg-navy hover:bg-navy-soft text-paper"
          >
            <ExternalLink className="h-4 w-4 mr-1.5" />
            {launchLabel}
          </Button>
        </Box>
      </Card>
    </Box>
  );
}

export function LessonContent({ courseId, lessonId }) {
  const { user } = useAuth();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [completing, setCompleting] = useState(false);
  const [status, setStatus] = useState(null);
  const [videoEnded, setVideoEnded] = useState(false);
  // Presigned R2 URLs for an uploaded video. undefined = not yet asked,
  // null = this lesson has no hosted video.
  const [media, setMedia] = useState(undefined);

  /**
   * Fetches a fresh signed URL pair. Also handed to the player as `onRefresh`
   * so it can re-sign before the current URL expires mid-playback.
   */
  /** Fire-and-forget: a lost progress ping is re-sent by the next one. */
  const reportProgress = useCallback(
    (payload) => {
      apiClient(`/api/learner/lessons/${lessonId}/video-progress`, {
        method: "POST",
        body: payload,
      }).catch(() => {});
    },
    [lessonId],
  );

  const loadMedia = useCallback(async () => {
    const res = await apiClient(`/api/learner/lessons/${lessonId}/media`);
    // The same endpoint serves both: a video URL for a video lesson, a document
    // URL for a document one. Null only when it carries neither, which is what
    // the players and the document view read as "nothing to show".
    setMedia(res.videoUrl || res.documentUrl ? res : null);
    return res;
  }, [lessonId]);

  const loadLesson = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetchLessonContent({ lessonId });
      setData(res);
      setStatus(res.progress_status);
    } catch (e) {
      setError(e.message);
    }
  }, [user, user, lessonId]);

  useEffect(() => { loadLesson(); }, [loadLesson]);
  useEffect(() => { setVideoEnded(false); setMedia(undefined); }, [lessonId]);

  // Only ask for a signed URL when the lesson actually has an uploaded file —
  // a video or a document. Signing is cheap but pointless for a YouTube-backed
  // lesson, a SCORM package, or a document that is only a link.
  const needsSignedUrl = Boolean(
    data?.lesson?.has_video || data?.lesson?.has_document,
  );
  useEffect(() => {
    if (!user || !needsSignedUrl) return;
    loadMedia().catch(() => setMedia(null));
  }, [user, needsSignedUrl, loadMedia]);

  const handleMarkComplete = async () => {
    setCompleting(true);
    try {
      await markLessonComplete({ lessonId });
      setStatus("completed");
      if (data?.next_lesson_id) {
        router.push(`/my-courses/${courseId}/lessons/${data.next_lesson_id}`);
      } else {
        router.push(`/my-courses/${courseId}`);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setCompleting(false);
    }
  };

  if (error) {
    const isLocked = error.toLowerCase().includes("locked");
    return (
      <Card className="p-8 text-center">
        {isLocked && <Lock className="h-10 w-10 mx-auto text-ink/70 mb-3" />}
        <Text as="p" className={`text-sm font-medium mb-1 ${isLocked ? "text-ink/70" : "text-error"}`}>{error}</Text>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => router.push(`/my-courses/${courseId}`)}>
          Back to Course
        </Button>
      </Card>
    );
  }

  if (!data) return <LessonSkeleton />;
  const { lesson } = data;

  const isScorm = lesson.content_type === "scorm";
  // A live/offline session's lesson. The learner cannot complete it — the admin
  // marks the session done and attendance decides who is credited — so every
  // completion affordance is withheld rather than shown and rejected.
  const isSession = lesson.content_type === "session" && Boolean(lesson.session);
  // A document lesson: the file is uploaded (has_document) or linked. Either
  // way there is nothing to play and nothing to measure, so its declared
  // duration is what counts — completion is the learner's to mark.
  const isDocument =
    ["document", "pdf", "ppt", "doc", "xls"].includes(lesson.content_type) &&
    (lesson.has_document || Boolean(lesson.content_url));
  // An uploaded R2 video wins over content_url — the admin form presents the
  // upload first and says as much.
  const isHosted = !isScorm && !isSession && !isDocument && Boolean(lesson.has_video);
  const isYT = !isScorm && !isSession && !isDocument && !isHosted && isYouTubeUrl(lesson.content_url);
  const isLocal = !isScorm && !isSession && !isDocument && !isHosted && isVideoFile(lesson.content_url);
  const canMarkComplete =
    !isSession && (isScorm || isDocument || ((!isYT && !isLocal && !isHosted) || videoEnded));

  const MarkCompleteButton = () => (
    <Button
      size="sm"
      onClick={handleMarkComplete}
      disabled={completing}
      className="shrink-0 bg-navy hover:bg-navy-soft text-paper"
    >
      <CheckCircle2 className="h-4 w-4 mr-1.5" />
      {completing ? "Saving..." : "Mark Complete"}
    </Button>
  );

  const lessonTypeLabel = isSession
    ? "Live session"
    : isScorm
    ? "SCORM"
    : isDocument
    ? "Document"
    : "Video Lesson";
  const lessonTypeIcon = isSession
    ? <Users className="h-4 w-4 text-navy shrink-0" />
    : isScorm
    ? <FileArchive className="h-4 w-4 text-navy shrink-0" />
    : isDocument
    ? <FileText className="h-4 w-4 text-navy shrink-0" />
    : <PlayCircle className="h-4 w-4 text-navy shrink-0" />;

  return (
    <Box className="space-y-4">
      {/* Back */}
      <Box className="flex items-center gap-2 flex-wrap">
        <Button variant="ghost" size="sm" className="shrink-0" onClick={() => router.push(`/my-courses/${courseId}`)}>
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back to Course
        </Button>
        {lesson.module && (
          <Text as="span" className="text-xs text-muted-foreground">/ {lesson.module.title}</Text>
        )}
      </Box>

      {/* Lesson Header */}
      <Card className="overflow-hidden">
        <CardContent className="p-5">
          <Box className="flex items-start justify-between gap-4 flex-wrap">
            <Box className="flex-1 min-w-0">
              <Box className="flex items-center gap-2 mb-2">
                {lessonTypeIcon}
                <Badge
                  className={`text-[10px] font-semibold px-2 py-0.5 ${status === "completed" ? "bg-paper-cream text-navy border-navy/20" : isScorm ? "bg-paper-cream text-navy border-navy/20" : "bg-paper-cream text-ink/70 border-border"}`}
                >
                  {status === "completed" ? "Completed" : lessonTypeLabel}
                </Badge>
              </Box>
              <Text as="h1" className="text-lg font-bold leading-snug">{lesson.title}</Text>
              {lesson.description && (
                <Text as="p" className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{lesson.description}</Text>
              )}
              {lesson.duration_minutes && (
                <Box className="flex items-center gap-1 mt-2">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <Text as="span" className="text-xs text-muted-foreground">{lesson.duration_minutes} min</Text>
                </Box>
              )}
            </Box>

            {!isScorm && !isSession && (
              status === "completed" ? (
                <Button size="sm" disabled className="shrink-0 bg-navy text-white opacity-70">
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />Completed
                </Button>
              ) : canMarkComplete ? (
                <MarkCompleteButton />
              ) : null
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Session, SCORM or video content */}
      {isSession ? (
        <SessionLessonView session={lesson.session} />
      ) : isDocument ? (
        <DocumentLessonView lesson={lesson} media={media} />
      ) : isScorm ? (
        <ScormLessonView
          lesson={lesson}
          courseId={courseId}
          progressStatus={status}
          onStatusRefresh={loadLesson}
        />
      ) : isHosted ? (
        <Card className="overflow-hidden h-[80vh]">
          {media === undefined ? (
            <Box className="h-full w-full bg-navy flex items-center justify-center">
              <Text as="p" className="text-sm text-paper/60 font-mono">Preparing video…</Text>
            </Box>
          ) : media ? (
            <LocalVideoPlayer
              src={media.videoUrl}
              captionSrc={media.captionUrl}
              expiresIn={media.expiresIn}
              onRefresh={loadMedia}
              onProgress={reportProgress}
              resumeAt={media.resumeAtSeconds}
              watchedSeconds={media.watchedSeconds}
              resetKey={lessonId}
              onEnded={() => setVideoEnded(true)}
              className="h-full"
            />
          ) : (
            <Box className="h-full w-full bg-navy flex items-center justify-center px-6">
              <Text as="p" className="text-sm text-paper/70 text-center">
                This video could not be loaded. Please refresh, or contact your administrator.
              </Text>
            </Box>
          )}
        </Card>
      ) : lesson.content_url ? (
        <Card className="overflow-hidden h-[80vh]">
          {isYT ? (
            <YoutubePlayer
              videoId={extractYouTubeId(lesson.content_url)}
              onEnded={() => setVideoEnded(true)}
              className="h-full"
            />
          ) : isLocal ? (
            <LocalVideoPlayer
              src={lesson.content_url}
              onEnded={() => setVideoEnded(true)}
              className="h-full"
            />
          ) : (
            <Box className="h-full w-full bg-navy">
              <iframe
                src={lesson.content_url}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                title={lesson.title}
              />
            </Box>
          )}
        </Card>
      ) : (
        <Card className="p-10 text-center">
          <PlayCircle className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <Text as="p" className="text-sm text-muted-foreground">No video content available for this lesson yet.</Text>
        </Card>
      )}

      {/* Supporting material, for every lesson type that has any. */}
      <LessonResources resources={data.resources} />

      {/* Footer action card — only where the learner can complete the lesson */}
      {!isScorm && !isSession && (
        <Card className="p-4">
          <Box className="flex items-center justify-between gap-4 flex-wrap">
            {status === "completed" ? (
              <>
                <Box className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-navy shrink-0" />
                  <Text as="p" className="text-sm text-muted-foreground">This lesson is already complete.</Text>
                </Box>
                <Button size="sm" disabled className="shrink-0 bg-navy text-white opacity-70">
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />Completed
                </Button>
              </>
            ) : canMarkComplete ? (
              <>
                <Text as="p" className="text-sm text-muted-foreground">
                  {isDocument
                    ? "Finished reading? Mark this lesson as complete."
                    : "Finished watching? Mark this lesson as complete."}
                </Text>
                <MarkCompleteButton />
              </>
            ) : (
              <>
                <Box className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-ink/70 shrink-0" />
                  <Text as="p" className="text-sm text-muted-foreground">
                    Watch the full video to unlock completion.
                  </Text>
                </Box>
                <Button size="sm" disabled className="shrink-0 opacity-50 cursor-not-allowed">
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                  Mark Complete
                </Button>
              </>
            )}
          </Box>
        </Card>
      )}
    </Box>
  );
}
