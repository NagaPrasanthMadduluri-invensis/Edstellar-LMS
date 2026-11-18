import Box from "@/components/ui/box";
import { PageHeader } from "@/components/shared/page-header";
import { PlatformIncidentsContent } from "@/components/platform/platform-incidents-content";

export default function PlatformIncidentsPage() {
  return (
    <Box className="space-y-6">
      <PageHeader
        eyebrow="Platform · Edstellar"
        title="Security"
        emphasis="incidents"
        summary="Every suspected personal data breach, with the legal clocks that start the moment it is discovered. Log it first, then assess, contain and notify. The steps are in the Incident Response Plan (Information Security Policies, document 05)."
      />
      <PlatformIncidentsContent />
    </Box>
  );
}
