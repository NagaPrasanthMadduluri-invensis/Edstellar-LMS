import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { AdminAssignLearningContent } from "@/components/admin/admin-assign-learning-content";

export default function AdminAssignLearningPage() {
  return (
    <Box className="space-y-5">
      <Box>
        <Text as="h1" className="text-2xl font-bold">Assign Learning</Text>
        <Text as="p" className="text-muted-foreground text-xs mt-0.5">
          Admin &gt; <Text as="span" className="text-indigo-500">Assign Learning</Text>
        </Text>
      </Box>
      <AdminAssignLearningContent />
    </Box>
  );
}
