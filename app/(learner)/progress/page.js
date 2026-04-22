import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { MyProgressContent } from "@/components/learner/my-progress-content";

export default function ProgressPage() {
  return (
    <Box className="space-y-5">
      <Box>
        <Text as="h1" className="text-2xl">My Progress</Text>
        <Text as="p" className="text-muted-foreground text-xs mt-0.5">
          Home &gt; <Text as="span" className="text-indigo-500">My Progress</Text>
        </Text>
      </Box>
      <MyProgressContent />
    </Box>
  );
}
