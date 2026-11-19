import Box from "@/components/ui/box";
import { PageHeader } from "@/components/shared/page-header";
import { AdminDashboardAiInsights } from "@/components/admin/dashboard-ai-insights";
import { AdminIntelligence } from "@/components/admin/admin-intelligence";
import { EngagementVsLearning } from "@/components/shared/engagement-vs-learning";

export default function AdminAiInsightsPage() {
  return (
    <Box className="space-y-5">
      <PageHeader
        eyebrow="Admin · AI"
        title="Organisation"
        emphasis="AI insights"
        summary="A model-backed reading of your organisation's learning health, what needs attention, and how engaged time compares with the learning it produced."
      />
      <AdminDashboardAiInsights />
      <AdminIntelligence />
      <EngagementVsLearning scope="admin" />
    </Box>
  );
}
