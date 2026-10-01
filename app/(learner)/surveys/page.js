import Box from "@/components/ui/box";
import { PageHeader } from "@/components/shared/page-header";
import { SurveysContent } from "@/components/learner/surveys-content";

export default function SurveysPage() {
  return (
    <Box className="space-y-6">
      <PageHeader
        eyebrow="My learning"
        title="Surveys &"
        emphasis="feedback"
        summary="Everything you have been asked to rate — and everything you already have. None of it affects your progress, hours or certificates."
      />
      <SurveysContent />
    </Box>
  );
}
