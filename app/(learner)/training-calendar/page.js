import Box from "@/components/ui/box";
import { PageHeader } from "@/components/shared/page-header";
import { LearnerTrainingCalendar } from "@/components/learner/learner-training-calendar";

export default function TrainingCalendarPage() {
  return (
    <Box className="space-y-6">
      <PageHeader
        eyebrow="My learning"
        title="Training"
        emphasis="calendar"
        summary="Sessions you are enrolled in, and how you attended."
      />
      <LearnerTrainingCalendar />
    </Box>
  );
}
