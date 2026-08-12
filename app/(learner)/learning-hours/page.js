import Box from "@/components/ui/box";
import { PageHeader } from "@/components/shared/page-header";
import { LearningHoursContent } from "@/components/learner/learning-hours-content";

export default function LearningHoursPage() {
  return (
    <Box className="space-y-6">
      <PageHeader
        eyebrow="My progress"
        title="Learning"
        emphasis="hours"
        summary="Time you have invested this month, measured against your goal."
      />
      <LearningHoursContent />
    </Box>
  );
}
