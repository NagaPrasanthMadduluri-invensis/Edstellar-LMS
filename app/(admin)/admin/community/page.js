import Box from "@/components/ui/box";
import { PageHeader } from "@/components/shared/page-header";
import { CommunityModeration } from "@/components/admin/community-moderation";

export default function AdminCommunityPage() {
  return (
    <Box className="space-y-6">
      <PageHeader
        eyebrow="Moderation"
        title="Learning"
        emphasis="community"
        summary="Every question, achievement and discussion in your organization — and the controls to remove anything that should not be there."
      />
      <CommunityModeration />
    </Box>
  );
}
