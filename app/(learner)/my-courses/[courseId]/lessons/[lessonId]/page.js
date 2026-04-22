import Box from "@/components/ui/box";
import { LessonContent } from "@/components/learner/lesson-content";

export default async function LessonPage({ params }) {
  const { courseId, lessonId } = await params;

  return (
    <Box className="space-y-5">
      <LessonContent courseId={courseId} lessonId={lessonId} />
    </Box>
  );
}
