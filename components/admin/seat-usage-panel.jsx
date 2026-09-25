"use client";

import { useState } from "react";
import { CheckCircle2, Clock, Infinity as InfinityIcon, UserPlus, Users, XCircle } from "lucide-react";

import Box from "@/components/ui/box";
import Text from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { requestMoreSeats } from "@/services/api/admin/admin-api";
import { cn } from "@/lib/utils";

/**
 * The Seat Licence panel, at the top of Manage Users.
 *
 * A seat is an ACTIVE LEARNER. Admins and trainers are shown in the legend
 * but do NOT consume one, and the panel says so in words.
 *
 * That last part is load-bearing. The reference mock adds admin + trainer +
 * learners together into its "20 of 50 used" figure; this does not, because
 * `0028_seat_limits.sql` records why — an organization should never have to
 * choose between an extra trainer and an extra learner. Two readings of the
 * same panel is exactly the kind of ambiguity that gets a customer billed
 * wrongly, so the headline counts learners, the legend marks the other two
 * "no seat", and the footnote repeats it.
 *
 * The allowance itself is set by Edstellar at onboarding and is not editable
 * here. What this screen can do is ask — and then show the answer, which is
 * why a replied request stays on screen rather than vanishing once it is no
 * longer pending.
 */
export function SeatUsagePanel({ state, onChanged }) {
  const [open, setOpen] = useState(false);

  if (!state) return null;
  const { seats, requests = [] } = state;
  const breakdown = seats.breakdown ?? { admins: 0, trainers: 0, learners: seats.used };

  const pending = requests.find((r) => r.status === "pending");
  const lastAnswered = requests.find((r) => r.status !== "pending");

  // No limit configured — a meter reading "unlimited of unlimited" is noise.
  if (seats.limit === null) {
    return (
      <Box className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 border border-line bg-surface px-4 py-2.5">
        <InfinityIcon className="size-4 shrink-0 text-text-3" />
        <Text as="p" className="text-[12px] text-text-2">
          <Text as="span" className="font-semibold text-ink">{seats.used}</Text> active
          learners · no seat limit is set on this account.
        </Text>
        <Roster breakdown={breakdown} muted />
      </Box>
    );
  }

  const pct = seats.limit > 0 ? Math.min(100, (seats.used / seats.limit) * 100) : 0;
  const tone = seats.is_full ? "danger" : seats.is_near_limit ? "warning" : "success";
  const fill =
    tone === "danger" ? "bg-danger" : tone === "warning" ? "bg-warning" : "bg-success";
  const remainingTone =
    tone === "danger" ? "text-danger" : tone === "warning" ? "text-warning" : "text-success";
  // A left rule in the state's colour, the way the reference marks the panel.
  const edge =
    tone === "danger" ? "border-l-danger" : tone === "warning" ? "border-l-warning" : "border-l-success";

  return (
    <Box className={cn("mb-4 border border-line border-l-2 bg-surface", edge)}>
      <Box className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-4 pt-3">
        <Box className="min-w-0">
          <Text as="p" className="text-[13px] font-bold text-ink">
            Seat Licence — {seats.used} of {seats.limit} seats used
          </Text>
          {seats.onboarded_at && (
            <Text as="p" className="mt-0.5 text-[11px] text-text-3">
              onboarded {formatOnboarded(seats.onboarded_at)}
            </Text>
          )}
        </Box>

        <Box className="flex shrink-0 flex-col items-end gap-1.5">
          <Text as="p" className={cn("text-[12.5px] font-bold", remainingTone)}>
            {seats.is_full
              ? "No seats remaining"
              : `${seats.remaining} seat${seats.remaining === 1 ? "" : "s"} remaining`}
          </Text>
          {pending ? (
            <Text as="span" className="inline-flex items-center gap-1.5 border border-warning/40 bg-[color-mix(in_oklab,var(--spectra-warning)_8%,transparent)] px-2 py-1 text-[11px] text-ink">
              <Clock className="size-3 shrink-0 text-warning" />
              Awaiting Edstellar — asked for {pending.requested_seats}
            </Text>
          ) : (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex cursor-pointer items-center gap-1 border border-line bg-surface px-2.5 py-1 text-[11.5px] font-semibold text-text-2 transition-colors hover:bg-accent-blue hover:text-white"
            >
              <UserPlus className="size-3" />Request more seats
            </button>
          )}
        </Box>
      </Box>

      <Box className="px-4 pt-2.5">
        <Box className="h-1.5 w-full bg-surface-3">
          <Box className={cn("h-full transition-all", fill)} style={{ width: `${pct}%` }} />
        </Box>
      </Box>

      <Box className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 pt-2.5">
        <Roster breakdown={breakdown} />
      </Box>

      <Text as="p" className="px-4 pb-3 pt-1.5 text-[11px] text-text-3">
        Your seat allowance is set by Edstellar during onboarding. To change it,
        request more seats above. Only active learners use a seat — deactivating
        one frees it.
      </Text>

      {/* The answer to the last ask stays on screen. An approval that silently
          changed a number would leave the admin guessing whether it landed. */}
      {!pending && lastAnswered && (
        <Box className="flex items-start gap-2.5 border-t border-line bg-surface-2 px-4 py-2.5">
          {lastAnswered.status === "approved"
            ? <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" />
            : <XCircle className="mt-0.5 size-3.5 shrink-0 text-danger" />}
          <Box className="min-w-0">
            <Text as="p" className="text-[11.5px] font-semibold text-ink">
              {lastAnswered.status === "approved"
                ? `Approved — ${lastAnswered.approved_seats} seats granted`
                : `Declined — you asked for ${lastAnswered.requested_seats}`}
            </Text>
            {lastAnswered.response_note && (
              <Text as="p" className="mt-0.5 text-[11.5px] leading-relaxed text-text-2">
                {lastAnswered.response_note}
              </Text>
            )}
          </Box>
        </Box>
      )}

      {open && (
        <RequestSeatsDialog
          seats={seats}
          onClose={() => setOpen(false)}
          onSaved={onChanged}
        />
      )}
    </Box>
  );
}

/**
 * The legend.
 *
 * Admins and trainers are grouped under ONE "no seat" qualifier rather than
 * listed beside the learners as equals. Listed flat — "20 learners · 1 admin ·
 * 1 trainer" — the three read as a sum, which is the reference mock's
 * arithmetic and not this product's rule; and a trailing qualifier after the
 * last item looks like it applies only to that item.
 */
function Roster({ breakdown, muted = false }) {
  const exempt = [
    breakdown.admins ? `${breakdown.admins} admin${breakdown.admins === 1 ? "" : "s"}` : null,
    breakdown.trainers ? `${breakdown.trainers} trainer${breakdown.trainers === 1 ? "" : "s"}` : null,
  ].filter(Boolean);

  return (
    <>
      <Text as="span" className="inline-flex items-center gap-1.5 text-[11.5px] text-text-2">
        <Text as="span" className="size-2.5 shrink-0 bg-success" />
        <Text as="span" className="font-semibold text-ink">
          {breakdown.learners} learner{breakdown.learners === 1 ? "" : "s"}
        </Text>
        {!muted && "using seats"}
      </Text>

      {exempt.length > 0 && (
        <Text as="span" className="inline-flex items-center gap-1.5 text-[11.5px] text-text-3">
          <Text as="span" className="size-2.5 shrink-0 border border-line-strong bg-surface-3" />
          {exempt.join(" and ")} — no seat used
        </Text>
      )}
    </>
  );
}

/** "12 Jan 2024", the reference's format. */
function formatOnboarded(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function RequestSeatsDialog({ seats, onClose, onSaved }) {
  const suggested = (seats.limit ?? seats.used) + 10;
  const [requested, setRequested] = useState(String(suggested));
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const n = Number(requested);
  // Stated before Save rather than discovered as a 422 — the API enforces
  // both, this only means the admin hears it while typing.
  const tooLow = seats.limit !== null && n <= seats.limit;

  async function save() {
    setSaving(true); setError(null);
    try {
      await requestMoreSeats({
        data: { requested_seats: n, reason: reason.trim() || null },
      });
      onClose();
      await onSaved();
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Request more seats</DialogTitle></DialogHeader>

        <Box className="space-y-4">
          <Box className="grid gap-px border border-line bg-line sm:grid-cols-2">
            <Box className="bg-surface px-3 py-2">
              <Text as="p" className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-text-3">
                Current limit
              </Text>
              <Text as="p" className="mt-0.5 text-[13px] font-bold text-ink">{seats.limit}</Text>
            </Box>
            <Box className="bg-surface px-3 py-2">
              <Text as="p" className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-text-3">
                Active learners
              </Text>
              <Text as="p" className="mt-0.5 text-[13px] font-bold text-ink">{seats.used}</Text>
            </Box>
          </Box>

          <Box className="space-y-1.5">
            <Label>New limit you need</Label>
            <Input
              type="number" min={(seats.limit ?? 0) + 1} value={requested}
              onChange={(e) => setRequested(e.target.value)}
            />
            <Text as="p" className="text-[10.5px] text-text-3">
              The TOTAL you want, not how many to add.
            </Text>
            {tooLow && (
              <Text as="p" className="text-[11px] font-semibold text-danger">
                You already have {seats.limit} seats — ask for more than that.
              </Text>
            )}
          </Box>

          <Box className="space-y-1.5">
            <Label>Why you need them</Label>
            <Textarea
              rows={3} maxLength={450} value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Onboarding 12 people into the support team in October."
            />
            <Text as="p" className="text-[10.5px] text-text-3">
              Optional, but a reason is what lets Edstellar approve it without
              coming back to ask. You can have one open request at a time.
            </Text>
          </Box>

          {error && (
            <Box className="border border-danger/30 bg-danger/10 px-3 py-2">
              <Text as="p" className="text-[12.5px] text-danger">{error}</Text>
            </Box>
          )}
        </Box>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button
            onClick={save}
            disabled={saving || tooLow || !n}
            className="cursor-pointer rounded-none bg-navy text-accent-soft hover:bg-accent-blue hover:text-white"
          >
            {saving ? "Sending…" : "Send request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
