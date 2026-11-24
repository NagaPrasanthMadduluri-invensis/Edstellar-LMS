"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Eye } from "lucide-react";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { backToCoursePath, courseStateLabel, previewEndpoints } from "@/lib/course-preview";

/**
 * The strip across every admin preview page. It sits in the preview layout, so
 * it stays mounted while the admin moves between the course, a lesson and an
 * assessment and the course state is fetched once.
 */
export function CoursePreviewBanner({ courseId }) {
  const [course, setCourse] = useState(null);

  useEffect(() => {
    apiClient(previewEndpoints.course(courseId))
      .then((d) => setCourse(d?.course ?? null))
      .catch(() => setCourse(null));
  }, [courseId]);

  const state = course ? courseStateLabel(course) : null;

  return (
    <Box
      role="status"
      className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-navy/20 bg-surface-3 px-4 py-2.5"
    >
      <Eye className="size-4 shrink-0 text-navy" />
      <Text as="p" className="min-w-0 flex-1 text-[13px] text-ink">
        <Text as="span" className="text-[length:inherit] font-semibold text-ink">Preview:</Text>{" "}
        you are seeing this course as a learner does. Nothing you do here is recorded.
      </Text>
      {state && (
        <Text
          as="span"
          data-testid="preview-course-state"
          className={cn(
            "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
            state === "Published" ? "chip-complete" : state === "Draft" ? "chip-warning" : "chip-idle",
          )}
        >
          {state}
        </Text>
      )}
      <Link href={backToCoursePath(courseId, true)} className="shrink-0">
        <Button variant="outline" size="sm" className="gap-1.5 bg-background">
          <ArrowLeft className="size-3.5" />
          Back to course editor
        </Button>
      </Link>
    </Box>
  );
}
