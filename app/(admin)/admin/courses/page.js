import Box from "@/components/ui/box";
import { PageHeader } from "@/components/shared/page-header";
import { CourseSelector } from "@/components/admin/course-selector";

export default function AdminCoursesPage() {
  return (
    <Box className="space-y-6">
      <PageHeader
        eyebrow="Admin · Course management"
        title="Content"
        emphasis="library"
        summary="Build courses from modules and lessons, then publish them to learners."
      />
      <CourseSelector />
    </Box>
  );
}
