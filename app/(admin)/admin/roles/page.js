import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { AdminRolesContent } from "@/components/admin/admin-roles-content";

export default function AdminRolesPage() {
  return (
    <Box className="space-y-5">
      <Box>
        <Text as="h1" className="text-2xl font-bold">Roles & Permissions</Text>
        <Text as="p" className="text-muted-foreground text-xs mt-0.5">
          Home &gt; <Text as="span" className="text-blue-500">Roles & Permissions</Text>
        </Text>
      </Box>
      <AdminRolesContent />
    </Box>
  );
}
