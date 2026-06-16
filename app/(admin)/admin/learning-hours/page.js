import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { AdminLearningHoursContent } from "@/components/admin/admin-learning-hours-content";

export default function AdminLearningHoursPage() {
  return (
    <Box className="space-y-5">
      <Box>
        <Text as="h1" className="text-2xl font-bold">Learning Hours</Text>
        <Text as="p" className="text-muted-foreground text-xs mt-0.5">
          Home &gt; <Text as="span" className="text-blue-500">Learning Hours</Text>
        </Text>
      </Box>
      <AdminLearningHoursContent />
    </Box>
  );
}
