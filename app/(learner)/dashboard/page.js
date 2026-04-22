import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { DashboardContent } from "@/components/learner/dashboard-content";

export default function DashboardPage() {
  return (
    <Box className="space-y-5">
      <Box>
        <Text as="h1" className="text-2xl">My Dashboard</Text>
        <Text as="p" className="text-muted-foreground text-xs mt-0.5">
          Home &gt; <Text as="span" className="text-indigo-500">Dashboard</Text>
        </Text>
      </Box>
      <DashboardContent />
    </Box>
  );
}
