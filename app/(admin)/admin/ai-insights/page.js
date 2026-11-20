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
        title="Your organisation,"
        emphasis="read by AI"
        summary="A clear, professional reading of where your people's learning stands — what is working, what needs attention, and where to act next."
      />
      <AdminDashboardAiInsights />
      <AdminIntelligence />
      <EngagementVsLearning scope="admin" />
    </Box>
  );
}
