import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { Card } from "@/components/ui/card";
import { CalendarCheck } from "lucide-react";

export default function AdminSessionsPage() {
  return (
    <Box className="space-y-5">
      <Box>
        <Text as="h1" className="text-2xl font-bold">Sessions &amp; Attendance</Text>
        <Text as="p" className="text-muted-foreground text-xs mt-0.5">
          Admin &gt; <Text as="span" className="text-indigo-500">Sessions &amp; Attendance</Text>
        </Text>
      </Box>
      <Card className="flex flex-col items-center justify-center py-24 gap-4">
        <Box className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center">
          <CalendarCheck className="h-8 w-8 text-indigo-400" />
        </Box>
        <Box className="text-center">
          <Text as="h2" className="text-base font-semibold">Coming Soon</Text>
          <Text as="p" className="text-sm text-muted-foreground mt-1">
            Live session scheduling, attendance tracking, and reports will appear here.
          </Text>
        </Box>
      </Card>
    </Box>
  );
}
