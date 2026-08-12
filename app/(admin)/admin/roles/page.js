import Box from "@/components/ui/box";
import { PageHeader } from "@/components/shared/page-header";
import { AdminRolesContent } from "@/components/admin/admin-roles-content";

export default function AdminRolesPage() {
  return (
    <Box className="space-y-6">
      <PageHeader
        eyebrow="Admin · User management"
        title="Roles and"
        emphasis="permissions"
        summary="Control what each role can see and do."
      />
      <AdminRolesContent />
    </Box>
  );
}
