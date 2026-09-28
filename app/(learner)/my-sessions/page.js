import Box from "@/components/ui/box";
import { PageHeader } from "@/components/shared/page-header";
import { MySessionsContent } from "@/components/learner/my-sessions-content";

export default function MySessionsPage() {
  return (
    <Box className="space-y-6">
      <PageHeader
        eyebrow="My learning"
        title="My"
        emphasis="sessions"
        summary="Every live and in-person session you are booked on, and how you attended."
      />
      <MySessionsContent />
    </Box>
  );
}
