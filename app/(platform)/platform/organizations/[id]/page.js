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
        summary="Activity, status and admin access for this tenant."
      />
      <OrganizationDetailContent organizationId={id} />
    </Box>
  );
}
