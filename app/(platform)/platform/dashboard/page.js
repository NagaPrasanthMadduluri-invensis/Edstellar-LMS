import Box from "@/components/ui/box";
import { PageHeader } from "@/components/shared/page-header";
import { PlatformOverviewContent } from "@/components/platform/platform-overview-content";

export default function PlatformOverviewPage() {
  return (
    <Box className="space-y-6">
      <PageHeader
        eyebrow="Platform"
        title="Platform"
        emphasis="overview"
        summary="What needs a decision today, what has been invoiced, and how every tenant is doing."
      />
      <PlatformOverviewContent />
    </Box>
  );
}
