import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { Card } from "@/components/ui/card";
import { Users } from "lucide-react";

export default function TeamLearningPage() {
  return (
    <Box className="space-y-5">
      <Box>
        <Text as="h1" className="text-2xl font-bold">Team Learning</Text>
        <Text as="p" className="text-muted-foreground text-xs mt-0.5">
          My Team &gt; <Text as="span" className="text-indigo-500">Team Learning</Text>
        </Text>
      </Box>
      <Card className="flex flex-col items-center justify-center py-24 gap-4">
        <Box className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center">
          <Users className="h-8 w-8 text-blue-400" />
        </Box>
        <Box className="text-center">
          <Text as="h2" className="text-base font-semibold">Coming Soon</Text>
          <Text as="p" className="text-sm text-muted-foreground mt-1">
            View and track your team&apos;s learning progress and activity here.
          </Text>
        </Box>
      </Card>
    </Box>
  );
}
