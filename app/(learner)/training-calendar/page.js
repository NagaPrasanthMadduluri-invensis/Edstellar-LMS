import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { Card } from "@/components/ui/card";
import { CalendarDays } from "lucide-react";

export default function TrainingCalendarPage() {
  return (
    <Box className="space-y-5">
      <Box>
        <Text as="h1" className="text-2xl font-bold">Training Calendar</Text>
        <Text as="p" className="text-muted-foreground text-xs mt-0.5">
          Home &gt; My Learnings &gt; <Text as="span" className="text-indigo-500">Training Calendar</Text>
        </Text>
      </Box>
      <Card className="flex flex-col items-center justify-center py-24 gap-4">
        <Box className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center">
          <CalendarDays className="h-8 w-8 text-indigo-400" />
        </Box>
        <Box className="text-center">
          <Text as="h2" className="text-base font-semibold">Coming Soon</Text>
          <Text as="p" className="text-sm text-muted-foreground mt-1">
            Your scheduled training sessions and upcoming events will appear here.
          </Text>
        </Box>
      </Card>
    </Box>
  );
}
