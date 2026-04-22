import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { AdminReportsContent } from "@/components/admin/admin-reports-content";

export default function AdminReportsPage() {
  return (
    <Box className="space-y-5">
      <Box>
        <Text as="h1" className="text-2xl font-bold">Reports & Analytics</Text>
        <Text as="p" className="text-muted-foreground text-xs mt-0.5">
          Admin &gt; <Text as="span" className="text-indigo-500">Reports</Text>
        </Text>
      </Box>
      <AdminReportsContent />
    </Box>
  );
}
