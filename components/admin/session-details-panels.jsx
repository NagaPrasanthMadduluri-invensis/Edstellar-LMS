"use client";

import { useEffect, useState } from "react";
import { CalendarRange, Download, FileSpreadsheet, FileText, Loader2, MessageSquareText, Star, Users } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { apiClient } from "@/lib/api-client";
import { downloadFile } from "@/lib/download";
import { cn } from "@/lib/utils";

/**
 * The admin session details additions (2026-11-24): the schedule of every
 * sitting with its seats, every learner's feedback, and the Download Session
 * Report. All three read the server's derived data (`sittings`, the feedback
 * and report routes), so they agree with the calendars and the learner's view.
 */

export function formatDay(iso) {
  if (!iso) return "";
  const [y, m, d] = String(iso).slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export function formatSpan(start, end) {
  if (!start) return "Date to be set";
  return end && end !== start ? `${formatDay(start)} to ${formatDay(end)}` : formatDay(start);
}

export function formatMinutes(min) {
  if (!min || min <= 0) return "";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h}h${m ? ` ${m}m` : ""}` : `${m}m`;
}

const SITTING_CHIP = {
  scheduled: "chip-progress",
  pending: "chip-warning",
  completed: "chip-complete",
  cancelled: "chip-error",
};

/** Every sitting of the session: dates, daily times, capacity and seats. */
export function SessionSchedulePanel({ session }) {
  const sittings = session?.sittings ?? [];
  if (sittings.length === 0) return null;
  const batched = sittings.some((s) => s.batch_id !== null);
  return (
    <Card className="gap-0 overflow-hidden p-0">
      <Box className="flex items-center gap-2 border-b border-line px-4 py-3">
        <CalendarRange className="h-4 w-4 text-accent-blue" />
        <Text as="h3" className="text-sm font-semibold">{batched ? `Batches (${sittings.length})` : "Schedule"}</Text>
      </Box>
      <Box className="overflow-x-auto">
        <Box as="table" className="w-full min-w-[720px] text-[12.5px]">
          <Box as="thead" className="bg-surface-2 text-left text-[10.5px] uppercase tracking-wide text-text-3">
            <Box as="tr">
              {["Sitting", "Dates", "Daily time", "Duration", "Trainer", "Registered", "Seats left", "Waitlist", "Status"].map((h) => (
                <Box as="th" key={h} className="px-3 py-2 font-semibold">{h}</Box>
              ))}
            </Box>
          </Box>
          <Box as="tbody" className="divide-y divide-border">
            {sittings.map((s) => (
              <Box as="tr" key={s.batch_id ?? "single"}>
                <Box as="td" className="px-3 py-2 font-semibold text-ink">{s.batch_id === null ? "Single sitting" : s.name}</Box>
                <Box as="td" className="px-3 py-2">
                  {formatSpan(s.start_date, s.end_date)}
                  {s.dates.length > 1 && <Text as="span" className="ml-1 text-text-3">({s.dates.length} days)</Text>}
                </Box>
                <Box as="td" className="px-3 py-2">{s.start_time && s.end_time ? `${s.start_time} to ${s.end_time}` : ""}</Box>
                <Box as="td" className="px-3 py-2">{formatMinutes(s.total_minutes)}</Box>
                <Box as="td" className="px-3 py-2">{s.trainer_name ?? ""}</Box>
                <Box as="td" className="px-3 py-2">{s.registered} / {s.capacity}</Box>
                <Box as="td" className={cn("px-3 py-2 font-semibold", s.is_full ? "text-error" : "text-success")}>
                  {s.is_full ? "Full" : s.available}
                </Box>
                <Box as="td" className="px-3 py-2">{s.waitlist || ""}</Box>
                <Box as="td" className="px-3 py-2"><Text as="span" className={cn("chip", SITTING_CHIP[s.status] ?? "chip-idle")}>{s.status}</Text></Box>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Card>
  );
}

function Stars({ value }) {
  return (
    <Box as="span" className="inline-flex items-center gap-0.5" title={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={cn("h-3 w-3", n <= Math.round(value) ? "fill-current text-warning" : "text-line")} />
      ))}
    </Box>
  );
}

/** Every learner's feedback on the session, with the averages on top. */
export function SessionFeedbackPanel({ sessionId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!sessionId) return;
    setData(null);
    setError(null);
    apiClient(`/api/admin/sessions/${sessionId}/feedback`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [sessionId]);

  const sum = data?.summary;
  return (
    <Card className="gap-0 overflow-hidden p-0">
      <Box className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
        <Box className="flex items-center gap-2">
          <MessageSquareText className="h-4 w-4 text-accent-blue" />
          <Text as="h3" className="text-sm font-semibold">Learner feedback</Text>
          {sum && <Text as="span" className="text-[11px] text-text-3">{sum.count} response{sum.count === 1 ? "" : "s"}</Text>}
        </Box>
        {sum?.count > 0 && (
          <Box className="flex flex-wrap gap-3 text-[11.5px] text-text-2">
            <Text as="span">Content <Box as="strong" className="text-ink">{sum.content}</Box></Text>
            <Text as="span">Trainer <Box as="strong" className="text-ink">{sum.trainer}</Box></Text>
            <Text as="span">Delivery <Box as="strong" className="text-ink">{sum.delivery}</Box></Text>
            <Text as="span">Overall <Box as="strong" className="text-ink">{sum.overall} / 5</Box></Text>
          </Box>
        )}
      </Box>
      <Box className="p-4">
        {error ? (
          <Text as="p" className="text-sm text-error">{error}</Text>
        ) : data === null ? (
          <Box className="space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></Box>
        ) : data.feedback.length === 0 ? (
          <Text as="p" className="text-sm text-text-3">
            No feedback yet. Learners who attended can rate the session after it is completed.
          </Text>
        ) : (
          <Box as="ul" className="divide-y divide-border">
            {data.feedback.map((f) => (
              <Box as="li" key={f.id} className="grid gap-2 py-3 sm:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
                <Box className="min-w-0">
                  <Text as="p" className="truncate text-[13px] font-semibold text-ink">{f.name}</Text>
                  <Text as="p" className="truncate text-[11px] text-text-3">{f.email}</Text>
                  <Text as="p" className="truncate text-[11px] text-text-3">
                    {[f.department, f.batch].filter(Boolean).join(" · ")}
                  </Text>
                  <Text as="p" className="text-[11px] text-text-3">Submitted {formatDay(f.submittedAt)}</Text>
                </Box>
                <Box className="min-w-0 space-y-1">
                  <Box className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-text-2">
                    <Text as="span" className="inline-flex items-center gap-1">Content <Stars value={f.ratings.content} /></Text>
                    <Text as="span" className="inline-flex items-center gap-1">Trainer <Stars value={f.ratings.trainer} /></Text>
                    <Text as="span" className="inline-flex items-center gap-1">Delivery <Stars value={f.ratings.delivery} /></Text>
                    <Text as="span" className="font-semibold text-ink">{f.average} / 5</Text>
                  </Box>
                  {f.comment ? (
                    <Text as="p" className="whitespace-pre-wrap text-[13px] text-ink/85">{f.comment}</Text>
                  ) : (
                    <Text as="p" className="text-[12px] italic text-text-3">No comment</Text>
                  )}
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Card>
  );
}

/** Download Session Report: an Excel workbook, or a printable PDF. */
export function SessionReportButtons({ sessionId }) {
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);

  async function excel() {
    setBusy("xlsx"); setError(null);
    try {
      await downloadFile(`/api/admin/sessions/${sessionId}/report.xlsx`, { filename: "session-report.xlsx" });
    } catch (e) { setError(e.message); } finally { setBusy(null); }
  }

  async function pdf() {
    setBusy("pdf"); setError(null);
    // Opened before the await so the browser treats it as the click's own window.
    const win = window.open("", "_blank");
    try {
      const report = await apiClient(`/api/admin/sessions/${sessionId}/report`);
      if (!win) throw new Error("Allow pop-ups for this site to save the PDF.");
      win.document.open();
      win.document.write(reportHtml(report));
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 300);
    } catch (e) {
      win?.close();
      setError(e.message);
    } finally { setBusy(null); }
  }

  return (
    <Box className="flex flex-wrap items-center gap-2">
      <Text as="span" className="inline-flex items-center gap-1 text-[12px] font-semibold text-text-2">
        <Download className="h-3.5 w-3.5" /> Download session report
      </Text>
      <Button size="sm" variant="outline" className="h-8 cursor-pointer gap-1.5" disabled={!!busy} onClick={excel}>
        {busy === "xlsx" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5" />} Excel
      </Button>
      <Button size="sm" variant="outline" className="h-8 cursor-pointer gap-1.5" disabled={!!busy} onClick={pdf}>
        {busy === "pdf" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />} PDF
      </Button>
      {error && <Text as="span" className="text-[12px] text-error">{error}</Text>}
    </Box>
  );
}

const esc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const ATT = { present: "Present", late: "Late", partial: "Partial", absent: "Absent", excused: "Excused" };

/**
 * The printable report: a standalone page the browser saves as PDF. Drawn from
 * the same payload as the Excel file. Fixed print colours: it is a document,
 * not a screen (the certificate's rule, design-palette.md).
 */
export function reportHtml(r) {
  const t = r.totals;
  const row = (cells, tag = "td") => `<tr>${cells.map((c) => `<${tag}>${esc(c)}</${tag}>`).join("")}</tr>`;
  const kv = (k, v) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`;
  const att = t.attendance;
  return `<!doctype html><html><head><meta charset="utf-8"><title>Session report: ${esc(r.session.title)}</title>
<style>
@page { size: A4 landscape; margin: 14mm; }
body { font: 11px/1.45 Inter, Arial, sans-serif; color: #0F1923; }
h1 { font-size: 20px; margin: 0 0 2px; } h2 { font-size: 13px; margin: 18px 0 6px; color: #1E2D40; }
.muted { color: #888; } .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 10px 0; }
.tile { border: 1px solid #D8D8D4; padding: 6px 8px; } .tile b { display: block; font-size: 16px; }
table { width: 100%; border-collapse: collapse; } th, td { border-bottom: 1px solid #D8D8D4; padding: 4px 6px; text-align: left; vertical-align: top; }
th { background: #F8F8F6; font-size: 10px; text-transform: uppercase; letter-spacing: .04em; }
table.kv th { width: 180px; text-transform: none; font-size: 11px; }
tr { break-inside: avoid; }
</style></head><body>
<h1>${esc(r.session.title)}</h1>
<div class="muted">Session report · generated ${esc(formatDay(r.generatedAt))}</div>
<div class="grid">
  <div class="tile">Learners<b>${t.learners}</b></div>
  <div class="tile">Registered / capacity<b>${t.registered} / ${t.capacity}</b></div>
  <div class="tile">Attendance rate<b>${t.attendanceRatePct === null ? "Not marked" : `${t.attendanceRatePct}%`}</b></div>
  <div class="tile">Feedback (overall)<b>${r.feedbackSummary.overall ?? "None"}${r.feedbackSummary.overall ? " / 5" : ""}</b></div>
</div>
<h2>Session</h2>
<table class="kv">
${kv("Format", r.session.type)}${kv("Trainer", r.session.trainer)}${kv("Venue or link", r.session.venue)}
${kv("Status", r.session.status)}${kv("Dates", formatSpan(r.session.firstDate, r.session.lastDate))}
${kv("Batches", t.batches || "Single sitting")}${kv("Seats available", t.available)}${kv("On waitlist", t.waitlist)}
${kv("Scheduled duration", formatMinutes(t.scheduledMinutes))}
${kv("Attendance", `${att.present} present, ${att.late} late, ${att.partial} partial, ${att.absent} absent, ${att.excused} excused, ${att.unmarked} not marked`)}
</table>
<h2>Batches and schedule</h2>
<table>${row(["Sitting", "Dates", "Days", "Daily time", "Duration", "Trainer", "Capacity", "Registered", "Available", "Waitlist", "Status"], "th")}
${r.sittings.map((s) => row([s.batch_id === null ? "Single sitting" : s.name, formatSpan(s.start_date, s.end_date), s.dates.length, s.start_time && s.end_time ? `${s.start_time} to ${s.end_time}` : "", formatMinutes(s.total_minutes), s.trainer_name ?? "", s.capacity, s.registered, s.available, s.waitlist, s.status])).join("")}
</table>
<h2>Learners (${r.learners.length})</h2>
<table>${row(["Name", "Email", "Department", "Batch", "Attendance", "Join time", "Rating", "Comment"], "th")}
${r.learners.map((l) => row([l.name, l.email, l.department ?? "", l.batch, l.attendance ? ATT[l.attendance] ?? l.attendance : "Not marked", l.joinTime ?? "", l.feedback ? `${l.feedback.average} / 5` : "", l.feedback?.comment ?? ""])).join("")}
</table>
<h2>Feedback summary</h2>
<table class="kv">
${kv("Responses", r.feedbackSummary.count)}${kv("Content", r.feedbackSummary.content ?? "")}${kv("Trainer", r.feedbackSummary.trainer ?? "")}
${kv("Delivery", r.feedbackSummary.delivery ?? "")}${kv("Overall", r.feedbackSummary.overall ?? "")}
</table>
</body></html>`;
}
