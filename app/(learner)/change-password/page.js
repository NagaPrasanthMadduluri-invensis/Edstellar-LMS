import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { ChangePasswordContent } from "@/components/learner/change-password-content";

export default function ChangePasswordPage() {
  return (
    <Box className="space-y-5">
      <Box>
        <Text as="h1" className="text-2xl font-bold">Change Password</Text>
        <Text as="p" className="text-muted-foreground text-xs mt-0.5">
          Home &gt; <Text as="span" className="text-indigo-500">Change Password</Text>
        </Text>
      </Box>
      <ChangePasswordContent />
    </Box>
  );
}
