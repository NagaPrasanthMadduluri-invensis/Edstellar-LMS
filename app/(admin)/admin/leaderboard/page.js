import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { AdminLeaderboardContent } from "@/components/admin/admin-leaderboard-content";

export default function AdminLeaderboardPage() {
  return (
    <Box className="space-y-5">
      <Box>
        <Text as="h1" className="text-2xl font-bold">Leaderboard</Text>
        <Text as="p" className="text-muted-foreground text-xs mt-0.5">
          Home &gt; <Text as="span" className="text-blue-500">Leaderboard</Text>
        </Text>
      </Box>
      <AdminLeaderboardContent />
    </Box>
  );
}
