"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Download,
  FilePenLine,
  History,
  Send,
  ShieldCheck,
  ShieldOff,
  Trash2,
} from "lucide-react";

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
  CONSENT_EVENT_LABELS,
  CONSENT_SOURCE_LABELS,
  DATA_COUNT_LABELS,
  DATA_REQUEST_TYPES,
  statusLabel,
  statusTone,
  typeLabel,
} from "@/lib/data-requests";
import {
  createDataRequest,
  downloadMyData,
  fetchMyConsent,
  fetchMyData,
  fetchMyDataRequests,
} from "@/services/api/learner/data-privacy-api";

export function MyDataContent() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [requests, setRequests] = useState(null);
  const [consent, setConsent] = useState(null);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);

  async function load() {
    try {
      const [s, r] = await Promise.all([fetchMyData(), fetchMyDataRequests()]);
      setSummary(s);
      setRequests(r.requests ?? []);
      setError(null);
      // The privacy record is its own read so a failure there cannot hide the
      // export or the requests; the card simply does not render.
      fetchMyConsent().then(setConsent).catch(() => setConsent(null));
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
      {consent && <PrivacyRecord record={consent} />}
      <HoldingGrid counts={summary.counts ?? {}} />

      <Box className="space-y-3">
        <Box className="flex flex-wrap items-center justify-between gap-3">
          <Box>
            <Text as="p" className="font-semibold text-ink">Your requests</Text>
            <Text as="p" className="text-sm text-ink/60">
              Corrections, deletions and consent withdrawals are reviewed by an
              administrator. They are not applied instantly.
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

/**
 * The person's privacy record (0065): which notice they acknowledged, whether a
 * newer one is waiting, and the consent log. Dates are cut from the timestamp
 * rather than parsed, because a Postgres `+00` offset trips `new Date()` in
 * some browsers (screens-shared §10.3.1.15).
 */
function PrivacyRecord({ record }) {
  const { notice, events = [] } = record;
  return (
    <Card className="p-5">
      <Box className="flex flex-wrap items-start justify-between gap-3">
        <Box className="min-w-0">
          <Text as="p" className="font-semibold text-ink">Your privacy record</Text>
          <Text as="p" className="mt-1 text-sm text-ink/60">
            {notice.acknowledged_at
              ? `You acknowledged privacy notice ${notice.acknowledged_version} on ${notice.acknowledged_at.slice(0, 10)}.`
              : "You have not acknowledged a privacy notice yet."}
            {!notice.up_to_date &&
              ` A newer notice (${notice.current_version}) will be shown at your next sign-in.`}
          </Text>
          <Text as="p" className="mt-1 text-xs text-ink/50">
            Change your leaderboard and email choices at any time in My Profile.
          </Text>
        </Box>
        <Text
          as="span"
          className={cn("chip", notice.up_to_date ? "chip-complete" : "chip-warning")}
        >
          {notice.up_to_date ? "Up to date" : "New notice pending"}
        </Text>
      </Box>

      {events.length > 0 && (
        <Box className="mt-4 border-t border-line pt-3">
          <Text as="p" className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-ink/60">
            <History className="size-3.5" />
            Consent history
          </Text>
          <Box as="ul" className="space-y-1.5">
            {events.map((e) => (
              <Box
                as="li"
                key={e.id}
                className="flex flex-wrap items-baseline justify-between gap-x-3 text-xs"
              >
                <Text as="span" className="text-ink">
                  {CONSENT_EVENT_LABELS[e.event] ?? e.event}
                  {describeEvent(e) && (
                    <Text as="span" className="text-ink/60"> · {describeEvent(e)}</Text>
                  )}
                </Text>
                <Text as="span" className="font-mono text-[11px] text-ink/40">
                  {e.created_at?.slice(0, 10)}
                  {e.source ? ` · ${CONSENT_SOURCE_LABELS[e.source] ?? e.source}` : ""}
                </Text>
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Card>
  );
}

/** One plain sentence for an event's details, or null. */
function describeEvent(e) {
  const d = e.details ?? {};
  if (e.event === "acknowledged") {
    const parts = [];
    if (e.notice_version) parts.push(`version ${e.notice_version}`);
    const c = d.choices ?? {};
    if (c.leaderboard_visible !== undefined)
      parts.push(c.leaderboard_visible ? "on leaderboards" : "hidden from leaderboards");
    if (c.recognition_emails !== undefined)
      parts.push(c.recognition_emails ? "recognition emails on" : "recognition emails off");
    return parts.join(", ") || null;
  }
  if (e.event === "choice_changed") {
    if (d.leaderboard_visible !== undefined)
      return d.leaderboard_visible ? "shown on leaderboards" : "hidden from leaderboards";
    if (d.email_all_off) return "all optional emails off";
    if (Array.isArray(d.email_groups_off))
      return d.email_groups_off.length
        ? `emails off for: ${d.email_groups_off.join(", ")}`
        : "all emails on";
  }
  return null;
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
  const Icon =
    r.type === "deletion" ? Trash2 : r.type === "withdrawal" ? ShieldOff : FilePenLine;
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

          {type === "withdrawal" && (
            <Box className="border border-line bg-surface-2 px-3 py-2.5">
              <Text as="p" className="text-xs leading-relaxed text-text-2">
                Two parts of your data work differently. Your optional choices,
                appearing on leaderboards and recognition emails, you can switch
                off yourself straight away in My Profile, with no request
                needed. Your training records are kept by your organization to
                run workplace training, so withdrawing from that part is
                reviewed by your administrator and may mean your account is
                closed. This request and its outcome are recorded in your
                consent history.
              </Text>
            </Box>
          )}

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
                  : type === "withdrawal"
                    ? "What would you like to stop, and why? (optional)"
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
