import Box from "@/components/ui/box";
import { PageHeader } from "@/components/shared/page-header";
import { AdminJourneysContent } from "@/components/admin/admin-journeys-content";

export default function AdminJourneysPage() {
  return (
    <Box className="space-y-6">
      <PageHeader
        eyebrow="Admin · Course management"
        title="Learning"
        emphasis="journeys"
        summary="Sequence courses into structured paths."
      />
      <AdminJourneysContent />
    </Box>
  );
}
