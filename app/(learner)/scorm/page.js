import Box from "@/components/ui/box";
import { PageHeader } from "@/components/shared/page-header";
import { LearnerScormContent } from "@/components/learner/learner-scorm-content";

export default function LearnerScormPage() {
  return (
    <Box className="space-y-6">
      <PageHeader
        eyebrow="My learning"
        title="Interactive"
        emphasis="courses"
        summary="Self-paced e-learning assigned to you."
      />
      <LearnerScormContent />
    </Box>
  );
}
