import Box from "@/components/ui/box";
import { PageHeader } from "@/components/shared/page-header";
import { AssignLearning } from "@/components/admin/assign-learning";

export default function AdminAssignLearningPage() {
  return (
    <Box className="space-y-6">
      <PageHeader
        eyebrow="Admin · Training delivery"
        title="Assign"
        emphasis="learning"
        summary="Choose what to assign, who gets it and when it is due — in one pass."
      />
      <AssignLearning />
    </Box>
  );
}
