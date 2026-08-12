import Box from "@/components/ui/box";
import { PageHeader } from "@/components/shared/page-header";
import { AdminLearningHoursContent } from "@/components/admin/admin-learning-hours-content";

export default function AdminLearningHoursPage() {
  return (
    <Box className="space-y-6">
      <PageHeader
        eyebrow="Admin · Analytics"
        title="Learning"
        emphasis="hours"
        summary="Time invested in training, week by week and team by team."
      />
      <AdminLearningHoursContent />
    </Box>
  );
}
