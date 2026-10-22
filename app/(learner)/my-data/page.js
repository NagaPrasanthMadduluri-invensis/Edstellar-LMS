import Box from "@/components/ui/box";
import { PageHeader } from "@/components/shared/page-header";
import { MyDataContent } from "@/components/learner/my-data-content";

export default function MyDataPage() {
  return (
    <Box className="space-y-6">
      <PageHeader
        eyebrow="Privacy"
        title="My data &"
        emphasis="privacy"
        summary="See what we hold about you, download a copy, and ask for a correction or deletion. You have these rights under data protection law."
      />
      <MyDataContent />
    </Box>
  );
}
