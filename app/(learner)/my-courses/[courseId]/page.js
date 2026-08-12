import Box from "@/components/ui/box";
import Text from "@/components/ui/text";
import { CourseDetailContent } from "@/components/learner/course-detail-content";

export default async function CourseDetailPage({ params }) {
  const { courseId } = await params;

  return (
    <Box className="space-y-6">
      {/* The course title is rendered by the content component below, so this
          header stays a section marker and does not repeat it. */}
      <Text as="p" className="eyebrow">
        My learning · Course
      </Text>
      <CourseDetailContent courseId={courseId} />
    </Box>
  );
}
