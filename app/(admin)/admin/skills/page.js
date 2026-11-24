import Box from "@/components/ui/box";
import { PageHeader } from "@/components/shared/page-header";
import { AdminSkillsContent } from "@/components/admin/admin-skills-content";

/**
 * Server Component, a static shell (client rule 2.3). Every chart lives in the
 * client component below, which fetches after mount.
 */
export default function AdminSkillsPage() {
  return (
    <Box className="space-y-6">
      <PageHeader
        eyebrow="Admin · Skills"
        title="Skills and"
        emphasis="competencies"
        summary="Which skills your people hold, at what level, how that is growing, and which courses could teach more."
      />
      <AdminSkillsContent />
    </Box>
  );
}
