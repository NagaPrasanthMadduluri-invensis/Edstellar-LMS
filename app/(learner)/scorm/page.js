import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { LearnerScormContent } from "@/components/learner/learner-scorm-content";

export default function LearnerScormPage() {
  return (
    <Box className="space-y-5">
      <Box>
        <Text as="h1" className="text-2xl font-bold">SCORM Courses</Text>
        <Text as="p" className="text-muted-foreground text-xs mt-0.5">
          My Learnings &gt;{" "}
          <Text as="span" className="text-indigo-500">SCORM Courses</Text>
        </Text>
      </Box>
      <LearnerScormContent />
    </Box>
  );
}
