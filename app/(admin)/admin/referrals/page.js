import Box from "@/components/ui/box";
import { PageHeader } from "@/components/shared/page-header";
import { ReferralsContent } from "@/components/admin/referrals-content";

export default function AdminReferralsPage() {
  return (
    <Box className="space-y-6">
      <PageHeader
        eyebrow="Rewards"
        title="Refer a"
        emphasis="company"
        summary="Introduce a company to Spectra LMS by Edstellar. Refer 2 that become customers for 15% off your subscription, 3 for 25%."
      />
      <ReferralsContent />
    </Box>
  );
}
