"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle, BookOpen, Building2, CalendarCheck, CalendarClock,
  CheckCircle2, Lock, Users,
} from "lucide-react";

import Box from "@/components/ui/box";
import Text from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import {
  fetchMyOrganization, updateMyOrganization,
} from "@/services/api/profile-api";
import { CONTRACT_STATE, PLANS, formatMoney } from "@/lib/tenant-account";
import { cn } from "@/lib/utils";

/**
 * Organization settings, as the TENANT's admin sees them.
 *
 * Two halves, and keeping them visibly apart is the whole design:
 *
 *   * **Yours to change** — name, industry, region. Three fields, behind
 *     `manage_organization`.
 *   * **Your account with Edstellar** — plan, contract dates, contract value,
 *     seat limit. Read-only here and written only by a platform admin. They
 *     are SHOWN rather than hidden because the customer signed the contract
 *     and is entitled to see its terms without asking; they are locked
 *     because a tenant editing its own contract, or raising its own seat cap,
 *     would make the renewal warnings and the seat enforcement decorative.
 *
 * Rendering the second group as disabled inputs would have been the obvious
 * move and the wrong one — a greyed input reads as "temporarily unavailable",
 * not "not yours". They are facts with a padlock and a sentence saying who to
 * ask.
 *
 * `manage_organization` is checked before the form is offered, so an admin
 * whose role lacks it gets the read view rather than a Save that 403s
 * (§10.3.1.2).
 */
export function OrganizationSettingsDialog({ open, onOpenChange }) {
  const { user } = useAuth();
  const [org, setOrg] = useState(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState(null);

  const canEdit = (user?.permissions ?? []).includes("manage_organization");

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setError(null);
    fetchMyOrganization()
      .then((d) => alive && setOrg(d.organization))
      .catch((e) => alive && setError(e.message));
    return () => { alive = false; };
  }, [open]);

  useEffect(() => { if (!open) setEditing(false); }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 sm:max-w-2xl">
        <DialogHeader className="px-5 pt-5">
          <DialogTitle>Organization settings</DialogTitle>
        </DialogHeader>

        {error && (
          <Box className="mx-5 border border-danger/30 bg-danger/10 px-3 py-2">
            <Text as="p" className="text-[12.5px] text-danger">{error}</Text>
          </Box>
        )}

        {!org && !error ? (
          <Box className="space-y-3 px-5 pb-5">
            <Skeleton className="h-[72px] w-full" />
            <Skeleton className="h-[220px] w-full" />
          </Box>
        ) : org ? (
          <>
            <Box className="surface-dark flex items-center gap-3.5 px-5 py-4">
              <Box className="flex size-12 shrink-0 items-center justify-center border border-white/25 bg-white/10">
                <Building2 className="size-5 text-white" />
              </Box>
              <Box className="min-w-0">
                <Text as="p" className="truncate text-[16px] font-bold text-white">
                  {org.name}
                </Text>
                <Text as="p" className="mt-0.5 font-mono text-[11px] text-accent-soft">
                  {org.slug}
                </Text>
              </Box>
            </Box>

            {editing ? (
              <OrgForm
                org={org}
                onCancel={() => setEditing(false)}
                onSaved={(next) => { setOrg(next); setEditing(false); }}
              />
            ) : (
              <OrgView
                org={org}
                canEdit={canEdit}
                onEdit={() => setEditing(true)}
              />
            )}
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

/* ── Read ────────────────────────────────────────────────────────────────── */

function OrgView({ org: o, canEdit, onEdit }) {
  const cs = CONTRACT_STATE[o.contract_state] ?? CONTRACT_STATE.none;
  const renewalSoon =
    o.contract_state === "expiring" || o.contract_state === "expired";

  return (
    <>
      <Box className="space-y-4 px-5 py-4">
        {/* The renewal warning belongs on the tenant's own screen too, not
            only on Edstellar's console — they are the ones who have to act. */}
        {renewalSoon && (
          <Box
            className={cn(
              "flex items-start gap-2.5 border px-3 py-2.5",
              o.contract_state === "expired"
                ? "border-danger/40 bg-danger/5"
                : "border-warning/40 bg-[color-mix(in_oklab,var(--spectra-warning)_8%,transparent)]",
            )}
          >
            <AlertTriangle
              className={cn(
                "mt-0.5 size-4 shrink-0",
                o.contract_state === "expired" ? "text-danger" : "text-warning",
              )}
            />
            <Text as="p" className="text-[12px] leading-relaxed text-text-2">
              <Text as="span" className="font-bold text-ink">
                {o.contract_state === "expired"
                  ? `Your contract expired ${Math.abs(o.contract_days_left)} days ago.`
                  : `Your contract renews in ${o.contract_days_left} days.`}
              </Text>{" "}
              Nothing stops automatically — your learners carry on. Talk to
              Edstellar to renew.
            </Text>
          </Box>
        )}

        <Box>
          <Text as="p" className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-text-3">
            Profile
          </Text>
          <Box className="grid gap-px border border-line bg-line sm:grid-cols-2">
            <Fact label="Name" value={o.name} />
            <Fact label="Identifier" value={o.slug} mono />
            <Fact label="Industry" value={o.industry} />
            <Fact label="Region" value={o.region} />
          </Box>
        </Box>

        <Box>
          <Box className="mb-2 flex items-center gap-1.5">
            <Lock className="size-3 text-text-3" />
            <Text as="p" className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-text-3">
              Your account with Edstellar
            </Text>
          </Box>
          <Box className="grid gap-px border border-line bg-line sm:grid-cols-2">
            <Fact label="Plan" value={o.plan ? (PLANS[o.plan] ?? o.plan) : null} />
            <Fact label="Billing cycle" value={o.billing_cycle} />
            <Fact label="Contract start" value={o.contract_start} />
            <Fact
              label="Contract end"
              value={o.contract_end}
              chip={o.contract_end ? { label: cs.label, className: cs.chip } : null}
            />
            <Fact label="Contract value" value={formatMoney(o.contract_value)} />
            <Fact
              label="Licensed seats"
              value={
                o.seat_limit === null
                  ? `${o.seats_used} active learners · no limit`
                  : `${o.seats_used} of ${o.seat_limit} used`
              }
            />
          </Box>
          <Text as="p" className="mt-1.5 text-[11px] text-text-3">
            These are set by Edstellar. To change a plan, a contract or your
            seat limit, ask your Edstellar contact — or raise a seat request
            from Manage Users.
          </Text>
        </Box>

        <Box>
          <Text as="p" className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-text-3">
            Usage
          </Text>
          <Box className="grid gap-px border border-line bg-line grid-cols-2 sm:grid-cols-4">
            <Stat icon={Users} value={o.learners} label="Learners" />
            <Stat icon={Users} value={o.admins} label="Admins" />
            <Stat icon={BookOpen} value={o.courses} label="Courses" />
            <Stat icon={CalendarCheck} value={o.sessions} label="Sessions" />
          </Box>
        </Box>
      </Box>

      <DialogFooter className="mx-0 mb-0 flex-row items-center gap-2 border-t border-line px-5 py-3">
        {canEdit ? (
          <Button
            onClick={onEdit}
            className="cursor-pointer gap-1.5 rounded-none bg-navy text-accent-soft hover:bg-accent-blue hover:text-white"
          >
            <Building2 className="size-3.5" />Edit details
          </Button>
        ) : (
          /* No disabled Save button: the role simply cannot do this, and a
             greyed control invites a click that would 403. Say why instead. */
          <Text as="p" className="text-[11.5px] text-text-3">
            Your role can view these settings but not change them.
          </Text>
        )}
      </DialogFooter>
    </>
  );
}

function Fact({ label, value, mono = false, chip = null }) {
  return (
    <Box className="bg-surface px-3.5 py-2.5">
      <Text as="p" className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-text-3">
        {label}
      </Text>
      <Box className="mt-1 flex flex-wrap items-center gap-2">
        <Text
          as="p"
          className={cn(
            "break-words text-[13px]",
            value ? "font-semibold text-ink" : "text-text-3",
            mono && "font-mono text-[12px]",
          )}
        >
          {value || "—"}
        </Text>
        {chip && <Text as="span" className={cn("chip", chip.className)}>{chip.label}</Text>}
      </Box>
    </Box>
  );
}

function Stat({ icon: Icon, value, label }) {
  return (
    <Box className="bg-surface px-3.5 py-2.5">
      <Box className="flex items-center gap-1.5">
        <Icon className="size-3 shrink-0 text-text-3" />
        <Text as="p" className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-text-3">
          {label}
        </Text>
      </Box>
      <Text as="p" className="mt-1 text-[15px] font-bold text-ink">{value}</Text>
    </Box>
  );
}

/* ── Edit ────────────────────────────────────────────────────────────────── */

function OrgForm({ org: o, onCancel, onSaved }) {
  const [form, setForm] = useState({
    name: o.name ?? "",
    industry: o.industry ?? "",
    region: o.region ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const { organization } = await updateMyOrganization({
        data: {
          name: form.name.trim(),
          industry: form.industry.trim() || null,
          region: form.region.trim() || null,
        },
      });
      onSaved(organization);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Box className="space-y-3.5 px-5 py-4">
        <Box className="space-y-1.5">
          <Label>Organization name</Label>
          <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
          <Text as="p" className="text-[10.5px] text-text-3">
            Shown to your learners and on certificates.
          </Text>
        </Box>

        <Box className="grid gap-3 sm:grid-cols-2">
          <Box className="space-y-1.5">
            <Label>Industry</Label>
            <Input
              value={form.industry}
              onChange={(e) => set("industry", e.target.value)}
              placeholder="e.g. IT Services"
            />
          </Box>
          <Box className="space-y-1.5">
            <Label>Region</Label>
            <Input
              value={form.region}
              onChange={(e) => set("region", e.target.value)}
              placeholder="e.g. India · South"
            />
          </Box>
        </Box>

        <Box className="flex items-start gap-2 border border-line bg-surface-2 px-3 py-2">
          <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-text-3" />
          <Text as="p" className="text-[11.5px] leading-relaxed text-text-2">
            Your identifier ({o.slug}) cannot change — it is unique across
            Edstellar. Neither can your plan, contract or seat limit; those are
            what you bought.
          </Text>
        </Box>

        {error && (
          <Box className="border border-danger/30 bg-danger/10 px-3 py-2">
            <Text as="p" className="text-[12.5px] text-danger">{error}</Text>
          </Box>
        )}
      </Box>

      <DialogFooter className="mx-0 mb-0 border-t border-line px-5 py-3">
        <Button variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button>
        <Button
          onClick={save}
          disabled={saving || !form.name.trim()}
          className="cursor-pointer rounded-none bg-navy text-accent-soft hover:bg-accent-blue hover:text-white"
        >
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </DialogFooter>
    </>
  );
}
