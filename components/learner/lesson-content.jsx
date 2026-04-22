"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, CheckCircle2, Clock, PlayCircle, Lock } from "lucide-react";
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

export function LessonContent({ courseId, lessonId }) {
  const { user, token } = useAuth();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [completing, setCompleting] = useState(false);
  const [status, setStatus] = useState(null);
  // True once the YouTube video fires its "ended" event
  const [videoEnded, setVideoEnded] = useState(false);

  useEffect(() => {
    if (!token || !user) return;
    fetchLessonContent({ token, lessonId })
      .then((res) => { setData(res); setStatus(res.progress_status); })
      .catch((e) => setError(e.message));
  }, [token, user, lessonId]);

  // Reset videoEnded when lesson changes
  useEffect(() => { setVideoEnded(false); }, [lessonId]);

  const handleMarkComplete = async () => {
    setCompleting(true);
    try {
      await markLessonComplete({ token, lessonId });
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
        {isLocked && <Lock className="h-10 w-10 mx-auto text-amber-400 mb-3" />}
        <Text as="p" className={`text-sm font-medium mb-1 ${isLocked ? "text-amber-700" : "text-red-500"}`}>{error}</Text>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => router.push(`/my-courses/${courseId}`)}>
          Back to Course
        </Button>
      </Card>
    );
  }

  if (!data) return <LessonSkeleton />;
  const { lesson } = data;

  const isYT = isYouTubeUrl(lesson.content_url);
  const isLocal = isVideoFile(lesson.content_url);
  // Button unlocks only after full playback for tracked video types; always unlocked for iframes
  const canMarkComplete = (!isYT && !isLocal) || videoEnded;

  const MarkCompleteButton = () => (
    <Button
      size="sm"
      onClick={handleMarkComplete}
      disabled={completing}
      className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white"
    >
      <CheckCircle2 className="h-4 w-4 mr-1.5" />
      {completing ? "Saving..." : "Mark Complete"}
    </Button>
  );

  return (
    <Box className="space-y-4">
      {/* ── Back ── */}
      <Box className="flex items-center gap-2 flex-wrap">
        <Button variant="ghost" size="sm" className="shrink-0" onClick={() => router.push(`/my-courses/${courseId}`)}>
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back to Course
        </Button>
        {lesson.module && (
          <Text as="span" className="text-xs text-muted-foreground">/ {lesson.module.title}</Text>
        )}
      </Box>

      {/* ── Lesson Header ── */}
      <Card>
        <CardHeader className="py-4 px-5">
          <Box className="flex items-start justify-between gap-4 flex-wrap">
            <Box className="flex-1 min-w-0">
              <Box className="flex items-center gap-2 mb-1.5">
                <PlayCircle className="h-4 w-4 text-indigo-500 shrink-0" />
                <Badge variant="secondary" className={`text-[10px] ${status === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>
                  {status === "completed" ? "Completed" : "Video Lesson"}
                </Badge>
              </Box>
              <CardTitle className="text-lg">{lesson.title}</CardTitle>
              {lesson.description && (
                <Text as="p" className="text-sm text-muted-foreground mt-1 leading-relaxed">{lesson.description}</Text>
              )}
              {lesson.duration_minutes && (
                <Box className="flex items-center gap-1 mt-2">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <Text as="span" className="text-xs text-muted-foreground">{lesson.duration_minutes} minutes</Text>
                </Box>
              )}
            </Box>

            {/* Right side of header */}
            {status === "completed" ? (
              <Button
                size="sm"
                onClick={() => {}}
                className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                Mark Complete
              </Button>
            ) : canMarkComplete ? (
              <MarkCompleteButton />
            ) : null}
          </Box>
        </CardHeader>
      </Card>

      {/* ── Video Player ── */}
      {lesson.content_url ? (
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
            <Box className="h-full w-full bg-black">
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

      {/* ── Footer action card ── */}
      <Card className="p-4">
        <Box className="flex items-center justify-between gap-4 flex-wrap">
          {status === "completed" ? (
            <>
              <Box className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <Text as="p" className="text-sm text-muted-foreground">
                  This lesson is already complete.
                </Text>
              </Box>
              <Button
                size="sm"
                onClick={() => {}}
                className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                Mark Complete
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
                <Lock className="h-4 w-4 text-amber-500 shrink-0" />
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
    </Box>
  );
}
