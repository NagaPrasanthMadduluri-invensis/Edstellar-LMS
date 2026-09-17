import Box from "@/components/ui/box";
import { PageHeader } from "@/components/shared/page-header";
import { ChangePasswordContent } from "@/components/shared/change-password-content";

/** Same gap as the admin portal had — see that page's note. */
export default function PlatformChangePasswordPage() {
  return (
    <Box className="space-y-6">
      <PageHeader
        eyebrow="Account"
        title="Change"
        emphasis="password"
        summary="Update the password you use to sign in."
      />
      <ChangePasswordContent />
    </Box>
  );
}
