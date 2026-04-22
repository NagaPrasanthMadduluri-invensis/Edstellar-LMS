import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { AdminDepartmentsContent } from "@/components/admin/admin-departments-content";

export default function AdminDepartmentsPage() {
  return (
    <Box className="space-y-5">
      <Box>
        <Text as="h1" className="text-2xl font-bold">Departments</Text>
        <Text as="p" className="text-muted-foreground text-xs mt-0.5">
          Admin &gt; <Text as="span" className="text-indigo-500">Departments</Text>
        </Text>
      </Box>
      <AdminDepartmentsContent />
    </Box>
  );
}
