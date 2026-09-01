import Box from "@/components/ui/box";
import { PageHeader } from "@/components/shared/page-header";
import { PlatformDashboardContent } from "@/components/platform/platform-dashboard-content";

export default function PlatformDashboardPage() {
  return (
    <Box className="space-y-6">
      <PageHeader
        eyebrow="Platform · Overview"
        title="Every organisation,"
        emphasis="one board"
        summary="Learners, courses and activity compared across every tenant on Edstellar."
      />
      <PlatformDashboardContent />
    </Box>
  );
}
