"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Briefcase, Building2, CalendarDays, Clock, KeyRound, Mail, MapPin,
  Pencil, Phone, Users,
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { fetchMyProfile, updateMyProfile } from "@/services/api/profile-api";
import { JOB_LEVELS, LOCATIONS } from "@/lib/workforce";
import { cn } from "@/lib/utils";

/**
 * Where "Change password" lives differs per portal, and there is no shared
 * route. Resolved from the role rather than passed down, so the shells do not
 * each have to remember.
 */
function changePasswordHref(profile) {
  if (profile?.role === "trainer") return "/trainer/change-password";
  if (profile?.role === "admin") {
    return profile.is_platform_admin
      ? "/platform/change-password"
      : "/admin/change-password";
  }
  return "/change-password";
}

/**
 * "My profile" — the dialog behind the avatar in every portal's top bar.
 *
 * Read first, edit second. The reference mock opens straight into a grid of
 * facts with an Edit button under it, and that is right: most opens are
 * somebody checking what their account says, not changing it.
 *
 * What is NOT editable is the substance of this component, and each omission
 * is shown rather than hidden, so nobody hunts for a control that should not
 * exist:
 *
 *   * **Email** is the login identity. An admin changes it from Manage Users.
 *   * **Department** decides which manager can see you (`specs/rbac.md`
 *     decision 3 gives a Manager a department row scope), so it is an
 *     authorisation boundary and not a label to self-serve.
 *   * **Role** is set by an admin, obviously.
 *
 * The mock also shows a Manager field. There is no reporting line in this
 * product — a Manager's scope is a department, not a set of reports — so the
 * field is not rendered rather than rendered permanently empty.
 */
export function MyProfileDialog({ open, onOpenChange }) {
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setError(null);
    fetchMyProfile()
      .then((d) => alive && setProfile(d.profile))
      .catch((e) => alive && setError(e.message));
    return () => { alive = false; };
  }, [open]);

  // Reset to the read view each time it is reopened — leaving it in edit mode
  // makes the next open look like an unsaved draft.
  useEffect(() => { if (!open) setEditing(false); }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 sm:max-w-xl">
        <DialogHeader className="px-5 pt-5">
          <DialogTitle>My profile</DialogTitle>
        </DialogHeader>

        {error && (
          <Box className="mx-5 border border-danger/30 bg-danger/10 px-3 py-2">
            <Text as="p" className="text-[12.5px] text-danger">{error}</Text>
          </Box>
        )}

        {!profile && !error ? (
          <Box className="space-y-3 px-5 pb-5">
            <Skeleton className="h-[72px] w-full" />
            <Skeleton className="h-[200px] w-full" />
          </Box>
        ) : profile ? (
          editing ? (
            <ProfileForm
              profile={profile}
              onCancel={() => setEditing(false)}
              onSaved={(next) => { setProfile(next); setEditing(false); }}
            />
          ) : (
            <ProfileView
              profile={profile}
              onEdit={() => setEditing(true)}
              onClose={() => onOpenChange(false)}
            />
          )
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

/* ── Read ────────────────────────────────────────────────────────────────── */

function ProfileView({ profile: p, onEdit, onClose }) {
  const initials =
    `${p.first_name?.[0] ?? ""}${p.last_name?.[0] ?? ""}`.toUpperCase() || "U";

  return (
    <>
      {/* The navy header from the reference. `accent-soft` for the role chip,
          never `accent-blue` — the accent is unreadable on navy (§10.1). */}
      <Box className="surface-dark flex items-center gap-3.5 px-5 py-4">
        <Box className="flex size-12 shrink-0 items-center justify-center border border-white/25 bg-white/10">
          <Text as="span" className="text-[15px] font-bold text-white">{initials}</Text>
        </Box>
        <Box className="min-w-0">
          <Text as="p" className="truncate text-[16px] font-bold text-white">
            {p.first_name} {p.last_name}
          </Text>
          <Box className="mt-1 flex flex-wrap items-center gap-2">
            <Text as="span" className="bg-accent-blue px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-white">
              {p.role_label ?? p.role}
            </Text>
            <Text as="span" className="text-[12px] text-accent-soft">
              {p.organization_name}
            </Text>
          </Box>
        </Box>
      </Box>

      <Box className="px-5 py-4">
        <Text as="p" className="mb-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-text-3">
          Account details
        </Text>

        <Box className="grid gap-px border border-line bg-line sm:grid-cols-2">
          <Fact icon={Mail} label="Email" value={p.email} note="Set by your admin" />
          <Fact icon={Users} label="Department" value={p.department} note="Set by your admin" />
          <Fact icon={Briefcase} label="Job role" value={p.job_role} />
          <Fact icon={Briefcase} label="Level" value={p.job_level} />
          <Fact icon={MapPin} label="Location" value={p.location} />
          <Fact icon={Phone} label="Phone" value={p.phone} />
          <Fact icon={CalendarDays} label="Joined" value={formatMonth(p.joined_at)} />
          <Fact
            icon={Clock}
            label="Last activity"
            value={formatDate(p.last_active)}
            /* Not the join date dressed up as activity — this column used to
               print `created_at` on the users table and was always wrong. */
            note={p.last_active ? null : "No lessons or attempts yet"}
          />
        </Box>

        {p.employee_id && (
          <Text as="p" className="mt-2 text-[11px] text-text-3">
            Employee ID <Text as="span" className="font-mono text-ink">{p.employee_id}</Text>
          </Text>
        )}
      </Box>

      {/* `mx-0 mb-0` cancels the primitive's `-mx-4 -mb-4`, which assumes
          the content keeps its default `p-4`. This dialog sets `p-0` so its
          navy header can meet the edges, and without the reset the footer
          rendered 16px wider than the dialog and gave it a horizontal
          scrollbar. */}
      <DialogFooter className="mx-0 mb-0 flex-row flex-wrap items-center gap-2 border-t border-line px-5 py-3">
        <Button
          onClick={onEdit}
          className="cursor-pointer gap-1.5 rounded-none bg-navy text-accent-soft hover:bg-accent-blue hover:text-white"
        >
          <Pencil className="size-3.5" />Edit profile
        </Button>
        <Link
          href={changePasswordHref(p)}
          onClick={onClose}
          className="inline-flex cursor-pointer items-center gap-1.5 border border-line bg-surface px-3 py-2 text-[12.5px] font-semibold text-text-2 transition-colors hover:bg-surface-2"
        >
          <KeyRound className="size-3.5" />Change password
        </Link>
      </DialogFooter>
    </>
  );
}

function Fact({ icon: Icon, label, value, note }) {
  return (
    <Box className="bg-surface px-3.5 py-2.5">
      <Box className="flex items-center gap-1.5">
        <Icon className="size-3 shrink-0 text-text-3" />
        <Text as="p" className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-text-3">
          {label}
        </Text>
      </Box>
      <Text
        as="p"
        className={cn(
          "mt-1 break-words text-[13px]",
          value ? "font-semibold text-ink" : "text-text-3",
        )}
      >
        {value || "—"}
      </Text>
      {note && (
        <Text as="p" className="mt-0.5 text-[10px] text-text-3">{note}</Text>
      )}
    </Box>
  );
}

/* ── Edit ────────────────────────────────────────────────────────────────── */

function ProfileForm({ profile: p, onCancel, onSaved }) {
  const [form, setForm] = useState({
    first_name: p.first_name ?? "",
    last_name: p.last_name ?? "",
    phone: p.phone ?? "",
    job_role: p.job_role ?? "",
    job_level: p.job_level ?? "",
    location: p.location ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const set = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));
  const ready = form.first_name.trim() && form.last_name.trim();

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const { profile } = await updateMyProfile({
        data: {
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          // Blank means CLEAR, which the API reads as an explicit null. A
          // person removing their phone number must be able to.
          phone: form.phone.trim() || null,
          job_role: form.job_role.trim() || null,
          job_level: form.job_level || null,
          location: form.location || null,
        },
      });
      onSaved(profile);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Box className="space-y-3.5 px-5 py-4">
        <Box className="grid gap-3 sm:grid-cols-2">
          <Box className="space-y-1.5">
            <Label>First name</Label>
            <Input value={form.first_name} onChange={(e) => set("first_name", e.target.value)} />
          </Box>
          <Box className="space-y-1.5">
            <Label>Last name</Label>
            <Input value={form.last_name} onChange={(e) => set("last_name", e.target.value)} />
          </Box>
        </Box>

        <Box className="grid gap-3 sm:grid-cols-2">
          <Box className="space-y-1.5">
            <Label>Job role</Label>
            <Input
              value={form.job_role}
              onChange={(e) => set("job_role", e.target.value)}
              placeholder="e.g. Head of L&D"
            />
            {/* Free text on purpose, unlike the two below — it is a job title,
                not a reporting axis (§10.3.1.1). */}
          </Box>
          <Box className="space-y-1.5">
            <Label>Phone</Label>
            <Input
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="+91 98765 43210"
            />
          </Box>
        </Box>

        <Box className="grid gap-3 sm:grid-cols-2">
          <Box className="space-y-1.5">
            <Label>Level</Label>
            <Select value={form.job_level} onValueChange={(v) => set("job_level", v)}>
              <SelectTrigger>
                <SelectValue>{form.job_level || "Not set"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {JOB_LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </Box>
          <Box className="space-y-1.5">
            <Label>Location</Label>
            <Select value={form.location} onValueChange={(v) => set("location", v)}>
              <SelectTrigger>
                <SelectValue>{form.location || "Not set"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {LOCATIONS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </Box>
        </Box>

        {/* Said, not hidden. Somebody looking for these fields should learn
            where they live rather than conclude the form is broken. */}
        <Box className="border border-line bg-surface-2 px-3 py-2">
          <Text as="p" className="text-[11.5px] leading-relaxed text-text-2">
            Your email, department and role are set by your organization&apos;s
            admin. Department in particular decides who can see your progress,
            so it is not yours to change.
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
          disabled={saving || !ready}
          className="cursor-pointer rounded-none bg-navy text-accent-soft hover:bg-accent-blue hover:text-white"
        >
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </DialogFooter>
    </>
  );
}

/* ── Dates ───────────────────────────────────────────────────────────────── */

function formatMonth(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

function formatDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
