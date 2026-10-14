"use client";

import { useEffect, useState } from "react";
import { Building2, Check, Gift, Mail, Plus, Send, Sparkles } from "lucide-react";

import Box from "@/components/ui/box";
import Text from "@/components/ui/text";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { REFERRAL_TIERS } from "@/lib/referral-rewards";
import { statusOf } from "@/lib/referrals";
import {
  createReferral,
  fetchReferrals,
} from "@/services/api/admin/referrals-api";

export function ReferralsContent() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);

  async function load() {
    try {
      setData(await fetchReferrals());
      setError(null);
    } catch (e) {
      setError(e.message);
      setData({ referrals: [], counts: { total: 0 }, reward: { convertedCount: 0, discountPct: 0 } });
    }
  }

  useEffect(() => {
    if (user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (!data) {
    return (
      <Box className="space-y-5">
        <Skeleton className="h-28 w-full rounded-lg" />
        <Skeleton className="h-9 w-36" />
        <Box className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </Box>
      </Box>
    );
  }

  const referrals = data.referrals ?? [];

  return (
    <Box className="space-y-5">
      <RewardBanner reward={data.reward} />

      <Box className="flex items-center justify-between">
        <Text as="p" className="text-sm text-ink/60">
          {data.counts?.total ?? 0}{" "}
          {(data.counts?.total ?? 0) === 1 ? "referral" : "referrals"}
        </Text>
        <Button
          onClick={() => setOpen(true)}
          className="cursor-pointer gap-1.5 rounded-none bg-navy text-accent-soft hover:bg-accent-blue hover:text-white"
        >
          <Plus className="size-4" />
          Refer a company
        </Button>
      </Box>

      {error && (
        <Card className="p-4">
          <Text as="p" className="text-sm text-error">{error}</Text>
        </Card>
      )}

      {referrals.length === 0 ? (
        <Card className="p-10 text-center">
          <Gift className="mx-auto mb-3 size-8 text-ink/30" />
          <Text as="p" className="font-semibold text-ink">No referrals yet</Text>
          <Text as="p" className="mx-auto mt-1 max-w-md text-sm text-ink/60">
            Refer a company you think would benefit from Spectra LMS. We will
            reach out, and once two of your referrals become customers you earn
            15% off your subscription.
          </Text>
        </Card>
      ) : (
        <Box className="space-y-3">
          {referrals.map((r) => (
            <ReferralRow key={r.id} referral={r} />
          ))}
        </Box>
      )}

      {open && (
        <ReferDialog
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

function RewardBanner({ reward }) {
  const converted = reward?.convertedCount ?? 0;
  const discountPct = reward?.discountPct ?? 0;
  const toNext = reward?.toNext ?? 0;
  const nextDiscountPct = reward?.nextDiscountPct ?? null;

  return (
    <Card className="overflow-hidden p-0">
      <Box className="flex flex-col gap-4 bg-navy p-5 text-white sm:flex-row sm:items-center sm:justify-between">
        <Box className="flex items-start gap-3">
          <Box className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/10">
            <Sparkles className="size-5 text-accent-soft" />
          </Box>
          <Box>
            <Text as="p" className="text-lg font-bold leading-tight text-white">
              {discountPct > 0
                ? `You have unlocked ${discountPct}% off`
                : "Earn up to 25% off your subscription"}
            </Text>
            <Text as="p" className="mt-0.5 text-sm text-accent-soft">
              {nextDiscountPct !== null
                ? `${converted} converted so far. ${toNext} more to reach ${nextDiscountPct}% off.`
                : `${converted} referrals converted. You are at the top tier.`}
            </Text>
          </Box>
        </Box>
        <Box className="flex gap-2">
          {REFERRAL_TIERS.slice()
            .sort((a, b) => a.min - b.min)
            .map((t) => {
              const reached = converted >= t.min;
              return (
                <Box
                  key={t.min}
                  className={cn(
                    "flex min-w-[88px] flex-col items-center rounded-lg border px-3 py-2 text-center",
                    reached
                      ? "border-accent-soft/40 bg-white/10"
                      : "border-white/15 bg-transparent",
                  )}
                >
                  <Text
                    as="span"
                    className={cn(
                      "inline-flex items-center gap-1 text-base font-bold",
                      reached ? "text-white" : "text-white/70",
                    )}
                  >
                    {reached && <Check className="size-3.5 text-accent-soft" />}
                    {t.discountPct}%
                  </Text>
                  <Text as="span" className="mt-0.5 text-[11px] text-accent-soft">
                    {t.min} referrals
                  </Text>
                </Box>
              );
            })}
        </Box>
      </Box>
    </Card>
  );
}

function ReferralRow({ referral: r }) {
  const status = statusOf(r.status);
  const isConverted = r.status === "converted";
  return (
    <Card className={cn("p-4", isConverted && "border-success/40")}>
      <Box className="flex flex-wrap items-start justify-between gap-3">
        <Box className="min-w-0">
          <Box className="flex flex-wrap items-center gap-2">
            <Text as="span" className="inline-flex items-center gap-1.5 font-semibold text-ink">
              <Building2 className="size-4 shrink-0 text-ink/40" />
              {r.company_name}
            </Text>
            <Text as="span" className={cn("chip", status.chip)}>{status.label}</Text>
            {isConverted && (
              <Text as="span" className="text-xs font-semibold text-success">
                Now a Spectra customer
              </Text>
            )}
          </Box>
          <Text as="p" className="mt-1 text-sm text-ink/70">
            {r.contact_name}
            {r.contact_email ? ` · ${r.contact_email}` : ""}
          </Text>
          {r.platform_note && (
            <Box className="mt-2 flex items-start gap-1.5 rounded-md bg-surface-2 px-3 py-2">
              <Mail className="mt-0.5 size-3.5 shrink-0 text-ink/40" />
              <Text as="p" className="text-xs text-ink/70">{r.platform_note}</Text>
            </Box>
          )}
        </Box>
        <Box className="text-right">
          <Text as="p" className="font-mono text-xs font-bold text-accent-blue">{r.ref_no}</Text>
          <Text as="p" className="mt-1 text-[11px] text-ink/40">
            {r.created_at?.slice(0, 10)}
          </Text>
        </Box>
      </Box>
    </Card>
  );
}

function ReferDialog({ onClose, onSaved }) {
  const [form, setForm] = useState({
    company_name: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    industry: "",
    country: "",
    team_size: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const canSave =
    form.company_name.trim() &&
    form.contact_name.trim() &&
    form.contact_email.trim();

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await createReferral({
        data: {
          company_name: form.company_name.trim(),
          contact_name: form.contact_name.trim(),
          contact_email: form.contact_email.trim(),
          contact_phone: form.contact_phone.trim() || null,
          industry: form.industry.trim() || null,
          country: form.country.trim() || null,
          team_size: form.team_size.trim() || null,
          notes: form.notes.trim() || null,
        },
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
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Refer a company</DialogTitle>
        </DialogHeader>

        <Box className="space-y-4">
          <Text as="p" className="text-sm text-ink/60">
            We will send an introduction on your behalf to the contact below.
            Once they become a customer, it counts toward your reward.
          </Text>

          <Box className="space-y-1.5">
            <Label>Company name</Label>
            <Input
              value={form.company_name}
              maxLength={160}
              onChange={(e) => set("company_name", e.target.value)}
              placeholder="Acme Corporation"
            />
          </Box>

          <Box className="grid gap-3 sm:grid-cols-2">
            <Box className="space-y-1.5">
              <Label>Contact name</Label>
              <Input
                value={form.contact_name}
                maxLength={120}
                onChange={(e) => set("contact_name", e.target.value)}
                placeholder="Jordan Lee"
              />
            </Box>
            <Box className="space-y-1.5">
              <Label>Contact email</Label>
              <Input
                type="email"
                value={form.contact_email}
                maxLength={255}
                onChange={(e) => set("contact_email", e.target.value)}
                placeholder="jordan@acme.com"
              />
            </Box>
          </Box>

          <Box className="grid gap-3 sm:grid-cols-3">
            <Box className="space-y-1.5">
              <Label>Phone</Label>
              <Input
                value={form.contact_phone}
                maxLength={40}
                onChange={(e) => set("contact_phone", e.target.value)}
                placeholder="Optional"
              />
            </Box>
            <Box className="space-y-1.5">
              <Label>Industry</Label>
              <Input
                value={form.industry}
                maxLength={80}
                onChange={(e) => set("industry", e.target.value)}
                placeholder="Optional"
              />
            </Box>
            <Box className="space-y-1.5">
              <Label>Team size</Label>
              <Input
                value={form.team_size}
                maxLength={40}
                onChange={(e) => set("team_size", e.target.value)}
                placeholder="e.g. 50-100"
              />
            </Box>
          </Box>

          <Box className="space-y-1.5">
            <Label>Country</Label>
            <Input
              value={form.country}
              maxLength={80}
              onChange={(e) => set("country", e.target.value)}
              placeholder="Optional"
            />
          </Box>

          <Box className="space-y-1.5">
            <Label>Why they would be a good fit</Label>
            <Textarea
              rows={3}
              value={form.notes}
              maxLength={450}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Anything that helps us tailor the conversation (optional)."
            />
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
            disabled={saving || !canSave}
            className="cursor-pointer gap-1.5 rounded-none bg-navy text-accent-soft hover:bg-accent-blue hover:text-white"
          >
            <Send className="size-3.5" />
            {saving ? "Sending…" : "Send referral"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
