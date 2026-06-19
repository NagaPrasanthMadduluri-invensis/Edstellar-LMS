import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { AdminScormContent } from "@/components/admin/admin-scorm-content";

export default function AdminScormPage() {
  return (
    <Box className="space-y-5">
      <Box>
        <Text as="h1" className="text-2xl font-bold">SCORM Manager</Text>
        <Text as="p" className="text-muted-foreground text-xs mt-0.5">
          Admin &gt; Course Management &gt;{" "}
          <Text as="span" className="text-indigo-500">SCORM Manager</Text>
        </Text>
      </Box>
      <AdminScormContent />
    </Box>
  );
}
