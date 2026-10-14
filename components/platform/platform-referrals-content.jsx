"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, Gift, Mail, Search, Send } from "lucide-react";

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
  fetchPlatformReferral,
  fetchPlatformReferrals,
  fetchTenants,
  respondToReferral,
} from "@/services/api/platform/platform-api";
import { REFERRAL_STATUSES, statusOf } from "@/lib/referrals";
import { cn } from "@/lib/utils";

/**
 * Edstellar's own queue — every tenant's customer referral in one place.
 *
 * Behind `@PlatformAdmin()`. A tenant files and reads its own referrals; only
 * Edstellar reads all of them, and only Edstellar can move one past `invited`
 * or mark it converted (BACKEND_STRUCTURE §10.36).
 */
export function PlatformReferralsContent() {
  const { user } = useAuth();

  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      setData(await fetchPlatformReferrals());
      setError(null);
    } catch (e) {
      setError(e.message);
      setData({ referrals: [], counts: { total: 0 } });
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const rows = data?.referrals ?? [];

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const matchesStatus = statusFilter === "all" || r.status === statusFilter;
      const matchesSearch =
        !q ||
        r.ref_no.toLowerCase().includes(q) ||
        r.company_name.toLowerCase().includes(q) ||
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
      <Box className="grid gap-px border border-line bg-line sm:grid-cols-3 xl:grid-cols-5">
        <Kpi value={data.counts.total} label="Total referrals" />
        <Kpi value={data.counts.invited} label="Invited" />
        <Kpi value={data.counts.contacted} label="Contacted" tone="accent" />
        <Kpi value={data.counts.qualified} label="Qualified" tone="warning" />
        <Kpi value={data.counts.converted} label="Converted" tone="success" />
      </Box>

      {error && (
        <Box className="border border-danger/30 bg-danger/10 px-3 py-2">
          <Text as="p" className="text-[12.5px] text-danger">{error}</Text>
        </Box>
      )}

      <Box className="flex flex-wrap items-center gap-2">
        <Box className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-text-3" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ref, tenant, company, contact…"
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
            {REFERRAL_STATUSES.map((s) => (
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
          <Gift className="mx-auto mb-3 size-8 text-text-3" />
          <Text as="h3" className="text-[14px] font-bold text-ink">
            {rows.length === 0 ? "No referrals yet" : "Nothing matches those filters"}
          </Text>
          <Text as="p" className="mx-auto mt-1.5 max-w-md text-[12.5px] text-text-2">
            {rows.length === 0
              ? "When a tenant admin refers a company it lands here."
              : "Clear the search or widen the status filter."}
          </Text>
        </Box>
      ) : (
        <Box className="overflow-x-auto border border-line bg-surface">
          <table className="w-full min-w-[900px] border-collapse">
            <thead>
              <tr className="border-b border-line bg-surface-2">
                {["Ref no.", "Referred by", "Company", "Contact", "Submitted", "Status", ""]
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
                    <td className="px-3.5 py-2.5 text-[12.5px] text-ink">{r.company_name}</td>
                    <td className="px-3.5 py-2.5">
                      <Text as="p" className="text-[12px] text-ink">{r.contact_name}</Text>
                      <Text as="p" className="text-[11px] text-text-3">{r.contact_email}</Text>
                    </td>
                    <td className="px-3.5 py-2.5 text-[11.5px] text-text-3">
                      {r.created_at?.slice(0, 10)}
                    </td>
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

      {openId && (
        <ReferralDialog
          referralId={openId}
          onClose={() => setOpenId(null)}
          onSaved={load}
        />
      )}
    </Box>
  );
}

function Kpi({ value, label, tone }) {
  return (
    <Box className="bg-surface px-4 py-3">
      <Text
        as="p"
        className={cn(
          "text-xl font-bold leading-none",
          tone === "success" && Number(value) > 0 ? "text-success" : "text-ink",
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

/* ── One referral, with its detail and the response box ──────────────────── */

function ReferralDialog({ referralId, onClose, onSaved }) {
  const [referral, setReferral] = useState(null);
  const [status, setStatus] = useState("invited");
  const [note, setNote] = useState("");
  const [convertedOrg, setConvertedOrg] = useState("");
  const [tenants, setTenants] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    fetchPlatformReferral({ referralId })
      .then((d) => {
        if (!alive) return;
        setReferral(d.referral);
        setStatus(d.referral.status);
        setNote(d.referral.platform_note ?? "");
        setConvertedOrg(
          d.referral.converted_organization_id
            ? String(d.referral.converted_organization_id)
            : "",
        );
      })
      .catch((e) => alive && setError(e.message));
    return () => { alive = false; };
  }, [referralId]);

  // The tenant list for the conversion link — fetched once, lazily, the first
  // time the admin marks this converted.
  useEffect(() => {
    if (status !== "converted" || tenants !== null) return;
    fetchTenants()
      .then((d) => setTenants(d.tenants ?? d ?? []))
      .catch(() => setTenants([]));
  }, [status, tenants]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await respondToReferral({
        referralId,
        data: {
          status,
          platform_note: note.trim() || null,
          converted_organization_id:
            status === "converted" && convertedOrg
              ? Number(convertedOrg)
              : null,
        },
      });
      onClose();
      await onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!saving && !o) onClose(); }}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{referral ? referral.company_name : "Loading…"}</DialogTitle>
        </DialogHeader>

        {!referral ? (
          <Text as="p" className="py-8 text-center text-[12.5px] text-text-3">Loading…</Text>
        ) : (
          <Box className="space-y-4">
            <Box className="grid gap-px border border-line bg-line sm:grid-cols-2">
              <Field label="Reference" value={referral.ref_no} mono />
              <Field label="Referred by" value={referral.organization_name} />
              <Field label="Referrer" value={`${referral.referrer_name} · ${referral.referrer_email}`} />
              <Field label="Submitted" value={referral.created_at?.slice(0, 10)} />
              <Field label="Contact" value={`${referral.contact_name} · ${referral.contact_email}`} />
              <Field label="Phone" value={referral.contact_phone ?? "—"} />
              <Field label="Industry" value={referral.industry ?? "—"} />
              <Field label="Country" value={referral.country ?? "—"} />
              <Field label="Team size" value={referral.team_size ?? "—"} />
              <Field
                label="Converted to"
                value={referral.converted_organization_name ?? "—"}
              />
            </Box>

            {referral.notes && (
              <Box>
                <Text as="p" className="mb-2 border-b border-line pb-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-text-3">
                  Why they would be a fit
                </Text>
                <Text as="p" className="text-[12.5px] text-ink">{referral.notes}</Text>
              </Box>
            )}

            <Box className="space-y-3 border border-line bg-surface-2 p-3.5">
              <Text as="p" className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-text-3">
                Edstellar&apos;s response
              </Text>
              <Box className="space-y-1.5">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue>{statusOf(status).label}</SelectValue></SelectTrigger>
                  <SelectContent>
                    {REFERRAL_STATUSES.map((s) => (
                      <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Box>

              {status === "converted" && (
                <Box className="space-y-1.5">
                  <Label>Link to the customer organization (optional)</Label>
                  <Select
                    value={convertedOrg || "none"}
                    onValueChange={(v) => setConvertedOrg(v === "none" ? "" : v)}
                  >
                    <SelectTrigger>
                      <SelectValue>
                        {convertedOrg
                          ? (tenants ?? []).find((t) => String(t.id) === convertedOrg)?.name ?? "Selected"
                          : "Not linked yet"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not linked yet</SelectItem>
                      {(tenants ?? []).map((t) => (
                        <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Text as="p" className="text-[10.5px] text-text-3">
                    Marking converted rewards the referrer and tells them their
                    referral became a customer.
                  </Text>
                </Box>
              )}

              <Box className="space-y-1.5">
                <Label>Note back to the referrer</Label>
                <Textarea
                  rows={3}
                  value={note}
                  maxLength={1000}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Intro call booked for 24 Oct with their L&D lead."
                />
                <Text as="p" className="inline-flex items-center gap-1.5 text-[10.5px] text-text-3">
                  <Mail className="size-3" />
                  The referring admin reads this on their own referral.
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
            disabled={saving || !referral}
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
