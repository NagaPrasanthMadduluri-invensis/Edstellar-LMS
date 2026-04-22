import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { AdminCourseTabsContent } from "@/components/admin/admin-course-tabs-content";

export default async function AdminCourseDetailPage({ params }) {
  const { courseId } = await params;

  return (
    <Box className="space-y-5">
      <Box>
        <Text as="h1" className="text-2xl font-bold">Manage Course</Text>
        <Text as="p" className="text-muted-foreground text-xs mt-0.5">
          Admin &gt; <Text as="span" className="text-indigo-500">Courses</Text> &gt; Course Detail
        </Text>
      </Box>
      <AdminCourseTabsContent courseId={courseId} />
    </Box>
  );
}
