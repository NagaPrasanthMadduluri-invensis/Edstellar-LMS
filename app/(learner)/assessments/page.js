import Box from "@/components/ui/box";
import { PageHeader } from "@/components/shared/page-header";
import { LearnerAssessmentsContent } from "@/components/learner/learner-assessments-content";

export default function AssessmentsPage() {
  return (
    <Box className="space-y-6">
      <PageHeader
        eyebrow="My learning"
        title="My"
        emphasis="assessments"
        summary="Quizzes unlocked by finishing a course."
      />
      <LearnerAssessmentsContent />
    </Box>
  );
}
