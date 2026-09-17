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
 * Licensed seats, as the tenant's admin sees them.
 *
 * A seat is an ACTIVE LEARNER — admins, managers and trainers are not seats,
 * and a deactivated learner frees one. Both facts are stated on the panel,
 * because the obvious move for an admin at the cap is to deactivate somebody
 * and they should not have to test whether that works.
 *
 * The limit is set only by Edstellar. What this screen can do is ask, and
 * then show the answer — which is why a replied request keeps its note here
 * rather than vanishing once it is no longer pending.
 */
export function SeatUsagePanel({ state, onChanged }) {
  const [open, setOpen] = useState(false);

  // No limit configured — the panel would be a row saying "unlimited of
  // unlimited". Say it once, quietly, and take up no more room than that.
  if (!state) return null;
  const { seats, requests = [] } = state;

  const pending = requests.find((r) => r.status === "pending");
  const lastAnswered = requests.find((r) => r.status !== "pending");

  if (seats.limit === null) {
    return (
      <Box className="mb-4 flex items-center gap-2.5 border border-line bg-surface px-4 py-2.5">
        <InfinityIcon className="size-4 shrink-0 text-text-3" />
        <Text as="p" className="text-[12px] text-text-2">
          <Text as="span" className="font-semibold text-ink">{seats.used}</Text> active
          learners · no seat limit is set on this account.
        </Text>
      </Box>
    );
  }

  const pct = seats.limit > 0 ? Math.min(100, (seats.used / seats.limit) * 100) : 0;
  const tone = seats.is_full ? "danger" : seats.is_near_limit ? "warning" : "accent";
  const bar =
    tone === "danger" ? "bg-danger" : tone === "warning" ? "bg-warning" : "bg-accent-blue";
  const edge =
    tone === "danger" ? "border-danger/40" : tone === "warning" ? "border-warning/40" : "border-line";

  return (
    <Box className={cn("mb-4 border bg-surface", edge)}>
      <Box className="flex flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3">
        <Box className="flex items-center gap-2.5">
          <Box className={cn("flex size-8 shrink-0 items-center justify-center",
            tone === "danger" ? "tile-rust" : tone === "warning" ? "tile-warning" : "tile-accent")}>
            <Users className="size-4" />
          </Box>
          <Box>
            <Text as="p" className="text-[17px] font-bold leading-none text-ink">
              {seats.used}
              <Text as="span" className="text-[13px] font-semibold text-text-3"> / {seats.limit}</Text>
            </Text>
            <Text as="p" className="mt-1 font-mono text-[10px] uppercase tracking-[0.1em] text-text-3">
              Seats used
            </Text>
          </Box>
        </Box>

        <Box className="min-w-[160px] flex-1">
          <Box className="h-1.5 w-full bg-surface-3">
            <Box className={cn("h-full transition-all", bar)} style={{ width: `${pct}%` }} />
          </Box>
          <Text as="p" className="mt-1.5 text-[11.5px] text-text-2">
            {seats.is_full ? (
              <>
                <Text as="span" className="font-semibold text-danger">No seats left.</Text>{" "}
                Deactivate a learner to free one, or ask for more.
              </>
            ) : (
              <>
                <Text as="span" className="font-semibold text-ink">{seats.remaining}</Text>{" "}
                remaining. Only active learners count — admins and trainers do not.
              </>
            )}
          </Text>
        </Box>

        {pending ? (
          <Box className="flex items-center gap-2 border border-warning/40 bg-[color-mix(in_oklab,var(--spectra-warning)_8%,transparent)] px-3 py-1.5">
            <Clock className="size-3.5 shrink-0 text-warning" />
            <Text as="span" className="text-[11.5px] text-ink">
              Waiting on Edstellar — you asked for{" "}
              <Text as="span" className="font-bold">{pending.requested_seats}</Text>
            </Text>
          </Box>
        ) : (
          <Button
            onClick={() => setOpen(true)}
            className="h-8 cursor-pointer gap-1.5 rounded-none bg-navy px-3 text-[12px] font-bold text-accent-soft hover:bg-accent-blue hover:text-white"
          >
            <UserPlus className="size-3.5" />Request more seats
          </Button>
        )}
      </Box>

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
