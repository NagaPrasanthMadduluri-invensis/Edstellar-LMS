"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle, Award, CheckCircle2, Clock, Download,
  TrendingUp, Users2,
} from "lucide-react";

import { apiClient } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { downloadFile } from "@/lib/download";
import { cn } from "@/lib/utils";

/**
 * Team Learning — the manager's extra module (`specs/rbac.md` decision 2).
 *
 * **The team is DIRECT REPORTS**, not the manager's department. `0033` moved
 * that definition: a department is a reporting dimension, not a team, so two
 * managers in one department each saw the other's people and neither could
 * have a report outside it. The header says "N direct reports" so the rule is
 * on the screen rather than only in the query.
 *
 * A manager is also a LEARNER — the role sits on the learner portal and they
 * keep My Courses, hours and certificates. So a manager who reports to
 * somebody appears in that person's team like anybody else, with their own
 * progress. Nothing here filters by role for that reason.
 *
 * The scope is never a parameter this component could widen: the API selects
 * on `manager_id = <the caller>`, and a plain learner gets 403.
 */

const STATUS = {
  completed:   { label: "completed",   chip: "chip chip-complete" },
  in_progress: { label: "in progress", chip: "chip chip-progress" },
  not_started: { label: "not started", chip: "chip chip-idle" },
};

/**
 * Postgres hands timestamps back as `2026-09-12 14:50:57.807+00`, and `+00`
 * is NOT a valid ISO offset — `new Date()` returns Invalid Date on it, which
 * rendered every Last active cell as an em dash while the API was sending a
 * real timestamp. Only the date is displayed, so take the date part and build
 * from the parts rather than trying to parse the whole string.
 */
function formatDate(iso) {
  if (!iso) return "—";
  const [y, m, d] = String(iso).slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return "—";
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

/** A figure with nothing behind it renders an em dash, never 0 (§10.3.1.8). */
function orDash(value, suffix = "") {
  return value === null || value === undefined ? "—" : `${value}${suffix}`;
}

function Tile({ icon: Icon, value, label, tone = "tile-accent" }) {
  return (
    <Card className="gap-0 p-4">
      <Box className={cn("mb-2 flex size-8 items-center justify-center", tone)}>
        <Icon className="size-4" />
      </Box>
      <Text as="p" className="text-[20px] font-bold leading-none text-ink">{value}</Text>
      <Text as="p" className="mt-1 text-[11px] text-text-2">{label}</Text>
    </Card>
  );
}

export function TeamLearningContent() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [nudging, setNudging] = useState(null);
  const [nudged, setNudged] = useState({});
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(null);

  const load = useCallback(async () => {
    try {
      setData(await apiClient("/api/learner/team"));
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function nudge(member) {
    setNudging(member.userId ?? member.id);
    try {
      await apiClient(`/api/learner/team/${member.userId ?? member.id}/nudge`, { method: "POST" });
      // Stays said, rather than flashing and vanishing: a manager needs to
      // know they already nudged this person today.
      setNudged((n) => ({ ...n, [member.userId ?? member.id]: true }));
    } catch (e) {
      setError(e.message);
    } finally {
      setNudging(null);
    }
  }

  async function exportReport() {
    setExporting(true);
    setExportError(null);
    try {
      await downloadFile("/api/learner/team/export", {
        method: "POST",
        filename: "team-report.xlsx",
      });
    } catch (e) {
      setExportError(e.message);
    } finally {
      setExporting(false);
    }
  }

  if (error) {
    return (
      <Card className="p-6">
        <Text as="p" className="text-[12.5px] text-danger">{error}</Text>
      </Card>
    );
  }

  if (!data) {
    return (
      <Box className="space-y-4">
        <Skeleton className="h-16 w-full" />
        <Box className="grid grid-cols-2 gap-3 lg:grid-cols-6">
          {[0,1,2,3,4,5].map((i) => <Skeleton key={i} className="h-24" />)}
        </Box>
        <Skeleton className="h-56 w-full" />
      </Box>
    );
  }

  const { team, summary, actions } = data;

  if (summary.size === 0) {
    return (
      <Card className="flex flex-col items-center justify-center gap-2 border-dashed border-line-strong py-16 text-center">
        <Users2 className="size-8 text-text-3" />
        <Text as="p" className="text-[13px] font-semibold text-ink">No direct reports</Text>
        <Text as="p" className="max-w-md text-[11.5px] text-text-2">{summary.note}</Text>
      </Card>
    );
  }

  return (
    <Box className="space-y-4">
      {/* ── Header strip ── */}
      <Card className="gap-0 p-4">
        <Box className="flex flex-wrap items-start justify-between gap-3">
          <Box>
            <Text as="h2" className="text-[15px] font-bold text-ink">
              Your team — {summary.size} direct report{summary.size === 1 ? "" : "s"}
            </Text>
            <Text as="p" className="mt-1 text-[11.5px] text-text-2">
              <Text as="span" className={cn("font-semibold", summary.completionPct > 0 ? "text-success" : "text-text-2")}>
                {summary.completionPct}%
              </Text>{" "}
              completion rate · Avg score:{" "}
              <Text as="span" className="font-semibold text-ink">{orDash(summary.avgScore, "%")}</Text>{" "}
              · {summary.onTrackForHours}/{summary.size} on track for hours
            </Text>
          </Box>

          <Box className="flex flex-wrap items-center gap-2">
            {/* Only when non-zero. A red "0 needs attention" is a false
                alarm — the same rule the sessions KPI follows. */}
            {summary.needsAttention > 0 && (
              <Text as="span" className="inline-flex items-center gap-1.5 border border-danger/30 bg-danger/10 px-2.5 py-1 text-[11.5px] font-semibold text-danger">
                <AlertTriangle className="size-3.5" />
                {summary.needsAttention} need{summary.needsAttention === 1 ? "s" : ""} attention
              </Text>
            )}
            <button
              type="button"
              onClick={exportReport}
              disabled={exporting}
              className="inline-flex cursor-pointer items-center gap-1.5 border border-line bg-surface px-2.5 py-1 text-[11.5px] font-semibold text-text-2 transition-colors hover:bg-accent-blue hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Download className="size-3.5" />
              {exporting ? "Preparing…" : "Export team report"}
            </button>
          </Box>
        </Box>
        {/* A failed download says so, rather than looking like a slow one. */}
        {exportError && (
          <Text as="p" className="mt-2 text-[11px] text-danger">{exportError}</Text>
        )}
      </Card>

      {/* ── Tiles, reduced from the rows below — never a second query ── */}
      <Box className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Tile icon={Users2}      value={summary.size}          label="Team size"     />
        <Tile icon={CheckCircle2} value={summary.completed}     label="Completed"     tone="tile-success" />
        <Tile icon={TrendingUp}  value={summary.inProgress}     label="In progress"   />
        <Tile icon={Clock}       value={summary.notStarted}     label="Not started"   tone="tile-warning" />
        <Tile icon={Award}       value={orDash(summary.avgScore, "%")} label="Avg score" tone="tile-success" />
        <Tile icon={Clock}       value={`${summary.avgHoursPerMonth}h`} label="Avg hrs/month" tone="tile-rust" />
      </Box>

      <Box className="grid gap-3 lg:grid-cols-2">
        {/* ── Status distribution ── */}
        <Card className="gap-0 p-0">
          <Box className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <Text as="h3" className="text-[13px] font-bold text-ink">Team completion</Text>
            <Text as="span" className="text-[11px] text-text-3">Status distribution</Text>
          </Box>
          <Box className="flex items-center gap-6 px-4 py-5">
            <Box className="shrink-0 text-center">
              <Text as="p" className={cn("text-[28px] font-bold leading-none", summary.completionPct > 0 ? "text-success" : "text-warning")}>
                {summary.completionPct}%
              </Text>
              <Text as="p" className="mt-1 text-[10.5px] text-text-3">done</Text>
            </Box>
            <Box className="flex-1 space-y-1.5">
              {[
                { label: "Completed",   n: summary.completed,  dot: "bg-success" },
                { label: "In progress", n: summary.inProgress, dot: "bg-accent-blue" },
                { label: "Not started", n: summary.notStarted, dot: "bg-text-3" },
              ].map((r) => (
                <Box key={r.label} className="flex items-center gap-2">
                  <Box className={cn("size-2.5 shrink-0", r.dot)} />
                  <Text as="span" className="flex-1 text-[12px] text-ink">{r.label}</Text>
                  <Text as="span" className="text-[12px] font-semibold text-ink">{r.n}</Text>
                </Box>
              ))}
            </Box>
          </Box>
        </Card>

        {/* ── Action required ── */}
        <Card className="gap-0 p-0">
          <Box className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <Text as="h3" className="text-[13px] font-bold text-ink">Action required</Text>
            <Text as="span" className="text-[11px] text-text-3">
              {actions.length} item{actions.length === 1 ? "" : "s"}
            </Text>
          </Box>
          {actions.length === 0 ? (
            /* Said explicitly. "Nothing needs attention" and "the panel did
               not load" must not look the same (§10.3.1.11). */
            <Box className="flex items-center gap-2 px-4 py-6">
              <CheckCircle2 className="size-4 shrink-0 text-success" />
              <Text as="p" className="text-[12px] text-ink">
                Nothing needs attention — everyone is on track this month.
              </Text>
            </Box>
          ) : (
            <Box className="divide-y divide-line">
              {actions.map((a) => (
                <Box key={`${a.userId}-${a.kind}`} className="flex items-center gap-3 px-4 py-2.5">
                  <Box className="flex size-7 shrink-0 items-center justify-center bg-surface-3">
                    <Clock className="size-3.5 text-text-2" />
                  </Box>
                  <Text as="p" className="flex-1 text-[12px] text-ink">{a.detail}</Text>
                  <button
                    type="button"
                    onClick={() => nudge(a)}
                    disabled={nudging === a.userId || nudged[a.userId]}
                    title={nudged[a.userId] ? "Already nudged" : `Send ${a.name.split(" ")[0]} a reminder`}
                    className="shrink-0 cursor-pointer border border-line bg-surface px-2 py-1 text-[11px] font-semibold text-text-2 transition-colors hover:bg-accent-blue hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {nudged[a.userId] ? "Nudged" : nudging === a.userId ? "…" : "Nudge"}
                  </button>
                </Box>
              ))}
            </Box>
          )}
        </Card>
      </Box>

      {/* ── Individual progress ── */}
      <Card className="gap-0 overflow-hidden p-0">
        <Box className="border-b border-line px-4 py-2.5">
          <Text as="h3" className="text-[13px] font-bold text-ink">Individual progress</Text>
          <Text as="p" className="mt-0.5 text-[10.5px] text-text-3">
            All courses assigned to each person
          </Text>
        </Box>
        <Box className="overflow-x-auto">
          <table className="w-full min-w-[52rem] text-left">
            <thead>
              <tr className="border-b border-line bg-surface-2">
                {["Member", "Status", "Course progress", "Score", "Pass?", "Hours", "Last active"].map((h) => (
                  <th key={h} className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-text-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {team.map((m) => {
                const cfg = STATUS[m.status] ?? STATUS.not_started;
                return (
                  <tr key={m.id} className="border-b border-line last:border-b-0 hover:bg-surface-2">
                    <td className="px-3 py-2.5">
                      <Text as="p" className="text-[12.5px] font-semibold text-ink">{m.name}</Text>
                      <Text as="p" className="text-[10.5px] text-text-3">
                        {m.department || "—"}{m.jobRole ? ` · ${m.jobRole}` : ""}
                      </Text>
                    </td>
                    <td className="px-3 py-2.5">
                      <Text as="span" className={cfg.chip}>{cfg.label}</Text>
                    </td>
                    <td className="px-3 py-2.5">
                      <Box className="flex items-center gap-2">
                        <Box className="h-1.5 w-24 shrink-0 bg-surface-3">
                          <Box
                            className={cn("h-full", m.progressPct >= 100 ? "bg-success" : "bg-accent-blue")}
                            style={{ width: `${Math.min(100, m.progressPct)}%` }}
                          />
                        </Box>
                        <Text as="span" className="text-[11.5px] font-semibold text-ink">{m.progressPct}%</Text>
                      </Box>
                      <Text as="p" className="mt-0.5 text-[10px] text-text-3">
                        {m.coursesCompleted} of {m.coursesAssigned} course{m.coursesAssigned === 1 ? "" : "s"}
                      </Text>
                    </td>
                    <td className="px-3 py-2.5">
                      <Text as="span" className="text-[12px] font-semibold text-ink">{orDash(m.score, "%")}</Text>
                    </td>
                    <td className="px-3 py-2.5">
                      {m.score === null ? (
                        <Text as="span" className="text-[12px] text-text-3">—</Text>
                      ) : (
                        <Text as="span" className={m.passed ? "chip chip-complete" : "chip chip-idle"}>
                          {m.passed ? "Pass" : "Not yet"}
                        </Text>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <Box className="flex items-center gap-2">
                        <Box className="h-1.5 w-16 shrink-0 bg-surface-3">
                          <Box
                            className={cn("h-full", m.onTrackForHours ? "bg-success" : "bg-warning")}
                            style={{ width: `${Math.min(100, (m.hoursThisMonth / summary.monthlyHoursGoal) * 100)}%` }}
                          />
                        </Box>
                        <Text as="span" className={cn("text-[11.5px] font-semibold", m.onTrackForHours ? "text-success" : "text-danger")}>
                          {m.hoursThisMonth}h
                        </Text>
                        <Text as="span" className="text-[10px] text-text-3">/{summary.monthlyHoursGoal}h</Text>
                      </Box>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <Text as="span" className="text-[11.5px] text-text-2">{formatDate(m.lastActiveAt)}</Text>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Box>
      </Card>

      {/* ── Learning hours ── */}
      <Card className="gap-0 p-0">
        <Box className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2.5">
          <Text as="h3" className="text-[13px] font-bold text-ink">Learning hours</Text>
          <Text as="span" className="text-[11px] text-text-3">
            Monthly goal {summary.monthlyHoursGoal}h — {summary.hoursThisMonth}h total this month
          </Text>
        </Box>
        <Box className="space-y-2.5 px-4 py-4">
          {team.map((m) => {
            const pct = Math.min(100, Math.round((m.hoursThisMonth / summary.monthlyHoursGoal) * 100));
            return (
              <Box key={m.id} className="flex items-center gap-3">
                <Text as="span" className="w-24 shrink-0 truncate text-[11.5px] text-ink">
                  {m.name.split(" ")[0]}
                </Text>
                <Box className="h-2 flex-1 bg-surface-3">
                  <Box
                    className={cn("h-full", m.onTrackForHours ? "bg-success" : "bg-warning")}
                    style={{ width: `${pct}%` }}
                  />
                </Box>
                <Text as="span" className={cn("w-10 shrink-0 text-right text-[11px] font-semibold", m.onTrackForHours ? "text-success" : "text-danger")}>
                  {pct}%
                </Text>
                <Text as="span" className="w-24 shrink-0 text-right text-[11px] text-text-3">
                  {m.hoursThisMonth}h / {summary.monthlyHoursGoal}h
                </Text>
              </Box>
            );
          })}
        </Box>
      </Card>
    </Box>
  );
}
