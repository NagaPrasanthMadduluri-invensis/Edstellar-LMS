import Box from "@/components/ui/box";
import { PageHeader } from "@/components/shared/page-header";
import { CertificatesTable } from "@/components/admin/certificates-table";
import { ExternalCertificationApprovals } from "@/components/admin/external-certification-approvals";
import { CertificateBranding } from "@/components/admin/certificate-branding";

export default function AdminCertificatesPage() {
  return (
    <Box className="space-y-6">
      <PageHeader
        eyebrow="Admin · Analytics"
        title="Issued"
        emphasis="certificates"
        summary="Every certificate earned across the organisation. Revoke or reinstate as needed."
      />
      {/* The queue ABOVE the table: it is the only thing on this page that
          needs somebody to act today, and it renders nothing when empty. */}
      <ExternalCertificationApprovals />
      {/* Branding sits ABOVE the table but below the approvals queue: it is
          configuration rather than work, so it must not outrank the thing
          waiting on somebody today — and it belongs on this page because
          this is where an admin is already looking at certificates. */}
      <CertificateBranding />
      <CertificatesTable />
    </Box>
  );
}
