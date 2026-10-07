import Box from "@/components/ui/box";
import { PageHeader } from "@/components/shared/page-header";
import { ActivityLog } from "@/components/shared/activity-log";

export default function AdminActivityPage() {
  return (
    <Box className="space-y-6">
      <PageHeader
        eyebrow="Admin · Activity log"
        title="Everything that"
        emphasis="happened here"
        summary="Every create, update and delete across your organization — by learners, trainers, managers and admins alike."
      />
      <ActivityLog base="admin" />
    </Box>
  );
}
