"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ClipboardCheck, Clock, Inbox, Loader2, XCircle } from "lucide-react";

import Box from "@/components/ui/box";
import Text from "@/components/ui/text";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiStatCard } from "@/components/shared/kpi-stat-card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { DATA_REQUEST_DETAILS_MAX } from "@/lib/content-limits";
import {
  DATA_REQUEST_STATUSES,
  statusLabel,
  statusTone,
  typeLabel,
} from "@/lib/data-requests";
import {
  fetchDataRequests,
  respondToDataRequest,
} from "@/services/api/admin/data-requests-api";

const PAGE_SIZE = 50;

export function DataRequestsContent() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState("all");
  const [active, setActive] = useState(null);

  async function load() {
    try {
      setData(await fetchDataRequests({ status, limit: PAGE_SIZE }));
      setError(null);
    } catch (e) {
      setError(e.message);
      setData((prev) => prev ?? { requests: [], counts: {} });
    }
  }

  useEffect(() => {
    if (user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, status]);

  if (!data) {
    return (
      <Box className="space-y-5">
        <Box className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </Box>
        <Skeleton className="h-9 w-48" />
        <Box className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </Box>
      </Box>
    );
  }

  const counts = data.counts ?? {};
  const requests = data.requests ?? [];

  return (
    <Box className="space-y-5">
      <Box className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <KpiStatCard icon={Inbox} tone="warning" value={counts.open ?? 0} label="Open" />
        <KpiStatCard icon={Loader2} tone="accent" value={counts.in_progress ?? 0} label="In progress" />
        <KpiStatCard icon={CheckCircle2} tone="success" value={counts.resolved ?? 0} label="Resolved" />
        <KpiStatCard icon={XCircle} tone="rust" value={counts.rejected ?? 0} label="Rejected" />
        <KpiStatCard icon={ClipboardCheck} tone="accent" value={counts.total ?? 0} label="Total" />
      </Box>

      <Box className="w-full sm:w-56">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="Any status">
              {status === "all" ? "Any status" : statusLabel(status)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any status</SelectItem>
            {DATA_REQUEST_STATUSES.map((s) => (
              <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Box>

      {error && (
        <Card className="p-4">
          <Text as="p" className="text-sm text-error">{error}</Text>
        </Card>
      )}

      {requests.length === 0 ? (
        <Card className="p-10 text-center">
          <Inbox className="mx-auto mb-3 size-8 text-ink/30" />
          <Text as="p" className="font-semibold text-ink">No data requests</Text>
          <Text as="p" className="mx-auto mt-1 max-w-md text-sm text-ink/60">
            Correction and deletion requests from your people will appear here.
          </Text>
        </Card>
      ) : (
        <Box className="space-y-3">
          {requests.map((r) => (
            <RequestRow key={r.id} request={r} onRespond={() => setActive(r)} />
          ))}
        </Box>
      )}

      {active && (
        <RespondDialog
          request={active}
          onClose={() => setActive(null)}
          onSaved={async () => {
            setActive(null);
            await load();
          }}
        />
      )}
    </Box>
  );
}

function RequestRow({ request: r, onRespond }) {
  return (
    <Card className="p-4">
      <Box className="flex flex-wrap items-start justify-between gap-3">
        <Box className="min-w-0">
          <Box className="flex flex-wrap items-center gap-2">
            <Text as="span" className="font-semibold text-ink">{r.subject_name}</Text>
            <Text as="span" className="text-sm text-ink/60">{r.subject_email}</Text>
            <Text as="span" className="chip chip-idle">{typeLabel(r.type)}</Text>
            <Text as="span" className={cn("chip", statusTone(r.status))}>
              {statusLabel(r.status)}
            </Text>
          </Box>
          {r.details && (
            <Text as="p" className="mt-1 text-sm text-ink/70">{r.details}</Text>
          )}
          {r.admin_note && (
            <Box className="mt-2 rounded-md bg-surface-2 px-3 py-2">
              <Text as="p" className="text-xs text-ink/70">{r.admin_note}</Text>
            </Box>
          )}
        </Box>
        <Box className="flex flex-col items-end gap-2">
          <Box className="text-right">
            <Text as="p" className="inline-flex items-center gap-1 text-[11px] text-ink/40">
              <Clock className="size-3" />
              Filed {r.created_at?.slice(0, 10)}
            </Text>
            {r.handled_at && (
              <Text as="p" className="text-[11px] text-ink/40">
                Handled {r.handled_at.slice(0, 10)}
              </Text>
            )}
          </Box>
          <Button variant="outline" size="sm" className="cursor-pointer" onClick={onRespond}>
            Respond
          </Button>
        </Box>
      </Box>
    </Card>
  );
}

function RespondDialog({ request, onClose, onSaved }) {
  const [status, setStatus] = useState(request.status);
  const [note, setNote] = useState(request.admin_note ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await respondToDataRequest({
        requestId: request.id,
        data: { status, admin_note: note.trim() || undefined },
      });
      await onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!saving && !o) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {typeLabel(request.type)} request from {request.subject_name}
          </DialogTitle>
        </DialogHeader>

        <Box className="space-y-4">
          {request.details && (
            <Box className="rounded-md bg-surface-2 px-3 py-2">
              <Text as="p" className="text-sm text-ink/70">{request.details}</Text>
            </Box>
          )}

          <Box className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Status">{statusLabel(status)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {DATA_REQUEST_STATUSES.map((s) => (
                  <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Box>

          <Box className="space-y-1.5">
            <Label>Note to the requester</Label>
            <Textarea
              rows={3}
              value={note}
              maxLength={DATA_REQUEST_DETAILS_MAX}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What was done, or why it was declined (optional)."
            />
            <Text as="p" className="text-right text-[11px] text-ink/40">
              {note.length}/{DATA_REQUEST_DETAILS_MAX}
            </Text>
          </Box>

          {error && (
            <Box className="border border-danger/30 bg-danger/10 px-3 py-2">
              <Text as="p" className="text-sm text-danger">{error}</Text>
            </Box>
          )}
        </Box>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button
            onClick={save}
            disabled={saving}
            className="cursor-pointer gap-1.5 rounded-none bg-navy text-accent-soft hover:bg-accent-blue hover:text-white"
          >
            {saving ? "Saving…" : "Save response"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
