import Box from "@/components/ui/box";
import { PageHeader } from "@/components/shared/page-header";
import { ChangePasswordContent } from "@/components/shared/change-password-content";

/**
 * The admin portal had no route for this at all, while the learner and trainer
 * portals both did — so the one shared component was reachable from two of the
 * four portals and an admin had no way to change their own password in the UI.
 * `POST /api/auth/change-password` was already open to any role; only the page
 * was missing.
 */
export default function AdminChangePasswordPage() {
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
