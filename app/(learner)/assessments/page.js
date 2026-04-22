import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { LearnerAssessmentsContent } from "@/components/learner/learner-assessments-content";

export default function AssessmentsPage() {
  return (
    <Box className="space-y-5">
      <Box>
        <Text as="h1" className="text-2xl">Assessments</Text>
        <Text as="p" className="text-muted-foreground text-xs mt-0.5">
          Home &gt; <Text as="span" className="text-indigo-500">Assessments</Text>
        </Text>
      </Box>
      <LearnerAssessmentsContent />
    </Box>
  );
}
