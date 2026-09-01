import Box from "@/components/ui/box";
import { PageHeader } from "@/components/shared/page-header";
import { PlatformOrganizationsContent } from "@/components/platform/platform-organizations-content";

export default function PlatformOrganizationsPage() {
  return (
    <Box className="space-y-6">
      <PageHeader
        eyebrow="Platform · Tenants"
        title="Every"
        emphasis="organisation"
        summary="Every tenant on Edstellar, with its own learners, courses and activity."
      />
      <PlatformOrganizationsContent />
    </Box>
  );
}
