"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Target, Zap, Trophy, Hash, BookOpen,
  GraduationCap, MessageSquare, Rocket, Crown,
  Lock, CheckCircle2,
} from "lucide-react";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

/* ── Icon map ── */
const ICONS = {
  target:   Target,
  zap:      Zap,
  trophy:   Trophy,
  perfect:  Hash,
  books:    BookOpen,
  scholar:  GraduationCap,
  feedback: MessageSquare,
  rocket:   Rocket,
  crown:    Crown,
};

/* ── Tier config ── */
const TIER_CFG = {
  BRONZE:   { label: "BRONZE",   color: "text-orange-500",  border: "border-orange-300",  iconBg: "bg-orange-50",  iconColor: "text-orange-500"  },
  SILVER:   { label: "SILVER",   color: "text-gray-400",    border: "border-gray-300",    iconBg: "bg-gray-50",    iconColor: "text-gray-400"    },
  GOLD:     { label: "GOLD",     color: "text-amber-500",   border: "border-amber-300",   iconBg: "bg-amber-50",   iconColor: "text-amber-500"   },
  PLATINUM: { label: "PLATINUM", color: "text-indigo-400",  border: "border-indigo-200",  iconBg: "bg-indigo-50",  iconColor: "text-indigo-400"  },
};

/* ── Single badge card ── */
function BadgeCard({ badge }) {
  const Icon  = ICONS[badge.icon] || Trophy;
  const tier  = badge.tier ? TIER_CFG[badge.tier] : null;
  const earned = badge.earned;

  return (
    <Card className={cn(
      "flex flex-col items-center p-5 gap-3 relative transition-all",
      earned && tier ? `border-2 ${tier.border}` : "border",
      !earned && "opacity-60"
    )}>
      {/* tier label */}
      {tier && (
        <Text as="span" className={cn("absolute top-3 right-3 text-[10px] font-extrabold tracking-wider", tier.color)}>
          {tier.label}
        </Text>
      )}

      {/* icon */}
      <Box className={cn(
        "w-14 h-14 rounded-full flex items-center justify-center",
        earned && tier ? tier.iconBg : "bg-muted"
      )}>
        <Icon className={cn(
          "h-7 w-7",
          earned && tier ? tier.iconColor : "text-muted-foreground/40"
        )} />
      </Box>

      {/* title + desc */}
      <Box className="text-center">
        <Text as="h4" className="text-sm font-bold leading-snug">{badge.title}</Text>
        <Text as="p" className="text-[11px] text-muted-foreground mt-1 leading-snug">{badge.desc}</Text>
      </Box>

      {/* status */}
      {earned ? (
        <Box className="flex items-center gap-1">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          <Text as="span" className="text-[11px] font-bold text-emerald-600">EARNED</Text>
        </Box>
      ) : (
        <Box className="flex items-center gap-1">
          <Lock className="h-3 w-3 text-muted-foreground/50" />
          <Text as="span" className="text-[11px] text-muted-foreground/50">Locked</Text>
        </Box>
      )}
    </Card>
  );
}

/* ── Skeleton ── */
function AchievementsSkeleton() {
  return (
    <Box className="space-y-5">
      <Skeleton className="h-20 rounded-xl" />
      <Box className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
      </Box>
      <Skeleton className="h-48 rounded-xl" />
    </Box>
  );
}

/* ── Activity type config ── */
const ACTIVITY_CFG = {
  lesson:     { color: "text-blue-600"    },
  assessment: { color: "text-emerald-600" },
};

export function AchievementsContent() {
  const { user, token } = useAuth();
  const [data, setData]   = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token || !user) return;
    fetch("/api/learner/achievements", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { if (d.message) throw new Error(d.message); setData(d); })
      .catch((e) => setError(e.message));
  }, [token, user]);

  if (error) return (
    <Card className="p-8 text-center">
      <Text as="p" className="text-red-500 text-sm">{error}</Text>
      <Button size="sm" variant="outline" className="mt-3" onClick={() => window.location.reload()}>Retry</Button>
    </Card>
  );
  if (!data) return <AchievementsSkeleton />;

  const { summary, badges, nextBadge, pointsHistory } = data;
  const NextIcon = nextBadge ? (ICONS[nextBadge.icon] || Zap) : Zap;

  return (
    <Box className="space-y-6">

      {/* ── Hero stats banner ── */}
      <Box className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-5 flex items-center gap-0">
        {/* 3 stats */}
        <Box className="flex items-center gap-0 flex-1">
          <Box className="pr-6">
            <Text as="h2" className="text-3xl font-extrabold text-white leading-none">{summary.points}</Text>
            <Text as="p" className="text-[10px] font-bold tracking-widest uppercase text-white/70 mt-1">Total Points</Text>
          </Box>
          <Box className="w-px h-10 bg-white/20 mr-6" />
          <Box className="pr-6">
            <Text as="h2" className="text-3xl font-extrabold text-white leading-none">#{summary.rank}</Text>
            <Text as="p" className="text-[10px] font-bold tracking-widest uppercase text-white/70 mt-1">Rank of {summary.rankOf}</Text>
          </Box>
          <Box className="w-px h-10 bg-white/20 mr-6" />
          <Box>
            <Text as="h2" className="text-3xl font-extrabold text-white leading-none">{summary.earnedCount}</Text>
            <Text as="p" className="text-[10px] font-bold tracking-widest uppercase text-white/70 mt-1">Badges Earned</Text>
          </Box>
        </Box>

        {/* next badge card */}
        {nextBadge && (
          <Box className="bg-white/15 rounded-xl px-4 py-3 min-w-[180px] max-w-[220px]">
            <Text as="p" className="text-[10px] font-bold tracking-widest uppercase text-white/60 mb-1.5">Next Badge</Text>
            <Box className="flex items-center gap-2">
              <Box className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <NextIcon className="h-4 w-4 text-amber-300" />
              </Box>
              <Box>
                <Text as="p" className="text-sm font-bold text-white leading-snug">{nextBadge.title}</Text>
                <Text as="p" className="text-[10px] text-white/70 leading-snug mt-0.5">{nextBadge.hint}</Text>
              </Box>
            </Box>
          </Box>
        )}
      </Box>

      {/* ── Badge Collection ── */}
      <Box>
        <Text as="p" className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground mb-4">
          Badge Collection
        </Text>
        <Box className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {badges.map((badge) => (
            <BadgeCard key={badge.id} badge={badge} />
          ))}
        </Box>
      </Box>

      {/* ── Points History ── */}
      <Box>
        <Text as="p" className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground mb-4">
          Points History
        </Text>
        <Card>
          {pointsHistory.length === 0 ? (
            <Box className="py-10 text-center">
              <Text as="p" className="text-sm text-muted-foreground">No points history yet. Start learning to earn points!</Text>
            </Box>
          ) : (
            <Box className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left text-[11px] font-semibold text-muted-foreground py-3 px-5">ACTIVITY</th>
                    <th className="text-left text-[11px] font-semibold text-muted-foreground py-3 px-3">DETAIL</th>
                    <th className="text-left text-[11px] font-semibold text-muted-foreground py-3 px-3">DATE</th>
                    <th className="text-right text-[11px] font-semibold text-muted-foreground py-3 px-5">POINTS</th>
                  </tr>
                </thead>
                <tbody>
                  {pointsHistory.map((row, i) => {
                    const cfg = ACTIVITY_CFG[row.type] || {};
                    return (
                      <tr key={i} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-5">
                          <Text as="p" className={cn("font-semibold text-sm", cfg.color)}>{row.activity}</Text>
                        </td>
                        <td className="py-3 px-3 text-muted-foreground max-w-[200px]">
                          <Text as="p" className="truncate text-sm">{row.detail}</Text>
                        </td>
                        <td className="py-3 px-3 text-muted-foreground text-sm whitespace-nowrap">{row.date}</td>
                        <td className="py-3 px-5 text-right">
                          <Text as="span" className="text-sm font-bold text-emerald-600">+{row.points}</Text>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Box>
          )}
        </Card>
      </Box>

    </Box>
  );
}
