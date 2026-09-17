import Box from "@/components/ui/box";
import { PageHeader } from "@/components/shared/page-header";
import { PlatformServicesContent } from "@/components/platform/platform-services-content";

export default function PlatformServicesPage() {
  return (
    <Box className="space-y-6">
      <PageHeader
        eyebrow="Platform · Edstellar"
        title="Service"
        emphasis="requests"
        summary="Every tenant's service request in one queue. Move one along and the note you write is what their admin reads back."
      />
      <PlatformServicesContent />
    </Box>
  );
}
