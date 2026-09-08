import Box from "@/components/ui/box";
import { TrainerSessionDetail } from "@/components/trainer/trainer-session-detail";

export default async function TrainerSessionPage({ params }) {
  const { sessionId } = await params;

  return (
    <Box className="space-y-6">
      <TrainerSessionDetail sessionId={sessionId} />
    </Box>
  );
}
