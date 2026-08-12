import Box from "@/components/ui/box";
import { PageHeader } from "@/components/shared/page-header";
import { AdminLeaderboardContent } from "@/components/admin/admin-leaderboard-content";

export default function AdminLeaderboardPage() {
  return (
    <Box className="space-y-6">
      <PageHeader
        eyebrow="Admin · Analytics"
        title="Top"
        emphasis="performers"
        summary="Learners ranked by completion and assessment score."
      />
      <AdminLeaderboardContent />
    </Box>
  );
}
