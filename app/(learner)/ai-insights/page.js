import Box from "@/components/ui/box";
import { PageHeader } from "@/components/shared/page-header";
import { DashboardAiInsights } from "@/components/learner/dashboard-ai-insights";
import { EngagementVsLearning } from "@/components/shared/engagement-vs-learning";

export default function LearnerAiInsightsPage() {
  return (
    <Box className="space-y-5">
      <PageHeader
        eyebrow="AI"
        title="Your learning"
        emphasis="insights"
        summary="Personalised guidance drawn from your own learning history, and how your active time compares with the learning it produced."
      />
      <DashboardAiInsights />
      <EngagementVsLearning scope="learner" />
    </Box>
  );
}
