import Box from "@/components/ui/box";
import { PageHeader } from "@/components/shared/page-header";
import { AdminDepartmentsContent } from "@/components/admin/admin-departments-content";

export default function AdminDepartmentsPage() {
  return (
    <Box className="space-y-6">
      <PageHeader
        eyebrow="Admin · Analytics"
        title="Department"
        emphasis="performance"
        summary="Compare completion and scores across teams."
      />
      <AdminDepartmentsContent />
    </Box>
  );
}
