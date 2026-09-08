import Box from "@/components/ui/box";
import { PageHeader } from "@/components/shared/page-header";
import { TrainerSessionsContent } from "@/components/trainer/trainer-sessions-content";

export default function TrainerSessionsPage() {
  return (
    <Box className="space-y-6">
      <PageHeader
        eyebrow="Trainer"
        title="My"
        emphasis="sessions"
        summary="The sessions you are running. Open one to see who is attending and record attendance."
      />
      <TrainerSessionsContent />
    </Box>
  );
}
