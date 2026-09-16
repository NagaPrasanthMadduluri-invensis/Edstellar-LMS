"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { BarChart3, ChevronDown, Download, Scale, Table2, User } from "lucide-react";

import Box from "@/components/ui/box";
import Text from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  buildComparisonReport,
  buildGroupReport,
  buildIndividualReport,
  exportComparisonReport,
  exportGroupReport,
  exportIndividualReport,
  fetchReportOptions,
} from "@/services/api/admin/admin-api";
import { BRAND, HAIRLINE } from "@/lib/brand";
import { cn } from "@/lib/utils";

const SCOPES = [
  { key: "group", label: "Group report", icon: BarChart3 },
  { key: "individual", label: "Individual report", icon: User },
  { key: "comparison", label: "Comparison", icon: Scale },
];

/** Mirrors ROW_CAP in `server/src/modules/reports/insights.service.ts`. It is
 *  only ever used in a sentence, so a drift misstates a number rather than
 *  breaking anything — but keep them in step. */
const ROW_CAP_LABEL = "first 500";

const AXIS = { fontSize: 11, fill: BRAND.text2 };
const TOOLTIP = {
  background: BRAND.surface,
  border: `1px solid ${BRAND.line}`,
  borderRadius: 0,
  fontSize: 12,
};

/** A labelled `<select>`, styled to the Spectra form control. */
function Field({ label, value, onChange, children }) {
  return (
    <Box>
      <Text as="label" className="mb-1 block font-mono text-[10px] uppercase tracking-[0.1em] text-text-3">
        {label}
      </Text>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 w-full border border-line bg-surface-2 px-2 text-[12.5px] text-ink outline-none focus:border-accent-blue"
      >
        {children}
      </select>
    </Box>
  );
}

/** The multi-select the reference uses for report types and metrics. */
function CheckList({ label, options, selected, onToggle, summary }) {
  const [open, setOpen] = useState(false);
  return (
    <Box className="relative">
      <Text as="label" className="mb-1 block font-mono text-[10px] uppercase tracking-[0.1em] text-text-3">
        {label}
      </Text>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-full items-center justify-between border border-line bg-surface-2 px-2 text-left text-[12.5px] text-ink outline-none focus:border-accent-blue"
      >
        <Text as="span" className="truncate">{summary}</Text>
        <ChevronDown className="size-3.5 shrink-0 text-text-3" />
      </button>
      {open && (
        <>
          {/* Click-away is a transparent full-screen layer rather than a
              document listener: it cannot leak past unmount. */}
          <Box
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <Box className="absolute left-0 right-0 z-50 mt-1 max-h-64 overflow-y-auto border border-line bg-surface">
            {options.map((o) => (
              <label
                key={o.key}
                className="flex cursor-pointer items-center gap-2.5 border-b border-line px-3 py-2 text-[12.5px] text-ink last:border-b-0 hover:bg-surface-2"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(o.key)}
                  onChange={() => onToggle(o.key)}
                  className="size-3.5 accent-accent-blue"
                />
                {o.label}
              </label>
            ))}
          </Box>
        </>
      )}
    </Box>
  );
}

/** One rendered report: summary, chart, detail table. */
function ReportSection({ report }) {
  const chartData = report.chart
    ? report.chart.labels.map((label, i) => ({ label, value: report.chart.data[i] ?? 0 }))
    : [];

  return (
    <Box className="space-y-3">
      <Box className="border-l-2 border-accent-blue pl-2.5">
        <Text as="h3" className="text-[14px] font-bold text-ink">{report.title}</Text>
      </Box>

      <Box className="grid gap-3 lg:grid-cols-2">
        <Box className="border border-line bg-surface">
          <Text as="p" className="border-b border-line px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-text-3">
            Summary
          </Text>
          <Box className="grid grid-cols-2 gap-2.5 p-4">
            {report.kpis.map((k) => (
              <Box key={k.label} className="border border-line bg-surface-2 px-3 py-2.5">
                <Text as="p" className="text-xl font-bold leading-none text-ink">{k.value}</Text>
                <Text as="p" className="mt-1.5 text-[11px] text-text-2">{k.label}</Text>
              </Box>
            ))}
          </Box>
        </Box>

        <Box className="border border-line bg-surface">
          <Text as="p" className="border-b border-line px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-text-3">
            Graph
          </Text>
          <Box className="h-[220px] p-4">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={HAIRLINE} vertical={false} />
                  <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: HAIRLINE }} />
                  <YAxis tick={AXIS} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: BRAND.surface2 }} contentStyle={TOOLTIP} />
                  <Bar dataKey="value" name={report.chart.axisLabel} fill={BRAND.accent} maxBarSize={56} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Box className="flex h-full items-center justify-center">
                <Text as="p" className="text-[12px] text-text-3">Nothing to plot for this selection.</Text>
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      <Box className="border border-line bg-surface">
        <Box className="flex items-center justify-between border-b border-line px-4 py-2.5">
          <Text as="p" className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-3">
            Details
          </Text>
          <Text as="p" className="text-[11px] text-text-3">
            {report.truncated
              ? `Showing the first ${report.rows.length} of ${report.totalRows} rows`
              : `${report.totalRows} row${report.totalRows === 1 ? "" : "s"}`}
          </Text>
        </Box>
        <Box className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr>
                {report.columns.map((c, i) => (
                  <th
                    key={c}
                    className={cn(
                      "border-b border-line bg-surface-2 px-4 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.06em] whitespace-nowrap text-text-3",
                      i === 0 ? "text-left" : "text-right",
                    )}
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.rows.map((row, r) => (
                <tr key={r} className="hover:bg-surface-2">
                  {row.map((cell, c) => (
                    <td
                      key={c}
                      className={cn(
                        "border-b border-line px-4 py-2.5 text-[12.5px]",
                        c === 0 ? "text-left text-ink" : "text-right text-text-2",
                      )}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
              {report.rows.length === 0 && (
                <tr>
                  <td colSpan={report.columns.length} className="px-4 py-10 text-center text-[12.5px] text-text-3">
                    No rows match this selection. Widen the time period or clear a filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Box>
      </Box>
    </Box>
  );
}

function EmptyState({ scope }) {
  const copy = {
    group: {
      title: "Group report",
      body: "Tick one or more reports, choose a time period and any filters, then press Create report. Each report you pick appears as its own section.",
    },
    individual: {
      title: "Individual report",
      body: "Pick a learner and a time period to see every course, score and hour on their record.",
    },
    comparison: {
      title: "Comparison",
      body: "Choose what to compare — departments, locations, job levels, job roles or individuals — then pick the metrics to measure them on.",
    },
  }[scope];

  return (
    <Box className="border border-dashed border-line-strong bg-surface px-6 py-16 text-center">
      <Table2 className="mx-auto mb-3 size-8 text-text-3" />
      <Text as="h3" className="text-[14px] font-bold text-ink">{copy.title}</Text>
      <Text as="p" className="mx-auto mt-2 max-w-md text-[12.5px] leading-relaxed text-text-2">
        {copy.body}
      </Text>
    </Box>
  );
}

export function AdminReportsContent() {
  const [options, setOptions] = useState(null);
  const [scope, setScope] = useState("group");

  // Builder state. Deliberately one object per scope rather than shared keys:
  // switching tabs must not carry a department filter into a comparison that
  // has no department control to show it in.
  const [types, setTypes] = useState(["completion"]);
  const [window_, setWindow] = useState("all");
  const [filters, setFilters] = useState({ department: "", location: "", job_role: "", job_level: "" });
  const [personId, setPersonId] = useState("");
  const [dimension, setDimension] = useState("department");
  const [items, setItems] = useState([]);
  const [metrics, setMetrics] = useState(["completion"]);

  const [result, setResult] = useState(null);
  const [person, setPerson] = useState(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(null);

  useEffect(() => {
    let alive = true;
    fetchReportOptions()
      .then((d) => {
        if (!alive) return;
        setOptions(d);
        if (d.learners?.length) setPersonId(String(d.learners[0].id));
      })
      .catch((e) => alive && setError(e.message || "Failed to load report options"));
    return () => { alive = false; };
  }, []);

  /** The items a comparison can pick, for the chosen dimension. */
  const itemOptions = useMemo(() => {
    if (!options) return [];
    if (dimension === "individual") {
      return options.learners.map((l) => ({ key: String(l.id), label: l.name }));
    }
    const source =
      dimension === "department" ? options.filters.departments
      : dimension === "location" ? options.filters.locations
      : dimension === "jobLevel" ? options.filters.jobLevels
      : options.filters.jobRoles;
    return source.map((v) => ({ key: v, label: v }));
  }, [options, dimension]);

  // Changing the dimension invalidates the selected items — they named values
  // of the previous dimension and would silently match nothing.
  useEffect(() => { setItems([]); }, [dimension]);

  const toggle = (setter) => (key) =>
    setter((cur) => (cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]));

  async function run() {
    setRunning(true);
    setError(null);
    setDownloadError(null);
    setPerson(null);
    try {
      if (scope === "group") {
        const d = await buildGroupReport({ types, window: window_, filters });
        setResult(d);
      } else if (scope === "individual") {
        const d = await buildIndividualReport({ userId: Number(personId), window: window_ });
        setPerson(d.person);
        setResult({ window: d.window, reports: d.report ? [d.report] : [] });
      } else {
        const d = await buildComparisonReport({ dimension, items, metrics, window: window_ });
        setResult(d);
      }
    } catch (e) {
      setError(e.message || "Could not build that report");
      setResult(null);
    } finally {
      setRunning(false);
    }
  }

  /**
   * Download the report that is on screen.
   *
   * It re-posts the SAME spec `run()` just posted rather than serialising
   * `result`, so the file is regenerated server-side and carries every row —
   * the table above is capped at 500 and says so, and a download that
   * inherited that cap would be a truncated file whose own summary described
   * the whole population.
   */
  async function download() {
    setDownloading(true);
    setDownloadError(null);
    try {
      if (scope === "group") {
        await exportGroupReport({ types, window: window_, filters });
      } else if (scope === "individual") {
        await exportIndividualReport({ userId: Number(personId), window: window_ });
      } else {
        await exportComparisonReport({ dimension, items, metrics, window: window_ });
      }
    } catch (e) {
      setDownloadError(e.message || "Could not download that report");
    } finally {
      setDownloading(false);
    }
  }

  const canRun =
    scope === "group" ? types.length > 0
    : scope === "individual" ? Boolean(personId)
    : items.length > 0 && metrics.length > 0;

  if (error && !options) {
    return (
      <Box className="border border-line bg-surface px-4 py-10 text-center">
        <Text as="p" className="text-sm text-danger">{error}</Text>
      </Box>
    );
  }
  if (!options) {
    return (
      <Box className="space-y-4">
        <Skeleton className="h-9 w-[420px] max-w-full" />
        <Skeleton className="h-[130px] w-full" />
        <Skeleton className="h-[320px] w-full" />
      </Box>
    );
  }

  return (
    <Box className="space-y-4">
      <Box className="flex flex-wrap border border-line">
        {SCOPES.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => { setScope(s.key); setResult(null); setError(null); }}
            className={cn(
              "flex items-center gap-1.5 border-r border-line px-3.5 py-2 text-[12.5px] font-semibold transition-colors last:border-r-0",
              scope === s.key
                ? "bg-navy text-accent-soft"
                : "bg-surface text-text-2 hover:bg-surface-2 hover:text-ink",
            )}
          >
            <s.icon className="size-3.5" />
            {s.label}
          </button>
        ))}
      </Box>

      <Box className="border border-line bg-surface p-4">
        <Box className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          {scope === "group" && (
            <>
              <CheckList
                label="Reports (choose one or more)"
                options={options.types}
                selected={types}
                onToggle={toggle(setTypes)}
                summary={
                  types.length === 0 ? "Select reports…"
                  : types.length === 1 ? options.types.find((t) => t.key === types[0])?.label
                  : `${types.length} reports selected`
                }
              />
              <Field label="Time period" value={window_} onChange={setWindow}>
                {options.windows.map((w) => <option key={w.key} value={w.key}>{w.label}</option>)}
              </Field>
              <Field label="Department" value={filters.department} onChange={(v) => setFilters({ ...filters, department: v })}>
                <option value="">All departments</option>
                {options.filters.departments.map((d) => <option key={d} value={d}>{d}</option>)}
              </Field>
              <Field label="Location" value={filters.location} onChange={(v) => setFilters({ ...filters, location: v })}>
                <option value="">All locations</option>
                {options.filters.locations.map((d) => <option key={d} value={d}>{d}</option>)}
              </Field>
              <Field label="Job level" value={filters.job_level} onChange={(v) => setFilters({ ...filters, job_level: v })}>
                <option value="">All levels</option>
                {options.filters.jobLevels.map((d) => <option key={d} value={d}>{d}</option>)}
              </Field>
              <Field label="Job role" value={filters.job_role} onChange={(v) => setFilters({ ...filters, job_role: v })}>
                <option value="">All roles</option>
                {options.filters.jobRoles.map((d) => <option key={d} value={d}>{d}</option>)}
              </Field>
            </>
          )}

          {scope === "individual" && (
            <>
              <Field label="Learner" value={personId} onChange={setPersonId}>
                {options.learners.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}{l.department ? ` — ${l.department}` : ""}
                  </option>
                ))}
              </Field>
              <Field label="Time period" value={window_} onChange={setWindow}>
                {options.windows.map((w) => <option key={w.key} value={w.key}>{w.label}</option>)}
              </Field>
            </>
          )}

          {scope === "comparison" && (
            <>
              <Field label="Compare" value={dimension} onChange={setDimension}>
                {options.dimensions.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
              </Field>
              <CheckList
                label="Items"
                options={itemOptions}
                selected={items}
                onToggle={toggle(setItems)}
                summary={items.length === 0 ? "Select items…" : `${items.length} selected`}
              />
              <CheckList
                label="Metrics"
                options={options.metrics}
                selected={metrics}
                onToggle={toggle(setMetrics)}
                summary={
                  metrics.length === 0 ? "Select metrics…"
                  : metrics.length === 1 ? options.metrics.find((m) => m.key === metrics[0])?.label
                  : `${metrics.length} metrics selected`
                }
              />
              <Field label="Time period" value={window_} onChange={setWindow}>
                {options.windows.map((w) => <option key={w.key} value={w.key}>{w.label}</option>)}
              </Field>
            </>
          )}
        </Box>

        <Box className="mt-4 flex items-center gap-3">
          <Button
            type="button"
            onClick={run}
            disabled={!canRun || running}
            className="h-9 rounded-none bg-navy px-5 text-[13px] font-bold text-accent-soft hover:bg-accent-blue hover:text-white"
          >
            {running ? "Building…" : "Create report"}
          </Button>
          {!canRun && (
            <Text as="p" className="text-[11.5px] text-text-3">
              {scope === "group" ? "Tick at least one report."
                : scope === "comparison" ? "Pick at least one item and one metric."
                : "Pick a learner."}
            </Text>
          )}
        </Box>
      </Box>

      {error && (
        <Box className="border border-line bg-surface px-4 py-6 text-center">
          <Text as="p" className="text-[13px] text-danger">{error}</Text>
        </Box>
      )}

      {!result && !error && <EmptyState scope={scope} />}

      {result && (
        <Box className="space-y-6">
          <Box className="flex flex-wrap items-start justify-between gap-3">
            <Box>
              <Text as="h2" className="text-[16px] font-bold text-ink">
                {scope === "group" ? "Group report" : scope === "individual" ? "Individual report" : "Comparison"}
              </Text>
              <Text as="p" className="mt-0.5 text-[12px] text-text-3">{result.window}</Text>
            </Box>

            {/* Only once a report exists. A download button beside an empty
                canvas has nothing to give. */}
            <Box className="flex flex-col items-end gap-1.5">
              <Button
                onClick={download}
                disabled={downloading}
                className="h-9 shrink-0 cursor-pointer gap-1.5 rounded-none bg-navy px-3.5 text-[12.5px] font-bold text-accent-soft hover:bg-accent-blue hover:text-white"
              >
                <Download className="size-3.5" />
                {downloading ? "Preparing…" : "Download .xlsx"}
              </Button>
              {result.reports.some((r) => r.truncated) && (
                <Text as="p" className="text-right text-[10.5px] text-text-3">
                  The file carries every row, not just the {ROW_CAP_LABEL} shown.
                </Text>
              )}
            </Box>
          </Box>

          {downloadError && (
            <Box className="border border-danger/30 bg-danger/10 px-3 py-2">
              <Text as="p" className="text-[12.5px] text-danger">{downloadError}</Text>
            </Box>
          )}

          {person && (
            <Box className="grid gap-px border border-line bg-line sm:grid-cols-3 xl:grid-cols-5">
              {[
                ["Learner", person.name],
                ["Email", person.email],
                ["Department", person.department ?? "—"],
                ["Location", person.location ?? "—"],
                ["Job level", person.job_level ?? "—"],
              ].map(([label, value]) => (
                <Box key={label} className="bg-surface px-3.5 py-2.5">
                  <Text as="p" className="font-mono text-[10px] uppercase tracking-[0.1em] text-text-3">{label}</Text>
                  <Text as="p" className="mt-1 truncate text-[12.5px] font-semibold text-ink">{value}</Text>
                </Box>
              ))}
            </Box>
          )}

          {result.reports.length === 0 ? (
            <Box className="border border-dashed border-line-strong bg-surface px-6 py-14 text-center">
              <Text as="p" className="text-[12.5px] text-text-2">
                That selection produced no report. Widen the time period or clear a filter.
              </Text>
            </Box>
          ) : (
            result.reports.map((r) => <ReportSection key={r.key} report={r} />)
          )}
        </Box>
      )}
    </Box>
  );
}
