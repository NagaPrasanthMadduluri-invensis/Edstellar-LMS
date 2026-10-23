"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, FilePenLine, Send, ShieldCheck, Trash2 } from "lucide-react";

import Box from "@/components/ui/box";
import Text from "@/components/ui/text";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
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
import { PRIVACY_POLICY_URL } from "@/lib/consent";
import {
  DATA_COUNT_LABELS,
  DATA_REQUEST_TYPES,
  statusLabel,
  statusTone,
  typeLabel,
} from "@/lib/data-requests";
import {
  createDataRequest,
  downloadMyData,
  fetchMyData,
  fetchMyDataRequests,
} from "@/services/api/learner/data-privacy-api";

export function MyDataContent() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [requests, setRequests] = useState(null);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);

  async function load() {
    try {
      const [s, r] = await Promise.all([fetchMyData(), fetchMyDataRequests()]);
      setSummary(s);
      setRequests(r.requests ?? []);
      setError(null);
    } catch (e) {
      setError(e.message);
      setSummary((prev) => prev ?? { counts: {}, note: null });
      setRequests((prev) => prev ?? []);
    }
  }

  useEffect(() => {
    if (user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (!summary || !requests) {
    return (
      <Box className="space-y-5">
        <Skeleton className="h-28 w-full rounded-lg" />
        <Box className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </Box>
        <Skeleton className="h-40 w-full rounded-lg" />
      </Box>
    );
  }

  return (
    <Box className="space-y-6">
      {error && (
        <Card className="p-4">
          <Text as="p" className="text-sm text-error">{error}</Text>
        </Card>
      )}

      <ExportCard note={summary.note} />
      <HoldingGrid counts={summary.counts ?? {}} />

      <Box className="space-y-3">
        <Box className="flex flex-wrap items-center justify-between gap-3">
          <Box>
            <Text as="p" className="font-semibold text-ink">Your requests</Text>
            <Text as="p" className="text-sm text-ink/60">
              Corrections and deletions are reviewed by an administrator. They
              are not applied instantly.
            </Text>
          </Box>
          <Button
            onClick={() => setOpen(true)}
            className="cursor-pointer gap-1.5 rounded-none bg-navy text-accent-soft hover:bg-accent-blue hover:text-white"
          >
            <FilePenLine className="size-4" />
            New request
          </Button>
        </Box>

        {requests.length === 0 ? (
          <Card className="p-8 text-center">
            <ShieldCheck className="mx-auto mb-3 size-8 text-ink/30" />
            <Text as="p" className="font-semibold text-ink">No requests yet</Text>
            <Text as="p" className="mx-auto mt-1 max-w-md text-sm text-ink/60">
              If something we hold about you is wrong, or you want it removed,
              file a request and an administrator will review it.
            </Text>
          </Card>
        ) : (
          <Box className="space-y-3">
            {requests.map((r) => (
              <RequestRow key={r.id} request={r} />
            ))}
          </Box>
        )}
      </Box>

      {open && (
        <RequestDialog
          onClose={() => setOpen(false)}
          onSaved={async () => {
            setOpen(false);
            await load();
          }}
        />
      )}
    </Box>
  );
}

function ExportCard({ note }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function download() {
    setBusy(true);
    setError(null);
    try {
      await downloadMyData();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-5">
      <Box className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Box className="min-w-0">
          <Text as="p" className="font-semibold text-ink">Download your data</Text>
          <Text as="p" className="mt-1 text-sm text-ink/60">
            Get a copy of everything we hold about you as a JSON file.
          </Text>
          {note && (
            <Text as="p" className="mt-2 text-xs text-ink/50">{note}</Text>
          )}
          <Text as="p" className="mt-2 text-xs text-ink/50">
            See our{" "}
            <Link
              href={PRIVACY_POLICY_URL}
              target="_blank"
              className="font-medium text-accent-blue underline-offset-2 hover:underline"
            >
              Privacy Policy
            </Link>{" "}
            for how we handle your data.
          </Text>
          {error && (
            <Text as="p" className="mt-2 text-sm text-error">{error}</Text>
          )}
        </Box>
        <Button
          onClick={download}
          disabled={busy}
          className="cursor-pointer gap-1.5 rounded-none bg-navy text-accent-soft hover:bg-accent-blue hover:text-white"
        >
          <Download className="size-4" />
          {busy ? "Preparing…" : "Download my data"}
        </Button>
      </Box>
    </Card>
  );
}

function HoldingGrid({ counts }) {
  const keys = Object.keys(DATA_COUNT_LABELS);
  return (
    <Box className="space-y-3">
      <Box>
        <Text as="p" className="font-semibold text-ink">What we hold</Text>
        <Text as="p" className="text-sm text-ink/60">
          The number of records linked to your account, by kind.
        </Text>
      </Box>
      <Box className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {keys.map((k) => (
          <Card key={k} className="p-4">
            <Text as="p" className="font-mono text-2xl font-bold leading-none text-ink">
              {counts[k] ?? 0}
            </Text>
            <Text as="p" className="mt-1.5 text-xs font-medium text-text-2">
              {DATA_COUNT_LABELS[k]}
            </Text>
          </Card>
        ))}
      </Box>
    </Box>
  );
}

function RequestRow({ request: r }) {
  const Icon = r.type === "deletion" ? Trash2 : FilePenLine;
  return (
    <Card className="p-4">
      <Box className="flex flex-wrap items-start justify-between gap-3">
        <Box className="min-w-0">
          <Box className="flex flex-wrap items-center gap-2">
            <Text as="span" className="inline-flex items-center gap-1.5 font-semibold text-ink">
              <Icon className="size-4 shrink-0 text-ink/40" />
              {typeLabel(r.type)} request
            </Text>
            <Text as="span" className={cn("chip", statusTone(r.status))}>
              {statusLabel(r.status)}
            </Text>
          </Box>
          {r.details && (
            <Text as="p" className="mt-1 text-sm text-ink/70">{r.details}</Text>
          )}
          {r.admin_note && (
            <Box className="mt-2 rounded-md bg-surface-2 px-3 py-2">
              <Text as="p" className="text-xs font-semibold text-ink/60">Administrator note</Text>
              <Text as="p" className="text-xs text-ink/70">{r.admin_note}</Text>
            </Box>
          )}
        </Box>
        <Box className="text-right">
          <Text as="p" className="text-[11px] text-ink/40">
            Filed {r.created_at?.slice(0, 10)}
          </Text>
          {r.handled_at && (
            <Text as="p" className="text-[11px] text-ink/40">
              Handled {r.handled_at.slice(0, 10)}
            </Text>
          )}
        </Box>
      </Box>
    </Card>
  );
}

function RequestDialog({ onClose, onSaved }) {
  const [type, setType] = useState("correction");
  const [details, setDetails] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await createDataRequest({
        data: { type, details: details.trim() || undefined },
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
          <DialogTitle>New data request</DialogTitle>
        </DialogHeader>

        <Box className="space-y-4">
          <Text as="p" className="text-sm text-ink/60">
            An administrator will review your request. Nothing is changed or
            deleted until they have done so.
          </Text>

          <Box className="space-y-1.5">
            <Label>Request type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Choose a type">{typeLabel(type)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {DATA_REQUEST_TYPES.map((t) => (
                  <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Box>

          <Box className="space-y-1.5">
            <Label>Details</Label>
            <Textarea
              rows={4}
              value={details}
              maxLength={DATA_REQUEST_DETAILS_MAX}
              onChange={(e) => setDetails(e.target.value)}
              placeholder={
                type === "deletion"
                  ? "What would you like deleted, and why? (optional)"
                  : "What is wrong, and what should it say? (optional)"
              }
            />
            <Text as="p" className="text-right text-[11px] text-ink/40">
              {details.length}/{DATA_REQUEST_DETAILS_MAX}
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
            <Send className="size-3.5" />
            {saving ? "Sending…" : "Submit request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
