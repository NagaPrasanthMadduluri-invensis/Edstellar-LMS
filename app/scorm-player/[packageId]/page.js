import { ScormPlayerClient } from "@/components/scorm/scorm-player-client";

/**
 * The player is a standalone window keyed by the package id. When it is opened
 * from a COURSE LESSON the launcher also passes the course and the next lesson
 * in the query string, so the player can offer "Next Lesson" on completion
 * (BACKEND_STRUCTURE §10.9 — the player itself has no course context otherwise).
 * Reading them here, server-side, keeps the client component off `useSearchParams`
 * and its Suspense requirement. When opened from the standalone SCORM library
 * there is no "next", so both are undefined and the footer shows Exit only.
 */
export default async function ScormPlayerPage({ params, searchParams }) {
  const { packageId } = await params;
  const sp = (await searchParams) ?? {};
  return (
    <ScormPlayerClient
      packageId={packageId}
      courseId={sp.courseId ?? null}
      nextLessonId={sp.nextLessonId ?? null}
    />
  );
}
