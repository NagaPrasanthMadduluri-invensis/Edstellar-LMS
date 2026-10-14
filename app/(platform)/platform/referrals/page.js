import Box from "@/components/ui/box";
import { PageHeader } from "@/components/shared/page-header";
import { PlatformReferralsContent } from "@/components/platform/platform-referrals-content";

export default function PlatformReferralsPage() {
  return (
    <Box className="space-y-6">
      <PageHeader
        eyebrow="Platform · Edstellar"
        title="Customer"
        emphasis="referrals"
        summary="Every tenant's referral in one queue. Work a prospect through the pipeline, and mark it converted once they become a customer to reward the referrer."
      />
      <PlatformReferralsContent />
    </Box>
  );
}
