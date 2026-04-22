import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { MyCoursesContent } from "@/components/learner/my-courses-content";

export default function MyCoursesPage() {
  return (
    <Box className="space-y-5">
      <Box>
        <Text as="h1" className="text-2xl">My Courses</Text>
        <Text as="p" className="text-muted-foreground text-xs mt-0.5">
          Home &gt; <Text as="span" className="text-indigo-500">My Courses</Text>
        </Text>
      </Box>
      <MyCoursesContent />
    </Box>
  );
}
