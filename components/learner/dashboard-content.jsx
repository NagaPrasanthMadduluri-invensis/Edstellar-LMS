"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  BookOpen,
  CheckCircle2,
  ClipboardList,
  TrendingUp,
  Play,
  ChevronRight,
  Award,
  Clock,
} from "lucide-react";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { fetchDashboard } from "@/services/api/learner/learner-api";

const GRADIENT_POOL = [
  "from-indigo-500/20 to-purple-500/20",
  "from-emerald-500/20 to-teal-500/20",
  "from-orange-500/20 to-amber-500/20",
  "from-cyan-500/20 to-blue-500/20",
  "from-pink-500/20 to-rose-500/20",
  "from-violet-500/20 to-purple-600/20",
];

function DashboardSkeleton() {
  return (
    <Box className="space-y-5">
      <Skeleton className="h-24 w-full rounded-xl" />
      <Box className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </Box>
      <Box className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </Box>
    </Box>
  );
}

export function DashboardContent() {
  const { user, token } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token || !user) return;
    fetchDashboard({ token }).then(setData).catch((e) => setError(e.message));
  }, [token, user]);

  if (error) {
    return (
      <Card className="p-8 text-center">
        <Text as="p" className="text-red-500 text-sm">{error}</Text>
        <Button size="sm" variant="outline" className="mt-3" onClick={() => window.location.reload()}>Retry</Button>
      </Card>
    );
  }

  if (!data) return <DashboardSkeleton />;

  const { enrolled_courses = [], stats = {}, recentAttempts = [] } = data;

  const statCards = [
    { label: "Assigned Courses",  value: stats.assigned_courses ?? 0,   icon: BookOpen,      color: "bg-indigo-100 text-indigo-600" },
    { label: "Completed Courses", value: stats.completed_courses ?? 0,  icon: CheckCircle2,  color: "bg-emerald-100 text-emerald-600" },
    { label: "In Progress",       value: (stats.assigned_courses ?? 0) - (stats.completed_courses ?? 0), icon: TrendingUp, color: "bg-amber-100 text-amber-600" },
    { label: "Assessments Taken", value: stats.completed_assessments ?? 0, icon: ClipboardList, color: "bg-violet-100 text-violet-600" },
  ];

  return (
    <Box className="space-y-6">
      {/* ── Welcome Banner ── */}
      <Card className="bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-pink-500/5 border-0 shadow-sm">
        <CardContent className="flex items-center gap-4 py-5 px-6 flex-wrap">
          <Avatar className="h-14 w-14 ring-2 ring-indigo-200 ring-offset-2">
            <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-lg font-bold">
              {user?.initials || "U"}
            </AvatarFallback>
          </Avatar>
          <Box className="flex-1 min-w-[180px]">
            <Text as="h2" className="text-lg font-bold">
              Welcome back, {user?.firstName || "Learner"}!
            </Text>
            <Text as="p" className="text-sm text-muted-foreground mt-0.5">
              You have {enrolled_courses.length} course{enrolled_courses.length !== 1 ? "s" : ""} assigned.
              {stats.completed_courses > 0 && ` ${stats.completed_courses} completed.`}
            </Text>
          </Box>
          <Link href="/my-courses">
            <Button size="sm" className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shrink-0">
              <Play className="h-3.5 w-3.5 mr-1.5" />
              Continue Learning
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* ── Stat Cards ── */}
      <Box className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((s) => (
          <Card key={s.label} className="p-4 hover:shadow-md transition-shadow">
            <Box className="flex items-start gap-3">
              <Box className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${s.color}`}>
                <s.icon className="h-5 w-5" />
              </Box>
              <Box>
                <Text as="h2" className="text-2xl font-bold leading-none">{s.value}</Text>
                <Text as="span" className="text-[11px] text-muted-foreground leading-tight">{s.label}</Text>
              </Box>
            </Box>
          </Card>
        ))}
      </Box>

      {/* ── My Courses + Recent Assessment Activity ── */}
      <Box className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* My Courses */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between py-3 px-5">
            <CardTitle className="text-sm font-semibold">My Courses</CardTitle>
            <Link href="/my-courses" className="text-xs text-indigo-500 font-medium hover:underline flex items-center gap-0.5">
              View All <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="px-5 pb-5 pt-0 space-y-3">
            {enrolled_courses.length === 0 ? (
              <Box className="py-8 text-center">
                <BookOpen className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                <Text as="p" className="text-sm text-muted-foreground">No courses assigned yet.</Text>
              </Box>
            ) : (
              enrolled_courses.slice(0, 4).map((c, i) => (
                <Link key={c.enrollment_id} href={`/my-courses/${c.course.id}`}>
                  <Box className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group">
                    <Box className={`w-10 h-10 rounded-lg bg-gradient-to-br ${GRADIENT_POOL[i % GRADIENT_POOL.length]} flex items-center justify-center shrink-0`}>
                      <BookOpen className="h-5 w-5 text-indigo-600" />
                    </Box>
                    <Box className="flex-1 min-w-0">
                      <Text as="p" className="text-sm font-semibold truncate group-hover:text-indigo-600 transition-colors">
                        {c.course.name}
                      </Text>
                      <Box className="flex items-center gap-2 mt-1">
                        <Progress value={c.progress_percentage} className="h-1.5 flex-1" />
                        <Text as="span" className="text-[11px] text-muted-foreground shrink-0">
                          {c.progress_percentage}%
                        </Text>
                      </Box>
                    </Box>
                    <Badge variant="secondary" className={`text-[10px] shrink-0 ${c.status === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-indigo-100 text-indigo-700"}`}>
                      {c.status === "completed" ? "Done" : "Active"}
                    </Badge>
                  </Box>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Assessment Activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between py-3 px-5">
            <CardTitle className="text-sm font-semibold">Recent Assessments</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-5 pb-5 pt-0">
            {recentAttempts.length === 0 ? (
              <Box className="py-8 text-center">
                <ClipboardList className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                <Text as="p" className="text-sm text-muted-foreground">No assessments taken yet.</Text>
                <Text as="p" className="text-xs text-muted-foreground mt-1">Open a course to take an assessment.</Text>
              </Box>
            ) : (
              <Box className="space-y-0 divide-y">
                {recentAttempts.map((a) => (
                  <Box key={a.id} className="py-2.5 flex items-center justify-between gap-3">
                    <Box className="flex-1 min-w-0">
                      <Text as="p" className="text-sm font-semibold truncate">{a.assessment_title}</Text>
                      <Text as="span" className="text-[11px] text-muted-foreground">{a.course_name}</Text>
                    </Box>
                    <Box className="text-right shrink-0">
                      <Box className="flex items-center gap-1.5">
                        <Badge variant="secondary" className={`text-[10px] ${a.is_passed ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                          {a.is_passed ? "Passed" : "Failed"}
                        </Badge>
                        <Text as="span" className="text-sm font-bold">{a.percentage}%</Text>
                      </Box>
                      <Box className="flex items-center gap-1 mt-0.5 justify-end">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <Text as="span" className="text-[10px] text-muted-foreground">
                          {new Date(a.submitted_at).toLocaleDateString()}
                        </Text>
                      </Box>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
