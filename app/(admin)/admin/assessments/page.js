import Box from "@/components/ui/box";
import { PageHeader } from "@/components/shared/page-header";
import { AdminAssessmentsStandaloneContent } from "@/components/admin/admin-assessments-standalone-content";

export default function AdminAssessmentsPage() {
  return (
    <Box className="space-y-6">
      <PageHeader
        eyebrow="Admin · Course management"
        title="Assessment"
        emphasis="builder"
        summary="Create quizzes, set pass marks and manage questions across every course."
      />
      <AdminAssessmentsStandaloneContent />
    </Box>
  );
}
