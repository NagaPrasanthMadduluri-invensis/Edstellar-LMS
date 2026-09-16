import Box from "@/components/ui/box";
import { PageHeader } from "@/components/shared/page-header";
import { AdminReportsContent } from "@/components/admin/admin-reports-content";

/**
 * Server Component — a static shell (TASTE §2.3). The builder, its filters and
 * every result live in the client component, which fetches after mount.
 */
export default function AdminReportsPage() {
  return (
    <Box className="space-y-6">
      <PageHeader
        eyebrow="Admin · Reports"
        title="Build a"
        emphasis="report"
        summary="Report on one person, a whole group, or compare departments, locations, job levels and roles side by side."
      />
      <AdminReportsContent />
    </Box>
  );
}
