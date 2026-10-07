import Box from "@/components/ui/box";
import { PageHeader } from "@/components/shared/page-header";
import { EmailDeliveryContent } from "@/components/admin/email-delivery-content";

export default function AdminEmailPage() {
  return (
    <Box className="space-y-6">
      <PageHeader
        eyebrow="Admin · Email delivery"
        title="What your people"
        emphasis="were sent"
        summary="Every message this organization has queued, what became of it, and why anything failed."
      />
      <EmailDeliveryContent />
    </Box>
  );
}
