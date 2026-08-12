import Box from "@/components/ui/box";
import { PageHeader } from "@/components/shared/page-header";
import { MyProgressContent } from "@/components/learner/my-progress-content";

export default function ProgressPage() {
  return (
    <Box className="space-y-6">
      <PageHeader
        eyebrow="My progress"
        title="Lifetime learning"
        emphasis="record"
        summary="Completions, scores and time spent across every course."
      />
      <MyProgressContent />
    </Box>
  );
}
