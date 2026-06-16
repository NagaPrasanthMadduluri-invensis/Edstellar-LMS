import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { LearningHoursContent } from "@/components/learner/learning-hours-content";

export default function LearningHoursPage() {
  return (
    <Box className="space-y-5">
      <Box>
        <Text as="p" className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase">
          Your Learning Hours Summary
        </Text>
        <Text as="p" className="text-muted-foreground text-xs mt-0.5">
          Home &gt; <Text as="span" className="text-indigo-500">Learning Hours</Text>
        </Text>
      </Box>
      <LearningHoursContent />
    </Box>
  );
}
