import Box from "@/components/ui/box";
import { PageHeader } from "@/components/shared/page-header";
import { DashboardAiInsights } from "@/components/learner/dashboard-ai-insights";
import {
  CourseRecommendationsPanel,
  SkillPlanPanel,
} from "@/components/learner/learner-ai-lenses";
import { LearnerInsightsCharts } from "@/components/learner/learner-insights-charts";
import { EngagementVsLearning } from "@/components/shared/engagement-vs-learning";

export default function LearnerAiInsightsPage() {
  return (
    <Box className="space-y-5">
      <PageHeader
        eyebrow="AI"
        title="Your learning,"
        emphasis="guided by AI"
        summary="Your personal AI is ready when you are. Each option reads your own learning story and turns it into clear, confident next steps — choose one to begin."
      />
      <Box className="grid gap-4 md:grid-cols-2">
        <DashboardAiInsights />
        <CourseRecommendationsPanel />
        <SkillPlanPanel />
      </Box>
      <LearnerInsightsCharts />
      <EngagementVsLearning scope="learner" />
    </Box>
  );
}
