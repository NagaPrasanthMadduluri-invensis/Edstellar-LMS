"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, MessageSquare } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Box from "@/components/ui/box";
import Text from "@/components/ui/text";
import { categoryColor, categoryTint } from "@/lib/course-taxonomy";
import { fetchPendingSurveys } from "@/services/api/surveys-api";

/**
 * "Your feedback is wanted" — courses this learner has FINISHED and not yet
 * rated.
 *
 * Finished only, and that is the API's rule rather than a filter here: asking
 * somebody what they thought of training they are a fifth of the way through
 * is a question they cannot answer, and a panel full of those is one people
 * stop reading.
 *
 * It says, twice, that answering is optional — once in the subtitle and once
 * on the empty state. A prompt on a dashboard reads as a task, and this one
 * is not: nothing about a learner's record changes whether or not they fill
 * it in (§10.3.1.18).
 *
 * It RENDERS NOTHING when there is nothing pending. Unlike the panels beside
 * it, an empty "surveys" card is not information — the learner has no action
 * to take and no absence to explain, and a permanent empty box is how a
 * dashboard row becomes furniture.
 */
export function DashboardPendingSurveys({ limit = 3 }) {
  const [surveys, setSurveys] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchPendingSurveys()
      .then((d) => { if (!cancelled) setSurveys(d.surveys || []); })
      .catch(() => { if (!cancelled) setSurveys([]); });
    return () => { cancelled = true; };
  }, []);

  // Null while loading and empty when there is nothing — both render nothing,
  // so the row below never jumps as the fetch lands.
  if (!surveys || surveys.length === 0) return null;

  const shown = surveys.slice(0, limit);

  return (
    <Card className="gap-0 p-5">
      <Box className="flex items-center justify-between mb-1">
        <Box className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-accent-blue" />
          <Text as="h3" className="text-base font-semibold">Your feedback is wanted</Text>
        </Box>
        <Text as="span" className="text-xs text-muted-foreground">
          {surveys.length} course{surveys.length === 1 ? "" : "s"}
        </Text>
      </Box>
      <Text as="p" className="text-xs text-muted-foreground mb-4">
        You finished these. Telling us how they went takes a minute and is
        entirely optional — it does not affect your progress or certificates.
      </Text>

      <Box className="space-y-2">
        {shown.map((s) => (
          <Box
            key={s.course_id}
            className="flex items-center gap-3 rounded-lg border border-border bg-paper-warm px-3 py-2.5"
          >
            <Box className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white">
              <CheckCircle2 className="h-4 w-4 text-success" />
            </Box>
            <Box className="min-w-0 flex-1">
              <Text as="p" className="truncate text-sm font-medium leading-snug">
                {s.course_name}
              </Text>
              <Box className="mt-1 flex flex-wrap items-center gap-1.5">
                {s.category && (
                  <Text
                    as="span"
                    className="px-1.5 py-0.5 text-[10px] font-bold"
                    style={{
                      background: categoryTint(s.category),
                      color: categoryColor(s.category),
                    }}
                  >
                    {s.category}
                  </Text>
                )}
                <Text as="span" className="text-[11px] text-muted-foreground">
                  {s.question_count} question{s.question_count === 1 ? "" : "s"}
                </Text>
              </Box>
            </Box>
            {/* The form lives on the course page, under the assessments —
                there is no separate survey page, so this is a link to where
                the control already is rather than a second way in. */}
            <Link href={`/my-courses/${s.course_id}`} className="shrink-0">
              <Button size="sm" variant="outline" className="h-8 cursor-pointer text-xs">
                Give feedback <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </Link>
          </Box>
        ))}
      </Box>

      {surveys.length > shown.length && (
        <Text as="p" className="mt-2 text-[11px] text-muted-foreground">
          and {surveys.length - shown.length} more in My Courses
        </Text>
      )}
    </Card>
  );
}
