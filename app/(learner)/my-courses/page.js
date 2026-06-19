import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { MyCoursesContent } from "@/components/learner/my-courses-content";

export default function MyCoursesPage() {
  return (
    <Box className="space-y-5">
      <Box>
        <Text as="h1" className="text-2xl font-bold">My Courses</Text>
        <Text as="p" className="text-sm text-muted-foreground mt-1">Track your assigned courses and learning progress</Text>
      </Box>
      <MyCoursesContent />
    </Box>
  );
}
