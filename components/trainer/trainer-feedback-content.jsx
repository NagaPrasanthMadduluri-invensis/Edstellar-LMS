"use client";

import { useCallback, useEffect, useState } from "react";
import { MessageSquare, Quote, Star, TrendingUp, Users } from "lucide-react";

import Box from "@/components/ui/box";
import Text from "@/components/ui/text";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { fetchTrainerFeedback } from "@/services/api/feedback-api";
import {
  FEEDBACK_DIMENSIONS, OWNER_NOTE, RATING_MAX, ratingTone, ratingWord,
} from "@/lib/feedback";
import { cn } from "@/lib/utils";

/**
 * The trainer's Feedback page.
 *
 * **Every response here is anonymous, and the page says so rather than
 * leaving it to be inferred.** The API never sends a name — `user_id` is
 * stored but no trainer route selects it — so there is nothing this
 * component could leak even by accident. Saying it out loud matters anyway:
 * a trainer who assumes they can work out who wrote something reads the
 * comments differently, and so does a learner who is not sure.
 *
 * **An average over fewer than three responses is WITHHELD, not shown.** The
 * API decides that (`sufficient`) and sends null; the card prints the count
 * and says why. One 2/5 rendered as "2.0 average" invites a conclusion three
 * more responses might reverse — the same refusal the analytics trends make
 * with two data points.
 */

function Stars({ value, size = "size-3.5" }) {
  if (value === null || value === undefined) {
    return <Text as="span" className="text-[12px] text-text-3">—</Text>;
  }
  return (
    <Box className="flex items-center gap-0.5" title={`${value} out of ${RATING_MAX}`}>
      {Array.from({ length: RATING_MAX }, (_, i) => (
        <Star
          key={i}
          className={cn(
            size,
            i < Math.round(value)
              ? "fill-warning text-warning"
              : "text-line-strong",
          )}
        />
      ))}
    </Box>
  );
}

function formatDate(iso) {
  if (!iso) return "—";
  const [y, m, d] = String(iso).slice(0, 10).split("-");
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export function TrainerFeedbackContent() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [sessionId, setSessionId] = useState("all");

  const load = useCallback(async (filter) => {
    try {
      setData(await fetchTrainerFeedback({
        sessionId: filter === "all" ? undefined : Number(filter),
      }));
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => { load(sessionId); }, [load, sessionId]);

  if (error) {
    return (
      <Card className="p-6">
        <Text as="p" className="text-[12.5px] text-danger">{error}</Text>
      </Card>
    );
  }

  if (!data) {
    return (
      <Box className="space-y-4">
        <Box className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
        </Box>
        <Skeleton className="h-64 w-full" />
      </Box>
    );
  }

  const { summary, sessions, responses } = data;

  /* No completed sessions at all is a different fact from completed sessions
     nobody rated, and they get different words. Collapsing them would tell a
     trainer their learners stayed silent when in truth nothing has finished. */
  if (summary.completed_sessions === 0) {
    return (
      <Card className="flex flex-col items-center justify-center gap-2 border-dashed border-line-strong py-16 text-center">
        <MessageSquare className="size-8 text-text-3" />
        <Text as="p" className="text-[13px] font-semibold text-ink">
          No completed sessions yet
        </Text>
        <Text as="p" className="max-w-md text-[11.5px] text-text-2">
          Feedback opens once you mark a session completed. Everyone you marked
          present, late or partial is then invited to rate it.
        </Text>
      </Card>
    );
  }

  return (
    <Box className="space-y-4">
      {/* ── The three dimensions, plus reach ── */}
      <Box className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {FEEDBACK_DIMENSIONS.map((d) => {
          const value = summary[`avg_${d.key}`];
          return (
            <Card key={d.key} className="gap-0 p-4">
              <Text as="p" className="font-mono text-[10px] uppercase tracking-wider text-text-3">
                {d.label}
              </Text>
              <Box className="mt-1.5 flex items-baseline gap-1.5">
                <Text as="span" className={cn("text-[22px] font-bold leading-none", ratingTone(value))}>
                  {value === null ? "—" : value.toFixed(1)}
                </Text>
                {value !== null && (
                  <Text as="span" className="text-[11px] text-text-3">/ {RATING_MAX}</Text>
                )}
              </Box>
              <Text as="p" className="mt-1 text-[11px] text-text-2">
                {ratingWord(value)}
              </Text>
              {/* Whose it is to fix. A trainer should not read a low Content
                  score as a verdict on their teaching — it is the material. */}
              <Text as="p" className="mt-1.5 text-[10px] text-text-3">
                {OWNER_NOTE[d.ownedBy]}
              </Text>
            </Card>
          );
        })}

        <Card className="gap-0 p-4">
          <Text as="p" className="font-mono text-[10px] uppercase tracking-wider text-text-3">
            Responses
          </Text>
          <Box className="mt-1.5 flex items-baseline gap-1.5">
            <Text as="span" className="text-[22px] font-bold leading-none text-ink">
              {summary.total_responses}
            </Text>
            {summary.response_rate !== null && (
              <Text as="span" className="text-[11px] text-text-3">
                {summary.response_rate}%
              </Text>
            )}
          </Box>
          <Text as="p" className="mt-1 text-[11px] text-text-2">
            of {summary.eligible_learners} who attended
          </Text>
          <Text as="p" className="mt-1.5 text-[10px] text-text-3">
            Across {summary.sessions_with_feedback} of {summary.completed_sessions} sessions
          </Text>
        </Card>
      </Box>

      {/* Said once, plainly, at the top of the page. */}
      <Box className="flex items-start gap-2 border border-line bg-surface-2 px-3 py-2.5">
        <Users className="mt-0.5 size-3.5 shrink-0 text-text-3" />
        <Text as="p" className="text-[11.5px] leading-snug text-text-2">
          <Text as="span" className="font-semibold text-ink">Responses are anonymous.</Text>{" "}
          You see what was said, never who said it — that is what makes the
          criticism worth reading. Only learners you marked present, late or
          partial can rate a session, and an average is withheld until a
          session has {summary.min_responses_for_average} responses.
        </Text>
      </Box>

      {/* ── Per session ── */}
      <Card className="gap-0 overflow-hidden p-0">
        <Box className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
          <Text as="h2" className="text-[13px] font-bold text-ink">By session</Text>
          <Text as="span" className="text-[11px] text-text-3">
            {sessions.length} completed
          </Text>
        </Box>

        <Box className="divide-y divide-line">
          {sessions.map((s) => (
            <Box key={s.session_id} className="px-4 py-3">
              <Box className="flex flex-wrap items-start justify-between gap-3">
                <Box className="min-w-0 flex-1 basis-[16rem]">
                  <Text as="p" className="truncate text-[12.5px] font-semibold text-ink">
                    {s.title}
                  </Text>
                  <Text as="p" className="mt-0.5 text-[11px] text-text-3">
                    {formatDate(s.date)}
                    {s.course_name ? ` · ${s.course_name}` : ""}
                    {" · "}
                    {s.responses} of {s.eligible} responded
                  </Text>
                </Box>

                {s.sufficient ? (
                  <Box className="flex flex-wrap items-center gap-4">
                    {FEEDBACK_DIMENSIONS.map((d) => (
                      <Box key={d.key} className="min-w-[5.5rem]">
                        <Text as="p" className="text-[10px] text-text-3">{d.label}</Text>
                        <Box className="mt-0.5 flex items-center gap-1.5">
                          <Stars value={s[`avg_${d.key}`]} size="size-3" />
                          <Text as="span" className={cn("text-[11px] font-semibold", ratingTone(s[`avg_${d.key}`]))}>
                            {s[`avg_${d.key}`]?.toFixed(1)}
                          </Text>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                ) : (
                  /* Withheld, and it says WHY. A blank here would read as a
                     page that failed to load its own numbers. */
                  <Text as="p" className="text-[11px] text-text-3">
                    {s.responses === 0
                      ? "No responses yet"
                      : `${s.responses} response${s.responses === 1 ? "" : "s"} — too few to average`}
                  </Text>
                )}
              </Box>
            </Box>
          ))}
        </Box>
      </Card>

      {/* ── The comments ── */}
      <Card className="gap-0 overflow-hidden p-0">
        <Box className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-2.5">
          <Text as="h2" className="text-[13px] font-bold text-ink">
            What people said
          </Text>
          <Box className="flex items-center gap-2">
            <Text as="span" className="text-[11px] text-text-3">
              {data.total} response{data.total === 1 ? "" : "s"}
            </Text>
            <Select value={sessionId} onValueChange={setSessionId}>
              <SelectTrigger className="h-8 w-[15rem] text-[12px]">
                <SelectValue>
                  {sessionId === "all"
                    ? "All sessions"
                    : sessions.find((s) => String(s.session_id) === sessionId)?.title
                      ?? "All sessions"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sessions</SelectItem>
                {sessions
                  .filter((s) => s.responses > 0)
                  .map((s) => (
                    <SelectItem key={s.session_id} value={String(s.session_id)}>
                      {s.title}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </Box>
        </Box>

        {responses.length === 0 ? (
          <Box className="px-4 py-12 text-center">
            <TrendingUp className="mx-auto mb-2 size-6 text-text-3" />
            <Text as="p" className="text-[12.5px] font-semibold text-ink">
              Nothing yet
            </Text>
            <Text as="p" className="mt-0.5 text-[11.5px] text-text-2">
              {sessionId === "all"
                ? "Nobody has rated your completed sessions yet."
                : "Nobody has rated this session yet."}
            </Text>
          </Box>
        ) : (
          <Box className="divide-y divide-line">
            {responses.map((r) => (
              <Box key={r.id} className="px-4 py-3">
                <Box className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                  {FEEDBACK_DIMENSIONS.map((d) => (
                    <Box key={d.key} className="flex items-center gap-1.5">
                      <Text as="span" className="text-[10px] text-text-3">{d.label}</Text>
                      <Stars value={r[d.field]} size="size-3" />
                    </Box>
                  ))}
                  <Text as="span" className="ml-auto text-[10.5px] text-text-3">
                    {r.session_title} · {formatDate(r.created_at)}
                  </Text>
                </Box>

                {r.comment && (
                  <Box className="mt-2 flex items-start gap-2 border-l-2 border-line-strong bg-surface-2 py-1.5 pl-2.5 pr-3">
                    <Quote className="mt-0.5 size-3 shrink-0 text-text-3" />
                    <Text as="p" className="text-[12px] leading-snug text-ink">
                      {r.comment}
                    </Text>
                  </Box>
                )}
              </Box>
            ))}
          </Box>
        )}

        {data.has_more && (
          <Box className="border-t border-line px-4 py-2.5">
            <Text as="p" className="text-[11px] text-text-3">
              Showing {responses.length} of {data.total}. Filter by session to
              narrow the list.
            </Text>
          </Box>
        )}
      </Card>
    </Box>
  );
}
