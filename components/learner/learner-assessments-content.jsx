"use client";

import { apiClient } from "@/lib/api-client";
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
            ? "bg-navy"
            : attempt_count > 0
              ? "bg-error"
              : is_unlocked
                ? "bg-navy"
                : "bg-paper-cream"
        }`}
      />
      <CardContent className="p-4">
        <Box className="flex items-start gap-3 flex-wrap">
          <Box
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              !is_unlocked ? "bg-paper-cream" : has_passed ? "bg-paper-cream" : "bg-paper-cream"
            }`}
          >
            {!is_unlocked ? (
              <Lock className="h-5 w-5 text-ink/45" />
            ) : has_passed ? (
              <Trophy className="h-5 w-5 text-navy" />
            ) : (
              <ClipboardList className="h-5 w-5 text-navy" />
            )}
          </Box>

          <Box className="min-w-0 flex-1 basis-[12rem]">
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
                      has_passed ? "bg-paper-cream text-navy" : "bg-error/10 text-error"
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
                <Badge variant="secondary" className="text-[10px] bg-paper-cream text-ink/70">
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
                      ? "bg-navy hover:bg-navy-soft text-paper"
                      : "bg-navy hover:bg-navy-soft text-paper"
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
                  <CheckCircle2 className="h-3.5 w-3.5 text-navy shrink-0" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 text-error shrink-0" />
                )}
                <Badge
                  variant="secondary"
                  className={`text-[10px] ${
                    att.is_passed
                      ? "bg-paper-cream text-navy"
                      : "bg-error/10 text-error"
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
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return;
    apiClient("/api/learner/assessments")
      .then(setData)
      .catch((e) => setError(e.message));
  }, [user]);

  if (error) {
    return (
      <Card className="p-8 text-center">
        <Text as="p" className="text-error text-sm">{error}</Text>
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
    { label: "Total", value: assessments.length, color: "text-navy", bg: "bg-paper-cream border-navy/20" },
    { label: "Passed", value: passed, color: "text-navy", bg: "bg-paper-cream border-navy/20" },
    { label: "Failed", value: failed, color: "text-error", bg: "bg-error/10 border-error/30" },
    { label: "Not Attempted", value: notAttempted, color: "text-ink/70", bg: "bg-paper-cream border-border" },
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
