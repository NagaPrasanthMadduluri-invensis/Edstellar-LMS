import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { Card } from "@/components/ui/card";
import { Award } from "lucide-react";

export default function AdminCertificatesPage() {
  return (
    <Box className="space-y-5">
      <Box>
        <Text as="h1" className="text-2xl font-bold">Certificates</Text>
        <Text as="p" className="text-muted-foreground text-xs mt-0.5">
          Admin &gt; <Text as="span" className="text-indigo-500">Certificates</Text>
        </Text>
      </Box>
      <Card className="flex flex-col items-center justify-center py-24 gap-4">
        <Box className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center">
          <Award className="h-8 w-8 text-amber-400" />
        </Box>
        <Box className="text-center">
          <Text as="h2" className="text-base font-semibold">Coming Soon</Text>
          <Text as="p" className="text-sm text-muted-foreground mt-1">
            Certificate management and issuance will be available here.
          </Text>
        </Box>
      </Card>
    </Box>
  );
}
