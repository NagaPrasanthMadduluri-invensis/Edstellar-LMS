"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { UserAvatar } from "@/components/shared/user-avatar";
import { cn } from "@/lib/utils";

/**
 * Home: "Learning with you" + the "Cohort leaderboard" podium.
 *
 * Both are presentational — the dashboard already fetched the data, so this
 * takes it as props rather than making a second request. Nothing here is
 * recomputed: the podium is the TOP 3 of the same `ranked` standings the
 * Leaderboard page shows (so Home and the board cannot disagree), and the
 * peers are learners the API says share a course with this learner.
 *
 * A peer is named FIRST NAME + LAST INITIAL (the reviews relaxation, §10.24),
 * never a full directory. "Say hi" opens a real direct-message thread with that
 * peer (`/messages?with=<id>`, the Messages module, 0054) — it is a working
 * per-person DM, not the control-that-lies a no-op button would be. The podium
 * links to the full Leaderboard.
 */

/* Medal tone per rank, from the palette: gold → warning, silver → grey,
   bronze → rust. No new hues (§10.1). */
const MEDAL = {
  1: { ring: "ring-warning", text: "text-warning", chip: "bg-warning text-white" },
  2: { ring: "ring-line-strong", text: "text-text-3", chip: "bg-text-3 text-white" },
  3: { ring: "ring-rust", text: "text-rust", chip: "bg-rust text-white" },
};

function PodiumPerson({ person }) {
  const m = MEDAL[person.rank] ?? MEDAL[3];
  const winner = person.rank === 1;
  const first = person.name.split(" ")[0];
  return (
    <Box className="flex min-w-0 flex-1 flex-col items-center gap-1 text-center">
      <Box className="relative">
        <UserAvatar
          src={person.avatar_url}
          name={person.name}
          className={cn(
            "ring-2 ring-offset-2 ring-offset-surface",
            m.ring,
            winner ? "size-[72px]" : "size-14",
          )}
        />
        <Box
          className={cn(
            "absolute -top-1.5 left-1/2 flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full border-2 border-surface text-[10px] font-extrabold",
            m.chip,
          )}
        >
          {person.rank}
        </Box>
      </Box>
      <Text
        as="p"
        className={cn(
          "mt-1.5 max-w-full truncate font-semibold text-ink",
          winner ? "text-sm" : "text-xs",
        )}
      >
        {person.is_you ? `You · ${first}` : person.name}
      </Text>
      <Text as="p" className={cn("font-mono font-bold tabular-nums", m.text, winner ? "text-lg" : "text-sm")}>
        {person.points}
      </Text>
    </Box>
  );
}

export function DashboardCohortPeers({ cohort, peers = [] }) {
  const podium = cohort?.podium ?? [];
  const me = cohort?.me ?? null;

  const hasPeers = peers.length > 0;
  const hasPodium = podium.length > 0;
  if (!hasPeers && !hasPodium) return null;

  // Podium display order: 2nd, 1st (centre, larger), 3rd — the reference layout.
  const byRank = Object.fromEntries(podium.map((p) => [p.rank, p]));
  const order = [byRank[2], byRank[1], byRank[3]].filter(Boolean);

  const bothCards = hasPeers && hasPodium;

  return (
    <Box className={cn("grid gap-4", bothCards && "lg:grid-cols-2")}>
      {/* ── Learning with you ── */}
      {hasPeers && (
        <Card className="gap-0 p-5">
          <Text as="h3" className="mb-4 font-mono text-[12px] font-bold uppercase tracking-[0.14em] text-ink/70">
            Learning with you
          </Text>
          <Box className="flex flex-wrap gap-x-5 gap-y-4">
            {peers.map((p) => (
              <Box key={p.id} className="flex w-20 flex-col items-center gap-1.5 text-center">
                <UserAvatar src={p.avatar_url} name={p.name} className="size-14" />
                <Text as="p" className="max-w-full truncate text-xs font-semibold text-ink">{p.name}</Text>
                <Text as="p" className="line-clamp-2 text-[10px] leading-tight text-text-3">{p.course_name}</Text>
                <Link
                  href={`/messages?with=${p.id}`}
                  className="mt-0.5 rounded-full border border-accent-blue/40 px-2.5 py-0.5 text-[11px] font-semibold text-accent-blue transition-colors hover:bg-accent-tint"
                >
                  Say hi
                </Link>
              </Box>
            ))}
          </Box>
        </Card>
      )}

      {/* ── Cohort leaderboard ── */}
      {hasPodium && (
        <Card className="gap-0 p-5">
          <Box className="mb-4 flex items-center justify-between gap-2">
            <Text as="h3" className="font-mono text-[12px] font-bold uppercase tracking-[0.14em] text-ink/70">
              Cohort leaderboard
            </Text>
            <Link href="/leaderboard" className="shrink-0 text-[11.5px] font-bold text-accent-blue hover:underline">
              View all →
            </Link>
          </Box>

          <Box className="flex items-end justify-center gap-4 sm:gap-6">
            {order.map((p) => <PodiumPerson key={p.id} person={p} />)}
          </Box>

          {/* The learner's own standing, when they are not already on the podium. */}
          {me && !me.in_top3 && (
            <Box className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-3">
              <Text as="span" className="text-xs font-semibold text-ink">
                You · {me.name.split(" ")[0]}
              </Text>
              <Box className="flex items-center gap-3">
                <Text as="span" className="font-mono text-[11px] uppercase tracking-[0.1em] text-text-3">
                  Rank #{me.rank}
                </Text>
                <Text as="span" className="font-mono text-sm font-bold tabular-nums text-ink">{me.points}</Text>
              </Box>
            </Box>
          )}
        </Card>
      )}
    </Box>
  );
}
