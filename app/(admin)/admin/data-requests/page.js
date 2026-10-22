import Box from "@/components/ui/box";
import { PageHeader } from "@/components/shared/page-header";
import { DataRequestsContent } from "@/components/admin/data-requests-content";

export default function AdminDataRequestsPage() {
  return (
    <Box className="space-y-6">
      <PageHeader
        eyebrow="Privacy"
        title="Data"
        emphasis="requests"
        summary="Correction and deletion requests from people in your organization. Review each one and record the outcome."
      />
      <DataRequestsContent />
    </Box>
  );
}
