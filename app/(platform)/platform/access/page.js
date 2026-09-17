import Box from "@/components/ui/box";
import { PageHeader } from "@/components/shared/page-header";
import { AccessControlContent } from "@/components/platform/access-control-content";

export default function PlatformAccessPage() {
  return (
    <Box className="space-y-6">
      <PageHeader
        eyebrow="Platform · Security"
        title="Access"
        emphasis="control"
        summary="Who can act on a tenant, at what level, and when they were last seen."
      />
      <AccessControlContent />
    </Box>
  );
}
