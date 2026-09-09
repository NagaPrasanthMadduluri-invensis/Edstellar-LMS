"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  Users2,
} from "lucide-react";

import { apiClient } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { cn } from "@/lib/utils";

/**
 * Team Learning — the manager's extra module (`specs/rbac.md` decision 2).
 *
 * This screen used to render a hardcoded `TEAM_MEMBERS` array with invented
 * names and progress, made no API call at all, and was shown to every learner.
 * It now reads `GET /api/learner/team`, which is gated on
 * `view_team_learning` and scoped server-side to the caller's own department —
 * the scope is never a parameter this component could widen.
 *
 * A plain learner never reaches it: the nav item is hidden and the endpoint
 * returns 403.
 */

function LoadingState() {
  return (
    <Box className="space-y-5">
      <Box className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </Box>
      <Skeleton className="h-64 rounded-xl" />
    </Box>
  );
}

function formatLastActive(iso) {
  if (!iso) return "No activity yet";
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "No activity yet";
  const days = Math.floor((Date.now() - then.getTime()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  return then.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function TeamLearningContent() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiClient("/api/learner/team")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) {
    return (
      <Card className="gap-0 p-6">
        <Text as="p" className="text-sm text-error">
          {error}
        </Text>
      </Card>
    );
  }

  if (!data) return <LoadingState />;

  const { team, summary } = data;

  // The server says so explicitly rather than leaving an empty list ambiguous:
  // a manager with no department set sees nothing, and needs to know why.
  if (summary.note) {
    return (
      <Card className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <AlertTriangle className="h-9 w-9 text-muted-foreground/30" />
        <Text as="p" className="max-w-md px-6 text-sm text-muted-foreground">
          {summary.note}
        </Text>
      </Card>
    );
  }

  const stats = [
    { icon: Users2, value: summary.size, label: "Team members", sub: summary.department },
    {
      icon: CheckCircle2,
      value: `${summary.coursesCompleted}/${summary.coursesAssigned}`,
      label: "Courses completed",
      sub: "Across the team",
    },
    {
      icon: TrendingUp,
      value: `${summary.completionPct}%`,
      label: "Completion",
      sub: "Team average",
    },
    { icon: Clock, value: `${summary.hours}h`, label: "Learning hours", sub: "All time" },
  ];

  return (
    <Box className="space-y-5">
      <Box className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="gap-0 relative overflow-hidden p-4">
            <Box className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-paper-cream">
              <s.icon className="h-4 w-4 text-navy" />
            </Box>
            <Text as="h2" className="text-2xl font-extrabold leading-none tracking-tight">
              {s.value}
            </Text>
            <Text as="p" className="mt-0.5 text-xs text-muted-foreground">
              {s.label}
            </Text>
            <Text as="p" className="mt-0.5 line-clamp-1 text-[10px] leading-tight text-muted-foreground/70">
              {s.sub}
            </Text>
          </Card>
        ))}
      </Box>

      <Card className="gap-0 overflow-hidden p-0">
        <Box className="flex flex-col gap-1 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5">
          <Box className="min-w-0">
            <Text as="h3" className="text-base font-bold">
              {summary.department} team
            </Text>
            <Text as="p" className="text-xs text-muted-foreground">
              Everyone in your department, and how their learning is going
            </Text>
          </Box>
          <Text as="span" className="shrink-0 text-xs text-muted-foreground">
            {team.length} member{team.length === 1 ? "" : "s"}
          </Text>
        </Box>

        {team.length === 0 ? (
          <Box className="flex flex-col items-center justify-center gap-3 py-14 text-center">
            <Users2 className="h-9 w-9 text-muted-foreground/25" />
            <Text as="p" className="px-6 text-sm text-muted-foreground">
              Nobody else is in {summary.department} yet.
            </Text>
          </Box>
        ) : (
          team.map((m, idx) => (
            <Box
              key={m.id}
              className={cn(
                "flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5",
                idx !== team.length - 1 && "border-b",
              )}
            >
              <Box className="min-w-0 flex-1 basis-[10rem]">
                <Text as="p" className="text-sm font-semibold leading-tight">
                  {m.name}
                </Text>
                <Text as="p" className="mt-0.5 text-[11px] text-muted-foreground">
                  {m.jobRole || m.department} · {formatLastActive(m.lastActiveAt)}
                </Text>
              </Box>

              <Box className="flex shrink-0 items-center gap-4">
                <Box className="text-right">
                  <Text as="p" className="text-sm font-semibold">
                    {m.coursesCompleted}/{m.coursesAssigned}
                  </Text>
                  <Text as="p" className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Courses
                  </Text>
                </Box>
                <Box className="text-right">
                  <Text as="p" className="text-sm font-semibold">
                    {m.hours}h
                  </Text>
                  <Text as="p" className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Hours
                  </Text>
                </Box>
                {/* Fill weight carries the state, per TASTE §10.3 — no new hues. */}
                <Badge
                  className={cn(
                    "w-[4.5rem] justify-center text-[11px] font-medium",
                    m.progressPct === 100
                      ? "border-0 bg-navy text-paper"
                      : m.progressPct > 0
                        ? "border border-navy/20 bg-paper-cream text-ink"
                        : "border border-border bg-paper-warm text-ink/60",
                  )}
                >
                  {m.progressPct}%
                </Badge>
              </Box>
            </Box>
          ))
        )}
      </Card>
    </Box>
  );
}
