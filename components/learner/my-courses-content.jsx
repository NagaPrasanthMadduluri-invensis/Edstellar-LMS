"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Play, CheckCircle2, Clock } from "lucide-react";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { useAuth } from "@/hooks/use-auth";
import { fetchMyCourses } from "@/services/api/learner/learner-api";

const GRADIENT_POOL = [
  "from-indigo-400/40 to-purple-500/40",
  "from-emerald-400/40 to-teal-500/40",
  "from-orange-400/40 to-amber-500/40",
  "from-cyan-400/40 to-blue-500/40",
  "from-pink-400/40 to-rose-500/40",
  "from-violet-400/40 to-purple-600/40",
];

function CourseCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="h-28 w-full" />
      <Box className="p-4 space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-2 w-full rounded-full" />
        <Skeleton className="h-8 w-full" />
      </Box>
    </Card>
  );
}

function CourseCard({ enrollment, index }) {
  const { course, progress_percentage, status, granted_at } = enrollment;
  const gradient = GRADIENT_POOL[index % GRADIENT_POOL.length];
  const isDone = status === "completed";

  return (
    <Link href={`/my-courses/${course.id}`} className="block group">
      <Card className="overflow-hidden hover:shadow-lg transition-all duration-200 group-hover:-translate-y-0.5">
        <Box className={`relative h-28 bg-gradient-to-br ${gradient} flex items-center justify-center`}>
          <BookOpen className="h-10 w-10 text-white/60" />
          <Box className="absolute top-2.5 right-2.5">
            <Badge className={`text-[10px] border-0 ${isDone ? "bg-emerald-100 text-emerald-700" : "bg-indigo-100 text-indigo-700"}`}>
              {isDone ? "Completed" : "In Progress"}
            </Badge>
          </Box>
          {isDone && (
            <Box className="absolute bottom-2.5 right-2.5">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 bg-white rounded-full" />
            </Box>
          )}
        </Box>
        <Box className="p-4 space-y-3">
          <Text as="p" className="text-sm font-semibold leading-snug group-hover:text-indigo-600 transition-colors">
            {course.name}
          </Text>
          {granted_at && (
            <Box className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <Text as="span" className="text-[11px] text-muted-foreground">
                Assigned {new Date(granted_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </Text>
            </Box>
          )}
          <Box>
            <Box className="flex items-center justify-between mb-1.5">
              <Text as="span" className="text-[11px] text-muted-foreground">Progress</Text>
              <Text as="span" className="text-[11px] font-semibold">{Math.round(progress_percentage)}%</Text>
            </Box>
            <Progress value={progress_percentage} className="h-2" />
          </Box>
          <Button
            size="sm"
            className={`w-full text-xs h-8 ${isDone
              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
              : "bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white"
            }`}
          >
            <Play className="h-3 w-3 mr-1.5" />
            {progress_percentage > 0 ? (isDone ? "Review Course" : "Continue") : "Start Course"}
          </Button>
        </Box>
      </Card>
    </Link>
  );
}

export function MyCoursesContent() {
  const { user, token } = useAuth();
  const [courses, setCourses] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token || !user) return;
    fetchMyCourses({ token }).then((d) => setCourses(d.courses || [])).catch((e) => setError(e.message));
  }, [token, user]);

  if (error) {
    return (
      <Card className="p-8 text-center">
        <Text as="p" className="text-red-500 text-sm">{error}</Text>
      </Card>
    );
  }

  if (!courses) {
    return (
      <Box className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => <CourseCardSkeleton key={i} />)}
      </Box>
    );
  }

  if (courses.length === 0) {
    return (
      <Card className="p-12 text-center">
        <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
        <Text as="h3" className="text-base font-semibold">No courses assigned yet</Text>
        <Text as="p" className="text-sm text-muted-foreground mt-1">
          Your courses will appear here once an admin assigns them to you.
        </Text>
      </Card>
    );
  }

  return (
    <Box>
      <Text as="p" className="text-sm text-muted-foreground mb-4">
        {courses.length} course{courses.length !== 1 ? "s" : ""} assigned
      </Text>
      <Box className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {courses.map((enrollment, index) => (
          <CourseCard key={enrollment.enrollment_id} enrollment={enrollment} index={index} />
        ))}
      </Box>
    </Box>
  );
}
