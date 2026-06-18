import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { LearnerTrainingCalendar } from "@/components/learner/learner-training-calendar";

export default function TrainingCalendarPage() {
  return (
    <Box className="space-y-5">
      <Box>
        <Text as="h1" className="text-2xl font-bold">Training Calendar</Text>
        <Text as="p" className="text-muted-foreground text-xs mt-0.5">
          Home &gt; My Learnings &gt; <Text as="span" className="text-indigo-500">Training Calendar</Text>
        </Text>
      </Box>
      <LearnerTrainingCalendar />
    </Box>
  );
}
