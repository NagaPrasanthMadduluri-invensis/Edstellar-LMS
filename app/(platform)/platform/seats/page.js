import Box from "@/components/ui/box";
import { PageHeader } from "@/components/shared/page-header";
import { SeatRequestsContent } from "@/components/platform/seat-requests-content";

export default function PlatformSeatsPage() {
  return (
    <Box className="space-y-6">
      <PageHeader
        eyebrow="Platform · Accounts"
        title="Seat"
        emphasis="requests"
        summary="Tenants who have run out of licensed seats. Approving one raises their limit immediately."
      />
      <SeatRequestsContent />
    </Box>
  );
}
