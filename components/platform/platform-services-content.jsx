"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2, Inbox, Mail, Search, Send,
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import {
  fetchPlatformServiceRequest, fetchPlatformServiceRequests,
  respondToServiceRequest,
} from "@/services/api/platform/platform-api";
import {
  REQUEST_STATUSES, SERVICE_GROUPS, formFor, statusOf,
} from "@/lib/edstellar-services";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "requests", label: "Incoming requests" },
  { key: "catalogue", label: "Service catalogue" },
];

/**
 * Edstellar's own queue — every tenant's service request in one place.
 *
 * The counterpart to `/admin/services`, and deliberately a separate page
 * behind `@PlatformAdmin()` rather than the same one widened: a tenant reads
 * and files its own requests, only Edstellar reads all of them, and only
 * Edstellar can move one past `pending` (BACKEND_STRUCTURE §10.14).
 */
export function PlatformServicesContent() {
  const { user } = useAuth();

  const [tab, setTab] = useState("requests");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      setData(await fetchPlatformServiceRequests());
      setError(null);
    } catch (e) {
      setError(e.message);
      setData({ requests: [], counts: { total: 0 } });
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const rows = data?.requests ?? [];

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const matchesStatus = statusFilter === "all" || r.status === statusFilter;
      const matchesSearch =
        !q ||
        r.ref_no.toLowerCase().includes(q) ||
        r.service.toLowerCase().includes(q) ||
        r.organization_name.toLowerCase().includes(q) ||
        r.contact_name.toLowerCase().includes(q) ||
        r.contact_email.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [rows, statusFilter, search]);

  if (!data) {
    return (
      <Box className="space-y-4">
        <Skeleton className="h-[74px] w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-[320px] w-full" />
      </Box>
    );
  }

  return (
    <Box className="space-y-4">
      {/* Counts span EVERY tenant and are not affected by the filters — they
          answer "what is on Edstellar's plate", which a filtered view cannot. */}
      <Box className="grid gap-px border border-line bg-line sm:grid-cols-3 xl:grid-cols-5">
        <Kpi value={data.counts.total} label="Total requests" />
        <Kpi value={data.counts.pending} label="Pending review" tone="warning" />
        <Kpi value={data.counts.in_discussion} label="In discussion" tone="accent" />
        <Kpi value={data.counts.proposal_sent} label="Proposal sent" tone="success" />
        <Kpi value={data.counts.closed} label="Closed" />
      </Box>

      <Box className="flex border border-line bg-surface-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "flex-1 cursor-pointer border-b-2 px-3 py-2.5 text-[13px] transition-colors",
              tab === t.key
                ? "border-navy bg-surface font-bold text-ink"
                : "border-transparent font-semibold text-text-3 hover:bg-surface hover:text-ink",
            )}
          >
            {t.label}
          </button>
        ))}
      </Box>

      {error && (
        <Box className="border border-danger/30 bg-danger/10 px-3 py-2">
          <Text as="p" className="text-[12.5px] text-danger">{error}</Text>
        </Box>
      )}

      {tab === "requests" ? (
        <>
          <Box className="flex flex-wrap items-center gap-2">
            <Box className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-text-3" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search ref, tenant, service, contact…"
                className="h-9 bg-surface pl-8 text-[12.5px]"
              />
            </Box>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-[170px] text-[12.5px]">
                <SelectValue>
                  {statusFilter === "all" ? "All statuses" : statusOf(statusFilter).label}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {REQUEST_STATUSES.map((s) => (
                  <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Text as="p" className="text-[12px] text-text-3">
              {visible.length} of {rows.length}
            </Text>
          </Box>

          {visible.length === 0 ? (
            <Box className="border border-dashed border-line-strong bg-surface px-6 py-16 text-center">
              <Inbox className="mx-auto mb-3 size-8 text-text-3" />
              <Text as="h3" className="text-[14px] font-bold text-ink">
                {rows.length === 0 ? "No requests yet" : "Nothing matches those filters"}
              </Text>
              <Text as="p" className="mx-auto mt-1.5 max-w-md text-[12.5px] text-text-2">
                {rows.length === 0
                  ? "When a tenant admin requests a service it lands here."
                  : "Clear the search or widen the status filter."}
              </Text>
            </Box>
          ) : (
            <Box className="overflow-x-auto border border-line bg-surface">
              <table className="w-full min-w-[900px] border-collapse">
                <thead>
                  <tr className="border-b border-line bg-surface-2">
                    {["Ref no.", "Tenant", "Service", "Contact", "Submitted", "Timeline", "Budget", "Status", ""]
                      .map((h) => (
                        <th
                          key={h}
                          className="px-3.5 py-2.5 text-left font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-text-3"
                        >
                          {h}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r) => {
                    const status = statusOf(r.status);
                    return (
                      <tr key={r.id} className="border-b border-line last:border-b-0 hover:bg-surface-2">
                        <td className="px-3.5 py-2.5 font-mono text-[11.5px] font-bold text-accent-blue">
                          {r.ref_no}
                        </td>
                        <td className="px-3.5 py-2.5">
                          <Text as="span" className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-ink">
                            <Building2 className="size-3.5 shrink-0 text-text-3" />
                            {r.organization_name}
                          </Text>
                        </td>
                        <td className="px-3.5 py-2.5 text-[12.5px] text-ink">{r.service}</td>
                        <td className="px-3.5 py-2.5">
                          <Text as="p" className="text-[12px] text-ink">{r.contact_name}</Text>
                          <Text as="p" className="text-[11px] text-text-3">{r.contact_email}</Text>
                        </td>
                        <td className="px-3.5 py-2.5 text-[11.5px] text-text-3">
                          {r.created_at?.slice(0, 10)}
                        </td>
                        <td className="px-3.5 py-2.5 text-[11.5px] text-text-2">{r.timeline ?? "—"}</td>
                        <td className="px-3.5 py-2.5 text-[11.5px] text-text-2">{r.budget ?? "—"}</td>
                        <td className="px-3.5 py-2.5">
                          <Text as="span" className={cn("chip", status.chip)}>{status.label}</Text>
                        </td>
                        <td className="px-3.5 py-2.5 text-right">
                          <Button
                            variant="outline"
                            onClick={() => setOpenId(r.id)}
                            className="h-7 cursor-pointer rounded-none px-2.5 text-[11.5px]"
                          >
                            Open
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Box>
          )}
        </>
      ) : (
        <CatalogueTab />
      )}

      {openId && (
        <RequestDialog
          requestId={openId}
          onClose={() => setOpenId(null)}
          onSaved={load}
        />
      )}
    </Box>
  );
}

const TONE = { accent: "tile-accent", success: "tile-success", warning: "tile-warning" };

function Kpi({ value, label, tone }) {
  return (
    <Box className="bg-surface px-4 py-3">
      <Text
        as="p"
        className={cn(
          "text-xl font-bold leading-none",
          tone === "warning" && Number(value) > 0 ? "text-warning" : "text-ink",
        )}
      >
        {value ?? 0}
      </Text>
      <Text as="p" className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-text-3">
        {label}
      </Text>
    </Box>
  );
}

/* ── One request, with its whole questionnaire and the reply box ─────────── */

function RequestDialog({ requestId, onClose, onSaved }) {
  const [request, setRequest] = useState(null);
  const [status, setStatus] = useState("pending");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    fetchPlatformServiceRequest({ requestId })
      .then((d) => {
        if (!alive) return;
        setRequest(d.request);
        setStatus(d.request.status);
        setNote(d.request.response_note ?? "");
      })
      .catch((e) => alive && setError(e.message));
    return () => { alive = false; };
  }, [requestId]);

  /**
   * The questionnaire, labelled.
   *
   * `answers` is stored as a document keyed by question id (§10.14), so the
   * labels come from the same question set the tenant filled in — otherwise
   * this reads as `dept_scope: "Sales"` and somebody at Edstellar has to guess
   * what was asked.
   */
  const answers = useMemo(() => {
    if (!request) return [];
    const config = formFor(findFormKey(request.service));
    const labels = new Map();
    for (const section of config.sections) {
      for (const field of section.fields) {
        if (field.id) labels.set(field.id, field.label);
        if (field.condField?.id) labels.set(field.condField.id, field.condField.label);
      }
    }
    return Object.entries(request.answers ?? {})
      .filter(([, v]) => v !== null && v !== "" && !(Array.isArray(v) && v.length === 0))
      .map(([k, v]) => ({
        label: labels.get(k) ?? k,
        value: Array.isArray(v) ? v.join(", ") : String(v),
      }));
  }, [request]);

  async function save() {
    setSaving(true); setError(null);
    try {
      await respondToServiceRequest({
        requestId,
        data: { status, response_note: note.trim() || null },
      });
      onClose();
      await onSaved();
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{request ? request.service : "Loading…"}</DialogTitle>
        </DialogHeader>

        {!request ? (
          <Text as="p" className="py-8 text-center text-[12.5px] text-text-3">Loading…</Text>
        ) : (
          <Box className="space-y-4">
            <Box className="grid gap-px border border-line bg-line sm:grid-cols-2">
              <Field label="Reference" value={request.ref_no} mono />
              <Field label="Tenant" value={request.organization_name} />
              <Field label="Raised by" value={`${request.contact_name} · ${request.contact_email}`} />
              <Field label="Submitted" value={request.created_at?.slice(0, 10)} />
              <Field label="Timeline" value={request.timeline ?? "—"} />
              <Field label="Budget" value={request.budget ?? "—"} />
            </Box>

            <Box>
              <Text as="p" className="mb-2 border-b border-line pb-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-text-3">
                What they asked for
              </Text>
              {answers.length === 0 ? (
                <Text as="p" className="text-[12px] italic text-text-3">
                  No questionnaire answers were submitted.
                </Text>
              ) : (
                <Box className="space-y-2">
                  {answers.map((a) => (
                    <Box key={a.label} className="border-l-2 border-line pl-3">
                      <Text as="p" className="text-[11px] text-text-3">{a.label}</Text>
                      <Text as="p" className="text-[12.5px] text-ink">{a.value}</Text>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>

            <Box className="space-y-3 border border-line bg-surface-2 p-3.5">
              <Text as="p" className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-text-3">
                Edstellar&apos;s response
              </Text>
              <Box className="space-y-1.5">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue>{statusOf(status).label}</SelectValue></SelectTrigger>
                  <SelectContent>
                    {REQUEST_STATUSES.map((s) => (
                      <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Box>
              <Box className="space-y-1.5">
                <Label>Note back to the tenant</Label>
                <Textarea
                  rows={3}
                  value={note}
                  maxLength={1000}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Discovery call booked for 24 Sep with the L&D lead."
                />
                {/* Said plainly, because it is the whole reason this field
                    exists and it is not obvious from a textarea. */}
                <Text as="p" className="inline-flex items-center gap-1.5 text-[10.5px] text-text-3">
                  <Mail className="size-3" />
                  The tenant&apos;s admin reads this on their own request.
                </Text>
              </Box>
            </Box>

            {error && (
              <Box className="border border-danger/30 bg-danger/10 px-3 py-2">
                <Text as="p" className="text-[12.5px] text-danger">{error}</Text>
              </Box>
            )}
          </Box>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button
            onClick={save}
            disabled={saving || !request}
            className="cursor-pointer gap-1.5 rounded-none bg-navy text-accent-soft hover:bg-accent-blue hover:text-white"
          >
            <Send className="size-3.5" />
            {saving ? "Saving…" : "Save response"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value, mono = false }) {
  return (
    <Box className="bg-surface px-3.5 py-2.5">
      <Text as="p" className="font-mono text-[10px] uppercase tracking-[0.1em] text-text-3">
        {label}
      </Text>
      <Text as="p" className={cn("mt-1 text-[12.5px] font-semibold text-ink", mono && "font-mono text-accent-blue")}>
        {value}
      </Text>
    </Box>
  );
}

/** The `formKey` for a service name, so the dialog can label its answers. */
function findFormKey(serviceName) {
  for (const group of SERVICE_GROUPS) {
    for (const sub of group.subGroups) {
      const item = sub.items.find((i) => i.name === serviceName);
      if (item) return item.formKey;
    }
  }
  return "default";
}

/* ── The catalogue, read-only ────────────────────────────────────────────── */

function CatalogueTab() {
  return (
    <Box className="space-y-3">
      <Text as="p" className="text-[12px] text-text-2">
        What tenant admins can request. This is the same catalogue their page
        renders — it is code, not data, so changing it is a deploy rather than
        an edit here.
      </Text>
      {SERVICE_GROUPS.map((g) => (
        <Box key={g.key} className="border border-line bg-surface">
          <Box className="flex items-center justify-between border-b border-line bg-surface-2 px-4 py-2.5">
            <Text as="p" className="text-[13px] font-bold text-ink">{g.group}</Text>
            <Text as="p" className="text-[11px] text-text-3">
              {g.subGroups.reduce((a, s) => a + s.items.length, 0)} services
            </Text>
          </Box>
          <Box className="divide-y divide-line">
            {g.subGroups.map((sub) => (
              <Box key={sub.sub} className="px-4 py-3">
                <Text as="p" className="text-[12px] font-bold text-ink">{sub.sub}</Text>
                <Box className="mt-1.5 flex flex-wrap gap-1.5">
                  {sub.items.map((item) => (
                    <Text key={item.name} as="span" className="chip chip-idle">
                      {item.name}
                    </Text>
                  ))}
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  );
}
