"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2, CheckCircle2, Inbox, Mail, UserPlus, XCircle,
} from "lucide-react";

import Box from "@/components/ui/box";
import Text from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { fetchSeatRequests, respondToSeatRequest } from "@/services/api/platform/platform-api";
import { SEAT_REQUEST_STATUS } from "@/lib/tenant-account";
import { cn } from "@/lib/utils";

const FILTERS = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "declined", label: "Declined" },
  { key: "", label: "All" },
];

/**
 * Seat requests, across every tenant.
 *
 * Approving here WRITES `organizations.seat_limit` — it is not a status
 * change with a follow-up task. That is stated on the dialog, because the
 * difference between "recorded your decision" and "the tenant can now add
 * thirty people" is the whole feature.
 */
export function SeatRequestsContent() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState("pending");
  const [error, setError] = useState(null);
  const [target, setTarget] = useState(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      setData(await fetchSeatRequests());
      setError(null);
    } catch (e) {
      setError(e.message);
      setData({ requests: [], counts: {} });
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const rows = useMemo(
    () => (data?.requests ?? []).filter((r) => !filter || r.status === filter),
    [data, filter],
  );

  if (!data) {
    return (
      <Box className="space-y-4">
        <Skeleton className="h-[74px] w-full" />
        <Skeleton className="h-[300px] w-full" />
      </Box>
    );
  }

  const counts = data.counts;

  return (
    <Box className="space-y-4">
      {error && (
        <Box className="border border-danger/30 bg-danger/10 px-3 py-2">
          <Text as="p" className="text-[12.5px] text-danger">{error}</Text>
        </Box>
      )}

      <Box className="grid gap-px border border-line bg-line sm:grid-cols-4">
        <Kpi value={counts.total ?? 0} label="Total" />
        <Kpi value={counts.pending ?? 0} label="Pending" tone="warning" />
        <Kpi value={counts.approved ?? 0} label="Approved" tone="success" />
        <Kpi value={counts.declined ?? 0} label="Declined" tone="danger" />
      </Box>

      <Box className="flex flex-wrap gap-px border border-line bg-line">
        {FILTERS.map((f) => (
          <button
            key={f.key || "all"}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              "cursor-pointer px-4 py-2 text-[12px] font-semibold transition-colors",
              filter === f.key
                ? "bg-navy text-accent-soft"
                : "bg-surface text-text-2 hover:bg-surface-2",
            )}
          >
            {f.label}
            {f.key && counts[f.key] > 0 ? ` (${counts[f.key]})` : ""}
          </button>
        ))}
      </Box>

      {rows.length === 0 ? (
        <Box className="border border-dashed border-line-strong bg-surface px-6 py-16 text-center">
          <Inbox className="mx-auto mb-3 size-8 text-text-3" />
          <Text as="p" className="text-[13px] font-semibold text-ink">
            {filter === "pending" ? "Nothing waiting" : "No requests here"}
          </Text>
          <Text as="p" className="mt-1 text-[12px] text-text-3">
            A tenant raises one from Manage Users when they run out of seats.
          </Text>
        </Box>
      ) : (
        <Box className="space-y-3">
          {rows.map((r) => (
            <RequestCard key={r.id} request={r} onRespond={() => setTarget(r)} />
          ))}
        </Box>
      )}

      {target && (
        <RespondDialog
          request={target}
          onClose={() => setTarget(null)}
          onSaved={load}
        />
      )}
    </Box>
  );
}

function Kpi({ value, label, tone }) {
  const colour =
    tone === "warning" ? "text-warning"
      : tone === "success" ? "text-success"
      : tone === "danger" ? "text-danger" : "text-ink";
  return (
    <Box className="bg-surface px-4 py-3">
      <Text as="p" className={cn("text-[17px] font-bold leading-none", colour)}>{value}</Text>
      <Text as="p" className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-text-3">
        {label}
      </Text>
    </Box>
  );
}

function RequestCard({ request: r, onRespond }) {
  const s = SEAT_REQUEST_STATUS[r.status] ?? SEAT_REQUEST_STATUS.pending;
  const from = r.current_limit === null ? "unlimited" : r.current_limit;

  return (
    <Box className="border border-line bg-surface">
      <Box className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-2.5">
        <Building2 className="size-4 shrink-0 text-accent-blue" />
        <Text as="span" className="min-w-0 flex-1 truncate text-[13px] font-bold text-ink">
          {r.organization_name}
        </Text>
        <Text as="span" className={cn("chip shrink-0", s.chip)}>{s.label}</Text>
        <Text as="span" className="shrink-0 text-[11px] text-text-3">
          {new Date(r.created_at).toLocaleDateString("en-IN", {
            day: "numeric", month: "short", year: "numeric",
          })}
        </Text>
      </Box>

      <Box className="grid gap-px bg-line sm:grid-cols-4">
        <Fact label="Current limit" value={String(from)} />
        <Fact label="In use when asked" value={String(r.current_used)} />
        <Fact label="Requested" value={String(r.requested_seats)} strong />
        <Fact
          label="Granted"
          value={r.approved_seats === null || r.approved_seats === undefined
            ? "—" : String(r.approved_seats)}
          strong={r.approved_seats !== null && r.approved_seats !== undefined}
        />
      </Box>

      <Box className="space-y-2.5 px-4 py-3">
        {r.reason && (
          <Box>
            <Text as="p" className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-text-3">
              Why they need them
            </Text>
            <Text as="p" className="mt-1 text-[12.5px] leading-relaxed text-ink">{r.reason}</Text>
          </Box>
        )}

        {r.response_note && (
          <Box className="border-l-2 border-accent-blue bg-accent-tint px-3 py-2">
            <Text as="p" className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-text-3">
              Our reply — the tenant reads this
            </Text>
            <Text as="p" className="mt-1 text-[12.5px] leading-relaxed text-ink">
              {r.response_note}
            </Text>
          </Box>
        )}

        <Box className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
          <Box className="flex items-center gap-1.5">
            <Mail className="size-3 text-text-3" />
            <Text as="span" className="text-[11.5px] text-text-2">
              {r.contact_name} · {r.contact_email}
            </Text>
          </Box>
          {r.status === "pending" ? (
            <Button
              onClick={onRespond}
              className="h-8 cursor-pointer gap-1.5 rounded-none bg-navy px-3 text-[12px] font-bold text-accent-soft hover:bg-accent-blue hover:text-white"
            >
              <UserPlus className="size-3.5" />Decide
            </Button>
          ) : (
            <Text as="span" className="text-[11.5px] text-text-3">
              Answered — a tenant may raise a new request.
            </Text>
          )}
        </Box>
      </Box>
    </Box>
  );
}

function Fact({ label, value, strong = false }) {
  return (
    <Box className="bg-surface px-4 py-2.5">
      <Text as="p" className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-text-3">
        {label}
      </Text>
      <Text
        as="p"
        className={cn("mt-0.5 text-[14px]", strong ? "font-bold text-ink" : "text-text-2")}
      >
        {value}
      </Text>
    </Box>
  );
}

/* ── Decide ──────────────────────────────────────────────────────────────── */

function RespondDialog({ request: r, onClose, onSaved }) {
  const [decision, setDecision] = useState("approved");
  const [granted, setGranted] = useState(String(r.requested_seats));
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const grantedNum = Number(granted);
  const belowUsed = decision === "approved" && grantedNum < r.current_used;

  async function save() {
    setSaving(true); setError(null);
    try {
      await respondToSeatRequest({
        requestId: r.id,
        data: {
          status: decision,
          approved_seats: decision === "approved" ? grantedNum : undefined,
          response_note: note.trim() || null,
        },
      });
      onClose();
      await onSaved();
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{r.organization_name} — seat request</DialogTitle>
        </DialogHeader>

        <Box className="space-y-4">
          <Box className="grid gap-px border border-line bg-line sm:grid-cols-3">
            <Fact
              label="Current limit"
              value={r.current_limit === null ? "Unlimited" : String(r.current_limit)}
            />
            <Fact label="In use" value={String(r.current_used)} />
            <Fact label="Asked for" value={String(r.requested_seats)} strong />
          </Box>

          <Box className="grid grid-cols-2 gap-px border border-line bg-line">
            <button
              type="button"
              onClick={() => setDecision("approved")}
              className={cn(
                "flex cursor-pointer items-center justify-center gap-2 px-4 py-2.5 text-[12.5px] font-bold transition-colors",
                decision === "approved"
                  ? "bg-success text-white"
                  : "bg-surface text-text-2 hover:bg-surface-2",
              )}
            >
              <CheckCircle2 className="size-4" />Approve
            </button>
            <button
              type="button"
              onClick={() => setDecision("declined")}
              className={cn(
                "flex cursor-pointer items-center justify-center gap-2 px-4 py-2.5 text-[12.5px] font-bold transition-colors",
                decision === "declined"
                  ? "bg-danger text-white"
                  : "bg-surface text-text-2 hover:bg-surface-2",
              )}
            >
              <XCircle className="size-4" />Decline
            </button>
          </Box>

          {decision === "approved" && (
            <Box className="space-y-1.5">
              <Label>Seats to grant</Label>
              <Input
                type="number" min={r.current_used} value={granted}
                onChange={(e) => setGranted(e.target.value)}
              />
              {/* Approving is the write. Say so — the difference between
                  recording a decision and changing what the tenant can do. */}
              <Text as="p" className="text-[10.5px] text-text-3">
                Saving sets this tenant&apos;s limit to {granted || "—"} immediately.
                You may grant fewer than they asked; they see both numbers.
              </Text>
              {belowUsed && (
                <Text as="p" className="text-[11px] font-semibold text-danger">
                  They had {r.current_used} active learners when they asked —
                  granting fewer would put them over their own limit, and the
                  API will refuse it.
                </Text>
              )}
            </Box>
          )}

          <Box className="space-y-1.5">
            <Label>Reply to the tenant</Label>
            <Textarea
              rows={3} maxLength={450} value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                decision === "approved"
                  ? "e.g. Approved at 30 seats, billed from the next cycle."
                  : "e.g. Your contract caps you at 25 — let's talk about an upgrade."
              }
            />
            <Text as="p" className="text-[10.5px] text-text-3">
              This is shown to their admin in Manage Users.
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
            disabled={saving || belowUsed}
            className={cn(
              "cursor-pointer rounded-none text-white",
              decision === "approved"
                ? "bg-success hover:bg-success/90"
                : "bg-danger hover:bg-danger/90",
            )}
          >
            {saving ? "Saving…" : decision === "approved" ? "Approve & set limit" : "Decline"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
