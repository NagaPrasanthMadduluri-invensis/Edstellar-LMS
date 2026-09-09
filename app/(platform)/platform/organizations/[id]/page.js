import Box from "@/components/ui/box";
import { PageHeader } from "@/components/shared/page-header";
import { OrganizationDetailContent } from "@/components/platform/organization-detail-content";

export default async function PlatformOrganizationDetailPage({ params }) {
  const { id } = await params;

  return (
    <Box className="space-y-6">
      <PageHeader
        eyebrow="Platform · Tenants"
        title="Organisation"
        emphasis="detail"
        summary="Activity and status for this tenant, the roles it has defined, and adding a user on any of them."
      />
      <OrganizationDetailContent organizationId={id} />
    </Box>
  );
}
