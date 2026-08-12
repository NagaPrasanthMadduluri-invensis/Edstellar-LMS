"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Award, Download, Hash } from "lucide-react";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { apiClient } from "@/lib/api-client";

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });
}

/* Escape values interpolated into the raw print-document HTML string. */
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

/**
 * Build a fully self-contained certificate document and print it in a new
 * window. Rendering into a separate document keeps the app shell (sidebar /
 * top-nav) out of the printout and lets the browser "Save as PDF".
 */
function printCertificate(cert) {
  const win = window.open("", "_blank", "width=900,height=650");
  if (!win) return;

  const score =
    cert.finalScore !== null && cert.finalScore !== undefined ? `${cert.finalScore}%` : "N/A";

  win.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Certificate — ${escapeHtml(cert.certificateCode || "")}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Georgia, "Times New Roman", serif; background: #F2F0E8; color: #0A1628; padding: 40px; }
    .cert { position: relative; max-width: 820px; margin: 0 auto; background: #ffffff; border: 2px solid #0A1628; padding: 56px 64px; }
    .cert::before { content: ""; position: absolute; inset: 12px; border: 1px solid rgba(10,22,40,0.15); pointer-events: none; }
    .eyebrow { text-align: center; letter-spacing: 6px; font-size: 12px; text-transform: uppercase; color: rgba(10,22,40,0.60); }
    .title { text-align: center; font-size: 40px; color: #0A1628; margin: 12px 0 4px; }
    .subtitle { text-align: center; font-size: 14px; color: rgba(10,22,40,0.60); margin-bottom: 32px; }
    .presented { text-align: center; font-size: 13px; color: rgba(10,22,40,0.60); }
    .name { text-align: center; font-size: 30px; color: #0A1628; margin: 8px 0 6px; border-bottom: 2px solid #0A1628; display: inline-block; padding: 0 24px 6px; }
    .name-wrap { text-align: center; margin-bottom: 28px; }
    .body { text-align: center; font-size: 15px; line-height: 1.7; color: rgba(10,22,40,0.75); max-width: 560px; margin: 0 auto 36px; }
    .course { font-weight: bold; color: #0A1628; }
    .meta { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 40px; font-size: 12px; color: rgba(10,22,40,0.60); }
    .meta .label { text-transform: uppercase; letter-spacing: 1px; font-size: 10px; }
    .meta .value { font-size: 14px; color: #0A1628; font-weight: bold; margin-top: 4px; }
    .code { font-family: "Courier New", monospace; }
    @media print { body { background: #ffffff; padding: 0; } .cert { border-color: #0A1628; } }
  </style>
</head>
<body>
  <div class="cert">
    <div class="eyebrow">Edstellar LMS</div>
    <div class="title">Certificate of Completion</div>
    <div class="subtitle">This is to certify that</div>
    <div class="name-wrap"><span class="name">${escapeHtml(cert.learnerName || "Learner")}</span></div>
    <div class="body">
      has successfully completed the course
      <span class="course">${escapeHtml(cert.courseName || "")}</span>
      with a final score of <strong>${score}</strong>, meeting all requirements for certification.
    </div>
    <div class="meta">
      <div>
        <div class="label">Date Issued</div>
        <div class="value">${formatDate(cert.issuedAt)}</div>
      </div>
      <div style="text-align:right">
        <div class="label">Certificate Code</div>
        <div class="value code">${escapeHtml(cert.certificateCode || "")}</div>
      </div>
    </div>
  </div>
  <script>
    window.onload = function () { window.focus(); window.print(); };
  </script>
</body>
</html>`);
  win.document.close();
}

export function CertificatePrintView({ certificateId, open, onClose }) {
  const [cert, setCert] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!certificateId || !open) return;
    setCert(null);
    setError(null);
    setLoading(true);
    apiClient(`/api/learner/certificates/${certificateId}`)
      .then((d) => setCert(d.certificate))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [certificateId, open]);

  const score =
    cert && cert.finalScore !== null && cert.finalScore !== undefined ? `${cert.finalScore}%` : "N/A";

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Certificate</DialogTitle>
        </DialogHeader>

        {loading && (
          <Box className="space-y-4 py-2">
            <Skeleton className="h-6 w-40 mx-auto" />
            <Skeleton className="h-8 w-64 mx-auto" />
            <Skeleton className="h-24 w-full" />
            <Box className="flex justify-between">
              <Skeleton className="h-10 w-28" />
              <Skeleton className="h-10 w-28" />
            </Box>
          </Box>
        )}

        {!loading && error && (
          <Box className="py-8 text-center">
            <Text as="p" className="text-error text-sm">{error}</Text>
          </Box>
        )}

        {!loading && cert && (
          <Box className="relative overflow-hidden rounded-xl border-2 border-border bg-white px-8 py-10 text-center">
            <Box className="pointer-events-none absolute inset-3 rounded-lg border border-border" />
            <Box className="relative">
              <Box className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-paper-cream">
                <Award className="h-7 w-7 text-navy" />
              </Box>
              <Text as="p" className="text-[11px] uppercase tracking-[0.4em] text-muted-foreground">
                Edstellar LMS
              </Text>
              <Text as="h2" className="mt-2 text-2xl font-bold text-navy">
                Certificate of Completion
              </Text>
              <Text as="p" className="mt-4 text-xs text-muted-foreground">This is to certify that</Text>
              <Text as="p" className="mt-1 inline-block border-b-2 border-border px-4 pb-1 text-xl font-bold text-foreground">
                {cert.learnerName || "Learner"}
              </Text>
              <Text as="p" className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
                has successfully completed the course{" "}
                <Text as="span" className="font-semibold text-navy">{cert.courseName}</Text>{" "}
                with a final score of <Text as="span" className="font-semibold text-ink/70">{score}</Text>.
              </Text>
              <Box className="mt-8 flex items-end justify-between text-left">
                <Box>
                  <Text as="p" className="text-[10px] uppercase tracking-wide text-muted-foreground">Date Issued</Text>
                  <Text as="p" className="text-sm font-semibold">{formatDate(cert.issuedAt)}</Text>
                </Box>
                <Box className="text-right">
                  <Text as="p" className="text-[10px] uppercase tracking-wide text-muted-foreground">Certificate Code</Text>
                  <Text as="p" className="flex items-center justify-end gap-1 font-mono text-sm font-semibold">
                    <Hash className="h-3.5 w-3.5 text-navy/70" />
                    {cert.certificateCode}
                  </Text>
                </Box>
              </Box>
            </Box>
          </Box>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button
            disabled={!cert}
            onClick={() => cert && printCertificate(cert)}
            className="gap-1.5 bg-navy hover:bg-navy-soft text-paper"
          >
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
