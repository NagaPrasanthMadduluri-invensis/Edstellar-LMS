import Box from "@/components/ui/box";
import { AssessmentContent } from "@/components/learner/assessment-content";

export default async function AssessmentPage({ params }) {
  const { courseId, assessmentId } = await params;
  return (
    <Box className="space-y-5">
      <AssessmentContent courseId={courseId} assessmentId={assessmentId} />
    </Box>
  );
}
