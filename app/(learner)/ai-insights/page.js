import Box from "@/components/ui/box";
import { PageHeader } from "@/components/shared/page-header";
import { DashboardAiInsights } from "@/components/learner/dashboard-ai-insights";
import {
  CourseRecommendationsPanel,
  SkillPlanPanel,
} from "@/components/learner/learner-ai-lenses";
import { EngagementVsLearning } from "@/components/shared/engagement-vs-learning";

export default function LearnerAiInsightsPage() {
  return (
    <Box className="space-y-5">
      <PageHeader
        eyebrow="AI"
        title="Your learning"
        emphasis="insights"
        summary="Several AI options, each drawn from your own learning history: what to do next, the best courses for you, and a plan to close your skill gaps. Pick one to run it."
      />
      <DashboardAiInsights />
      <CourseRecommendationsPanel />
      <SkillPlanPanel />
      <EngagementVsLearning scope="learner" />
    </Box>
  );
}
