import Box from "@/components/ui/box";
import { PageHeader } from "@/components/shared/page-header";
import { CertificatesTable } from "@/components/admin/certificates-table";

export default function AdminCertificatesPage() {
  return (
    <Box className="space-y-6">
      <PageHeader
        eyebrow="Admin · Analytics"
        title="Issued"
        emphasis="certificates"
        summary="Every certificate earned across the organisation. Revoke or reinstate as needed."
      />
      <CertificatesTable />
    </Box>
  );
}
