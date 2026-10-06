"use client";

import { apiClient } from "@/lib/api-client";
import { useEffect, useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Zap, Target, Star, Info } from "lucide-react";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { BRAND } from "@/lib/brand";

/* ── helpers ── */
function Initials({ name, color, size = "md" }) {
  const sz = size === "lg" ? "w-16 h-16 text-xl" : size === "sm" ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm";
  return (
    <Box className={cn("rounded-full flex items-center justify-center font-bold text-white shrink-0", sz)} style={{ background: color }}>
      {name}
    </Box>
  );
}

function MedalBadge({ rank }) {
  if (rank === 1) return <Text as="span" className="text-xl leading-none">🥇</Text>;
  if (rank === 2) return <Text as="span" className="text-xl leading-none">🥈</Text>;
  if (rank === 3) return <Text as="span" className="text-xl leading-none">🥉</Text>;
  return <Text as="span" className="text-xs font-bold text-muted-foreground w-5 text-center">{rank}</Text>;
}

function PodiumMedal({ pos }) {
  if (pos === 1) return (
    <Box className="w-7 h-7 rounded-full bg-navy border-2 border-border flex items-center justify-center text-white text-xs font-extrabold shadow-md">1</Box>
  );
  if (pos === 2) return (
    <Box className="w-7 h-7 rounded-full bg-ink/45 border-2 border-border flex items-center justify-center text-white text-xs font-extrabold shadow-md">2</Box>
  );
  return (
    <Box className="w-7 h-7 rounded-full bg-navy border-2 border-border flex items-center justify-center text-white text-xs font-extrabold shadow-md">3</Box>
  );
}

const PODIUM_CFG = {
  1: { border: "border-border", bg: "bg-paper-cream", pointsColor: "text-ink/70", ribbonColor: BRAND.navy, height: "h-36" },
  2: { border: "border-border",  bg: "bg-paper-warm",  pointsColor: "text-ink/60",  ribbonColor: BRAND.accent, height: "h-28" },
  3: { border: "border-border", bg: "bg-paper-cream",pointsColor: "text-ink/70",ribbonColor: BRAND.navy, height: "h-24" },
};

const RECOGNITION_CFG = {
  learnerOfMonth:   { icon: "🌟", label: "Learner of the Month",  border: "border-l-amber-400",  iconBg: "bg-paper-cream", tag: "text-ink/70" },
  quickLearner:     { icon: "⚡", label: "Quick Learner",          border: "border-l-purple-400", iconBg: "bg-paper-cream",tag: "text-navy" },
  assessmentTopper: { icon: "🎯", label: "Assessment Topper",      border: "border-l-red-400",    iconBg: "bg-error/10",   tag: "text-error"   },
};

/* ── Skeleton ── */
function LBSkeleton() {
  return (
    <Box className="space-y-5">
      <Skeleton className="h-20 rounded-xl" />
      <Box className="grid grid-cols-1 md:grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</Box>
      <Skeleton className="h-56 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
    </Box>
  );
}

/**
 * What actually earns points, straight from the API.
 *
 * The rules are NOT written here. They arrive from
 * `modules/leaderboard/points.ts`, which is the same file the board pays
 * out with — so the table and the arithmetic cannot drift. A hardcoded
 * price list beside a live formula is the screen that lies (§10.3.1.2),
 * and it fails worst here: a learner who reads a value they never receive
 * stops believing the whole board.
 *
 * The reference design's rules, minus its four community actions — there
 * is no community feature, so those are absent rather than shown at zero,
 * the same call §10.3.1.21 makes for the webinar column. Every row that
 * does appear is paid by `LeaderboardRepository.pointEvents`.
 */
function HowPointsWork({ rules = [], notes = [] }) {
  return (
    <Card className="gap-0 overflow-hidden p-0">
      <Box className="border-b border-line px-4 py-3">
        <Text as="h3" className="text-sm font-semibold">How you earn points</Text>
        <Text as="p" className="mt-0.5 text-[11px] text-text-3">
          Your total across these is what places you on the board.
        </Text>
      </Box>

      <Box className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-surface-2">
            <tr>
              <th className="px-3 py-2 pl-4 text-left text-[10px] font-semibold uppercase tracking-wider text-text-3">Activity</th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-text-3">What earns it</th>
              <th className="px-3 py-2 pr-4 text-right text-[10px] font-semibold uppercase tracking-wider text-text-3">Points</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r.key} className="border-t border-line align-top">
                <td className="py-3 pl-4 pr-3 font-semibold whitespace-nowrap">{r.activity}</td>
                <td className="px-3 py-3 text-text-2">
                  {r.earnedBy}
                  {/* The surprising half of a rule belongs beside it, not in
                      a footnote nobody reaches — "you already passed this"
                      is the single most common reason a score does not move. */}
                  {r.note && (
                    <Text as="p" className="mt-1 text-[11px] text-text-3">{r.note}</Text>
                  )}
                </td>
                <td className="py-3 pl-3 pr-4 text-right whitespace-nowrap">
                  {r.points === null ? (
                    <Text as="span" className="text-[11px] font-medium text-text-2">
                      {r.pointsLabel || "varies"}
                    </Text>
                  ) : (
                    <Text as="span" className="text-sm font-bold text-accent-blue">+{r.points}</Text>
                  )}
                </td>
              </tr>
            ))}
            {rules.length === 0 && (
              <tr><td colSpan={3} className="py-8 text-center text-xs text-text-3">
                Point rules are unavailable right now.
              </td></tr>
            )}
          </tbody>
        </table>
      </Box>

      {notes.length > 0 && (
        <Box className="space-y-1.5 border-t border-line bg-surface-2 px-4 py-3">
          {notes.map((n) => (
            <Box key={n} className="flex items-start gap-2">
              <Info className="mt-px h-3 w-3 shrink-0 text-text-3" />
              <Text as="p" className="text-[11px] text-text-2">{n}</Text>
            </Box>
          ))}
        </Box>
      )}
    </Card>
  );
}

const LB_TABS = [
  { key: "rankings", label: "Rankings", icon: Trophy },
  { key: "points", label: "How Points Work", icon: Star },
];

export function LeaderboardContent() {
  const { user } = useAuth();
  const [data, setData]   = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab]         = useState("rankings"); // rankings | points
  const [period, setPeriod]   = useState("alltime"); // alltime | month
  const [deptFilter, setDeptFilter] = useState("All Departments");

  useEffect(() => {
    if (!user) return;
    apiClient("/api/learner/leaderboard")
      .then(setData)
      .catch((e) => setError(e.message));
  }, [user]);

  const filteredRankings = useMemo(() => {
    if (!data) return [];
    let list = [...data.allLearners];
    if (deptFilter !== "All Departments") list = list.filter((l) => l.dept === deptFilter);
    if (period === "month") list.sort((a, b) => b.monthPoints - a.monthPoints || b.badges - a.badges);
    else list.sort((a, b) => b.allTimePoints - a.allTimePoints || b.badges - a.badges);
    return list.map((l, i) => ({ ...l, displayRank: i + 1 }));
  }, [data, period, deptFilter]);

  if (error) return (
    <Card className="p-8 text-center">
      <Text as="p" className="text-error text-sm">{error}</Text>
      <Button size="sm" variant="outline" className="mt-3" onClick={() => window.location.reload()}>Retry</Button>
    </Card>
  );
  if (!data) return <LBSkeleton />;

  const { recognition, podium, departments } = data;

  return (
    <Box className="space-y-5">

      {/* ── Tabs. Rankings is the page as it was; the second answers the
             question the first one provokes. ── */}
      <Box className="flex border-b border-line">
        {LB_TABS.map(({ key, label, icon: Icon }) => (
          <Button
            key={key}
            variant="ghost" size="sm"
            onClick={() => setTab(key)}
            className={cn(
              "-mb-px h-9 cursor-pointer gap-1.5 border-b-2 px-4 text-xs font-medium",
              tab === key
                ? "border-accent-blue text-accent-blue hover:bg-transparent"
                : "border-transparent text-text-2 hover:bg-surface-2",
            )}
          >
            <Icon className="h-3.5 w-3.5" />{label}
          </Button>
        ))}
      </Box>

      {tab === "points" ? (
        <HowPointsWork rules={data.pointRules} notes={data.pointNotes} />
      ) : (
      <>

      {/* ── Hero banner ── */}
      <Box className="rounded-xl bg-navy px-6 py-5 flex items-center gap-4">
        <Trophy className="h-10 w-10 text-paper shrink-0" />
        <Box>
          <Text as="h1" className="text-xl font-extrabold text-white">Leaderboard &amp; Recognition</Text>
          <Text as="p" className="text-sm text-white/80 mt-0.5">
            Points come from finishing lessons, passing assessments and completing learning paths. Recognition is worked out automatically.
          </Text>
        </Box>
      </Box>

      {/* ── This Month's Recognition ── */}
      <Box>
        <Text as="p" className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground mb-3">
          This Month&apos;s Recognition
        </Text>
        <Box className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(["learnerOfMonth", "quickLearner", "assessmentTopper"]).map((key) => {
            const rec = recognition[key];
            const cfg = RECOGNITION_CFG[key];
            return (
              <Card key={key} className={cn("gap-0 p-4 border-l-4", cfg.border)}>
                <Box className="flex items-center gap-1.5 mb-2">
                  <Text as="span" className="text-sm">{cfg.icon}</Text>
                  <Text as="p" className={cn("text-[10px] font-bold tracking-widest uppercase", cfg.tag)}>
                    {cfg.label}
                  </Text>
                </Box>
                {rec ? (
                  <>
                    <Box className="flex items-center gap-1.5">
                      <Text as="h3" className="text-base font-extrabold">{rec.name}</Text>
                      {rec.isYou && <Badge className="text-[9px] px-1.5 py-0 bg-navy text-white border-0 shrink-0">You</Badge>}
                    </Box>
                    <Text as="p" className="text-xs text-muted-foreground mt-0.5">
                      {key === "learnerOfMonth"   && `${rec.points} points · ${rec.badges} badge${rec.badges !== 1 ? "s" : ""}`}
                      {key === "quickLearner"     && `${rec.coursesThisMonth} course${rec.coursesThisMonth !== 1 ? "s" : ""} completed`}
                      {key === "assessmentTopper" && `${rec.attemptsPerPass} attempt${rec.attemptsPerPass !== 1 ? "s" : ""} per pass · ${rec.passed} passed`}
                      {key === "assessmentTopper" && `Avg score ${rec.avgScore}%`}
                    </Text>
                  </>
                ) : (
                  <Text as="p" className="text-xs text-muted-foreground">No data yet</Text>
                )}
              </Card>
            );
          })}
        </Box>
      </Box>

      {/* ── Podium ── */}
      <Box className="flex items-end justify-center gap-4 pt-4 pb-2">
        {podium.map((p) => {
          const cfg = PODIUM_CFG[p.podiumPos];
          return (
            <Box key={p.id} className="flex flex-col items-center gap-2 w-36">
              {/* avatar + medal */}
              <Box className="relative">
                <Initials name={p.initials} color={p.color} size="lg" />
                <Box className="absolute -top-2 -right-2">
                  <PodiumMedal pos={p.podiumPos} />
                </Box>
              </Box>
              <Box className="text-center">
                <Box className="flex items-center justify-center gap-1">
                  <Text as="p" className="text-sm font-bold leading-tight">{p.name}</Text>
                  {p.isYou && <Badge className="text-[9px] px-1 py-0 bg-navy text-white border-0">You</Badge>}
                </Box>
                <Text as="p" className="text-xs text-muted-foreground">{p.dept}</Text>
              </Box>
              {/* points box */}
              <Box className={cn("w-full rounded-xl border-2 flex flex-col items-center py-4 px-3", cfg.border, cfg.bg, cfg.height)}>
                <Text as="h2" className={cn("text-2xl font-extrabold leading-none", cfg.pointsColor)}>{p.allTimePoints}</Text>
                <Text as="p" className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground mt-1">Points</Text>
                <Text as="p" className="text-sm mt-2">{p.badges > 0 ? `${p.badges} 🏅` : "0 🏅"}</Text>
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* ── Full Rankings ── */}
      <Card className="p-5">
        <Box className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <Box>
            <Text as="h3" className="text-base font-semibold">Full Rankings</Text>
            <Text as="p" className="text-xs text-muted-foreground">{period === "alltime" ? "All-time points" : "This month's points"}</Text>
          </Box>
          <Box className="flex items-center gap-2 flex-wrap">
            {/* Period toggle */}
            <Box className="flex rounded-lg border overflow-hidden text-xs">
              <button
                type="button"
                onClick={() => setPeriod("alltime")}
                className={cn("px-4 py-1.5 font-semibold transition-colors", period === "alltime" ? "bg-navy text-white" : "bg-white text-muted-foreground hover:bg-muted")}
              >
                All-time
              </button>
              <button
                type="button"
                onClick={() => setPeriod("month")}
                className={cn("px-4 py-1.5 font-semibold transition-colors", period === "month" ? "bg-navy text-white" : "bg-white text-muted-foreground hover:bg-muted")}
              >
                This Month
              </button>
            </Box>
            {/* Dept filter */}
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="text-xs border rounded-lg px-3 py-1.5 bg-white text-foreground focus:outline-none focus:ring-1 focus:ring-navy"
            >
              {departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </Box>
        </Box>

        <Box className="overflow-x-auto -mx-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left text-[11px] font-semibold text-muted-foreground py-2 pl-5 pr-3 w-16">RANK</th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground py-2 px-3">LEARNER</th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground py-2 px-3">DEPARTMENT</th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground py-2 px-3">BADGES</th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground py-2 pl-3 pr-5">POINTS</th>
              </tr>
            </thead>
            <tbody>
              {filteredRankings.map((l) => (
                <tr
                  key={l.id}
                  className={cn(
                    "border-b last:border-0 transition-colors",
                    l.isYou ? "bg-paper-cream" : "hover:bg-muted/20"
                  )}
                >
                  <td className="py-3 pl-5 pr-3">
                    <MedalBadge rank={l.displayRank} />
                  </td>
                  <td className="py-3 px-3">
                    <Box className="flex items-center gap-3">
                      <Initials name={l.initials} color={l.color} size="sm" />
                      <Box className="flex items-center gap-1.5 flex-wrap">
                        <Text as="p" className={cn("text-sm font-semibold", l.isYou && "text-navy")}>{l.name}</Text>
                        {l.isYou && (
                          <Badge className="text-[9px] px-1.5 py-0 bg-navy text-white border-0 shrink-0">You</Badge>
                        )}
                      </Box>
                    </Box>
                  </td>
                  <td className="py-3 px-3 text-sm text-muted-foreground">{l.dept}</td>
                  <td className="py-3 px-3 text-sm">
                    {l.badges > 0 ? `${l.badges} 🏅` : <Text as="span" className="text-muted-foreground/40">—</Text>}
                  </td>
                  <td className="py-3 pl-3 pr-5">
                    <Text as="p" className={cn("text-sm font-bold", l.isYou ? "text-navy" : "text-navy")}>
                      {period === "alltime" ? l.allTimePoints : l.monthPoints}
                    </Text>
                  </td>
                </tr>
              ))}
              {filteredRankings.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm text-muted-foreground">No learners found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </Box>
      </Card>

      </>
      )}
    </Box>
  );
}
