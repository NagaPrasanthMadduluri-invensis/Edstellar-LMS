"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle, CheckCircle2, Clock, Filter, Mail, RefreshCw, Search, Send, Ban,
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
import { fetchEmailOutbox, resendEmail } from "@/services/api/email-delivery-api";
import { cn } from "@/lib/utils";

/**
 * What happened to this organization's email.
 *
 * **The words on this page are chosen carefully and should not be loosened.**
 * Under the Gmail driver `sent` means Google ACCEPTED the message, not that
 * it arrived: the bounce and complaint feedback loop is SES-specific and is
 * not wired for Gmail, so nothing after acceptance reaches the table this
 * page reads. The status therefore reads "Handed to Gmail", never
 * "Delivered". A delivery figure nobody is measuring is worse than an
 * honest smaller claim — it is the screen that lies, about the one subject
 * where an admin has no other way to check.
 */

const STATUS = {
  sent:       { label: "Handed to Gmail", icon: CheckCircle2, tone: "bg-success/10 text-success border-success/25" },
  pending:    { label: "Queued",          icon: Clock,        tone: "bg-warning/10 text-warning border-warning/25" },
  sending:    { label: "Sending",         icon: Send,         tone: "bg-accent-blue/10 text-accent-blue border-accent-blue/25" },
  failed:     { label: "Failed",          icon: AlertTriangle, tone: "bg-error/10 text-error border-error/25" },
  suppressed: { label: "Withheld",        icon: Ban,          tone: "bg-muted text-text-3 border-border" },
};

const PAGE = 50;

function timeOf(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

function prettyType(value) {
  if (!value) return "—";
  const words = String(value).replace(/[-_]/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function EmailDeliveryContent() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [offset, setOffset]   = useState(0);
  const [status, setStatus]   = useState("all");
  const [type, setType]       = useState("all");
  const [search, setSearch]   = useState("");
  const [q, setQ]             = useState("");
  const [resending, setResending] = useState(null);
  const [notice, setNotice]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchEmailOutbox({ status, type, q, limit: PAGE, offset }));
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [status, type, q, offset]);

  useEffect(() => { load(); }, [load]);

  const onResend = async (row) => {
    setResending(row.id);
    setNotice(null);
    try {
      await resendEmail(row.id);
      setNotice({ tone: "success", text: `Queued again for ${row.to_email}. The worker picks it up within a minute.` });
      /* Refetched rather than patched locally: the row's status and attempt
       * count both changed server-side, and a hand-patched row is how a
       * tile comes to disagree with the list under it. */
      await load();
    } catch (e) {
      setNotice({ tone: "error", text: e.message });
    } finally {
      setResending(null);
    }
  };

  const counts = data?.counts ?? {};
  const rows = data?.rows ?? [];
  const failed = counts.failed ?? 0;

  if (error) {
    return <Card className="p-6 text-center"><Text as="p" className="text-sm text-error">{error}</Text></Card>;
  }

  return (
    <Box className="space-y-5">
      <Box className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {Object.entries(STATUS).map(([key, meta]) => (
          <Card key={key} className="p-4">
            {/* Sibling, not child — a Skeleton <div> inside a <p> is invalid
                HTML and fails hydration. See the note in activity-log.jsx. */}
            {loading && !data ? (
              <Skeleton className="h-7 w-10" />
            ) : (
              <Text as="p" className={cn("text-2xl font-bold",
                key === "failed" && (counts[key] ?? 0) > 0 ? "text-error" : "text-navy")}>
                {counts[key] ?? 0}
              </Text>
            )}
            <Text as="p" className="text-[11px] text-text-3 mt-0.5 uppercase tracking-wide">
              {meta.label}
            </Text>
          </Card>
        ))}
      </Box>

      {failed > 0 && (
        <Box className="flex items-start gap-2 rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-xs text-error">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <Text as="span">
            {failed} message{failed === 1 ? "" : "s"} gave up after their retries. Filter to
            <strong> Failed</strong> to see why, and resend once the cause is fixed.
          </Text>
        </Box>
      )}

      {notice && (
        <Box className={cn("rounded-xl border px-4 py-3 text-xs",
          notice.tone === "success"
            ? "border-success/30 bg-success/10 text-success"
            : "border-error/30 bg-error/10 text-error")}>
          {notice.text}
        </Box>
      )}

      <Card className="p-4 space-y-3">
        <Box className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-text-3" />
          <Text as="p" className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-text-3">
            Narrow it down
          </Text>
        </Box>
        <Box className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <Select value={status} onValueChange={(v) => { setOffset(0); setStatus(v); }}>
            {/* Explicit children — this Select does not resolve the item
                label on its own, and renders the raw value without them. */}
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Any status">
                {status === "all" ? "Any status" : (STATUS[status]?.label ?? status)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any status</SelectItem>
              {Object.entries(STATUS).map(([k, m]) => (
                <SelectItem key={k} value={k}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={type} onValueChange={(v) => { setOffset(0); setType(v); }}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Any message">
                {type === "all" ? "Any message" : prettyType(type)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="all">Any message</SelectItem>
              {(data?.types ?? []).map((t) => (
                <SelectItem key={t} value={t}>{prettyType(t)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Box className="flex gap-2 lg:col-span-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { setOffset(0); setQ(search); } }}
              placeholder="Address, name or subject…"
              className="h-9 text-sm"
            />
            <Button variant="outline" size="sm" className="h-9 gap-1.5 shrink-0"
                    onClick={() => { setOffset(0); setQ(search); }}>
              <Search className="h-3.5 w-3.5" />Search
            </Button>
          </Box>
        </Box>
      </Card>

      <Card className="overflow-hidden">
        <Box className="px-4 py-2.5 border-b flex items-center justify-between gap-3">
          <Text as="p" className="text-xs font-semibold text-text-3 uppercase tracking-wide">
            {loading && !data ? "Loading…" : `${data?.total ?? 0} message${data?.total === 1 ? "" : "s"}`}
          </Text>
          <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={load} disabled={loading}>
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />Refresh
          </Button>
        </Box>

        <Box className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/30">
              <tr>
                {["Queued", "To", "Message", "Status", "Attempts", ""].map((h, i) => (
                  <th key={i} className="px-4 py-2.5 text-left font-semibold text-text-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && !data && [...Array(6)].map((_, i) => (
                <tr key={i} className="border-t"><td colSpan={6} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td></tr>
              ))}

              {!loading && rows.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-12 text-center">
                  <Mail className="h-8 w-8 text-text-3/40 mx-auto mb-2" />
                  <Text as="p" className="text-sm text-text-3">No messages match.</Text>
                </td></tr>
              )}

              {rows.map((r) => {
                const meta = STATUS[r.status] ?? { label: r.status, icon: Mail, tone: "bg-muted text-text-3" };
                const Icon = meta.icon;
                return (
                  <tr key={r.id} className={cn("border-t align-top", r.status === "failed" && "bg-error/[0.035]")}>
                    <td className="px-4 py-2.5 whitespace-nowrap text-text-3">{timeOf(r.enqueued_at)}</td>
                    <td className="px-4 py-2.5">
                      <Text as="p" className="font-medium">{r.to_name || "—"}</Text>
                      <Text as="p" className="text-[10.5px] text-text-3">{r.to_email}</Text>
                    </td>
                    <td className="px-4 py-2.5 max-w-[20rem]">
                      <Text as="p">{r.subject}</Text>
                      <Text as="p" className="text-[10.5px] text-text-3">{prettyType(r.type)}</Text>
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant="outline" className={cn("text-[10px] gap-1 whitespace-nowrap", meta.tone)}>
                        <Icon className="h-3 w-3" />{meta.label}
                      </Badge>
                      {r.last_error && (
                        <Text as="p" className="mt-1 text-[10.5px] text-error max-w-[18rem]">{r.last_error}</Text>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-text-3">{r.attempts}</td>
                    <td className="px-4 py-2.5 text-right">
                      {/*
                        Offered ONLY for a failed row. A `sent` one would
                        deliver a duplicate nobody can recall, and a
                        `suppressed` one was withheld on purpose — the API
                        refuses both with 422, and a button that exists only
                        to be refused is the control that lies.
                      */}
                      {r.status === "failed" && (
                        <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs"
                                disabled={resending === r.id}
                                onClick={() => onResend(r)}>
                          <Send className="h-3 w-3" />
                          {resending === r.id ? "Queueing…" : "Resend"}
                        </Button>
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
              <Button variant="outline" size="sm" className="h-7 text-xs" disabled={offset === 0 || loading}
                      onClick={() => setOffset(Math.max(offset - PAGE, 0))}>Previous</Button>
              <Button variant="outline" size="sm" className="h-7 text-xs"
                      disabled={offset + PAGE >= (data?.total ?? 0) || loading}
                      onClick={() => setOffset(offset + PAGE)}>Next</Button>
            </Box>
          </Box>
        )}
      </Card>

      <Text as="p" className="text-[11px] text-text-3 leading-relaxed">
        <strong>&ldquo;Handed to Gmail&rdquo; is not the same as delivered.</strong> It means Google
        accepted the message for sending. Bounce and complaint feedback is not wired up for Gmail,
        so a message that was accepted and then rejected by the recipient&rsquo;s mail server will
        still show here as handed over. Anything that failed before that point — a bad address we
        rejected, a credential problem, a daily limit — does show as Failed, with the reason.
      </Text>
    </Box>
  );
}
