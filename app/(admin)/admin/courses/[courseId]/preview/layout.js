import Box from "@/components/ui/box";
import { CoursePreviewBanner } from "@/components/admin/course-preview-banner";

export default async function CoursePreviewLayout({ children, params }) {
  const { courseId } = await params;

  return (
    <Box className="space-y-5">
      <CoursePreviewBanner courseId={courseId} />
      {children}
    </Box>
  );
}
