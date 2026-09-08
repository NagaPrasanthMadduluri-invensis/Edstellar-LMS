"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarCheck,
  CalendarDays,
  ChevronRight,
  Clock,
  MapPin,
  UserCircle,
  Users,
  Video,
} from "lucide-react";

import { apiClient } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Box from "@/components/ui/box";
import Text from "@/components/ui/text";
import { cn } from "@/lib/utils";

/**
 * The trainer's session list — `specs/rbac.md` §3.6.1.
 *
 * `GET /api/trainer/sessions` returns only sessions where he is the trainer;
 * the filter is a SQL predicate on `trainer_user_id`, not something this
 * component asks for, so there is no "all sessions" state to get wrong here.
 */

/** Session status carried by fill weight, per TASTE §10.3 — no new hues. */
const STATUS_CFG = {
  upcoming: { label: "Upcoming", cls: "bg-paper-warm text-ink/60 border border-border" },
  in_progress: { label: "In progress", cls: "bg-paper-cream text-ink border border-navy/20" },
  completed: { label: "Completed", cls: "bg-navy text-paper border-0" },
  cancelled: { label: "Cancelled", cls: "bg-error/10 text-error border-0" },
};

function formatDate(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function LoadingState() {
  return (
    <Box className="space-y-5">
      <Box className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </Box>
      {[...Array(3)].map((_, i) => (
        <Skeleton key={i} className="h-28 rounded-xl" />
      ))}
    </Box>
  );
}

export function TrainerSessionsContent() {
  const [sessions, setSessions] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiClient("/api/trainer/sessions")
      .then((d) => setSessions(d.sessions || []))
      .catch((e) => setError(e.message));
  }, []);

  if (error) {
    return (
      <Card className="p-6">
        <Text as="p" className="text-sm text-error">
          {error}
        </Text>
      </Card>
    );
  }

  if (!sessions) return <LoadingState />;

  if (sessions.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <CalendarCheck className="h-10 w-10 text-muted-foreground/25" />
        <Text as="p" className="text-sm text-muted-foreground">
          No sessions are assigned to you yet. An admin assigns you as the trainer
          when they schedule one.
        </Text>
      </Card>
    );
  }

  const counts = {
    total: sessions.length,
    upcoming: sessions.filter((s) => s.display_status === "upcoming").length,
    awaiting: sessions.filter(
      (s) => s.display_status === "in_progress" || (s.roster_count > 0 && s.attendance_marked_count === 0),
    ).length,
    learners: sessions.reduce((sum, s) => sum + Number(s.roster_count || 0), 0),
  };

  const stats = [
    { icon: CalendarCheck, value: counts.total, label: "Sessions", sub: "Assigned to you" },
    { icon: CalendarDays, value: counts.upcoming, label: "Upcoming", sub: "Not yet started" },
    { icon: Clock, value: counts.awaiting, label: "Need attendance", sub: "Not marked yet" },
    { icon: Users, value: counts.learners, label: "Participants", sub: "Across all sessions" },
  ];

  return (
    <Box className="space-y-5">
      {/* Stat tiles. `gap-0` because this card does its own spacing — the Card
          primitive's flex gap would otherwise add 16px between every child. */}
      <Box className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="gap-0 relative overflow-hidden p-4">
            <Box className={cn("mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-paper-cream")}>
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

      <Box className="space-y-4">
        {sessions.map((s) => {
          const cfg = STATUS_CFG[s.display_status] || STATUS_CFG.upcoming;
          const isVirtual = s.session_type === "Virtual";
          const needsAttendance =
            s.roster_count > 0 && s.attendance_marked_count === 0 && s.display_status !== "cancelled";

          return (
            <Card key={s.id} className="gap-0 overflow-hidden p-0">
              <Link
                href={`/trainer/sessions/${s.id}`}
                className="block p-4 transition-colors hover:bg-paper-warm sm:p-5"
              >
                <Box className="flex flex-wrap items-start gap-4">
                  <Box className="min-w-0 flex-1 basis-[14rem] space-y-2">
                    <Box className="flex flex-wrap items-center gap-2">
                      <Badge className={cn("text-[11px] font-medium", cfg.cls)}>{cfg.label}</Badge>
                      {s.course_name && (
                        <Badge
                          variant="outline"
                          className="flex items-center gap-1 border-navy/20 bg-paper-cream text-[11px] font-medium text-navy"
                        >
                          {s.course_name}
                        </Badge>
                      )}
                      {needsAttendance && (
                        <Badge className="border-0 bg-paper-cream text-[11px] font-medium text-ink">
                          Attendance not marked
                        </Badge>
                      )}
                    </Box>

                    <Text as="h3" className="text-base font-extrabold leading-snug">
                      {s.title}
                    </Text>

                    <Box className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <Box className="flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                        <Text as="span">{formatDate(s.date)}</Text>
                      </Box>
                      <Box className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 shrink-0" />
                        <Text as="span">
                          {s.start_time}–{s.end_time} IST
                        </Text>
                      </Box>
                      <Box className="flex items-center gap-1.5">
                        {isVirtual ? (
                          <Video className="h-3.5 w-3.5 shrink-0 text-navy" />
                        ) : (
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-navy" />
                        )}
                        <Text as="span" className="max-w-[220px] truncate">
                          {s.venue_url}
                        </Text>
                      </Box>
                    </Box>
                  </Box>

                  <Box className="ml-auto flex w-full shrink-0 flex-col items-start gap-1 sm:w-auto sm:items-end">
                    <Text as="p" className="text-sm font-semibold text-muted-foreground">
                      Registered{" "}
                      <Text as="span" className="text-foreground">
                        {s.roster_count}/{s.capacity}
                      </Text>
                    </Text>
                    <Text as="p" className="text-xs text-muted-foreground">
                      {s.attendance_marked_count > 0
                        ? `Attendance marked for ${s.attendance_marked_count} of ${s.roster_count}`
                        : "Attendance not marked yet"}
                    </Text>
                    <Box className="mt-1 flex items-center gap-1 text-xs font-semibold text-navy">
                      <UserCircle className="h-3.5 w-3.5" />
                      Open session
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Box>
                  </Box>
                </Box>
              </Link>
            </Card>
          );
        })}
      </Box>
    </Box>
  );
}
