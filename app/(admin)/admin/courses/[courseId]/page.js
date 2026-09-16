import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import Box from "@/components/ui/box";
import { PageHeader } from "@/components/shared/page-header";
import { CourseManager } from "@/components/admin/course-manager";

export default async function AdminCourseDetailPage({ params }) {
  const { courseId } = await params;

  return (
    <Box className="space-y-4">
      {/* Back first, above the title: the admin arrived from the library and
          that is where this returns them. */}
      <Link
        href="/admin/courses"
        className="inline-flex items-center gap-1.5 text-[12px] text-text-3 transition-colors hover:text-accent-blue"
      >
        <ArrowLeft className="size-3.5" />
        Course library
      </Link>
      <PageHeader
        eyebrow="Admin · Course library"
        title="Manage"
        emphasis="course"
        summary="Modules, lessons and assessments for this course."
      />
      <CourseManager courseId={courseId} />
    </Box>
  );
}
