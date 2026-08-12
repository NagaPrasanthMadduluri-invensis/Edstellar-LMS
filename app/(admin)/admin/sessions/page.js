import Box from "@/components/ui/box";
import { PageHeader } from "@/components/shared/page-header";
import { AdminSessionsContent } from "@/components/admin/admin-sessions-content";

export default function AdminSessionsPage() {
  return (
    <Box className="space-y-6">
      <PageHeader
        eyebrow="Admin · Course management"
        title="Sessions and"
        emphasis="attendance"
        summary="Schedule training, manage rosters and record who attended."
      />
      <AdminSessionsContent />
    </Box>
  );
}
