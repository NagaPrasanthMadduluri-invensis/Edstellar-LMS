import { Suspense } from "react";

import Box from "@/components/ui/box";
import { PageHeader } from "@/components/shared/page-header";
import { CourseLibrary } from "@/components/admin/course-library";

/**
 * Server Component — a static shell (TASTE §2.3). The library, its filters and
 * every card live in the client component, which fetches after mount.
 */
export default function AdminCoursesPage() {
  return (
    <Box className="space-y-6">
      <PageHeader
        eyebrow="Admin · Course management"
        title="Course"
        emphasis="library"
        summary="Build courses from modules and lessons, categorise them, then publish them to learners."
      />
      {/* The library reads `?edit=<id>` to reopen a course's editor after a
          navigation, and `useSearchParams` opts a client component out of
          static rendering unless it sits behind a boundary. */}
      <Suspense fallback={null}>
        <CourseLibrary />
      </Suspense>
    </Box>
  );
}
