import Box from "@/components/ui/box";
import { PageHeader } from "@/components/shared/page-header";
import { AdminEmployeesContent } from "@/components/admin/admin-employees-content";

export default function AdminUsersPage() {
  return (
    <Box className="space-y-6">
      <PageHeader
        eyebrow="Admin · User management"
        title="Manage"
        emphasis="your people"
        summary="Add learners one by one, or import a whole team from a spreadsheet."
      />
      <AdminEmployeesContent />
    </Box>
  );
}
