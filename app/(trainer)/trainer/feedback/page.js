import Box from "@/components/ui/box";
import { PageHeader } from "@/components/shared/page-header";
import { TrainerFeedbackContent } from "@/components/trainer/trainer-feedback-content";

export default function TrainerFeedbackPage() {
  return (
    <Box className="space-y-6">
      <PageHeader
        eyebrow="Trainer"
        title="Session"
        emphasis="feedback"
        summary="What learners said about the sessions you have completed. Ratings and comments are anonymous."
      />
      <TrainerFeedbackContent />
    </Box>
  );
}
