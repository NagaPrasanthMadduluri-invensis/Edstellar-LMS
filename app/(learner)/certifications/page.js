import Box from "@/components/ui/box";
import { PageHeader } from "@/components/shared/page-header";
import { CertificationsContent } from "@/components/learner/certifications-content";

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
    </Box>
  );
}
