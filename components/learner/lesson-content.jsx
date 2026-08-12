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
} from "lucide-react";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { useAuth } from "@/hooks/use-auth";
import { fetchLessonContent, markLessonComplete } from "@/services/api/learner/learner-api";
import { YoutubePlayer, isYouTubeUrl, extractYouTubeId } from "@/components/learner/youtube-player";
import { LocalVideoPlayer, isVideoFile } from "@/components/learner/local-video-player";

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
  useEffect(() => { setVideoEnded(false); }, [lessonId]);

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
  const isYT = !isScorm && isYouTubeUrl(lesson.content_url);
  const isLocal = !isScorm && isVideoFile(lesson.content_url);
  const canMarkComplete = isScorm || ((!isYT && !isLocal) || videoEnded);

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

  const lessonTypeLabel = isScorm ? "SCORM" : "Video Lesson";
  const lessonTypeIcon = isScorm
    ? <FileArchive className="h-4 w-4 text-navy shrink-0" />
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

            {!isScorm && (
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

      {/* SCORM or Video content */}
      {isScorm ? (
        <ScormLessonView
          lesson={lesson}
          courseId={courseId}
          progressStatus={status}
          onStatusRefresh={loadLesson}
        />
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

      {/* Footer action card — only for non-SCORM lessons */}
      {!isScorm && (
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
                  Finished watching? Mark this lesson as complete.
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
