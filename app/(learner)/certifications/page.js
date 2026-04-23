import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { CertificationsContent } from "@/components/learner/certifications-content";

export default function CertificationsPage() {
  return (
    <Box className="space-y-5">
      <Box>
        <Text as="h1" className="text-2xl">My Certifications</Text>
        <Text as="p" className="text-muted-foreground text-xs mt-0.5">
          Home &gt; <Text as="span" className="text-indigo-500">My Certifications</Text>
        </Text>
      </Box>
      <CertificationsContent />
    </Box>
  );
}
