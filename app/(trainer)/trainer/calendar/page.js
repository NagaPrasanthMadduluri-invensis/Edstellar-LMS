import Box from "@/components/ui/box";
import { PageHeader } from "@/components/shared/page-header";
import { TrainerTrainingCalendar } from "@/components/trainer/trainer-training-calendar";

export default function TrainerCalendarPage() {
  return (
    <Box className="space-y-6">
      <PageHeader
        eyebrow="Trainer"
        title="Training"
        emphasis="calendar"
        summary="Every session assigned to you, by month. Click one to see the room, the roster and what you still owe on it."
      />
      <TrainerTrainingCalendar />
    </Box>
  );
}
