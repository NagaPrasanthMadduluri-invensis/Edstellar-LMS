import Box from "@/components/ui/box";
import { PageHeader } from "@/components/shared/page-header";
import { EdstellarServices } from "@/components/admin/edstellar-services";

export default function AdminServicesPage() {
  return (
    <Box className="space-y-6">
      <PageHeader
        eyebrow="Admin · Edstellar"
        title="Edstellar"
        emphasis="services"
        summary="Consulting, training, platforms and managed programmes. Request any of them and Edstellar follows up within 2 business days."
      />
      <EdstellarServices />
    </Box>
  );
}
