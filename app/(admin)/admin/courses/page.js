import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { CourseSelector } from "@/components/admin/course-selector";

export default function AdminCoursesPage() {
  return (
    <Box className="space-y-5">
      <Box>
        <Text as="h1" className="text-2xl">Courses</Text>
        <Text as="p" className="text-muted-foreground text-xs mt-0.5">
          Admin &gt; <Text as="span" className="text-indigo-500">Courses</Text>
        </Text>
      </Box>
      <CourseSelector />
    </Box>
  );
}
