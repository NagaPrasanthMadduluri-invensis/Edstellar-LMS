"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ClipboardList,
  Trophy,
  RotateCcw,
  Lock,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle2,
  XCircle,
  BookOpen,
} from "lucide-react";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { useAuth } from "@/hooks/use-auth";

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function AssessmentsSkeleton() {
  return (
    <Box className="space-y-4">
      <Box className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </Box>
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-24 rounded-xl" />
      ))}
    </Box>
  );
}

function AssessmentCard({ assessment }) {
  const [expanded, setExpanded] = useState(false);
  const {
    id,
    title,
    course_id,
    course_name,
    passing_score,
    questions_count,
    attempt_count,
    best_score,
    has_passed,
    is_unlocked,
    attempts,
  } = assessment;

  return (
    <Card className={`overflow-hidden transition-all ${!is_unlocked ? "opacity-70" : ""}`}>
      <Box
        className={`h-1 ${
          has_passed
            ? "bg-emerald-500"
            : attempt_count > 0
              ? "bg-red-400"
              : is_unlocked
                ? "bg-indigo-500"
                : "bg-gray-200"
        }`}
      />
      <CardContent className="p-4">
        <Box className="flex items-start gap-3 flex-wrap">
          <Box
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              !is_unlocked ? "bg-gray-100" : has_passed ? "bg-emerald-100" : "bg-indigo-100"
            }`}
          >
            {!is_unlocked ? (
              <Lock className="h-5 w-5 text-gray-400" />
            ) : has_passed ? (
              <Trophy className="h-5 w-5 text-emerald-600" />
            ) : (
              <ClipboardList className="h-5 w-5 text-indigo-600" />
            )}
          </Box>

          <Box className="flex-1 min-w-0">
            <Text as="p" className="text-sm font-semibold">{title}</Text>
            <Box className="flex items-center gap-1.5 mt-0.5">
              <BookOpen className="h-3 w-3 text-muted-foreground" />
              <Text as="span" className="text-xs text-muted-foreground">{course_name}</Text>
            </Box>
            <Box className="flex items-center gap-2 mt-1.5 flex-wrap">
              <Text as="span" className="text-[11px] text-muted-foreground">
                Pass: {passing_score}%
              </Text>
              <Text as="span" className="text-[11px] text-muted-foreground">
                {questions_count} questions
              </Text>
              {is_unlocked && attempt_count > 0 && (
                <>
                  <Badge
                    variant="secondary"
                    className={`text-[10px] ${
                      has_passed ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                    }`}
                  >
                    Best: {best_score}%
                  </Badge>
                  <Text as="span" className="text-[11px] text-muted-foreground">
                    {attempt_count} attempt{attempt_count !== 1 ? "s" : ""}
                  </Text>
                </>
              )}
              {!is_unlocked && (
                <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-700">
                  Complete all lessons to unlock
                </Badge>
              )}
            </Box>
          </Box>

          <Box className="flex items-center gap-2 shrink-0">
            {attempt_count > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded((v) => !v)}
                className="text-xs text-muted-foreground h-8 px-2"
              >
                History
                {expanded ? (
                  <ChevronUp className="h-3.5 w-3.5 ml-1" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 ml-1" />
                )}
              </Button>
            )}
            {is_unlocked ? (
              <Link href={`/my-courses/${course_id}/assessments/${id}`}>
                <Button
                  size="sm"
                  className={`text-xs ${
                    has_passed
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white"
                  }`}
                >
                  {attempt_count > 0 ? (
                    <>
                      <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                      Retake
                    </>
                  ) : (
                    <>
                      <ClipboardList className="h-3.5 w-3.5 mr-1.5" />
                      Start
                    </>
                  )}
                </Button>
              </Link>
            ) : (
              <Button size="sm" disabled className="text-xs opacity-50">
                <Lock className="h-3.5 w-3.5 mr-1.5" />
                Locked
              </Button>
            )}
          </Box>
        </Box>

        {/* Attempt history */}
        {expanded && attempts.length > 0 && (
          <Box className="mt-3 pt-3 border-t space-y-1.5">
            <Text as="p" className="text-xs font-medium text-muted-foreground mb-2">
              Attempt History
            </Text>
            {attempts.map((att, i) => (
              <Box
                key={att.id}
                className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/40"
              >
                <Text as="span" className="text-xs font-medium w-5 text-muted-foreground shrink-0">
                  #{attempts.length - i}
                </Text>
                {att.is_passed ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                )}
                <Badge
                  variant="secondary"
                  className={`text-[10px] ${
                    att.is_passed
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {att.percentage}%
                </Badge>
                <Text as="span" className="text-[11px] text-muted-foreground">
                  {att.score}/{att.total_questions} correct
                </Text>
                <Box className="flex items-center gap-1 ml-auto shrink-0">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <Text as="span" className="text-[11px] text-muted-foreground">
                    {formatDate(att.submitted_at)}
                  </Text>
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

export function LearnerAssessmentsContent() {
  const { user, token } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token || !user) return;
    fetch("/api/learner/assessments", {
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

  if (!data) return <AssessmentsSkeleton />;

  const { assessments } = data;

  if (assessments.length === 0) {
    return (
      <Card className="p-12 text-center">
        <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
        <Text as="h2" className="font-semibold mb-1">No assessments available</Text>
        <Text as="p" className="text-sm text-muted-foreground">
          Complete your course lessons to unlock assessments.
        </Text>
      </Card>
    );
  }

  const passed = assessments.filter((a) => a.has_passed).length;
  const failed = assessments.filter((a) => !a.has_passed && a.attempt_count > 0).length;
  const notAttempted = assessments.filter((a) => a.attempt_count === 0).length;

  const statCards = [
    { label: "Total", value: assessments.length, color: "text-indigo-600", bg: "bg-indigo-50 border-indigo-100" },
    { label: "Passed", value: passed, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-100" },
    { label: "Failed", value: failed, color: "text-red-500", bg: "bg-red-50 border-red-100" },
    { label: "Not Attempted", value: notAttempted, color: "text-amber-600", bg: "bg-amber-50 border-amber-100" },
  ];

  return (
    <Box className="space-y-5">
      <Box className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statCards.map((s) => (
          <Card key={s.label} className={s.bg}>
            <CardContent className="p-4 text-center">
              <Text as="p" className={`text-3xl font-bold ${s.color}`}>{s.value}</Text>
              <Text as="p" className="text-xs text-muted-foreground mt-0.5">{s.label}</Text>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Box className="space-y-3">
        {assessments.map((a) => (
          <AssessmentCard key={a.id} assessment={a} />
        ))}
      </Box>
    </Box>
  );
}
