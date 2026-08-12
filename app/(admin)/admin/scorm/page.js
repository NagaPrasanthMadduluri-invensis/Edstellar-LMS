import Box from "@/components/ui/box";
import { PageHeader } from "@/components/shared/page-header";
import { AdminScormContent } from "@/components/admin/admin-scorm-content";

export default function AdminScormPage() {
  return (
    <Box className="space-y-6">
      <PageHeader
        eyebrow="Admin · Course management"
        title="SCORM"
        emphasis="packages"
        summary="Upload interactive e-learning and assign it to learners."
      />
      <AdminScormContent />
    </Box>
  );
}
