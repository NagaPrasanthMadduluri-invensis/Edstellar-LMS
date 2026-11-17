"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Building2, Clock, Plus, Send, ShieldAlert, StickyNote } from "lucide-react";

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
  addIncidentNote,
  createIncident,
  fetchIncident,
  fetchIncidentOptions,
  fetchIncidents,
  notifyIncidentClients,
  updateIncident,
} from "@/services/api/platform/platform-api";
import {
  DEADLINE_STATES,
  INCIDENT_ASSESSMENTS,
  INCIDENT_SEVERITIES,
  INCIDENT_STATUSES,
  formatWhen,
  fromLocalInput,
  pick,
  relativeTo,
  toLocalInput,
} from "@/lib/incidents";
import { cn } from "@/lib/utils";

/**
 * The security incident register (BACKEND_STRUCTURE §10.46). Edstellar only.
 *
 * Every clock and its state comes from the API; this file only renders them.
 * The one rule the page states before anything else: log an incident the
 * moment it is suspected, because the clocks run from DISCOVERY, not from
 * when somebody got round to writing it down.
 */
export function PlatformIncidentsContent() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [orgs, setOrgs] = useState([]);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      setData(await fetchIncidents());
      setError(null);
    } catch (e) {
      setError(e.message);
      setData({ incidents: [], counts: { total: 0 } });
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!user) return;
    fetchIncidentOptions().then((d) => setOrgs(d.organizations ?? [])).catch(() => setOrgs([]));
  }, [user]);

  if (!data) {
    return (
      <Box className="space-y-4">
        <Skeleton className="h-[74px] w-full" />
        <Skeleton className="h-[320px] w-full" />
      </Box>
    );
  }

  const rows = data.incidents ?? [];
  const overdue = data.counts.overdue ?? 0;

  return (
    <Box className="space-y-4">
      <Box className="grid gap-px border border-line bg-line sm:grid-cols-4">
        <Kpi value={data.counts.total} label="Incidents logged" />
        <Kpi value={data.counts.open} label="Not closed" />
        <Kpi value={data.counts.notifiable} label="Assessed notifiable" />
        <Kpi value={overdue} label="With an overdue clock" danger={overdue > 0} />
      </Box>

      {error && <ErrorBox message={error} />}

      <Box className="flex flex-wrap items-center justify-between gap-3 border border-line bg-surface-2 px-4 py-3">
        <Text as="p" className="max-w-2xl text-[12.5px] text-text-2">
          Log an incident as soon as a breach is suspected, even with little
          known. The client, regulator and assessment clocks start at the
          discovery time, not when the entry is written.
        </Text>
        <Button
          onClick={() => setCreating(true)}
          className="cursor-pointer gap-1.5 rounded-none bg-navy text-accent-soft hover:bg-accent-blue hover:text-white"
        >
          <Plus className="size-4" />
          Log an incident
        </Button>
      </Box>

      {rows.length === 0 ? (
        <Box className="border border-dashed border-line-strong bg-surface px-6 py-16 text-center">
          <ShieldAlert className="mx-auto mb-3 size-8 text-text-3" />
          <Text as="h3" className="text-[14px] font-bold text-ink">No incidents logged</Text>
          <Text as="p" className="mx-auto mt-1.5 max-w-md text-[12.5px] text-text-2">
            When a personal data breach is suspected, log it here first. The
            register then tracks who must be told, and by when.
          </Text>
        </Box>
      ) : (
        <Box className="overflow-x-auto border border-line bg-surface">
          <table className="w-full min-w-[960px] border-collapse">
            <thead>
              <tr className="border-b border-line bg-surface-2">
                {["Ref no.", "Incident", "Severity", "Status", "Affected", "Next deadline", ""].map((h) => (
                  <th key={h} className="px-3.5 py-2.5 text-left font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-text-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const sev = pick(INCIDENT_SEVERITIES, r.severity);
                const st = pick(INCIDENT_STATUSES, r.status);
                const next = r.next_deadline;
                return (
                  <tr key={r.id} className="border-b border-line last:border-b-0 hover:bg-surface-2">
                    <td className="px-3.5 py-2.5 font-mono text-[11.5px] font-bold text-accent-blue">{r.ref_no}</td>
                    <td className="px-3.5 py-2.5">
                      <Text as="p" className="text-[12.5px] font-semibold text-ink">{r.title}</Text>
                      <Text as="p" className="text-[11px] text-text-3">Discovered {formatWhen(r.discovered_at)}</Text>
                    </td>
                    <td className="px-3.5 py-2.5"><Text as="span" className={cn("chip", sev.chip)}>{sev.label}</Text></td>
                    <td className="px-3.5 py-2.5"><Text as="span" className={cn("chip", st.chip)}>{st.label}</Text></td>
                    <td className="px-3.5 py-2.5 text-[12px] text-ink">
                      {r.organizations.length === 0
                        ? <Text as="span" className="text-text-3">None named</Text>
                        : r.organizations.map((o) => o.name).join(", ")}
                    </td>
                    <td className="px-3.5 py-2.5">
                      {next ? (
                        <Box>
                          <Text as="span" className={cn("chip", DEADLINE_STATES[next.state].chip)}>
                            {DEADLINE_STATES[next.state].label}
                          </Text>
                          <Text as="p" className="mt-1 text-[11.5px] text-ink">{next.label}</Text>
                          <Text as="p" className="text-[11px] text-text-3">
                            {next.due_at ? `${formatWhen(next.due_at)} · ${relativeTo(next.due_at)}` : "As soon as practicable"}
                          </Text>
                        </Box>
                      ) : (
                        <Text as="span" className="text-[12px] text-text-3">—</Text>
                      )}
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

      {creating && (
        <CreateDialog
          orgs={orgs}
          onClose={() => setCreating(false)}
          onCreated={async (id) => { setCreating(false); await load(); setOpenId(id); }}
        />
      )}
      {openId && (
        <IncidentDialog
          incidentId={openId}
          orgs={orgs}
          onClose={() => setOpenId(null)}
          onChanged={load}
        />
      )}
    </Box>
  );
}

/* ── Log an incident ─────────────────────────────────────────────────────── */

function CreateDialog({ orgs, onClose, onCreated }) {
  const [title, setTitle] = useState("");
  const [discovered, setDiscovered] = useState(toLocalInput(new Date().toISOString()));
  const [severity, setSeverity] = useState("medium");
  const [orgIds, setOrgIds] = useState([]);
  const [categories, setCategories] = useState("");
  const [people, setPeople] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const d = await createIncident({
        data: {
          title: title.trim(),
          discovered_at: fromLocalInput(discovered) || undefined,
          severity,
          organization_ids: orgIds,
          data_categories: categories.trim() || undefined,
          individuals_affected: people === "" ? undefined : Number(people),
          description: description.trim() || undefined,
        },
      });
      await onCreated(d.incident.id);
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!saving && !o) onClose(); }}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>Log a security incident</DialogTitle></DialogHeader>
        <Box className="space-y-3">
          <Text as="p" className="text-[12.5px] text-text-2">
            Write down what is known now. Everything else can be filled in as
            the assessment goes on; each change is recorded on the timeline.
          </Text>
          <FieldBox label="What happened">
            <Input value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Bulk email sent to the wrong distribution list" />
          </FieldBox>
          <Box className="grid gap-3 sm:grid-cols-2">
            <FieldBox label="Discovered at (your local time)">
              <Input type="datetime-local" value={discovered} onChange={(e) => setDiscovered(e.target.value)} />
            </FieldBox>
            <FieldBox label="Severity">
              <PickSelect value={severity} onChange={setSeverity} options={INCIDENT_SEVERITIES} />
            </FieldBox>
          </Box>
          <OrgPicker orgs={orgs} value={orgIds} onChange={setOrgIds} />
          <Box className="grid gap-3 sm:grid-cols-2">
            <FieldBox label="Personal data involved">
              <Input value={categories} onChange={(e) => setCategories(e.target.value)} placeholder="e.g. names, work emails" />
            </FieldBox>
            <FieldBox label="People affected (estimate)">
              <Input type="number" min={0} value={people} onChange={(e) => setPeople(e.target.value)} />
            </FieldBox>
          </Box>
          <FieldBox label="Description">
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </FieldBox>
          {error && <ErrorBox message={error} />}
        </Box>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button
            onClick={save}
            disabled={saving || !title.trim()}
            title={!title.trim() ? "Say what happened first" : undefined}
            className="cursor-pointer gap-1.5 rounded-none bg-navy text-accent-soft hover:bg-accent-blue hover:text-white"
          >
            {saving ? "Logging…" : "Log incident"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── One incident: clocks, details, notify, timeline ─────────────────────── */

function IncidentDialog({ incidentId, orgs, onClose, onChanged }) {
  const [incident, setIncident] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  const adopt = (i) => {
    setIncident(i);
    setForm({
      title: i.title,
      description: i.description ?? "",
      severity: i.severity,
      status: i.status,
      assessment: i.assessment,
      data_categories: i.data_categories ?? "",
      individuals_affected: i.individuals_affected ?? "",
      cause: i.cause ?? "",
      containment: i.containment ?? "",
      organization_ids: i.organizations.map((o) => o.id),
      regulator_notified_at: toLocalInput(i.regulator_notified_at),
      regulator_reference: i.regulator_reference ?? "",
      individuals_notified_at: toLocalInput(i.individuals_notified_at),
    });
  };

  useEffect(() => {
    let alive = true;
    fetchIncident({ incidentId })
      .then((d) => alive && adopt(d.incident))
      .catch((e) => alive && setError(e.message));
    return () => { alive = false; };
  }, [incidentId]);

  const set = (k) => (v) => { setSaved(false); setForm((f) => ({ ...f, [k]: v })); };

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const d = await updateIncident({
        incidentId,
        data: {
          title: form.title.trim(),
          description: form.description,
          severity: form.severity,
          status: form.status,
          assessment: form.assessment,
          data_categories: form.data_categories,
          individuals_affected: form.individuals_affected === "" ? null : Number(form.individuals_affected),
          cause: form.cause,
          containment: form.containment,
          organization_ids: form.organization_ids,
          regulator_notified_at: fromLocalInput(form.regulator_notified_at) || null,
          regulator_reference: form.regulator_reference,
          individuals_notified_at: fromLocalInput(form.individuals_notified_at) || null,
        },
      });
      adopt(d.incident);
      setSaved(true);
      await onChanged();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!saving && !o) onClose(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            {incident ? `${incident.ref_no} · ${incident.title}` : "Loading…"}
          </DialogTitle>
        </DialogHeader>

        {!incident || !form ? (
          error ? <ErrorBox message={error} /> :
          <Text as="p" className="py-8 text-center text-[12.5px] text-text-3">Loading…</Text>
        ) : (
          <Box className="min-w-0 space-y-5">
            <Deadlines incident={incident} />

            <Section title="Assessment and status">
              <Box className="grid gap-3 sm:grid-cols-3">
                <FieldBox label="Status">
                  <PickSelect value={form.status} onChange={set("status")} options={INCIDENT_STATUSES} />
                </FieldBox>
                <FieldBox label="Assessment">
                  <PickSelect value={form.assessment} onChange={set("assessment")} options={INCIDENT_ASSESSMENTS} />
                </FieldBox>
                <FieldBox label="Severity">
                  <PickSelect value={form.severity} onChange={set("severity")} options={INCIDENT_SEVERITIES} />
                </FieldBox>
              </Box>
              <Text as="p" className="text-[11px] text-text-3">
                Changing the assessment records the time it was decided. The
                PDPC's 3-day clock runs from that moment. Notifiable means:
                significant harm is likely, or 500 or more people are affected
                (PDPA), or there is a risk to people (GDPR). Under India&apos;s
                DPDP Act every breach is reportable.
              </Text>
            </Section>

            <Section title="What happened">
              <FieldBox label="Title">
                <Input value={form.title} maxLength={200} onChange={(e) => set("title")(e.target.value)} />
              </FieldBox>
              <FieldBox label="Description">
                <Textarea rows={3} value={form.description} onChange={(e) => set("description")(e.target.value)} />
              </FieldBox>
              <Box className="grid gap-3 sm:grid-cols-2">
                <FieldBox label="Personal data involved">
                  <Input value={form.data_categories} onChange={(e) => set("data_categories")(e.target.value)} />
                </FieldBox>
                <FieldBox label="People affected (estimate)">
                  <Input type="number" min={0} value={form.individuals_affected}
                    onChange={(e) => set("individuals_affected")(e.target.value)} />
                </FieldBox>
                <FieldBox label="Cause">
                  <Textarea rows={2} value={form.cause} onChange={(e) => set("cause")(e.target.value)} />
                </FieldBox>
                <FieldBox label="Containment and recovery">
                  <Textarea rows={2} value={form.containment} onChange={(e) => set("containment")(e.target.value)} />
                </FieldBox>
              </Box>
              <OrgPicker orgs={orgs} value={form.organization_ids} onChange={set("organization_ids")} />
            </Section>

            <Section title="Notices recorded by hand">
              <Text as="p" className="text-[11px] text-text-3">
                Filings to a regulator and letters to individuals happen outside
                the app. Record when they were made so the clocks close.
              </Text>
              <Box className="grid gap-3 sm:grid-cols-3">
                <FieldBox label="Regulator notified at">
                  <Input type="datetime-local" value={form.regulator_notified_at}
                    onChange={(e) => set("regulator_notified_at")(e.target.value)} />
                </FieldBox>
                <FieldBox label="Regulator reference">
                  <Input value={form.regulator_reference} onChange={(e) => set("regulator_reference")(e.target.value)} />
                </FieldBox>
                <FieldBox label="Individuals notified at">
                  <Input type="datetime-local" value={form.individuals_notified_at}
                    onChange={(e) => set("individuals_notified_at")(e.target.value)} />
                </FieldBox>
              </Box>
            </Section>

            {error && <ErrorBox message={error} />}
            <Box className="flex items-center justify-end gap-3">
              {saved && <Text as="span" className="text-[12px] text-success">Saved</Text>}
              <Button
                onClick={save}
                disabled={saving || !form.title.trim()}
                className="cursor-pointer rounded-none bg-navy text-accent-soft hover:bg-accent-blue hover:text-white"
              >
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </Box>

            <NotifyClients incident={incident} onDone={async (i) => { adopt(i); await onChanged(); }} />
            <Timeline incident={incident} onAdded={(i) => adopt(i)} />
          </Box>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Deadlines({ incident }) {
  return (
    <Box>
      <SectionTitle icon={Clock}>Clocks</SectionTitle>
      <Box className="divide-y divide-line border border-line bg-surface">
        {incident.deadlines.map((d) => {
          const st = DEADLINE_STATES[d.state];
          return (
            <Box key={d.key} className="flex flex-wrap items-start justify-between gap-3 px-3.5 py-2.5">
              <Box className="min-w-0 flex-1">
                <Text as="p" className="text-[12.5px] font-semibold text-ink">{d.label}</Text>
                <Text as="p" className="text-[11px] text-text-3">{d.basis}</Text>
              </Box>
              <Box className="text-right">
                <Text as="span" className={cn("chip", st.chip)}>{st.label}</Text>
                <Text as="p" className="mt-1 text-[11px] text-text-2">
                  {d.state === "done"
                    ? `Done ${formatWhen(d.done_at)}`
                    : d.due_at
                      ? `Due ${formatWhen(d.due_at)} · ${relativeTo(d.due_at)}`
                      : "As soon as practicable"}
                </Text>
              </Box>
            </Box>
          );
        })}
      </Box>
      {incident.status === "closed" && (
        <Text as="p" className="mt-1.5 text-[11px] text-text-3">
          This incident is closed. Open clocks are kept as the record of what was or was not done.
        </Text>
      )}
    </Box>
  );
}

function NotifyClients({ incident, onDone }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const names = incident.organizations.map((o) => o.name);

  async function send() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const d = await notifyIncidentClients({ incidentId: incident.id, message: message.trim() });
      setResult(`Sent to ${d.notified} admin${d.notified === 1 ? "" : "s"}.`);
      setMessage("");
      await onDone(d.incident);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Box className="space-y-2 border border-line bg-surface-2 p-3.5">
      <SectionTitle icon={Send}>Notify affected organizations</SectionTitle>
      {names.length === 0 ? (
        <Text as="p" className="text-[12px] text-text-2">
          No organization is named on this incident. Add the affected ones above and save first.
        </Text>
      ) : (
        <>
          <Text as="p" className="text-[12px] text-text-2">
            Sends an in-app notice and an email to every admin of{" "}
            <b>{names.join(", ")}</b>. Their email preferences do not apply,
            because telling them is our duty as their processor. The notice adds
            the reference, discovery time, data involved and status, and asks
            them to assess their own obligations.
            {incident.clients_notified_at && (
              <> First sent {formatWhen(incident.clients_notified_at)}; another send is recorded as an update.</>
            )}
          </Text>
          <Textarea
            rows={3}
            value={message}
            maxLength={4000}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What happened, what data is involved, what we have done, and what they should do."
          />
          {error && <ErrorBox message={error} />}
          <Box className="flex items-center justify-end gap-3">
            {result && <Text as="span" className="text-[12px] text-success">{result}</Text>}
            <Button
              onClick={send}
              disabled={busy || !message.trim()}
              title={!message.trim() ? "Write the message first" : undefined}
              className="cursor-pointer gap-1.5 rounded-none bg-navy text-accent-soft hover:bg-accent-blue hover:text-white"
            >
              <Send className="size-3.5" />
              {busy ? "Sending…" : incident.clients_notified_at ? "Send an update" : "Send notice"}
            </Button>
          </Box>
        </>
      )}
    </Box>
  );
}

function Timeline({ incident, onAdded }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function add() {
    setBusy(true);
    setError(null);
    try {
      const d = await addIncidentNote({ incidentId: incident.id, note: note.trim() });
      setNote("");
      onAdded(d.incident);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Box className="space-y-2">
      <SectionTitle icon={StickyNote}>Timeline</SectionTitle>
      <Box className="flex gap-2">
        <Input value={note} maxLength={4000} onChange={(e) => setNote(e.target.value)}
          placeholder="Add what was found, decided or done" />
        <Button variant="outline" onClick={add} disabled={busy || !note.trim()} className="cursor-pointer rounded-none">
          Add note
        </Button>
      </Box>
      {error && <ErrorBox message={error} />}
      <Box className="divide-y divide-line border border-line bg-surface">
        {(incident.events ?? []).map((e) => (
          <Box key={e.id} className="px-3.5 py-2">
            <Text as="p" className="whitespace-pre-wrap text-[12px] text-ink">{e.note}</Text>
            <Text as="p" className="mt-0.5 font-mono text-[10.5px] text-text-3">
              {formatWhen(e.created_at)} · {e.actor_name ?? "Unknown"}
            </Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

/* ── Small parts ─────────────────────────────────────────────────────────── */

function OrgPicker({ orgs, value, onChange }) {
  const selected = useMemo(() => new Set(value), [value]);
  const toggle = (id) => onChange(selected.has(id) ? value.filter((v) => v !== id) : [...value, id]);
  return (
    <FieldBox label="Affected client organizations">
      {orgs.length === 0 ? (
        <Text as="p" className="text-[12px] text-text-3">No tenant organizations exist.</Text>
      ) : (
        <Box className="grid max-h-40 gap-1 overflow-y-auto border border-line bg-surface p-2 sm:grid-cols-2">
          {orgs.map((o) => (
            <label key={o.id} className="flex cursor-pointer items-center gap-2 text-[12.5px] text-ink">
              <input type="checkbox" className="size-3.5 cursor-pointer accent-[#3B6FD4]"
                checked={selected.has(o.id)} onChange={() => toggle(o.id)} />
              <Building2 className="size-3.5 text-text-3" />
              {o.name}
            </label>
          ))}
        </Box>
      )}
    </FieldBox>
  );
}

function PickSelect({ value, onChange, options }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 text-[12.5px]">
        <SelectValue>{pick(options, value).label}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function Section({ title, children }) {
  return (
    <Box className="space-y-2.5">
      <SectionTitle>{title}</SectionTitle>
      {children}
    </Box>
  );
}

function SectionTitle({ icon: Icon, children }) {
  return (
    <Text as="p" className="mb-1.5 inline-flex items-center gap-1.5 border-b border-line pb-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-text-3">
      {Icon && <Icon className="size-3.5" />}
      {children}
    </Text>
  );
}

function FieldBox({ label, children }) {
  return (
    <Box className="space-y-1.5">
      <Label className="text-[12px]">{label}</Label>
      {children}
    </Box>
  );
}

function Kpi({ value, label, danger = false }) {
  return (
    <Box className="bg-surface px-4 py-3">
      <Text as="p" className={cn("inline-flex items-center gap-1.5 text-xl font-bold leading-none", danger ? "text-danger" : "text-ink")}>
        {danger && <AlertTriangle className="size-4" />}
        {value ?? 0}
      </Text>
      <Text as="p" className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-text-3">{label}</Text>
    </Box>
  );
}

function ErrorBox({ message }) {
  return (
    <Box className="border border-danger/30 bg-danger/10 px-3 py-2">
      <Text as="p" className="text-[12.5px] text-danger">{message}</Text>
    </Box>
  );
}
