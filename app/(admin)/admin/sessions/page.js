import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { AdminSessionsContent } from "@/components/admin/admin-sessions-content";

export default function AdminSessionsPage() {
  return (
    <Box className="space-y-5">
      <Box>
        <Text as="h1" className="text-2xl font-bold">Sessions &amp; Attendance</Text>
        <Text as="p" className="text-muted-foreground text-xs mt-0.5">
          Admin &gt; <Text as="span" className="text-indigo-500">Sessions &amp; Attendance</Text>
        </Text>
      </Box>
      <AdminSessionsContent />
    </Box>
  );
}
