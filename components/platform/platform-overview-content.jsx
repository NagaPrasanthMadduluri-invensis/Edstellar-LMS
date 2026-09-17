"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle, Banknote, Building2, CalendarClock, CheckCircle2, Inbox,
  Plus, Receipt, TrendingUp, Users,
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
  createInvoice, fetchInvoices, fetchSeatRequests, fetchTenants,
  recordPayment,
} from "@/services/api/platform/platform-api";
import {
  CONTRACT_STATE, INVOICE_STATE, PAYMENT_METHODS, formatMoney,
} from "@/lib/tenant-account";
import { cn } from "@/lib/utils";

/**
 * Platform Overview — what needs attention, then the money, then the accounts.
 *
 * Ordered by what a super admin opens it to find out. The reference leads with
 * revenue tiles; this leads with the things that are WRONG — overdue invoices,
 * lapsed contracts, waiting requests — because those are the only items on the
 * page that need somebody to do something today.
 */
export function PlatformOverviewContent() {
  const { user } = useAuth();

  const [tenants, setTenants] = useState(null);
  const [billing, setBilling] = useState(null);
  const [seats, setSeats] = useState(null);
  const [error, setError] = useState(null);
  const [payTarget, setPayTarget] = useState(null);
  const [newInvoiceFor, setNewInvoiceFor] = useState(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [t, b, s] = await Promise.all([
        fetchTenants(),
        fetchInvoices(),
        fetchSeatRequests(),
      ]);
      setTenants(t); setBilling(b); setSeats(s);
      setError(null);
    } catch (e) {
      setError(e.message);
      setTenants({ tenants: [], counts: {} });
      setBilling({ invoices: [], totals: {} });
      setSeats({ requests: [], counts: {} });
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  /** Invoices that need chasing — overdue first, then anything unpaid. */
  const needsChasing = useMemo(
    () => (billing?.invoices ?? [])
      .filter((i) => i.state === "overdue" || i.state === "part_paid")
      .sort((a, b) => (a.state === "overdue" ? -1 : 1) - (b.state === "overdue" ? -1 : 1)),
    [billing],
  );

  const renewals = useMemo(
    () => (tenants?.tenants ?? [])
      .filter((t) => t.contract_state === "expiring" || t.contract_state === "expired")
      .sort((a, b) => (a.contract_days_left ?? 0) - (b.contract_days_left ?? 0)),
    [tenants],
  );

  if (!tenants || !billing || !seats) {
    return (
      <Box className="space-y-4">
        <Skeleton className="h-[74px] w-full" />
        <Skeleton className="h-[180px] w-full" />
        <Skeleton className="h-[320px] w-full" />
      </Box>
    );
  }

  const c = tenants.counts;
  const m = billing.totals;
  const pendingSeats = seats.counts.pending ?? 0;
  const attention =
    (m.overdue_count ?? 0) + renewals.length + pendingSeats;

  return (
    <Box className="space-y-4">
      {error && (
        <Box className="border border-danger/30 bg-danger/10 px-3 py-2">
          <Text as="p" className="text-[12.5px] text-danger">{error}</Text>
        </Box>
      )}

      {/* ── Money ── */}
      <Box className="grid gap-px border border-line bg-line sm:grid-cols-2 xl:grid-cols-6">
        <Kpi icon={Building2} tone="accent" value={c.total} label="Tenants" />
        <Kpi icon={Users} tone="accent" value={c.learners} label="Learners" />
        <Kpi icon={TrendingUp} tone="success" value={formatMoney(c.contract_value)} label="Contracted" />
        <Kpi icon={Banknote} tone="success" value={formatMoney(m.collected)} label="Collected" />
        <Kpi
          icon={Receipt} tone="warning"
          value={formatMoney(m.outstanding)} label="Outstanding"
          warn={(m.outstanding ?? 0) > 0}
        />
        <Kpi
          icon={AlertTriangle} tone="rust"
          value={formatMoney(m.overdue_amount)} label="Overdue"
          alert={(m.overdue_amount ?? 0) > 0}
        />
      </Box>

      {/* ── What needs doing. First, because it is why this page is open. ── */}
      {attention === 0 ? (
        <Box className="flex items-center gap-2.5 border border-success/40 bg-success/10 px-4 py-3">
          <CheckCircle2 className="size-4 shrink-0 text-success" />
          <Text as="p" className="text-[12.5px] text-ink">
            Nothing needs attention — no overdue invoices, no contract inside 60
            days, no waiting requests.
          </Text>
        </Box>
      ) : (
        <Box className="grid gap-3 lg:grid-cols-3">
          <AttentionPanel
            icon={Receipt}
            tone={m.overdue_count > 0 ? "danger" : "muted"}
            count={m.overdue_count ?? 0}
            title="Overdue invoices"
            body={
              m.overdue_count > 0
                ? `${formatMoney(m.overdue_amount)} past its due date.`
                : "Everything issued is inside its terms."
            }
          />
          <AttentionPanel
            icon={CalendarClock}
            tone={renewals.length > 0 ? "warning" : "muted"}
            count={renewals.length}
            title="Contracts to renew"
            body={
              renewals.length > 0
                ? "Expiring within 60 days, or already lapsed. Nothing stops automatically."
                : "No contract is inside its renewal window."
            }
            href="/platform/tenants"
          />
          <AttentionPanel
            icon={Inbox}
            tone={pendingSeats > 0 ? "accent" : "muted"}
            count={pendingSeats}
            title="Seat requests"
            body={
              pendingSeats > 0
                ? "A tenant is capped and waiting on a decision."
                : "No tenant is waiting on more seats."
            }
            href="/platform/seats"
          />
        </Box>
      )}

      {/* ── Renewals, named ── */}
      {renewals.length > 0 && (
        <Panel title="Contracts needing a decision" sub="Soonest first">
          <Box className="divide-y divide-line">
            {renewals.map((t) => {
              const cs = CONTRACT_STATE[t.contract_state];
              return (
                <Box key={t.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                  <Text as="span" className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-ink">
                    {t.name}
                  </Text>
                  <Text as="span" className={cn("chip shrink-0", cs.chip)}>{cs.label}</Text>
                  <Text as="span" className={cn("shrink-0 text-[12px] font-semibold", cs.text)}>
                    {t.contract_state === "expired"
                      ? `${Math.abs(t.contract_days_left)} days ago`
                      : `in ${t.contract_days_left} days`}
                  </Text>
                  <Text as="span" className="shrink-0 text-[12px] text-text-2">
                    {formatMoney(t.contract_value)}
                  </Text>
                </Box>
              );
            })}
          </Box>
        </Panel>
      )}

      {/* ── Invoices to chase ── */}
      <Panel
        title="Invoices to chase"
        sub={needsChasing.length ? "Overdue and part-paid" : "Nothing outstanding"}
      >
        {needsChasing.length === 0 ? (
          <Text as="p" className="px-4 py-8 text-center text-[12.5px] text-text-3">
            Every issued invoice is paid or still inside its terms.
          </Text>
        ) : (
          <Box className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse">
              <thead>
                <tr className="border-b border-line bg-surface-2">
                  {["Invoice", "Tenant", "Issued", "Due", "Amount", "Paid", "Outstanding", "State", ""]
                    .map((h) => (
                      <th key={h} className="px-3.5 py-2.5 text-left font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-text-3">
                        {h}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {needsChasing.map((i) => (
                  <tr key={i.id} className="border-b border-line last:border-b-0">
                    <td className="px-3.5 py-2.5 font-mono text-[11.5px] font-bold text-accent-blue">{i.invoice_no}</td>
                    <td className="px-3.5 py-2.5 text-[12.5px] text-ink">{i.organization_name}</td>
                    <td className="px-3.5 py-2.5 text-[11.5px] text-text-3">{i.issue_date}</td>
                    <td className="px-3.5 py-2.5 text-[11.5px] text-text-3">{i.due_date}</td>
                    <td className="px-3.5 py-2.5 text-[12px] text-ink">{formatMoney(i.amount)}</td>
                    <td className="px-3.5 py-2.5 text-[12px] text-text-2">{formatMoney(i.paid)}</td>
                    <td className="px-3.5 py-2.5 text-[12px] font-bold text-ink">{formatMoney(i.outstanding)}</td>
                    <td className="px-3.5 py-2.5">
                      <Text as="span" className={cn("chip", INVOICE_STATE[i.state].chip)}>
                        {INVOICE_STATE[i.state].label}
                      </Text>
                    </td>
                    <td className="px-3.5 py-2.5 text-right">
                      <Button
                        variant="outline"
                        onClick={() => setPayTarget(i)}
                        className="h-7 cursor-pointer rounded-none px-2.5 text-[11.5px]"
                      >
                        Record payment
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        )}
      </Panel>

      {/* ── Every account ── */}
      <Panel
        title="Tenant accounts"
        sub="Usage and money side by side"
        action={
          <Button
            onClick={() => setNewInvoiceFor(tenants.tenants[0] ?? null)}
            disabled={tenants.tenants.length === 0}
            className="h-8 cursor-pointer gap-1.5 rounded-none bg-navy px-3 text-[12px] font-bold text-accent-soft hover:bg-accent-blue hover:text-white"
          >
            <Plus className="size-3.5" />New invoice
          </Button>
        }
      >
        <Box className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse">
            <thead>
              <tr className="border-b border-line bg-surface-2">
                {["Organisation", "Status", "Learners", "Activity", "Contract", "Value", "Collected", "Outstanding", ""]
                  .map((h) => (
                    <th key={h} className="px-3.5 py-2.5 text-left font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-text-3">
                      {h}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {tenants.tenants.map((t) => {
                const cs = CONTRACT_STATE[t.contract_state];
                return (
                  <tr key={t.id} className="border-b border-line last:border-b-0 hover:bg-surface-2">
                    <td className="px-3.5 py-2.5">
                      <Text as="p" className="text-[12.5px] font-semibold text-ink">{t.name}</Text>
                      <Text as="p" className="text-[11px] text-text-3">
                        {[t.industry, t.region].filter(Boolean).join(" · ") || "—"}
                      </Text>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <Text as="span" className={t.is_active ? "chip chip-complete" : "chip chip-error"}>
                        {t.is_active ? "active" : "suspended"}
                      </Text>
                    </td>
                    <td className="px-3.5 py-2.5 text-[12px] text-ink">{t.learners}</td>
                    {/* The activity the old platform dashboard carried, folded
                        into one cell — three counts nobody sorts by, but that
                        say at a glance whether a paying tenant is using it. */}
                    <td className="px-3.5 py-2.5 text-[11.5px] text-text-2">
                      {t.courses} courses · {t.completions} done ·{" "}
                      {Math.round((t.tracked_minutes / 60) * 10) / 10} h
                    </td>
                    <td className="px-3.5 py-2.5">
                      <Text as="span" className={cn("chip", cs.chip)}>{cs.label}</Text>
                      {t.contract_end && (
                        <Text as="p" className="mt-0.5 text-[10.5px] text-text-3">{t.contract_end}</Text>
                      )}
                    </td>
                    <td className="px-3.5 py-2.5 text-[12px] text-text-2">{formatMoney(t.contract_value)}</td>
                    <td className="px-3.5 py-2.5 text-[12px] text-text-2">{formatMoney(t.collected)}</td>
                    <td
                      className={cn(
                        "px-3.5 py-2.5 text-[12px]",
                        t.outstanding > 0 ? "font-bold text-danger" : "text-text-3",
                      )}
                    >
                      {formatMoney(t.outstanding)}
                    </td>
                    <td className="px-3.5 py-2.5 text-right">
                      <Link
                        href="/platform/tenants"
                        className="cursor-pointer text-[11.5px] font-semibold text-accent-blue underline-offset-2 hover:underline"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Box>
      </Panel>

      {payTarget && (
        <PaymentDialog invoice={payTarget} onClose={() => setPayTarget(null)} onSaved={load} />
      )}
      {newInvoiceFor && (
        <InvoiceDialog
          tenants={tenants.tenants}
          onClose={() => setNewInvoiceFor(null)}
          onSaved={load}
        />
      )}
    </Box>
  );
}

/* ── Pieces ──────────────────────────────────────────────────────────────── */

const TILE = {
  accent: "tile-accent", success: "tile-success",
  warning: "tile-warning", rust: "tile-rust",
};

function Kpi({ icon: Icon, tone, value, label, warn = false, alert = false }) {
  return (
    <Box className="flex items-center gap-3 bg-surface px-4 py-3">
      <Box className={cn("flex size-8 shrink-0 items-center justify-center", TILE[tone])}>
        <Icon className="size-4" />
      </Box>
      <Box className="min-w-0">
        <Text
          as="p"
          className={cn(
            "truncate text-[17px] font-bold leading-none",
            alert ? "text-danger" : warn ? "text-warning" : "text-ink",
          )}
        >
          {value}
        </Text>
        <Text as="p" className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-text-3">
          {label}
        </Text>
      </Box>
    </Box>
  );
}

function AttentionPanel({ icon: Icon, tone, count, title, body, href }) {
  const border =
    tone === "danger" ? "border-danger/40 bg-danger/5"
      : tone === "warning" ? "border-warning/40 bg-[color-mix(in_oklab,var(--spectra-warning)_6%,transparent)]"
      : tone === "accent" ? "border-accent-blue/40 bg-accent-tint"
      : "border-line bg-surface";
  const numberTone =
    tone === "danger" ? "text-danger"
      : tone === "warning" ? "text-warning"
      : tone === "accent" ? "text-accent-blue" : "text-text-3";

  const inner = (
    <Box className={cn("flex h-full items-start gap-3 border px-4 py-3", border)}>
      <Icon className={cn("mt-0.5 size-4 shrink-0", numberTone)} />
      <Box className="min-w-0">
        <Box className="flex items-baseline gap-2">
          <Text as="span" className={cn("text-xl font-bold leading-none", numberTone)}>{count}</Text>
          <Text as="span" className="text-[13px] font-bold text-ink">{title}</Text>
        </Box>
        <Text as="p" className="mt-1 text-[11.5px] leading-relaxed text-text-2">{body}</Text>
      </Box>
    </Box>
  );

  return href && count > 0
    ? <Link href={href} className="block cursor-pointer transition-opacity hover:opacity-90">{inner}</Link>
    : inner;
}

function Panel({ title, sub, action, children }) {
  return (
    <Box className="border border-line bg-surface">
      <Box className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2.5">
        <Box>
          <Text as="p" className="text-[13px] font-bold text-ink">{title}</Text>
          {sub && <Text as="p" className="text-[11px] text-text-3">{sub}</Text>}
        </Box>
        {action}
      </Box>
      {children}
    </Box>
  );
}

/* ── Record a payment ────────────────────────────────────────────────────── */

function PaymentDialog({ invoice, onClose, onSaved }) {
  const [amount, setAmount] = useState(String(invoice.outstanding));
  const [paidOn, setPaidOn] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState("bank_transfer");
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function save() {
    setSaving(true); setError(null);
    try {
      await recordPayment({
        invoiceId: invoice.id,
        data: {
          amount: Number(amount),
          paid_on: paidOn,
          method,
          reference: reference.trim() || null,
        },
      });
      onClose();
      await onSaved();
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record payment — {invoice.invoice_no}</DialogTitle>
        </DialogHeader>

        <Box className="space-y-4">
          <Box className="grid gap-px border border-line bg-line sm:grid-cols-3">
            <Mini label="Amount" value={formatMoney(invoice.amount)} />
            <Mini label="Already paid" value={formatMoney(invoice.paid)} />
            <Mini label="Outstanding" value={formatMoney(invoice.outstanding)} />
          </Box>

          <Box className="space-y-1.5">
            <Label>Amount received (₹)</Label>
            <Input
              type="number" min="0.01" step="0.01" value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            {/* Said up front, because the API refuses it and an admin should
                not have to discover the rule by being rejected. */}
            <Text as="p" className="text-[10.5px] text-text-3">
              Cannot exceed the {formatMoney(invoice.outstanding)} outstanding —
              a part payment is fine and leaves the rest owed.
            </Text>
          </Box>

          <Box className="grid gap-3 sm:grid-cols-2">
            <Box className="space-y-1.5">
              <Label>Received on</Label>
              <Input type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
            </Box>
            <Box className="space-y-1.5">
              <Label>Method</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger><SelectValue>{method.replace("_", " ")}</SelectValue></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>{m.replace("_", " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Box>
          </Box>

          <Box className="space-y-1.5">
            <Label>Reference</Label>
            <Input
              value={reference} maxLength={120}
              onChange={(e) => setReference(e.target.value)}
              placeholder="UTR / cheque number — what you would search for later"
            />
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
            disabled={saving}
            className="cursor-pointer rounded-none bg-navy text-accent-soft hover:bg-accent-blue hover:text-white"
          >
            {saving ? "Saving…" : "Record payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Mini({ label, value }) {
  return (
    <Box className="bg-surface px-3 py-2">
      <Text as="p" className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-text-3">{label}</Text>
      <Text as="p" className="mt-0.5 text-[12.5px] font-bold text-ink">{value}</Text>
    </Box>
  );
}

/* ── Raise an invoice ────────────────────────────────────────────────────── */

function InvoiceDialog({ tenants, onClose, onSaved }) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    organization_id: String(tenants[0]?.id ?? ""),
    issue_date: today,
    due_date: today,
    amount: "",
    status: "issued",
    description: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  async function save() {
    if (!form.amount) { setError("Enter an amount."); return; }
    setSaving(true); setError(null);
    try {
      await createInvoice({
        data: {
          organization_id: Number(form.organization_id),
          issue_date: form.issue_date,
          due_date: form.due_date,
          amount: Number(form.amount),
          status: form.status,
          description: form.description.trim() || null,
        },
      });
      onClose();
      await onSaved();
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  }

  const tenant = tenants.find((t) => String(t.id) === form.organization_id);

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>New invoice</DialogTitle></DialogHeader>

        <Box className="space-y-4">
          <Box className="space-y-1.5">
            <Label>Tenant</Label>
            <Select value={form.organization_id} onValueChange={(v) => set("organization_id", v)}>
              <SelectTrigger><SelectValue>{tenant?.name}</SelectValue></SelectTrigger>
              <SelectContent>
                {tenants.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Box>

          <Box className="grid gap-3 sm:grid-cols-2">
            <Box className="space-y-1.5">
              <Label>Issue date</Label>
              <Input type="date" value={form.issue_date} onChange={(e) => set("issue_date", e.target.value)} />
            </Box>
            <Box className="space-y-1.5">
              <Label>Due date</Label>
              <Input type="date" value={form.due_date} onChange={(e) => set("due_date", e.target.value)} />
            </Box>
          </Box>

          <Box className="grid gap-3 sm:grid-cols-2">
            <Box className="space-y-1.5">
              <Label>Amount (₹)</Label>
              <Input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => set("amount", e.target.value)} />
            </Box>
            <Box className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger><SelectValue>{form.status}</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">draft</SelectItem>
                  <SelectItem value="issued">issued</SelectItem>
                </SelectContent>
              </Select>
              {/* The consequence of the choice, since it is not obvious. */}
              <Text as="p" className="text-[10.5px] text-text-3">
                A draft owes nothing and takes no payments until it is issued.
              </Text>
            </Box>
          </Box>

          <Box className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              rows={2} value={form.description} maxLength={300}
              onChange={(e) => set("description", e.target.value)}
              placeholder="e.g. Annual licence FY26"
            />
          </Box>

          <Text as="p" className="text-[10.5px] text-text-3">
            The invoice number is allocated automatically and is unique across
            every tenant.
          </Text>

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
            disabled={saving}
            className="cursor-pointer rounded-none bg-navy text-accent-soft hover:bg-accent-blue hover:text-white"
          >
            {saving ? "Saving…" : "Create invoice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
