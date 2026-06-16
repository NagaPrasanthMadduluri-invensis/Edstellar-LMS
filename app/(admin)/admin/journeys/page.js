import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { AdminJourneysContent } from "@/components/admin/admin-journeys-content";

export default function AdminJourneysPage() {
  return (
    <Box className="space-y-5">
      <Box>
        <Text as="h1" className="text-2xl font-bold">Learning Journeys</Text>
        <Text as="p" className="text-muted-foreground text-xs mt-0.5">
          Home &gt; <Text as="span" className="text-blue-500">Learning Journeys</Text>
        </Text>
      </Box>
      <AdminJourneysContent />
    </Box>
  );
}
