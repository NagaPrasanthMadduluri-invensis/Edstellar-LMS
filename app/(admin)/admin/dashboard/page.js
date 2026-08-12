import Box from "@/components/ui/box";
import { PageHeader } from "@/components/shared/page-header";
import { AdminDashboardContent } from "@/components/admin/admin-dashboard-content";

export default function AdminDashboardPage() {
  return (
    <Box className="space-y-6">
      <PageHeader
        eyebrow="Admin · Overview"
        title="Your organisation,"
        emphasis="at a glance"
        summary="Completion, activity and assessment performance across every learner."
      />
      <AdminDashboardContent />
    </Box>
  );
}
