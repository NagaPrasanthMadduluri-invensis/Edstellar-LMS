import Box from "@/components/ui/box";
import { PageHeader } from "@/components/shared/page-header";
import { CertificationsContent } from "@/components/learner/certifications-content";
import { ExternalCertifications } from "@/components/learner/external-certifications";

export default function CertificationsPage() {
  return (
    <Box className="space-y-6">
      <PageHeader
        eyebrow="My achievements"
        title="My"
        emphasis="certificates"
        summary="Every course you have completed, verified and ready to share."
      />
      <CertificationsContent />
      {/* Certifications earned ELSEWHERE, under the ones earned here. They
          are a different kind of thing — a claim awaiting two approvals
          rather than a document this product issued — so they get their own
          heading rather than being mixed into the grid above. */}
      <ExternalCertifications />
    </Box>
  );
}
