import Box from "@/components/ui/box";
import { PageHeader } from "@/components/shared/page-header";
import { MyCoursesContent } from "@/components/learner/my-courses-content";

export default function MyCoursesPage() {
  return (
    <Box className="space-y-6">
      <PageHeader
        eyebrow="My learning"
        title="My"
        emphasis="courses"
        summary="Everything assigned to you, and how far you have come."
      />
      <MyCoursesContent />
    </Box>
  );
}
