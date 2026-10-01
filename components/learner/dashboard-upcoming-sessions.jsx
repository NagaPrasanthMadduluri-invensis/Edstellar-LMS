"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronRight, MapPin, Video } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import Box from "@/components/ui/box";
import Text from "@/components/ui/text";
import { apiClient } from "@/lib/api-client";

/**
 * The sittings this learner still has to turn up to.
 *
 * A second VIEW over `GET /api/learner/sessions` — the same call My Sessions
 * and the Training Calendar make — never a dashboard-specific endpoint. Three
 * reads of "my sessions" that can disagree about which ones are mine is the
 * thing §10.3.1.13 records for the trainer's calendar, and it applies here
 * for the same reason.
 *
 * `display_status` arrives DERIVED from the API (§10.3). Nothing here
 * recomputes "has it started?" from the browser clock, or this panel would
 * contradict the session list beside it the moment the two disagreed about
 * the time.
 */
export function DashboardUpcomingSessions({ limit = 3 }) {
  const [sessions, setSessions] = useState(null);

  useEffect(() => {
    let cancelled = false;
    apiClient("/api/learner/sessions")
      .then((d) => { if (!cancelled) setSessions(d.sessions || []); })
      // Silent, and the panel reads as empty. The dashboard is six panels
      // wide and one of them failing must not put an error banner across
      // somebody's morning — the rule the notification bell already follows.
      .catch(() => { if (!cancelled) setSessions([]); });
    return () => { cancelled = true; };
  }, []);

  const upcoming = (sessions ?? [])
    .filter((s) => s.display_status === "upcoming" || s.display_status === "in_progress")
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .slice(0, limit);

  return (
    <Card className="gap-0 p-5">
      <Box className="flex items-center justify-between mb-1">
        <Text as="h3" className="text-base font-semibold">Upcoming Sessions</Text>
        <Link
          href="/my-sessions"
          className="text-xs text-navy hover:underline font-medium flex items-center gap-0.5"
        >
          View all <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </Box>
      <Text as="p" className="text-xs text-muted-foreground mb-4">
        Live training you are booked on
      </Text>

      {sessions === null ? (
        <Box className="space-y-2">
          {[0, 1].map((i) => (
            <Box key={i} className="h-14 bg-paper-warm animate-pulse rounded-lg" />
          ))}
        </Box>
      ) : upcoming.length === 0 ? (
        <Box className="py-6 text-center">
          <CalendarDays className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
          <Text as="p" className="text-sm text-muted-foreground">
            Nothing scheduled right now.
          </Text>
          {/* Where a learner can DO something about it, rather than a dead
              empty state — the catalogue is the only place they can book
              themselves onto one. */}
          <Link href="/catalogue" className="text-xs text-navy hover:underline font-medium">
            Browse open sessions
          </Link>
        </Box>
      ) : (
        <Box className="space-y-2">
          {upcoming.map((s) => {
            const virtual = s.session_type === "Virtual";
            const Icon = virtual ? Video : MapPin;
            return (
              <Link key={s.id} href="/my-sessions" className="block">
                <Box className="flex items-start gap-3 rounded-lg border border-border bg-paper-warm px-3 py-2.5 transition-colors hover:border-navy/25">
                  <Box className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white">
                    <Icon className="h-4 w-4 text-navy/70" />
                  </Box>
                  <Box className="min-w-0 flex-1">
                    <Text as="p" className="truncate text-sm font-medium leading-snug">
                      {s.title}
                    </Text>
                    <Text as="p" className="mt-0.5 text-xs text-muted-foreground">
                      {formatDate(s.date)} · {s.start_time}–{s.end_time}
                    </Text>
                    {s.venue_url && (
                      <Text as="p" className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        {s.venue_url}
                      </Text>
                    )}
                  </Box>
                  {s.display_status === "in_progress" && (
                    <Text
                      as="span"
                      className={cn(
                        "shrink-0 px-1.5 py-0.5 text-[10px] font-bold",
                        "bg-accent-blue/12 text-accent-blue",
                      )}
                    >
                      Now
                    </Text>
                  )}
                </Box>
              </Link>
            );
          })}
        </Box>
      )}
    </Card>
  );
}

/** `sessions.date` is a plain `YYYY-MM-DD`, so it is built from its own parts
 *  rather than handed to `new Date()` (§10.3.1.15). */
function formatDate(value) {
  if (!value) return "Date to be confirmed";
  const [y, m, d] = String(value).slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return String(value);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    day: "numeric", month: "short", year: "numeric",
  });
}
