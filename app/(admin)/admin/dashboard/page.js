import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { AdminDashboardContent } from "@/components/admin/admin-dashboard-content";

export default function AdminDashboardPage() {
  return (
    <Box className="space-y-5">
      <Box>
        <Text as="h1" className="text-2xl font-bold">Admin Dashboard</Text>
        <Text as="p" className="text-muted-foreground text-xs mt-0.5">
          Home &gt; <Text as="span" className="text-indigo-500">Dashboard</Text>
        </Text>
      </Box>
      <AdminDashboardContent />
    </Box>
  );
}
