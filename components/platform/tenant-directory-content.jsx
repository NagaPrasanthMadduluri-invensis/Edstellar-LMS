"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle, Building2, CalendarClock, LogIn, Mail, Pencil, Phone,
  Plus, Search, ShieldCheck, Users,
} from "lucide-react";

import Box from "@/components/ui/box";
import Text from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import {
  createTenant, fetchTenants, openSupportSession, updateTenant,
} from "@/services/api/platform/platform-api";
import {
  BILLING_CYCLES, CONTRACT_STATE, PLANS, formatMoney,
} from "@/lib/tenant-account";
import { cn } from "@/lib/utils";

export function TenantDirectoryContent() {
  const { user } = useAuth();

  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [contractFilter, setContractFilter] = useState("all");
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      setData(await fetchTenants());
      setError(null);
    } catch (e) {
      setError(e.message);
      setData({ tenants: [], counts: {} });
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const tenants = data?.tenants ?? [];

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tenants.filter((t) => {
      const matchesSearch =
        !q ||
        t.name.toLowerCase().includes(q) ||
        (t.industry ?? "").toLowerCase().includes(q) ||
        (t.region ?? "").toLowerCase().includes(q) ||
        (t.contact_name ?? "").toLowerCase().includes(q) ||
        (t.contact_email ?? "").toLowerCase().includes(q) ||
        (t.admin_name ?? "").toLowerCase().includes(q) ||
        (t.admin_email ?? "").toLowerCase().includes(q);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" ? t.is_active : !t.is_active);
      const matchesContract =
        contractFilter === "all" || t.contract_state === contractFilter;
      return matchesSearch && matchesStatus && matchesContract;
    });
  }, [tenants, search, statusFilter, contractFilter]);

  if (!data) {
    return (
      <Box className="space-y-4">
        <Skeleton className="h-[74px] w-full" />
        <Skeleton className="h-10 w-full" />
        <Box className="grid gap-3 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[190px] w-full" />)}
        </Box>
      </Box>
    );
  }

  const needsAttention = (data.counts.expiring ?? 0) + (data.counts.expired ?? 0);

  return (
    <Box className="space-y-4">
      <Box className="grid gap-px border border-line bg-line sm:grid-cols-3 xl:grid-cols-6">
        <Kpi value={data.counts.total} label="Tenants" />
        <Kpi value={data.counts.active} label="Active" />
        <Kpi value={data.counts.suspended} label="Suspended" alert={data.counts.suspended > 0} />
        <Kpi value={data.counts.learners} label="Total learners" />
        <Kpi value={data.counts.expiring} label="Expiring soon" warn={data.counts.expiring > 0} />
        <Kpi value={data.counts.expired} label="Expired" alert={data.counts.expired > 0} />
      </Box>

      {/* The renewal prompt, said once and plainly at the top — a contract that
          lapses unnoticed is the expensive failure this page exists to prevent,
          and a chip on a card further down is easy to scroll past. */}
      {needsAttention > 0 && (
        <Box className="flex items-start gap-2.5 border border-warning/40 bg-[color-mix(in_oklab,var(--spectra-warning)_8%,transparent)] px-4 py-3">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
          <Text as="p" className="text-[12.5px] leading-relaxed text-text-2">
            <strong className="text-ink">
              {data.counts.expired > 0 && `${data.counts.expired} contract${data.counts.expired === 1 ? " has" : "s have"} expired`}
              {data.counts.expired > 0 && data.counts.expiring > 0 && ", and "}
              {data.counts.expiring > 0 && `${data.counts.expiring} renew${data.counts.expiring === 1 ? "s" : ""} within 60 days`}
            </strong>
            . An expired contract does <strong>not</strong> suspend the tenant — their
            learners carry on — so nothing here stops until somebody acts on it.
          </Text>
        </Box>
      )}

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
            placeholder="Search org, industry, region, admin name or email…"
            className="h-9 bg-surface pl-8 text-[12.5px]"
          />
        </Box>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-[150px] text-[12.5px]">
            <SelectValue>
              {statusFilter === "all" ? "All statuses" : statusFilter === "active" ? "Active" : "Suspended"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
        <Select value={contractFilter} onValueChange={setContractFilter}>
          <SelectTrigger className="h-9 w-[170px] text-[12.5px]">
            <SelectValue>
              {contractFilter === "all" ? "All contracts" : CONTRACT_STATE[contractFilter].label}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All contracts</SelectItem>
            {Object.entries(CONTRACT_STATE).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Text as="p" className="text-[12px] text-text-3">
          {visible.length} of {tenants.length}
        </Text>
        <Button
          onClick={() => setCreating(true)}
          className="h-9 cursor-pointer gap-1.5 rounded-none bg-navy px-3 text-[12px] font-bold text-accent-soft hover:bg-accent-blue hover:text-white"
        >
          <Plus className="size-3.5" />New tenant
        </Button>
      </Box>

      {visible.length === 0 ? (
        <Box className="border border-dashed border-line-strong bg-surface px-6 py-16 text-center">
          <Building2 className="mx-auto mb-3 size-8 text-text-3" />
          <Text as="h3" className="text-[14px] font-bold text-ink">
            {tenants.length === 0 ? "No tenants yet" : "Nothing matches those filters"}
          </Text>
        </Box>
      ) : (
        <Box className="grid gap-3 lg:grid-cols-2">
          {visible.map((t) => (
            <TenantCard key={t.id} tenant={t} onEdit={() => setEditing(t)} />
          ))}
        </Box>
      )}

      {editing && (
        <TenantDialog
          tenant={editing}
          onClose={() => setEditing(null)}
          onSaved={load}
        />
      )}
      {creating && (
        <NewTenantDialog onClose={() => setCreating(false)} onSaved={load} />
      )}
    </Box>
  );
}

function Kpi({ value, label, warn = false, alert = false }) {
  return (
    <Box className="bg-surface px-4 py-3">
      <Text
        as="p"
        className={cn(
          "text-xl font-bold leading-none",
          alert ? "text-danger" : warn ? "text-warning" : "text-ink",
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

function TenantCard({ tenant: t, onEdit }) {
  const contract = CONTRACT_STATE[t.contract_state];
  return (
    <Box className="flex flex-col border border-line bg-surface">
      <Box className="flex items-start gap-3 px-4 py-3.5">
        <Box className="flex size-10 shrink-0 items-center justify-center border border-line bg-surface-3 text-text-2">
          <Building2 className="size-5" />
        </Box>
        <Box className="min-w-0 flex-1">
          <Box className="flex flex-wrap items-center gap-2">
            <Text as="h3" className="text-[14px] font-bold text-ink">{t.name}</Text>
            <Text as="span" className={t.is_active ? "chip chip-complete" : "chip chip-error"}>
              {t.is_active ? "Active" : "Suspended"}
            </Text>
            {t.plan && <Text as="span" className="chip chip-idle">{PLANS[t.plan] ?? t.plan}</Text>}
          </Box>
          <Text as="p" className="mt-0.5 text-[11.5px] text-text-3">
            {[t.industry, t.region].filter(Boolean).join(" · ") || "No industry or region recorded"}
          </Text>
        </Box>
        <Button
          variant="outline"
          onClick={onEdit}
          className="h-7 shrink-0 cursor-pointer gap-1.5 rounded-none px-2.5 text-[11.5px]"
        >
          <Pencil className="size-3" />Edit
        </Button>
      </Box>

      {/* Contract state carries the warning, with the number of days on it —
          "expires soon" without a figure leaves the reader to go and look. */}
      <Box
        className={cn(
          "flex flex-wrap items-center gap-2 border-y border-line px-4 py-2",
          t.contract_state === "expired" ? "bg-danger/10"
            : t.contract_state === "expiring" ? "bg-[color-mix(in_oklab,var(--spectra-warning)_8%,transparent)]"
            : "bg-surface-2",
        )}
      >
        <CalendarClock
          className={cn(
            "size-3.5 shrink-0",
            t.contract_state === "expired" ? "text-danger"
              : t.contract_state === "expiring" ? "text-warning" : "text-text-3",
          )}
        />
        <Text as="span" className={cn("text-[12px] font-semibold", contract.text)}>
          {t.contract_state === "none"
            ? "No contract recorded"
            : t.contract_state === "expired"
              ? `Expired ${Math.abs(t.contract_days_left)} day${Math.abs(t.contract_days_left) === 1 ? "" : "s"} ago`
              : t.contract_state === "expiring"
                ? `Renews in ${t.contract_days_left} day${t.contract_days_left === 1 ? "" : "s"}`
                : `Runs to ${t.contract_end}`}
        </Text>
        {t.contract_value !== null && (
          <Text as="span" className="ml-auto text-[12px] font-bold text-ink">
            {formatMoney(t.contract_value)}
            {t.billing_cycle && (
              <Text as="span" className="font-normal text-[11px] text-text-3"> · {t.billing_cycle}</Text>
            )}
          </Text>
        )}
      </Box>

      <Box className="grid grid-cols-4 gap-px border-b border-line bg-line">
        <Stat value={t.learners} label="Learners" />
        <Stat value={t.admins} label="Admins" />
        <Stat value={t.courses} label="Courses" />
        <Stat value={t.completions} label="Completions" />
      </Box>

      {/* Who runs the account — a REAL admin from `users`, never a typed-in
          contact. The two are different facts and the card used to show only
          the second, so it named a person nothing could verify. */}
      <Box className="flex flex-wrap items-center gap-3 px-4 py-2.5">
        {t.admin_email ? (
          <>
            <Text as="span" className="inline-flex items-center gap-1.5 text-[11.5px] text-text-2">
              <ShieldCheck className="size-3 shrink-0 text-text-3" />
              {t.admin_name || "Unnamed admin"}
              <Text as="span" className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-text-3">
                {t.admin_is_owner ? "owner" : "admin"}
              </Text>
            </Text>
            <Text as="span" className="inline-flex min-w-0 items-center gap-1.5 text-[11.5px] text-text-2">
              <Mail className="size-3 shrink-0 text-text-3" />
              <a
                href={`mailto:${t.admin_email}`}
                className="cursor-pointer truncate text-accent-blue underline-offset-2 hover:underline"
              >
                {t.admin_email}
              </a>
            </Text>
            {t.admin_portal_count > 1 && (
              <Text as="span" className="text-[11px] text-text-3">
                +{t.admin_portal_count - 1} more admin
                {t.admin_portal_count - 1 === 1 ? "" : "s"}
              </Text>
            )}
          </>
        ) : (
          /* Not a cosmetic gap: an organization with no active admin account
             is one nobody can administer, and the super admin should see that
             rather than a blank row. */
          <Text as="span" className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-warning">
            <AlertTriangle className="size-3 shrink-0" />No active admin account
          </Text>
        )}

        {/* The commercial contact is a SEPARATE, optional fact — shown only
            when somebody has actually recorded one, and labelled so it cannot
            be read as the account holder. */}
        {(t.contact_name || t.contact_email || t.contact_phone) && (
          <Text as="span" className="inline-flex min-w-0 items-center gap-1.5 border-l border-line pl-3 text-[11px] text-text-3">
            <Phone className="size-3 shrink-0" />
            <Text as="span" className="truncate">
              Billing: {[t.contact_name, t.contact_email, t.contact_phone].filter(Boolean).join(" · ")}
            </Text>
          </Text>
        )}

        <Box className="ml-auto flex items-center gap-2">
          <Link
            href={`/platform/organizations/${t.id}`}
            className="cursor-pointer text-[11.5px] font-semibold text-text-2 underline-offset-2 hover:text-accent-blue hover:underline"
          >
            Details
          </Link>
          <OpenTenantButton tenant={t} />
        </Box>
      </Box>
    </Box>
  );
}

/**
 * Sign in to this tenant.
 *
 * A two-step control rather than a link, because the click has a real
 * consequence: the platform admin's own cookie is replaced with one that acts
 * as somebody else, and the tenant's activity log gets an entry saying so.
 * The confirm names the person whose account it will be and says the session
 * is logged and time-boxed — an admin should know all three BEFORE the click,
 * not from the banner afterwards.
 *
 * Disabled when the tenant has no admin account, with the reason in the title
 * (§10.3.1.2) — the API refuses that case with a 422 and there is nothing to
 * become.
 */
function OpenTenantButton({ tenant: t }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function open() {
    setBusy(true);
    setError(null);
    try {
      await openSupportSession({ organizationId: t.id });
      // Hard navigation: the auth cookie has just been swapped, and every RSC
      // payload the router has cached belongs to the platform session. A soft
      // push would render the tenant's pages from the wrong shell.
      window.location.href = "/admin/dashboard";
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }

  if (!t.admin_email) {
    return (
      <Text
        as="span"
        title="This organization has no active admin account to sign in as"
        className="inline-flex cursor-not-allowed items-center gap-1.5 border border-line bg-surface-2 px-2.5 py-1 text-[11.5px] font-semibold text-text-3"
      >
        <LogIn className="size-3" />Open tenant
      </Text>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="inline-flex cursor-pointer items-center gap-1.5 border border-line bg-surface px-2.5 py-1 text-[11.5px] font-semibold text-text-2 transition-colors hover:bg-accent-blue hover:text-white"
      >
        <LogIn className="size-3" />Open tenant
      </button>

      <Dialog open={confirming} onOpenChange={(o) => { if (!o && !busy) setConfirming(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sign in to {t.name}?</DialogTitle>
          </DialogHeader>

          <Box className="space-y-3">
            <Text as="p" className="text-[12.5px] leading-relaxed text-text-2">
              You will be signed in as{" "}
              <Text as="span" className="font-semibold text-ink">
                {t.admin_name}
              </Text>{" "}
              ({t.admin_email}) with their full admin access. Anything you do is
              their live data and carries their name.
            </Text>

            <Box className="space-y-1.5 border border-line bg-surface-2 px-3 py-2.5">
              <Text as="p" className="text-[11.5px] text-text-2">
                · An entry appears in <Text as="span" className="font-semibold text-ink">{t.name}&apos;s</Text> own
                activity log saying Edstellar support signed in.
              </Text>
              <Text as="p" className="text-[11.5px] text-text-2">
                · The session lasts one hour, then you are signed out.
              </Text>
              <Text as="p" className="text-[11.5px] text-text-2">
                · The platform console is unreachable until you exit — a banner
                at the top of every page takes you back.
              </Text>
            </Box>

            {error && (
              <Box className="border border-danger/30 bg-danger/10 px-3 py-2">
                <Text as="p" className="text-[12.5px] text-danger">{error}</Text>
              </Box>
            )}
          </Box>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(false)} disabled={busy}>
              Cancel
            </Button>
            <Button
              onClick={open}
              disabled={busy}
              className="cursor-pointer gap-1.5 rounded-none bg-navy text-accent-soft hover:bg-accent-blue hover:text-white"
            >
              <LogIn className="size-3.5" />
              {busy ? "Signing in…" : "Sign in to tenant"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Stat({ value, label }) {
  return (
    <Box className="bg-surface px-3 py-2">
      <Text as="p" className="text-[14px] font-bold leading-none text-ink">{value}</Text>
      <Text as="p" className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.1em] text-text-3">
        {label}
      </Text>
    </Box>
  );
}

/* ── Edit the account ────────────────────────────────────────────────────── */

function TenantDialog({ tenant, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: tenant.name ?? "",
    isActive: tenant.is_active,
    industry: tenant.industry ?? "",
    region: tenant.region ?? "",
    contactName: tenant.contact_name ?? "",
    contactEmail: tenant.contact_email ?? "",
    contactPhone: tenant.contact_phone ?? "",
    contractStart: tenant.contract_start ?? "",
    contractEnd: tenant.contract_end ?? "",
    contractValue: tenant.contract_value === null ? "" : String(tenant.contract_value),
    plan: tenant.plan ?? "",
    billingCycle: tenant.billing_cycle ?? "",
    notes: tenant.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  async function save() {
    if (!form.name.trim()) { setError("Organisation name is required"); return; }
    if (form.contractStart && form.contractEnd && form.contractEnd < form.contractStart) {
      setError("The contract cannot end before it starts.");
      return;
    }
    setSaving(true); setError(null);
    try {
      await updateTenant({
        tenantId: tenant.id,
        data: {
          name: form.name.trim(),
          isActive: form.isActive,
          industry: form.industry.trim() || null,
          region: form.region.trim() || null,
          contactName: form.contactName.trim() || null,
          contactEmail: form.contactEmail.trim() || null,
          contactPhone: form.contactPhone.trim() || null,
          contractStart: form.contractStart || null,
          contractEnd: form.contractEnd || null,
          contractValue: form.contractValue === "" ? null : Number(form.contractValue),
          plan: form.plan || null,
          billingCycle: form.billingCycle || null,
          notes: form.notes.trim() || null,
        },
      });
      onClose();
      await onSaved();
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{tenant.name}</DialogTitle>
        </DialogHeader>

        <Box className="space-y-4">
          <Section>Account</Section>
          <Box className="grid gap-3 sm:grid-cols-2">
            <Field label="Organisation name" required>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
            </Field>
            <Box className="flex items-center justify-between border border-line bg-surface-2 px-3 py-2.5">
              <Box>
                <Text as="p" className="text-[13px] font-semibold text-ink">Active</Text>
                {/* Said here because it is the one control on this dialog with
                    a consequence the admin cannot see from the label. */}
                <Text as="p" className="text-[11px] text-text-3">
                  Suspending blocks every login for this tenant. No data is deleted.
                </Text>
              </Box>
              <Switch checked={form.isActive} onCheckedChange={(v) => set("isActive", v)} />
            </Box>
            <Field label="Industry">
              <Input value={form.industry} onChange={(e) => set("industry", e.target.value)} placeholder="e.g. IT Services" />
            </Field>
            <Field label="Region">
              <Input value={form.region} onChange={(e) => set("region", e.target.value)} placeholder="e.g. India · South" />
            </Field>
          </Box>

          <Section>Billing contact (optional)</Section>
          {/* Renamed from "Commercial contact" and marked optional on
              purpose. These three are free text nothing verifies, and while
              they were the only contact on the card they read as the account
              holder. Who administers the tenant is shown from `users`
              instead — it is not editable here, because inventing an admin
              in a text box is exactly the problem. */}
          <Text as="p" className="-mt-1 mb-2 text-[11px] text-text-3">
            A procurement or finance contact, if it differs from the tenant&apos;s
            admin account. Leave blank and the card shows the admin alone.
          </Text>
          <Box className="grid gap-3 sm:grid-cols-3">
            <Field label="Name">
              <Input value={form.contactName} onChange={(e) => set("contactName", e.target.value)} />
            </Field>
            <Field label="Email">
              <Input type="email" value={form.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} />
            </Field>
            <Field label="Phone">
              <Input value={form.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} />
            </Field>
          </Box>

          <Section>Contract</Section>
          <Box className="grid gap-3 sm:grid-cols-2">
            <Field label="Start">
              <Input type="date" value={form.contractStart} onChange={(e) => set("contractStart", e.target.value)} />
            </Field>
            <Field label="End">
              <Input type="date" value={form.contractEnd} onChange={(e) => set("contractEnd", e.target.value)} />
              <Text as="p" className="text-[10.5px] text-text-3">
                The directory warns 60 days out and flags it once past.
              </Text>
            </Field>
            <Field label="Value (₹)">
              <Input
                type="number" min="0" value={form.contractValue}
                onChange={(e) => set("contractValue", e.target.value)}
              />
            </Field>
            <Box className="grid grid-cols-2 gap-3">
              <Field label="Plan">
                <Select value={form.plan} onValueChange={(v) => set("plan", v)}>
                  <SelectTrigger><SelectValue placeholder="—">{PLANS[form.plan]}</SelectValue></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PLANS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Billing">
                <Select value={form.billingCycle} onValueChange={(v) => set("billingCycle", v)}>
                  <SelectTrigger><SelectValue placeholder="—">{form.billingCycle}</SelectValue></SelectTrigger>
                  <SelectContent>
                    {BILLING_CYCLES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </Box>
          </Box>

          <Field label="Account notes">
            <Textarea
              rows={3} value={form.notes} maxLength={2000}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Internal only — never shown to the tenant."
            />
          </Field>

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
            {saving ? "Saving…" : "Save tenant"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Provision a tenant ───────────────────────────────────────────────── */

/** Lowercase, hyphenated, no leading/trailing hyphen — the API's own rule. */
function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Create an organization AND its first admin.
 *
 * The admin is required, not an optional extra step. The API creates both in
 * one transaction, and the reason is visible right here on this page: a tenant
 * with no admin account renders as a warning on its own card and cannot be
 * opened. A form that let you skip the account would be a form whose happy
 * path produces a broken tenant.
 *
 * Everything below the account is optional. A signed contract can be typed in
 * now rather than forcing a create-then-immediately-edit round trip, but an
 * account created ahead of the paperwork is a normal thing to want.
 */
function NewTenantDialog({ onClose, onSaved }) {
  const [form, setForm] = useState({
    name: "", slug: "", slugTouched: false,
    industry: "", region: "", plan: "", billingCycle: "",
    contractStart: "", contractEnd: "", contractValue: "", seatLimit: "",
    adminFirstName: "", adminLastName: "", adminEmail: "", adminPassword: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  // The slug follows the name until the admin edits it, then it stops —
  // otherwise typing a deliberate slug and then fixing a typo in the name
  // silently throws the slug away.
  const slug = form.slugTouched ? form.slug : slugify(form.name);

  const datesInverted =
    form.contractStart && form.contractEnd && form.contractEnd < form.contractStart;

  const ready =
    form.name.trim() &&
    form.adminFirstName.trim() &&
    form.adminLastName.trim() &&
    form.adminEmail.trim() &&
    form.adminPassword.length >= 6 &&
    !datesInverted;

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await createTenant({
        data: {
          name: form.name.trim(),
          slug: slug || undefined,
          admin: {
            firstName: form.adminFirstName.trim(),
            lastName: form.adminLastName.trim(),
            email: form.adminEmail.trim().toLowerCase(),
            password: form.adminPassword,
          },
          // Only what was filled in. An empty string would clear a field the
          // admin never touched, which is the omitted-vs-null distinction the
          // API is careful about at the other end.
          ...(form.industry.trim() ? { industry: form.industry.trim() } : {}),
          ...(form.region.trim() ? { region: form.region.trim() } : {}),
          ...(form.plan ? { plan: form.plan } : {}),
          ...(form.billingCycle ? { billingCycle: form.billingCycle } : {}),
          ...(form.contractStart ? { contractStart: form.contractStart } : {}),
          ...(form.contractEnd ? { contractEnd: form.contractEnd } : {}),
          ...(form.contractValue ? { contractValue: Number(form.contractValue) } : {}),
          ...(form.seatLimit ? { seatLimit: Number(form.seatLimit) } : {}),
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
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>New tenant</DialogTitle></DialogHeader>

        <Box className="space-y-4">
          <Section>Organization</Section>
          <Box className="grid gap-3 sm:grid-cols-2">
            <Field label="Name" required>
              <Input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Northwind Logistics"
              />
            </Field>
            <Field label="Slug">
              <Input
                value={slug}
                onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value, slugTouched: true }))}
                placeholder="northwind-logistics"
              />
              <Text as="p" className="text-[10.5px] text-text-3">
                Lowercase letters, digits and hyphens. Derived from the name
                unless you change it, and must be unique across the platform.
              </Text>
            </Field>
          </Box>
          <Box className="grid gap-3 sm:grid-cols-2">
            <Field label="Industry">
              <Input value={form.industry} onChange={(e) => set("industry", e.target.value)} placeholder="e.g. Logistics" />
            </Field>
            <Field label="Region">
              <Input value={form.region} onChange={(e) => set("region", e.target.value)} placeholder="e.g. India · North" />
            </Field>
          </Box>

          <Section>First admin</Section>
          <Text as="p" className="-mt-1 text-[11px] text-text-3">
            Required. This account is created with the tenant and is the one
            they sign in with — and the one a support session assumes when you
            open their account from this page.
          </Text>
          <Box className="grid gap-3 sm:grid-cols-2">
            <Field label="First name" required>
              <Input value={form.adminFirstName} onChange={(e) => set("adminFirstName", e.target.value)} />
            </Field>
            <Field label="Last name" required>
              <Input value={form.adminLastName} onChange={(e) => set("adminLastName", e.target.value)} />
            </Field>
          </Box>
          <Box className="grid gap-3 sm:grid-cols-2">
            <Field label="Email" required>
              <Input
                type="email" value={form.adminEmail}
                onChange={(e) => set("adminEmail", e.target.value)}
                placeholder="admin@northwind.com"
              />
              <Text as="p" className="text-[10.5px] text-text-3">
                Unique across the whole platform, not just this tenant.
              </Text>
            </Field>
            <Field label="Temporary password" required>
              <Input
                type="text" value={form.adminPassword}
                onChange={(e) => set("adminPassword", e.target.value)}
                placeholder="At least 6 characters"
              />
              <Text as="p" className="text-[10.5px] text-text-3">
                Shown, not masked — you have to pass it on. They can change it
                from Change password once they are in.
              </Text>
            </Field>
          </Box>

          <Section>Contract (optional)</Section>
          <Box className="grid gap-3 sm:grid-cols-2">
            <Field label="Plan">
              <Select value={form.plan} onValueChange={(v) => set("plan", v)}>
                <SelectTrigger>
                  <SelectValue>{form.plan ? PLANS[form.plan] : "Not set"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PLANS).map(([k, label]) => (
                    <SelectItem key={k} value={k}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Billing cycle">
              <Select value={form.billingCycle} onValueChange={(v) => set("billingCycle", v)}>
                <SelectTrigger>
                  <SelectValue>{form.billingCycle || "Not set"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {BILLING_CYCLES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </Box>
          <Box className="grid gap-3 sm:grid-cols-2">
            <Field label="Start">
              <Input type="date" value={form.contractStart} onChange={(e) => set("contractStart", e.target.value)} />
            </Field>
            <Field label="End">
              <Input type="date" value={form.contractEnd} onChange={(e) => set("contractEnd", e.target.value)} />
              {datesInverted && (
                <Text as="p" className="text-[11px] font-semibold text-danger">
                  The contract cannot end before it starts.
                </Text>
              )}
            </Field>
          </Box>
          <Box className="grid gap-3 sm:grid-cols-2">
            <Field label="Value (₹)">
              <Input
                type="number" min="0" value={form.contractValue}
                onChange={(e) => set("contractValue", e.target.value)}
              />
            </Field>
            <Field label="Seat limit">
              <Input
                type="number" min="1" value={form.seatLimit}
                onChange={(e) => set("seatLimit", e.target.value)}
                placeholder="Leave blank for unlimited"
              />
              <Text as="p" className="text-[10.5px] text-text-3">
                Active learners only — admins and trainers do not use a seat.
                Their admin sees this in Manage Users and can ask for more.
              </Text>
            </Field>
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
            disabled={saving || !ready}
            className="cursor-pointer rounded-none bg-navy text-accent-soft hover:bg-accent-blue hover:text-white"
          >
            {saving ? "Creating…" : "Create tenant"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Section({ children }) {
  return (
    <Text as="p" className="border-b border-line pb-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-text-3">
      {children}
    </Text>
  );
}

function Field({ label, required = false, children }) {
  return (
    <Box className="space-y-1.5">
      <Label>
        {label}{required && <Text as="span" className="text-danger"> *</Text>}
      </Label>
      {children}
    </Box>
  );
}
