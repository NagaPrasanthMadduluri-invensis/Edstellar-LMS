"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2,
  Circle,
  Lock,
  BookOpen,
  TrendingUp,
} from "lucide-react";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { useAuth } from "@/hooks/use-auth";

function formatDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function isToday(iso) {
  if (!iso) return false;
  const d = new Date(iso);
  return d.toDateString() === new Date().toDateString();
}

function ProgressSkeleton() {
  return (
    <Box className="space-y-8">
      {Array.from({ length: 2 }).map((_, i) => (
        <Box key={i} className="space-y-3">
          <Skeleton className="h-5 w-64" />
          <Box className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
          </Box>
          <Skeleton className="h-52 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </Box>
      ))}
    </Box>
  );
}

function MilestoneRow({ label, status, date, isLast }) {
  const isDone = status === "done";
  const isLocked = status === "locked";
  const dateStr = date ? (isToday(date) ? "Today" : formatDate(date)) : null;

  return (
    <Box className={`flex items-center justify-between py-3.5 ${!isLast ? "border-b" : ""}`}>
      <Box className="flex items-center gap-3">
        <Box className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 ${
          isDone
            ? "bg-emerald-50 border-emerald-500"
            : "bg-gray-50 border-gray-300"
        }`}>
          {isDone
            ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            : isLocked
              ? <Lock className="h-3.5 w-3.5 text-gray-400" />
              : <Circle className="h-3.5 w-3.5 text-gray-400" />
          }
        </Box>
        <Text as="span" className={`text-sm ${isDone ? "font-medium" : "text-muted-foreground"}`}>
          {label}
        </Text>
      </Box>
      <Text as="span" className={`text-xs font-medium shrink-0 ml-4 ${
        isDone ? "text-emerald-600" : isLocked ? "text-gray-400" : "text-amber-500"
      }`}>
        {isDone ? (dateStr ?? "Completed") : isLocked ? "Locked" : "Pending"}
      </Text>
    </Box>
  );
}

function CourseProgressSection({ data }) {
  const {
    course,
    enrollment,
    totalLessons,
    completedLessons,
    firstCompletionDate,
    firstAttemptDate,
    hasPassed,
    modules,
    assessments,
  } = data;

  const progress = enrollment.progress_percentage;

  const bestScore = assessments.reduce((max, a) => {
    if (a.best_score !== null && a.best_score > (max ?? -1)) return a.best_score;
    return max;
  }, null);

  const hasAttempt = assessments.some((a) => a.attempt_count > 0);
  const certificateEarned = progress === 100 && hasPassed;

  const statusLabel =
    progress === 0 ? "not started" : progress === 100 ? "completed" : "in progress";
  const statusColor =
    progress === 0
      ? "bg-gray-100 text-gray-600"
      : progress === 100
        ? "bg-emerald-100 text-emerald-700"
        : "bg-indigo-100 text-indigo-700";

  return (
    <Box className="space-y-3">
      <Box className="flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-indigo-500 shrink-0" />
        <Text as="h2" className="text-base font-semibold">{course.name}</Text>
      </Box>

      {/* Course Progress + Assessment Score */}
      <Box className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-5">
            <Text as="p" className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase mb-3">
              Course Progress
            </Text>
            <Text as="h3" className="text-4xl font-bold text-indigo-600 mb-3">{progress}%</Text>
            <Progress value={progress} className="h-1.5 mb-3" />
            <Box className="flex items-center justify-between">
              <Badge variant="secondary" className={`text-[10px] ${statusColor}`}>
                {statusLabel}
              </Badge>
              <Text as="span" className="text-[11px] text-muted-foreground">
                {completedLessons}/{totalLessons} lessons
              </Text>
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <Text as="p" className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase mb-3">
              Assessment Score
            </Text>
            {bestScore !== null ? (
              <>
                <Text as="h3" className={`text-4xl font-bold mb-2 ${hasPassed ? "text-emerald-600" : "text-red-500"}`}>
                  {bestScore}%
                </Text>
                <Badge
                  variant="secondary"
                  className={`text-[10px] ${hasPassed ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}
                >
                  {hasPassed ? "Passed" : "Not yet passed"}
                </Badge>
              </>
            ) : (
              <>
                <Box className="w-8 h-0.5 bg-muted-foreground/30 mb-3" />
                <Text as="p" className="text-sm text-muted-foreground">
                  Complete the assessment to see your score
                </Text>
              </>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Learning Milestones */}
      <Card>
        <CardContent className="px-5 pt-4 pb-2">
          <Text as="h3" className="text-sm font-bold mb-1">Learning Milestones</Text>
          <MilestoneRow
            label="Enrolled in course"
            status="done"
            date={enrollment.assigned_at}
            isLast={false}
          />
          <MilestoneRow
            label="Video content viewed"
            status={completedLessons > 0 ? "done" : "pending"}
            date={firstCompletionDate}
            isLast={false}
          />
          <MilestoneRow
            label="Assessment submitted"
            status={hasAttempt ? "done" : "pending"}
            date={firstAttemptDate}
            isLast={false}
          />
          <MilestoneRow
            label="Certificate earned"
            status={certificateEarned ? "done" : "locked"}
            date={null}
            isLast={true}
          />
        </CardContent>
      </Card>

      {/* About This Course */}
      <Card>
        <CardContent className="p-5">
          <Text as="h3" className="text-sm font-bold mb-3">About This Course</Text>
          {course.description ? (
            <Text as="p" className="text-sm text-muted-foreground leading-relaxed mb-3">
              <Text as="span" className="font-semibold text-foreground">{course.name}</Text>
              {" "}{course.description}
            </Text>
          ) : (
            <Text as="p" className="text-sm text-muted-foreground mb-3">No description available.</Text>
          )}
          {modules.length > 0 && (
            <Box className="flex items-center gap-2 flex-wrap">
              {modules.map((m) => (
                <Badge key={m.id} variant="outline" className="text-xs font-normal">
                  {m.title}
                </Badge>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

export function MyProgressContent() {
  const { user, token } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token || !user) return;
    fetch("/api/learner/progress", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.message) throw new Error(d.message);
        setData(d);
      })
      .catch((e) => setError(e.message));
  }, [token, user]);

  if (error) {
    return (
      <Card className="p-8 text-center">
        <Text as="p" className="text-red-500 text-sm">{error}</Text>
      </Card>
    );
  }

  if (!data) return <ProgressSkeleton />;

  const { courses } = data;

  if (courses.length === 0) {
    return (
      <Card className="p-12 text-center">
        <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
        <Text as="h2" className="font-semibold mb-1">No courses assigned yet</Text>
        <Text as="p" className="text-sm text-muted-foreground">
          Contact your administrator to get enrolled in a course.
        </Text>
      </Card>
    );
  }

  return (
    <Box className="space-y-8">
      {courses.map((courseData) => (
        <CourseProgressSection key={courseData.course.id} data={courseData} />
      ))}
    </Box>
  );
}
