"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, ChevronLeft, ChevronRight, Filter, Plus, RefreshCw,
  Search, ShieldAlert, Trash2, Pencil,
} from "lucide-react";

import Box from "@/components/ui/box";
import Text from "@/components/ui/text";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { fetchActivity, fetchActivityOptions } from "@/services/api/activity-api";
import { cn } from "@/lib/utils";

/**
 * The activity log, rendered for whichever portal passed its `base`.
 *
 * ONE component for both, because the two endpoints return the same shape
 * over different scopes and a second copy would be two screens free to
 * disagree about what an action looks like. The ONLY difference the props
 * carry is the organization column, which the platform view shows and the
 * tenant view cannot (there is only ever one).
 *
 * **It renders what the API sends and derives nothing.** The action, the
 * outcome and the entity were all decided server-side at write time; a
 * browser-side re-derivation would be a second definition of "what
 * happened", which is the failure the standards keep recording.
 */

/** Action → how it reads. A create and a delete are not the same news. */
const ACTIONS = {
  create: { label: "Created", icon: Plus,   tone: "text-success" },
  update: { label: "Updated", icon: Pencil, tone: "text-accent-blue" },
  delete: { label: "Deleted", icon: Trash2, tone: "text-error" },
};

/**
 * Routes whose HTTP verb reads wrong as an action.
 *
 * `action` is derived from the method at write time, which is right for a
 * resource and silly for an event: `POST /api/auth/login` is a create, so
 * the table said "Created / Login", which is not what happened and reads
 * as a bug. The STORED value is untouched — filtering by "create" still
 * finds these — and this is presentation only, keyed on the route pattern
 * the row already carries.
 *
 * Deliberately short. It covers the handful where the noun is an event
 * rather than a thing; everything else is a genuine create, update or
 * delete and needs no translation.
 */
const PHRASES = [
  [/\/auth\/login$/,               "Signed in"],
  [/\/auth\/logout$/,              "Signed out"],
  [/\/auth\/impersonate$/,         "Started a support session"],
  [/\/auth\/exit-impersonation$/,  "Ended a support session"],
  [/\/auth\/forgot-password$/,     "Asked for a password reset"],
  [/\/auth\/reset-password$/,      "Reset a password"],
  [/\/auth\/change-password$/,     "Changed a password"],
  [/\/complete$/,                   "Completed"],
  [/\/resend$/,                     "Resent"],
  [/\/promote$/,                    "Promoted"],
  [/\/nudge$/,                      "Nudged"],
  [/\/enrol$/,                      "Enrolled in"],
  [/\/bulk$/,                       "Bulk-changed"],
];

function phraseFor(route) {
  const hit = PHRASES.find(([re]) => re.test(route ?? ""));
  return hit ? hit[1] : null;
}

/** Portal → what to call the person. A Manager rides the learner portal. */
const PORTALS = {
  admin:   { label: "Admin",   tone: "bg-navy/10 text-navy border-navy/20" },
  learner: { label: "Learner", tone: "bg-accent-blue/10 text-accent-blue border-accent-blue/20" },
  trainer: { label: "Trainer", tone: "bg-warning/10 text-warning border-warning/25" },
};

const PAGE = 50;

function timeOf(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

/** `courses` → `Courses`, `external-certifications` → `External certifications`. */
function prettyEntity(value) {
  if (!value) return "—";
  const words = value.replace(/[-_]/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function ActivityLog({ base, showOrganization = false }) {
  const [data, setData]       = useState(null);
  const [options, setOptions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [offset, setOffset]   = useState(0);
  const [expanded, setExpanded] = useState(null);

  const [filters, setFilters] = useState({
    actor_user_id: "all", actor_portal: "all", action: "all",
    entity: "all", outcome: "all", organization_id: "all", q: "",
  });
  /* Typed into, but not sent until Search — a request per keystroke across a
   * table this size is a request per keystroke nobody asked for. */
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchActivity(base, { ...filters, limit: PAGE, offset });
      setData(result);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [base, filters, offset]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    fetchActivityOptions(base).then(setOptions).catch(() => setOptions(null));
  }, [base]);

  const set = (key) => (value) => { setOffset(0); setFilters((p) => ({ ...p, [key]: value })); };

  const applySearch = () => { setOffset(0); setFilters((p) => ({ ...p, q: search })); };

  const summary = data?.summary ?? {};
  const rows = data?.entries ?? [];

  const tiles = useMemo(() => ([
    { label: "Actions",  value: summary.total   ?? 0 },
    { label: "Created",  value: summary.creates ?? 0 },
    { label: "Updated",  value: summary.updates ?? 0 },
    { label: "Deleted",  value: summary.deletes ?? 0 },
    { label: "Refused",  value: summary.failures ?? 0, tone: (summary.failures ?? 0) > 0 ? "text-error" : undefined },
    { label: "People",   value: summary.actors  ?? 0 },
  ]), [summary]);

  if (error) {
    return (
      <Card className="p-6 text-center">
        <Text as="p" className="text-sm text-error">{error}</Text>
      </Card>
    );
  }

  return (
    <Box className="space-y-5">
      {/*
        The tiles come from the SAME query as the table, over the same
        filters — so narrowing to one person moves both, and a tile can
        never describe a different set from the rows beneath it.
      */}
      <Box className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {tiles.map((t) => (
          <Card key={t.label} className="p-4">
            {/*
              The skeleton is a SIBLING of the figure, never inside it.
              `Skeleton` renders a <div> and `Text as="p"` renders a <p>; a
              div inside a p is invalid HTML, which React resolves by
              moving it — so the server and client trees disagree and the
              whole subtree is thrown away and re-rendered. It showed up as
              a hydration error in the dev overlay, not as anything visible,
              which is exactly why it is worth fixing rather than ignoring.
            */}
            {loading && !data ? (
              <Skeleton className="h-7 w-12" />
            ) : (
              <Text as="p" className={cn("text-2xl font-bold", t.tone ?? "text-navy")}>
                {t.value}
              </Text>
            )}
            <Text as="p" className="text-[11px] text-text-3 mt-0.5 uppercase tracking-wide">
              {t.label}
            </Text>
          </Card>
        ))}
      </Box>

      <Card className="p-4 space-y-3">
        <Box className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-text-3" />
          <Text as="p" className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-text-3">
            Narrow it down
          </Text>
        </Box>

        <Box className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <Picker
            value={filters.action} onChange={set("action")} placeholder="Any action"
            options={[["create", "Created"], ["update", "Updated"], ["delete", "Deleted"]]}
          />
          <Picker
            value={filters.actor_portal} onChange={set("actor_portal")} placeholder="Anyone"
            options={[["admin", "Admins"], ["learner", "Learners & managers"], ["trainer", "Trainers"]]}
          />
          <Picker
            value={filters.outcome} onChange={set("outcome")} placeholder="Any outcome"
            options={[["success", "Succeeded"], ["failure", "Refused or failed"]]}
          />
          <Picker
            value={filters.entity} onChange={set("entity")} placeholder="Anything"
            options={(options?.entities ?? []).map((e) => [e, prettyEntity(e)])}
          />
          <Picker
            value={filters.actor_user_id} onChange={set("actor_user_id")} placeholder="Any person"
            options={(options?.actors ?? []).map((a) => [String(a.id), `${a.name} (${a.actions})`])}
          />
          {showOrganization && (
            <Picker
              value={filters.organization_id} onChange={set("organization_id")} placeholder="Every tenant"
              options={(options?.organizations ?? []).map((o) => [String(o.id), o.name])}
            />
          )}
          <Box className="flex gap-2 lg:col-span-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") applySearch(); }}
              placeholder="Name, path or thing…"
              className="h-9 text-sm"
            />
            <Button variant="outline" size="sm" className="h-9 gap-1.5 shrink-0" onClick={applySearch}>
              <Search className="h-3.5 w-3.5" />Search
            </Button>
          </Box>
        </Box>
      </Card>

      <Card className="overflow-hidden">
        <Box className="px-4 py-2.5 border-b flex items-center justify-between gap-3">
          <Text as="p" className="text-xs font-semibold text-text-3 uppercase tracking-wide">
            {loading && !data ? "Loading…" : `${data?.total ?? 0} action${data?.total === 1 ? "" : "s"}`}
          </Text>
          <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={load} disabled={loading}>
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />Refresh
          </Button>
        </Box>

        <Box className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/30">
              <tr>
                {["When", "Who", "Did what", "To", showOrganization && "Tenant", "Result"]
                  .filter(Boolean).map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left font-semibold text-text-3 whitespace-nowrap">{h}</th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {loading && !data && [...Array(8)].map((_, i) => (
                <tr key={i} className="border-t"><td colSpan={6} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td></tr>
              ))}

              {!loading && rows.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-12 text-center">
                  <Text as="p" className="text-sm text-text-3">
                    Nothing matches those filters.
                  </Text>
                  <Text as="p" className="text-xs text-text-3 mt-1">
                    Every create, update and delete is recorded from the moment this shipped — there is no history from before it.
                  </Text>
                </td></tr>
              )}

              {rows.map((r) => {
                const action = ACTIONS[r.action] ?? { label: r.action, icon: Pencil, tone: "text-text-3" };
                const Icon = action.icon;
                const portal = PORTALS[r.actor_portal];
                const open = expanded === r.id;
                return (
                  <tr
                    key={r.id}
                    className={cn("border-t align-top cursor-pointer hover:bg-muted/20",
                      r.outcome === "failure" && "bg-error/[0.035]")}
                    onClick={() => setExpanded(open ? null : r.id)}
                  >
                    <td className="px-4 py-2.5 whitespace-nowrap text-text-3">{timeOf(r.created_at)}</td>
                    <td className="px-4 py-2.5">
                      <Box className="flex items-center gap-1.5 flex-wrap">
                        <Text as="span" className="font-medium">{r.actor_name}</Text>
                        {portal && (
                          <Badge variant="outline" className={cn("text-[9.5px] px-1.5 py-0 h-4", portal.tone)}>
                            {portal.label}
                          </Badge>
                        )}
                      </Box>
                      {/*
                        A support session is the one attribution this table
                        must never get wrong: without this line Edstellar's
                        actions read as the tenant's own admin's.
                      */}
                      {r.impersonator_name && (
                        <Box className="flex items-center gap-1 mt-0.5">
                          <ShieldAlert className="h-3 w-3 text-warning shrink-0" />
                          <Text as="span" className="text-[10.5px] text-warning">
                            Edstellar support ({r.impersonator_name})
                          </Text>
                        </Box>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <Box className="flex items-center gap-1.5">
                        <Icon className={cn("h-3.5 w-3.5 shrink-0", action.tone)} />
                        <Text as="span">{phraseFor(r.route) ?? action.label}</Text>
                      </Box>
                      {open && (
                        <Text as="p" className="mt-1 font-mono text-[10.5px] text-text-3 break-all">
                          {r.method} {r.path}
                        </Text>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <Text as="span">{prettyEntity(r.entity)}</Text>
                      {r.entity_id ? (
                        <Text as="span" className="text-text-3"> #{r.entity_id}</Text>
                      ) : null}
                      {open && r.summary && (
                        <pre className="mt-1.5 max-w-md overflow-x-auto rounded-lg bg-muted/50 p-2 text-[10px] leading-relaxed text-text-2">
                          {JSON.stringify(r.summary, null, 2)}
                        </pre>
                      )}
                    </td>
                    {showOrganization && (
                      <td className="px-4 py-2.5 whitespace-nowrap">{r.organization_name ?? "—"}</td>
                    )}
                    <td className="px-4 py-2.5">
                      {r.outcome === "failure" ? (
                        <Box className="flex items-start gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5 text-error shrink-0 mt-0.5" />
                          <Box>
                            <Text as="span" className="text-error font-medium">{r.status_code}</Text>
                            {r.error_message && (
                              <Text as="p" className="text-[10.5px] text-error/80 max-w-[22rem]">
                                {r.error_message}
                              </Text>
                            )}
                          </Box>
                        </Box>
                      ) : (
                        <Text as="span" className="text-success">{r.status_code}</Text>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Box>

        {(data?.total ?? 0) > PAGE && (
          <Box className="px-4 py-3 border-t flex items-center justify-between">
            <Text as="p" className="text-xs text-text-3">
              {offset + 1}–{Math.min(offset + PAGE, data.total)} of {data.total}
            </Text>
            <Box className="flex gap-2">
              <Button variant="outline" size="sm" className="h-7 gap-1 text-xs"
                      disabled={offset === 0 || loading}
                      onClick={() => setOffset(Math.max(offset - PAGE, 0))}>
                <ChevronLeft className="h-3.5 w-3.5" />Previous
              </Button>
              <Button variant="outline" size="sm" className="h-7 gap-1 text-xs"
                      disabled={!data?.has_more || loading}
                      onClick={() => setOffset(offset + PAGE)}>
                Next<ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </Box>
          </Box>
        )}
      </Card>

      {/*
        Stated on the page, not buried in a doc. An audit log that quietly
        omits a class of event is worse than one that says what it omits:
        somebody reading it needs to know a missing row might mean "did not
        happen" or might mean "not recorded".
      */}
      <Text as="p" className="text-[11px] text-text-3 leading-relaxed">
        Every create, update and delete is recorded — including attempts that were refused.
        Reads are not, and two high-volume telemetry writes (SCORM tracking and video progress)
        are deliberately left out so they cannot bury everything else. Passwords and tokens are
        never stored.
      </Text>
    </Box>
  );
}

function Picker({ value, onChange, placeholder, options }) {
  /*
   * `SelectValue` is given EXPLICIT children, not just a placeholder.
   *
   * This project's Select does not resolve the selected item's label by
   * itself — with `<SelectValue placeholder=… />` alone every one of these
   * rendered the literal string "all", which is what the value happens to
   * be and means nothing to a reader. `ManagerField` in the users screen
   * already passes children for the same reason.
   */
  const picked = options.find(([v]) => v === value);
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 text-sm">
        <SelectValue placeholder={placeholder}>
          {picked ? picked[1] : placeholder}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-72">
        <SelectItem value="all">{placeholder}</SelectItem>
        {options.map(([v, label]) => (
          <SelectItem key={v} value={v}>{label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
