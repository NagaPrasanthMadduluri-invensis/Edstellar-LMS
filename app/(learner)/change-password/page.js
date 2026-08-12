import Box from "@/components/ui/box";
import { PageHeader } from "@/components/shared/page-header";
import { ChangePasswordContent } from "@/components/learner/change-password-content";

export default function ChangePasswordPage() {
  return (
    <Box className="space-y-6">
      <PageHeader
        eyebrow="Account"
        title="Change"
        emphasis="password"
        summary="Choose something long and unique to you."
      />
      <ChangePasswordContent />
    </Box>
  );
}
