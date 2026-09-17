import Box from "@/components/ui/box";
import { PageHeader } from "@/components/shared/page-header";
import { TenantDirectoryContent } from "@/components/platform/tenant-directory-content";

export default function PlatformTenantsPage() {
  return (
    <Box className="space-y-6">
      <PageHeader
        eyebrow="Platform · Accounts"
        title="Tenant"
        emphasis="directory"
        summary="Every customer account — who they are, what they signed, and when it renews."
      />
      <TenantDirectoryContent />
    </Box>
  );
}
