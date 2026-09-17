"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, Crown, Search, ShieldCheck, UserCog } from "lucide-react";

import Box from "@/components/ui/box";
import Text from "@/components/ui/text";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { fetchPrivilegedAccounts } from "@/services/api/platform/platform-api";
import { cn } from "@/lib/utils";

/**
 * TWO levels, not the reference's four.
 *
 * Owner and Admin are derived from the role a user actually holds, and both
 * are enforced by `PermissionsGuard`. The reference also offers Billing Admin
 * and Read-only Auditor; neither gates anything in this system, and a level
 * that gates nothing is a screen that lies (§5.2.1). They belong here the day
 * something checks them.
 */
const LEVELS = {
  owner: {
    label: "Tenant owner",
    icon: Crown,
    chip: "chip-complete",
    desc: "The organisation's seeded admin role — full control, including managing its other admins.",
  },
  admin: {
    label: "Admin",
    icon: UserCog,
    chip: "chip-progress",
    desc: "A custom admin-portal role. What it can actually do is whatever its permissions allow.",
  },
};

export function AccessControlContent() {
  const { user } = useAuth();

  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");

  const load = useCallback(async () => {
    if (!user) return;
    try {
      setData(await fetchPrivilegedAccounts());
      setError(null);
    } catch (e) {
      setError(e.message);
      setData({ accounts: [], counts: {} });
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const accounts = data?.accounts ?? [];

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return accounts.filter((a) => {
      const matchesSearch =
        !q ||
        a.name.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        a.organization_name.toLowerCase().includes(q);
      const matchesLevel = levelFilter === "all" || a.level === levelFilter;
      return matchesSearch && matchesLevel;
    });
  }, [accounts, search, levelFilter]);

  if (!data) {
    return (
      <Box className="space-y-4">
        <Skeleton className="h-[74px] w-full" />
        <Skeleton className="h-[120px] w-full" />
        <Skeleton className="h-[320px] w-full" />
      </Box>
    );
  }

  return (
    <Box className="space-y-4">
      <Box className="grid gap-px border border-line bg-line sm:grid-cols-2 xl:grid-cols-4">
        <Kpi value={data.counts.total} label="Privileged accounts" />
        <Kpi value={data.counts.owners} label="Tenant owners" />
        <Kpi value={data.counts.suspended} label="Suspended" alert={data.counts.suspended > 0} />
        <Kpi value={data.counts.platform} label="Edstellar staff" />
      </Box>

      {/* Stated up front, because it is the thing a reader of this page most
          needs to know and the table alone does not say it. */}
      <Box className="flex items-start gap-2.5 border border-line bg-surface-2 px-4 py-3">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent-blue" />
        <Text as="p" className="text-[12px] leading-relaxed text-text-2">
          Everyone here holds an <strong className="text-ink">admin-portal role</strong> —
          they can change a tenant&apos;s content, people or settings. Learners,
          managers and trainers are not listed. Accounts in{" "}
          <strong className="text-ink">Edstellar Platform</strong> can act across
          every tenant.
        </Text>
      </Box>

      <Box className="grid gap-3 sm:grid-cols-2">
        {Object.entries(LEVELS).map(([key, lv]) => (
          <Box key={key} className="flex items-start gap-3 border border-line bg-surface px-4 py-3">
            <Box className="flex size-8 shrink-0 items-center justify-center border border-line bg-surface-3 text-text-2">
              <lv.icon className="size-4" />
            </Box>
            <Box>
              <Text as="p" className="text-[13px] font-bold text-ink">{lv.label}</Text>
              <Text as="p" className="mt-0.5 text-[11.5px] leading-relaxed text-text-2">{lv.desc}</Text>
            </Box>
          </Box>
        ))}
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
            placeholder="Search name, email, tenant…"
            className="h-9 bg-surface pl-8 text-[12.5px]"
          />
        </Box>
        <Select value={levelFilter} onValueChange={setLevelFilter}>
          <SelectTrigger className="h-9 w-[170px] text-[12.5px]">
            <SelectValue>
              {levelFilter === "all" ? "All levels" : LEVELS[levelFilter].label}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All levels</SelectItem>
            {Object.entries(LEVELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Text as="p" className="text-[12px] text-text-3">
          {visible.length} of {accounts.length}
        </Text>
      </Box>

      <Box className="overflow-x-auto border border-line bg-surface">
        <table className="w-full min-w-[820px] border-collapse">
          <thead>
            <tr className="border-b border-line bg-surface-2">
              {["Name", "Tenant", "Access level", "Role", "Status", "Last active", "Granted"].map((h) => (
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
            {visible.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <Text as="p" className="text-[12.5px] text-text-3">Nothing matches that search.</Text>
                </td>
              </tr>
            ) : visible.map((a) => {
              const lv = LEVELS[a.level] ?? LEVELS.admin;
              return (
                <tr key={a.id} className="border-b border-line last:border-b-0 hover:bg-surface-2">
                  <td className="px-3.5 py-2.5">
                    <Text as="p" className="text-[12.5px] font-semibold text-ink">{a.name}</Text>
                    <Text as="p" className="text-[11px] text-text-3">{a.email}</Text>
                  </td>
                  <td className="px-3.5 py-2.5">
                    <Text as="span" className="inline-flex items-center gap-1.5 text-[12px] text-ink">
                      <Building2 className="size-3.5 shrink-0 text-text-3" />
                      {a.organization_name}
                    </Text>
                    {a.is_platform_org && (
                      <Text as="p" className="mt-0.5 text-[10.5px] font-semibold text-accent-blue">
                        Acts across all tenants
                      </Text>
                    )}
                  </td>
                  <td className="px-3.5 py-2.5">
                    <Text as="span" className={cn("chip", lv.chip)}>{lv.label}</Text>
                  </td>
                  <td className="px-3.5 py-2.5 text-[12px] text-text-2">{a.role_name}</td>
                  <td className="px-3.5 py-2.5">
                    <Text as="span" className={a.status === "active" ? "chip chip-complete" : "chip chip-error"}>
                      {a.status}
                    </Text>
                  </td>
                  {/* Null is rendered as a dash, not "never" — an admin who
                      manages courses without completing any has no activity of
                      this kind, which is not the same as being dormant. */}
                  <td className="px-3.5 py-2.5 text-[11.5px] text-text-3">
                    {a.last_active ? String(a.last_active).slice(0, 10) : "—"}
                  </td>
                  <td className="px-3.5 py-2.5 text-[11.5px] text-text-3">
                    {String(a.granted_at).slice(0, 10)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Box>
    </Box>
  );
}

function Kpi({ value, label, alert = false }) {
  return (
    <Box className="bg-surface px-4 py-3">
      <Text as="p" className={cn("text-xl font-bold leading-none", alert ? "text-danger" : "text-ink")}>
        {value ?? 0}
      </Text>
      <Text as="p" className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-text-3">
        {label}
      </Text>
    </Box>
  );
}
