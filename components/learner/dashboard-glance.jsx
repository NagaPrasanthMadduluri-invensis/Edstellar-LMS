"use client";

import Link from "next/link";
import { MessageCircle, Award, Flame, Sparkles } from "lucide-react";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { KpiStatCard } from "@/components/shared/kpi-stat-card";
import { useUnreadMessages } from "@/hooks/use-unread-messages";

/**
 * Home "at a glance" — four tiles reading data that already exists elsewhere in
 * the product, so each can only agree with its own page: unread DMs (the same
 * count the sidebar badge shows), certificates (the certificates module), the
 * learning streak and points this month (both from the dashboard payload). The
 * messages and certificates tiles link to their pages.
 */
export function DashboardGlance({ certificates, streak = 0, pointsThisMonth = 0 }) {
  const unread = useUnreadMessages();
  const certCount = certificates?.count ?? 0;
  const latestCert = certificates?.latest?.name ?? null;

  return (
    <Box className="space-y-2.5">
      <Text as="h2" className="font-mono text-[12px] font-bold uppercase tracking-[0.14em] text-ink/70">
        At a glance
      </Text>
      <Box className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Link href="/messages" className="block">
          <KpiStatCard
            icon={MessageCircle}
            tone="accent"
            value={unread}
            label="Unread messages"
            sub={unread > 0 ? "Open your inbox" : "You are all caught up"}
          />
        </Link>
        <Link href="/certifications" className="block">
          <KpiStatCard
            icon={Award}
            tone="success"
            value={certCount}
            label="Certificates"
            sub={latestCert ? `Latest: ${latestCert}` : "Finish a course to earn one"}
          />
        </Link>
        <KpiStatCard
          icon={Flame}
          tone="warning"
          value={`${streak}d`}
          label="Learning streak"
          sub={streak > 0 ? "Keep it going" : "Study today to start one"}
        />
        <KpiStatCard
          icon={Sparkles}
          tone="rust"
          value={pointsThisMonth}
          label="Points this month"
          sub="From your activity"
        />
      </Box>
    </Box>
  );
}
