"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Clock,
  MapPin,
  Users,
  Video,
} from "lucide-react";

import { apiClient } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Box from "@/components/ui/box";
import Text from "@/components/ui/text";
import { cn } from "@/lib/utils";

/**
 * One session, its participants, and attendance — `specs/rbac.md` §3.6.1.
 *
 * What is deliberately NOT here (decisions 7 and 8): no "mark completed" and
 * no add/remove participant. Completing a session credits every attendee with
 * the training, its hours and its completion; changing the roster creates
 * course assignments. Both belong to an org admin, and the API has no trainer
 * route for either — so this is not a hidden button, there is nothing to hide.
 *
 * Participants carry no email address: the API narrows that before it leaves
 * the server, so it is not merely unrendered here.
 */

const STATUS_OPTIONS = [
  { value: "present", label: "Present", credits: true },
  { value: "late", label: "Late", credits: true },
  { value: "partial", label: "Partial", credits: true },
  { value: "absent", label: "Absent", credits: false },
  { value: "excused", label: "Excused", credits: false },
];

const SESSION_STATUS_CFG = {
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

export function TrainerSessionDetail({ sessionId }) {
  const [session, setSession] = useState(null);
  const [participants, setParticipants] = useState(null);
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const [s, p] = await Promise.all([
        apiClient(`/api/trainer/sessions/${sessionId}`),
        apiClient(`/api/trainer/sessions/${sessionId}/participants`),
      ]);
      setSession(s.session);
      setParticipants(p.participants || []);
      setDraft(
        Object.fromEntries(
          (p.participants || []).map((row) => [row.user_id, row.status || ""]),
        ),
      );
    } catch (e) {
      setError(e.message);
    }
  }, [sessionId]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const records = Object.entries(draft)
        .filter(([, status]) => status)
        .map(([userId, status]) => ({ user_id: Number(userId), status }));
      const d = await apiClient(`/api/trainer/sessions/${sessionId}/attendance`, {
        method: "PUT",
        body: { records },
      });
      setParticipants(d.participants || []);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (error && !session) {
    return (
      <Card className="p-6">
        <Text as="p" className="text-sm text-error">
          {error}
        </Text>
        <Link href="/trainer/sessions" className="mt-3 inline-block text-sm font-semibold text-navy">
          Back to my sessions
        </Link>
      </Card>
    );
  }

  if (!session || !participants) {
    return (
      <Box className="space-y-5">
        <Skeleton className="h-8 w-40 rounded" />
        <Skeleton className="h-36 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </Box>
    );
  }

  const cfg = SESSION_STATUS_CFG[session.display_status] || SESSION_STATUS_CFG.upcoming;
  const isVirtual = session.session_type === "Virtual";
  const marked = participants.filter((p) => p.status).length;
  const dirty = participants.some((p) => (draft[p.user_id] || "") !== (p.status || ""));

  return (
    <Box className="space-y-5">
      <Link
        href="/trainer/sessions"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        My sessions
      </Link>

      {/* ── Session details ── */}
      <Card className="gap-0 p-4 sm:p-5">
        <Box className="flex flex-wrap items-start gap-4">
          <Box className="min-w-0 flex-1 basis-[14rem] space-y-2">
            <Box className="flex flex-wrap items-center gap-2">
              <Badge className={cn("text-[11px] font-medium", cfg.cls)}>{cfg.label}</Badge>
              {session.course_name && (
                <Badge
                  variant="outline"
                  className="border-navy/20 bg-paper-cream text-[11px] font-medium text-navy"
                >
                  {session.course_name}
                </Badge>
              )}
            </Box>
            <Text as="h1" className="text-xl font-extrabold leading-snug">
              {session.title}
            </Text>
            {session.description && (
              <Text as="p" className="text-sm leading-relaxed text-muted-foreground">
                {session.description}
              </Text>
            )}
            <Box className="flex flex-wrap items-center gap-4 pt-1 text-sm text-muted-foreground">
              <Box className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                <Text as="span">{formatDate(session.date)}</Text>
              </Box>
              <Box className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                <Text as="span">
                  {session.start_time}–{session.end_time} IST
                </Text>
              </Box>
              <Box className="flex items-center gap-1.5">
                {isVirtual ? (
                  <Video className="h-3.5 w-3.5 shrink-0 text-navy" />
                ) : (
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-navy" />
                )}
                <Text as="span" className="max-w-[260px] truncate">
                  {session.venue_url}
                </Text>
              </Box>
            </Box>
          </Box>

          <Box className="ml-auto flex w-full shrink-0 flex-col items-start gap-1 sm:w-auto sm:items-end">
            <Text as="p" className="text-sm font-semibold text-muted-foreground">
              Registered{" "}
              <Text as="span" className="text-foreground">
                {participants.length}/{session.capacity}
              </Text>
            </Text>
            <Text as="p" className="text-xs text-muted-foreground">
              Attendance marked for {marked} of {participants.length}
            </Text>
          </Box>
        </Box>
      </Card>

      {/* ── Participants + attendance ── */}
      <Card className="gap-0 overflow-hidden p-0">
        <Box className="flex flex-col gap-3 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <Box className="min-w-0">
            <Text as="h3" className="text-base font-bold">
              Participants
            </Text>
            <Text as="p" className="text-xs text-muted-foreground">
              Record who attended. Present, late and partial credit the learner with
              the training.
            </Text>
          </Box>
          <Box className="flex shrink-0 items-center gap-2">
            {saved && (
              <Text as="span" className="text-xs font-semibold text-navy">
                Saved
              </Text>
            )}
            <Button
              size="sm"
              className="h-9 gap-2 bg-navy text-paper hover:bg-navy-soft"
              disabled={!dirty || saving}
              onClick={save}
            >
              <Check className="h-3.5 w-3.5" />
              {saving ? "Saving…" : "Save attendance"}
            </Button>
          </Box>
        </Box>

        {error && (
          <Box className="border-b bg-error/10 px-4 py-2.5 sm:px-5">
            <Text as="p" className="text-xs font-medium text-error">
              {error}
            </Text>
          </Box>
        )}

        {participants.length === 0 ? (
          <Box className="flex flex-col items-center justify-center gap-3 py-14 text-center">
            <Users className="h-9 w-9 text-muted-foreground/25" />
            <Text as="p" className="px-6 text-sm text-muted-foreground">
              No one is on this roster yet. An admin adds participants — you record
              their attendance once they are on it.
            </Text>
          </Box>
        ) : (
          participants.map((p, idx) => (
            <Box
              key={p.user_id}
              className={cn(
                "flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5",
                idx !== participants.length - 1 && "border-b",
              )}
            >
              <Box className="min-w-0 flex-1 basis-[10rem]">
                <Text as="p" className="text-sm font-semibold leading-tight">
                  {p.first_name} {p.last_name}
                </Text>
                {p.department && (
                  <Text as="p" className="mt-0.5 text-[11px] text-muted-foreground">
                    {p.department}
                  </Text>
                )}
              </Box>

              <Box className="ml-auto flex flex-wrap items-center gap-1.5">
                {STATUS_OPTIONS.map((opt) => {
                  const active = (draft[p.user_id] || "") === opt.value;
                  return (
                    <Button
                      key={opt.value}
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={p.is_locked}
                      onClick={() =>
                        setDraft((prev) => ({
                          ...prev,
                          [p.user_id]: active ? "" : opt.value,
                        }))
                      }
                      className={cn(
                        "h-8 px-2.5 text-xs",
                        active && opt.credits && "border-navy bg-navy text-paper hover:bg-navy-soft",
                        active && !opt.credits && "border-error/30 bg-error/10 text-error",
                      )}
                    >
                      {opt.label}
                    </Button>
                  );
                })}
              </Box>
            </Box>
          ))
        )}
      </Card>
    </Box>
  );
}
