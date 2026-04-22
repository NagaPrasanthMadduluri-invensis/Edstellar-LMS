import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { AdminEmployeesContent } from "@/components/admin/admin-employees-content";

export default function AdminUsersPage() {
  return (
    <Box className="space-y-5">
      <Box>
        <Text as="h1" className="text-2xl font-bold">All Employees</Text>
        <Text as="p" className="text-muted-foreground text-xs mt-0.5">
          Admin &gt; <Text as="span" className="text-indigo-500">User Management</Text>
        </Text>
      </Box>
      <AdminEmployeesContent />
    </Box>
  );
}
