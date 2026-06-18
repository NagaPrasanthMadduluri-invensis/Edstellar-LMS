import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { TeamLearningContent } from "@/components/learner/team-learning-content";

export default function TeamLearningPage() {
  return (
    <Box className="space-y-5">
      <Box>
        <Text as="h1" className="text-2xl font-bold">Team Learning</Text>
        <Text as="p" className="text-muted-foreground text-xs mt-0.5">
          My Team &gt; <Text as="span" className="text-indigo-500">Team Learning</Text>
        </Text>
      </Box>
      <TeamLearningContent />
    </Box>
  );
}
