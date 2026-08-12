import Box from "@/components/ui/box";
import { PageHeader } from "@/components/shared/page-header";
import { AdminCourseTabsContent } from "@/components/admin/admin-course-tabs-content";

export default async function AdminCourseDetailPage({ params }) {
  const { courseId } = await params;

  return (
    <Box className="space-y-6">
      <PageHeader
        eyebrow="Admin · Content library"
        title="Manage this"
        emphasis="course"
        summary="Modules, lessons, assessments and the learners enrolled on it."
      />
      <AdminCourseTabsContent courseId={courseId} />
    </Box>
  );
}
