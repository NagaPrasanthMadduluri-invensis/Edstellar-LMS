import Box from "@/components/ui/box";
import { PageHeader } from "@/components/shared/page-header";
import { ChangePasswordContent } from "@/components/shared/change-password-content";

/**
 * The same screen the learner portal uses. It lives in `components/shared/`
 * because changing your own password is not portal-specific work — TASTE §1.2
 * forbids one portal importing another's components, and this used to sit
 * under `components/learner/`.
 */
export default function TrainerChangePasswordPage() {
  return (
    <Box className="space-y-6">
      <PageHeader
        eyebrow="Trainer"
        title="Change"
        emphasis="password"
        summary="Update the password you use to sign in."
      />
      <ChangePasswordContent />
    </Box>
  );
}
