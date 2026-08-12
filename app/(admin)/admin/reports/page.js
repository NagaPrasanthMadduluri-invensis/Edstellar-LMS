import Box from "@/components/ui/box";
import { PageHeader } from "@/components/shared/page-header";
import { AdminReportsContent } from "@/components/admin/admin-reports-content";

export default function AdminReportsPage() {
  return (
    <Box className="space-y-6">
      <PageHeader
        eyebrow="Admin · Analytics"
        title="Reports and"
        emphasis="analytics"
        summary="Per-learner progress, scores and completion. Export to a spreadsheet."
      />
      <AdminReportsContent />
    </Box>
  );
}
