"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight, BarChart3, BookOpen, Building2, CheckCircle2, ClipboardList,
  Crown, Handshake, Layers, Monitor, Paperclip, Search, Settings2, ShieldCheck,
  Sparkles, Target, TrendingUp, Trophy, Zap,
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
  createServiceRequest, fetchServiceRequests,
} from "@/services/api/admin/admin-api";
import {
  BADGE_CHIP, SERVICE_GROUPS, formFor, statusOf,
} from "@/lib/edstellar-services";
import { cn } from "@/lib/utils";

/**
 * Icon name -> lucide component. The catalogue stores a NAME, not a component,
 * so it stays plain data; this map is the only place that turns one into a
 * glyph. Every icon in this module comes from lucide — no inline SVG, no
 * emoji, which is what the reference used.
 */
const ICONS = {
  Search, Target, Zap, Sparkles,
  BookOpen, Building2, BarChart3, Settings2, ShieldCheck, Crown, Handshake,
  TrendingUp, Monitor, Layers, Trophy,
};

const Glyph = ({ name, className }) => {
  const Icon = ICONS[name] ?? Layers;
  return <Icon className={className} />;
};

/**
 * Each group carries a Spectra token rather than a hex value, so the four
 * group colours are the chart ramp (TASTE §10.4) and no new hue enters.
 * Written out in full because Tailwind cannot see a class built by string
 * concatenation.
 */
const TONE = {
  accent: {
    text: "text-accent-blue", border: "border-accent-blue", bg: "bg-accent-blue",
    tint: "bg-accent-tint", rule: "border-l-accent-blue",
  },
  success: {
    text: "text-success", border: "border-success", bg: "bg-success",
    tint: "bg-success/10", rule: "border-l-success",
  },
  warning: {
    text: "text-warning", border: "border-warning", bg: "bg-warning",
    tint: "bg-warning/10", rule: "border-l-warning",
  },
  rust: {
    text: "text-rust", border: "border-rust", bg: "bg-rust",
    tint: "bg-rust/10", rule: "border-l-rust",
  },
};

export function EdstellarServices() {
  const { user } = useAuth();

  const [mainTab, setMainTab] = useState(0);
  const [subTab, setSubTab] = useState(0);
  const [requesting, setRequesting] = useState(null);

  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      setData(await fetchServiceRequests());
      setError(null);
    } catch (e) {
      // A failure here must not hide the catalogue — the page's main job is
      // to show what Edstellar offers, and that is static.
      setError(e.message);
      setData({ requests: [], counts: { total: 0 } });
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const group = SERVICE_GROUPS[mainTab];
  const sub = group.subGroups[Math.min(subTab, group.subGroups.length - 1)];
  const tone = TONE[group.tone];

  const totalServices = useMemo(
    () => SERVICE_GROUPS.reduce(
      (a, g) => a + g.subGroups.reduce((b, s) => b + s.items.length, 0), 0),
    [],
  );

  return (
    <Box className="space-y-4">
      {/* ── What this page is, and what has been asked for so far ── */}
      <Box className="flex flex-wrap items-center gap-px border border-line bg-line">
        {[
          ["Services offered", totalServices],
          ["Requests raised", data?.counts?.total],
          ["Pending", data?.counts?.pending],
          ["In discussion", data?.counts?.in_discussion],
          ["Proposal sent", data?.counts?.proposal_sent],
        ].map(([label, value]) => (
          <Box key={label} className="min-w-[128px] flex-1 bg-surface px-4 py-3">
            {/* The placeholder sits OUTSIDE the paragraph, not inside it:
                Skeleton renders a <div>, and a <div> inside a <p> is invalid
                HTML that the browser silently reparents — which shows up as a
                hydration mismatch rather than as a layout bug. */}
            {data ? (
              <Text as="p" className="text-xl font-bold leading-none text-ink">
                {value ?? 0}
              </Text>
            ) : (
              <Skeleton className="h-5 w-8" />
            )}
            <Text as="p" className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-text-3">
              {label}
            </Text>
          </Box>
        ))}
      </Box>

      {/* ── Level 1: the four groups ── */}
      <Box className="flex flex-wrap border-b-2 border-line">
        {SERVICE_GROUPS.map((g, i) => {
          const t = TONE[g.tone];
          const active = i === mainTab;
          return (
            <button
              key={g.key}
              type="button"
              onClick={() => { setMainTab(i); setSubTab(0); }}
              className={cn(
                "-mb-0.5 flex cursor-pointer items-center gap-2 border-b-2 px-4 py-2.5 text-[13px] transition-colors",
                active
                  ? cn(t.border, t.tint, t.text, "font-bold")
                  : "border-transparent font-semibold text-text-3 hover:text-ink",
              )}
            >
              <Glyph name={g.icon} className="size-4" />
              {g.group}
            </button>
          );
        })}
      </Box>

      <Text as="p" className="text-[12.5px] text-text-2">{group.groupDesc}</Text>

      {/* ── Level 2: sub-groups within the chosen group ── */}
      <Box className="flex flex-wrap gap-2">
        {group.subGroups.map((sg, j) => {
          const active = j === subTab;
          return (
            <button
              key={sg.sub}
              type="button"
              onClick={() => setSubTab(j)}
              className={cn(
                "flex cursor-pointer items-center gap-1.5 border px-3 py-1.5 text-[12px] transition-colors",
                active
                  ? cn(tone.bg, tone.border, "font-bold text-white")
                  : "border-line bg-surface-2 font-semibold text-text-2 hover:border-line-strong hover:text-ink",
              )}
            >
              <Glyph name={sg.icon} className="size-3.5" />
              {sg.sub}
              <Text as="span" className={cn("text-[10.5px]", active ? "text-white/70" : "text-text-3")}>
                {sg.items.length}
              </Text>
            </button>
          );
        })}
      </Box>

      <Text as="p" className="text-[12px] text-text-3">{sub.subDesc}</Text>

      {/* ── The services themselves ── */}
      <Box className="grid gap-2 lg:grid-cols-2">
        {sub.items.map((item) => (
          <Box
            key={item.name}
            className={cn(
              "flex items-start gap-3 border border-l-[3px] border-line bg-surface px-4 py-3 transition-colors hover:bg-surface-2",
              tone.rule,
            )}
          >
            <Box className="min-w-0 flex-1">
              <Box className="flex flex-wrap items-center gap-2">
                <Text as="h3" className="text-[13px] font-bold text-ink">{item.name}</Text>
                {item.badge && (
                  <Text as="span" className={cn("chip", BADGE_CHIP[item.badge])}>
                    {item.badge}
                  </Text>
                )}
              </Box>
              <Text as="p" className="mt-1 text-[11.5px] leading-relaxed text-text-2">
                {item.desc}
              </Text>
            </Box>
            <Button
              onClick={() => setRequesting(item)}
              className={cn(
                "mt-0.5 h-7 shrink-0 cursor-pointer gap-1 rounded-none px-3 text-[11px] font-bold text-white",
                tone.bg, "hover:bg-navy",
              )}
            >
              Request
              <ArrowRight className="size-3" />
            </Button>
          </Box>
        ))}
      </Box>

      {/* ── What this organization has already asked for ── */}
      <RequestHistory data={data} error={error} />

      <RequestDialog
        service={requesting}
        tone={tone}
        user={user}
        onOpenChange={(open) => { if (!open) setRequesting(null); }}
        onSubmitted={load}
      />
    </Box>
  );
}

/* ── Past requests ─────────────────────────────────────────────────────── */

function RequestHistory({ data, error }) {
  if (error) {
    return (
      <Box className="border border-danger/30 bg-danger/10 px-3 py-2">
        <Text as="p" className="text-[12.5px] text-danger">
          Could not load your past requests: {error}
        </Text>
      </Box>
    );
  }
  if (!data || data.requests.length === 0) return null;

  return (
    <Box className="mt-2 space-y-2">
      <Box className="flex items-center gap-2">
        <ClipboardList className="size-4 text-text-3" />
        <Text as="h2" className="text-[14px] font-bold text-ink">Your requests</Text>
      </Box>

      <Box className="overflow-x-auto border border-line bg-surface">
        <table className="w-full min-w-[720px] border-collapse">
          <thead>
            <tr className="border-b border-line bg-surface-2">
              {["Ref no.", "Service", "Submitted", "Timeline", "Budget", "Status"].map((h) => (
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
            {data.requests.map((r) => {
              const status = statusOf(r.status);
              return (
                <tr key={r.id} className="border-b border-line last:border-b-0">
                  <td className="px-3.5 py-2.5 font-mono text-[11.5px] font-bold text-accent-blue">
                    {r.ref_no}
                  </td>
                  <td className="px-3.5 py-2.5 text-[12.5px] font-semibold text-ink">
                    {r.service}
                    {r.response_note && (
                      <Text as="p" className="mt-0.5 text-[11px] font-normal text-text-2">
                        {r.response_note}
                      </Text>
                    )}
                  </td>
                  <td className="px-3.5 py-2.5 text-[11.5px] text-text-3">
                    {r.created_at?.slice(0, 10) ?? "—"}
                  </td>
                  <td className="px-3.5 py-2.5 text-[11.5px] text-text-2">{r.timeline ?? "—"}</td>
                  <td className="px-3.5 py-2.5 text-[11.5px] text-text-2">{r.budget ?? "—"}</td>
                  <td className="px-3.5 py-2.5">
                    <Text as="span" className={cn("chip", status.chip)}>{status.label}</Text>
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

/* ── The request form ──────────────────────────────────────────────────────
   Rendered from the service's question set, not written per service. Fourteen
   sets cover the 42 services, and a service without one falls back to the
   generic set — which is why every service has a working Request button
   rather than 28 of them opening nothing.
──────────────────────────────────────────────────────────────────────────── */

function RequestDialog({ service, tone, user, onOpenChange, onSubmitted }) {
  const [answers, setAnswers] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);

  const config = service ? formFor(service.formKey) : null;

  useEffect(() => {
    if (!service) return;
    setAnswers({});
    setError(null);
    setDone(null);
  }, [service]);

  const set = (id, value) => setAnswers((prev) => ({ ...prev, [id]: value }));

  const toggle = (id, option) =>
    setAnswers((prev) => {
      const current = Array.isArray(prev[id]) ? prev[id] : [];
      return {
        ...prev,
        [id]: current.includes(option)
          ? current.filter((o) => o !== option)
          : [...current, option],
      };
    });

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      // Both are lifted out of the questionnaire into their own columns, so
      // the list can show them without reading into the JSON.
      const res = await createServiceRequest({
        service: service.name,
        answers,
        timeline: answers.timeline ?? null,
        budget: answers.budget ?? null,
      });
      setDone(res.request);
      await onSubmitted();
    } catch (e) {
      setError(e.message || "Could not submit that request");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={Boolean(service)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
        {done ? (
          <Box className="space-y-4 py-4 text-center">
            <CheckCircle2 className="mx-auto size-10 text-success" />
            <Box>
              <Text as="h2" className="text-[16px] font-bold text-ink">Request submitted</Text>
              <Text as="p" className="mx-auto mt-1.5 max-w-md text-[12.5px] leading-relaxed text-text-2">
                Your reference is{" "}
                <Text as="span" className="font-mono font-bold text-accent-blue">{done.ref_no}</Text>.
                Edstellar follows up within 2 business days. You can track it in
                Your requests below.
              </Text>
            </Box>
            <Button
              onClick={() => onOpenChange(false)}
              className="rounded-none bg-navy text-accent-soft hover:bg-accent-blue hover:text-white"
            >
              Done
            </Button>
          </Box>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{config?.headline ?? service?.name}</DialogTitle>
            </DialogHeader>

            {config?.intro && (
              <Text as="p" className="-mt-2 text-[12px] text-text-2">{config.intro}</Text>
            )}

            {/* Who this goes out as. Read from the session, not editable — the
                API signs the request with the verified token regardless, and a
                field that looks editable but is ignored would be a lie. */}
            <Box className="grid gap-px border border-line bg-line sm:grid-cols-2">
              <Box className="bg-surface-2 px-3.5 py-2.5">
                <Text as="p" className="font-mono text-[10px] uppercase tracking-[0.1em] text-text-3">
                  Service
                </Text>
                <Text as="p" className="mt-1 text-[12.5px] font-semibold text-ink">{service?.name}</Text>
              </Box>
              <Box className="bg-surface-2 px-3.5 py-2.5">
                <Text as="p" className="font-mono text-[10px] uppercase tracking-[0.1em] text-text-3">
                  Submitted by
                </Text>
                <Text as="p" className="mt-1 truncate text-[12.5px] font-semibold text-ink">
                  {[user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email}
                </Text>
              </Box>
            </Box>

            <Box className="space-y-5">
              {config?.sections.map((section) => (
                <Box key={section.heading} className="space-y-3.5">
                  <Text as="p" className="border-b border-line pb-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-text-3">
                    {section.heading}
                  </Text>
                  {section.fields.map((field) => (
                    <Field
                      key={field.id ?? field.label}
                      field={field}
                      value={answers[field.id]}
                      answers={answers}
                      onChange={set}
                      onToggle={toggle}
                    />
                  ))}
                </Box>
              ))}
            </Box>

            {error && (
              <Box className="border border-danger/30 bg-danger/10 px-3 py-2">
                <Text as="p" className="text-[12.5px] text-danger">{error}</Text>
              </Box>
            )}

            <DialogFooter className="items-center sm:justify-between">
              <Text as="p" className="text-[11px] text-text-3">
                Edstellar follows up within 2 business days.
              </Text>
              <Box className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button
                  onClick={submit}
                  disabled={saving}
                  className={cn("rounded-none text-white hover:bg-navy", tone?.bg)}
                >
                  {saving ? "Submitting…" : "Submit request"}
                </Button>
              </Box>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ── One question ──────────────────────────────────────────────────────────
   Six field types, plus the conditional follow-up that several sets attach to
   a specific option ("Other" -> tell us more). The follow-up renders only when
   its trigger is actually chosen, so the form stays as short as the answers
   allow.
──────────────────────────────────────────────────────────────────────────── */

function Field({ field, value, answers, onChange, onToggle }) {
  // A `note` is guidance, not a question — it has no id and collects nothing.
  if (field.type === "note") {
    return (
      <Box className="flex items-start gap-2 border-l-2 border-accent-blue bg-accent-tint px-3 py-2">
        <Paperclip className="mt-0.5 size-3.5 shrink-0 text-accent-blue" />
        <Text as="p" className="text-[11.5px] leading-relaxed text-text-2">
          {field.label ?? field.text}
        </Text>
      </Box>
    );
  }

  const triggered =
    field.condTrigger !== undefined &&
    (Array.isArray(value) ? value.includes(field.condTrigger) : value === field.condTrigger);

  return (
    <Box className="space-y-1.5">
      <Label className="text-[12.5px] leading-snug">{field.label}</Label>

      {field.type === "text" && (
        <Input
          value={value ?? ""}
          placeholder={field.placeholder}
          onChange={(e) => onChange(field.id, e.target.value)}
        />
      )}

      {field.type === "textarea" && (
        <Textarea
          rows={field.rows ?? 3}
          value={value ?? ""}
          placeholder={field.placeholder}
          onChange={(e) => onChange(field.id, e.target.value)}
        />
      )}

      {field.type === "select" && (
        <Select value={value ?? ""} onValueChange={(v) => onChange(field.id, v)}>
          <SelectTrigger>
            {/* This Select renders the raw value unless given children. */}
            <SelectValue placeholder="Choose one">{value}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {field.opts.map((opt) => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {field.type === "radio" && (
        <Box className="space-y-1.5">
          {field.opts.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(field.id, opt)}
              className={cn(
                "flex w-full cursor-pointer items-center gap-2.5 border px-3 py-2 text-left text-[12px] transition-colors",
                value === opt
                  ? "border-accent-blue bg-accent-tint font-semibold text-ink"
                  : "border-line bg-surface-2 text-text-2 hover:border-line-strong",
              )}
            >
              <Box
                className={cn(
                  "size-3.5 shrink-0 rounded-full border-2",
                  value === opt ? "border-accent-blue bg-accent-blue" : "border-line-strong",
                )}
              />
              {opt}
            </button>
          ))}
        </Box>
      )}

      {field.type === "checkbox" && (
        <Box className="grid gap-1.5 sm:grid-cols-2">
          {field.opts.map((opt) => {
            const on = Array.isArray(value) && value.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onToggle(field.id, opt)}
                className={cn(
                  "flex cursor-pointer items-center gap-2.5 border px-3 py-2 text-left text-[12px] transition-colors",
                  on
                    ? "border-accent-blue bg-accent-tint font-semibold text-ink"
                    : "border-line bg-surface-2 text-text-2 hover:border-line-strong",
                )}
              >
                <Box
                  className={cn(
                    "flex size-3.5 shrink-0 items-center justify-center border-2",
                    on ? "border-accent-blue bg-accent-blue" : "border-line-strong",
                  )}
                >
                  {on && <CheckCircle2 className="size-2.5 text-white" />}
                </Box>
                {opt}
              </button>
            );
          })}
        </Box>
      )}

      {triggered && field.condField && (
        <Box className="mt-2 border-l-2 border-accent-blue pl-3">
          <Field
            field={field.condField}
            value={answers[field.condField.id]}
            answers={answers}
            onChange={onChange}
            onToggle={onToggle}
          />
        </Box>
      )}
    </Box>
  );
}
