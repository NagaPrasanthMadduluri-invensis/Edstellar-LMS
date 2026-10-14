import Box from "@/components/ui/box";
import { PageHeader } from "@/components/shared/page-header";
import { CommunityContent } from "@/components/learner/community-content";

export default function CommunityPage() {
  return (
    <Box className="space-y-6">
      <PageHeader
        eyebrow="Connect"
        title="Learning"
        emphasis="community"
        summary="Ask questions, share achievements and discuss — with everyone in your organization."
      />
      <CommunityContent />
    </Box>
  );
}
