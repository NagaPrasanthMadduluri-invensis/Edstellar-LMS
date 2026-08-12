import Box from "@/components/ui/box";
import { PageHeader } from "@/components/shared/page-header";
import { TeamLearningContent } from "@/components/learner/team-learning-content";

export default function TeamLearningPage() {
  return (
    <Box className="space-y-6">
      <PageHeader
        eyebrow="My team"
        title="Team"
        emphasis="learning"
        summary="How your direct reports are progressing."
      />
      <TeamLearningContent />
    </Box>
  );
}
