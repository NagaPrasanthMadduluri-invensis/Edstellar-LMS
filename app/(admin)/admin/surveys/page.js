import Box from "@/components/ui/box";
import { PageHeader } from "@/components/shared/page-header";
import { AdminSurveysContent } from "@/components/admin/admin-surveys-content";

export default function AdminSurveysPage() {
  return (
    <Box className="space-y-6">
      <PageHeader
        eyebrow="Admin · Course Management"
        title="Surveys &"
        emphasis="feedback"
        summary="The forms your courses ask learners to fill in, and what they said. A course's category picks its form automatically; every form here is yours to edit."
      />
      <AdminSurveysContent />
    </Box>
  );
}
