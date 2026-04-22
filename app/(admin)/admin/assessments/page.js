import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { AdminAssessmentsStandaloneContent } from "@/components/admin/admin-assessments-standalone-content";

export default function AdminAssessmentsPage() {
  return (
    <Box className="space-y-5">
      <Box>
        <Text as="h1" className="text-2xl font-bold">Assessment Builder</Text>
        <Text as="p" className="text-muted-foreground text-xs mt-0.5">
          Admin &gt; <Text as="span" className="text-indigo-500">Assessments</Text>
        </Text>
      </Box>
      <AdminAssessmentsStandaloneContent />
    </Box>
  );
}
