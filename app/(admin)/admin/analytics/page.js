import Box from "@/components/ui/box";
import { PageHeader } from "@/components/shared/page-header";
import { AdminAnalyticsContent } from "@/components/admin/admin-analytics-content";

/**
 * Server Component — a static shell (TASTE §2.3). The granularity switcher and
 * every chart live in the client component below, which fetches after mount.
 */
export default function AdminAnalyticsPage() {
  return (
    <Box className="space-y-6">
      <PageHeader
        eyebrow="Admin · Analytics"
        title="Historical"
        emphasis="performance"
        summary="Learners, courses, hours and engagement over time — by mode and type of learning."
      />
      <AdminAnalyticsContent />
    </Box>
  );
}
