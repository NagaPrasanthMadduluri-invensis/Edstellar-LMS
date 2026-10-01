"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2, Clock, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import Box from "@/components/ui/box";
import Text from "@/components/ui/text";
import { CourseArt } from "@/components/shared/course-art";
import { categoryColor, categoryTint } from "@/lib/course-taxonomy";
import { fetchCatalogue } from "@/services/api/catalogue-api";

/**
 * "Recommended courses" — the first six COURSES in the Course Catalogue.
 *
 * NOT a recommendation engine, and the subtitle says so rather than letting
 * the heading imply one: these are the courses the organization has opened
 * to everyone, in the catalogue's own order. The word "Recommended" is fine
 * over "what your organization has opened"; it would not be fine over a
 * claim that they were chosen for this learner, so the page does not make
 * one.
 *
 * Courses only. The catalogue also carries open SESSIONS, but a session
 * under a heading reading "Courses" is the heading lying about its contents,
 * and the learner already has a sessions panel higher up the page.
 *
 * Courses the learner ALREADY HAS are shown rather than filtered out, and
 * labelled "Already yours". Filtering them would be the more obvious choice
 * and it is wrong here: a tenant that has opened three courses to a learner
 * who holds two would see a "Recommended courses" heading over a single
 * card, or — when they hold all three — over nothing at all, with no way to
 * tell that from a failure. Showing the catalogue as it is, with the card
 * telling the truth about each row, is steadier.
 *
 * It reads `GET /api/learner/catalogue`, the same call the catalogue page
 * makes, so nothing here can offer a course that page would not.
 */
export function DashboardRecommended({ limit = 6 }) {
  const [courses, setCourses] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchCatalogue()
      .then((d) => { if (!cancelled) setCourses(d.courses ?? []); })
      // Silent: one panel of six failing must not put an error across the
      // whole dashboard. The section simply does not render.
      .catch(() => { if (!cancelled) setCourses([]); });
    return () => { cancelled = true; };
  }, []);

  if (!courses || courses.length === 0) return null;

  return (
    <Box className="space-y-3">
      <Box className="flex flex-wrap items-center justify-between gap-2">
        <Box>
          <Text as="h3" className="text-base font-semibold">Recommended Courses</Text>
          <Text as="p" className="text-xs text-muted-foreground">
            Open to everyone at your organization — add one and it moves
            straight into My Courses.
          </Text>
        </Box>
        <Link href="/catalogue">
          <Button variant="outline" size="sm" className="cursor-pointer text-xs">
            Explore more courses <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </Link>
      </Box>

      <Box className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {courses.slice(0, limit).map((c) => (
          <RecommendedCard key={c.id} course={c} />
        ))}
      </Box>
    </Box>
  );
}

function RecommendedCard({ course }) {
  const colour = categoryColor(course.category);
  // Already theirs → the course itself. Not yet → the catalogue, which is
  // the only place the Add button lives. A card that landed somewhere with
  // nothing to press would be the §10.3.1.2 failure one click along.
  const href = course.is_enrolled ? `/my-courses/${course.id}` : "/catalogue";

  return (
    <Link href={href} className="block">
      <Box className="flex h-full flex-col border border-line bg-surface transition-colors hover:border-line-strong">
        <Box
          className="h-[3px] w-full"
          style={{ backgroundColor: course.category ? colour : "var(--spectra-line)" }}
        />
        <Box className="relative h-24 w-full overflow-hidden border-b border-line">
          <CourseArt
            thumbnailUrl={course.thumbnail_url}
            contentType="MIXED"
            alt=""
            className="h-full w-full"
          />
        </Box>

        <Box className="flex flex-1 flex-col p-3">
          <Box className="flex items-center justify-between gap-2">
            <Text
              as="p"
              className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-3"
            >
              Course
            </Text>
            {course.category && (
              <Text
                as="span"
                className="shrink-0 px-1.5 py-0.5 text-[10px] font-bold"
                style={{ background: categoryTint(course.category), color: colour }}
              >
                {course.category}
              </Text>
            )}
          </Box>

          <Text as="h4" className="mt-1 line-clamp-2 min-h-[2.2rem] text-[13px] font-bold text-ink">
            {course.name}
          </Text>

          <Box className="mt-auto flex items-center gap-3 border-t border-line pt-2 text-[11px] text-text-2">
            <Text as="span" className="flex items-center gap-1">
              <BookOpen className="size-3.5 text-text-3" />
              {course.lessons_count} lesson{course.lessons_count === 1 ? "" : "s"}
            </Text>
            {course.duration_minutes > 0 && (
              <Text as="span" className="flex items-center gap-1">
                <Clock className="size-3.5 text-text-3" />
                {formatMinutes(course.duration_minutes)}
              </Text>
            )}
            {course.is_enrolled ? (
              <Text as="span" className="ml-auto flex items-center gap-1 font-semibold text-success">
                <CheckCircle2 className="size-3.5" /> Already yours
              </Text>
            ) : (
              <Text as="span" className="ml-auto flex items-center gap-1 font-semibold text-accent-blue">
                <Plus className="size-3.5" /> Add
              </Text>
            )}
          </Box>
        </Box>
      </Box>
    </Link>
  );
}

function formatMinutes(total) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
