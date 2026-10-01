import Box from "@/components/ui/box";
import { PageHeader } from "@/components/shared/page-header";
import { LearningPathsContent } from "@/components/learner/learning-paths-content";

export default function LearningPathsPage() {
  return (
    <Box className="space-y-6">
      <PageHeader
        eyebrow="My learning"
        title="My learning"
        emphasis="paths"
        summary="Courses your L&D team has put in a deliberate order, and where you are along each one."
      />
      <LearningPathsContent />
    </Box>
  );
}
