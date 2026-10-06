"use client";

import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Download } from "lucide-react";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { apiClient } from "@/lib/api-client";
import { PRODUCT_BY } from "@/lib/brand";

/**
 * THE CERTIFICATE DOCUMENT — three designs, one per kind of certificate.
 *
 * Built to the owner's reference PDFs (`Edstellar-Course-Certificate`,
 * `-LearningPath-`, `-Session-`). The three share one layout — corner
 * brackets, a pill naming the kind of learning, a serif "This is to certify
 * that", the learner's name over a fading rule, a details row, one named
 * signature — and differ in their COLOUR and in what they certify:
 *
 *   course   blue    Certificate of Completion     category, issue date, duration
 *   path     purple  Certificate of Achievement    the path's courses, count, length, date
 *   session  teal    Certificate of Participation  mode, trainer, date, duration, venue
 *
 * `cert.kind` decides which, and the API decides `kind` once
 * (`CertificatesService.certificateKind`), so the list chip and this
 * document cannot disagree.
 *
 * ## It does not use the Spectra palette, and that is a decision
 *
 * Gradients, rounded pills, a purple and a teal that are nowhere else in the
 * product. This is not a screen: it is a document the learner downloads,
 * keeps and shows to people who never see the rest of the product, so the
 * consistency the palette rules protect does not apply to it
 * (`.claude/rules/design-palette.md` records the exception). Treat THEMES as
 * FIXED, not as tokens.
 *
 * ## The tenant's branding, not the reference's
 *
 * The PDFs carry Edstellar's wordmark and Edstellar's CEO. Here the header is
 * the ISSUING ORGANISATION's logo (or its name, set as a wordmark, when none
 * is uploaded) and the signature is whoever that organisation names in its
 * certificate branding (0039). With no signatory set, the signature is the
 * organisation itself — never a person nobody at that tenant chose.
 *
 * ## Kept although the reference omits it: the certificate ID
 *
 * `GET /api/certificates/verify/:code` takes exactly this code, so a
 * certificate without it cannot be checked by anybody it is shown to. It is
 * printed small, at the foot.
 *
 * ## Still deliberately absent: the final score
 *
 * Removed from every certificate surface on the owner's instruction.
 *
 * ## ONE document, previewed and downloaded
 *
 * The dialog shows the same HTML the download writes, in a scaled iframe.
 * It used to be a hand-built React copy beside an HTML-string copy, and two
 * copies of a formal document are two chances for the preview to promise
 * something the file does not say.
 */

/* Fixed — see the note above. `main` is the kind's ink; `from`/`to` its
   gradient; `soft` the pill; `corner` the brackets; `frame` the hairline. */
const THEMES = {
  course: {
    main: "#1E4FA3", from: "#1A4DA1", to: "#3B6FD4",
    soft: "#E7EDF8", corner: "#8EA6CE", frame: "#DCE4F2",
  },
  path: {
    main: "#5B21B6", from: "#5B21B6", to: "#7C3AED",
    soft: "#F1EBFC", corner: "#B39DDB", frame: "#E4DAF5",
  },
  session: {
    main: "#0F6E6A", from: "#0F766E", to: "#17A2B8",
    soft: "#E3F1F0", corner: "#8DBDB9", frame: "#D5E8E7",
  },
};

const INK = "#0F172A";
const SLATE = "#334155";
const MUTED = "#64748B";
const FAINT = "#94A3B8";

/** A4 landscape at 96 dpi — the page the download prints onto. */
const PAGE_W = 1123;
const PAGE_H = 794;

/**
 * Postgres hands back `2026-06-06 02:54:34.739+00`, which is not ISO, and a
 * session's `date` is a bare `2026-05-31`. Both are normalised before `Date`
 * sees them — Safari rejects the first, and the offset repair would read the
 * "-31" of the second as an offset.
 */
function toDate(value) {
  if (!value) return null;
  const raw = String(value).trim();
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(raw)
    ? `${raw}T00:00:00`
    : raw.replace(" ", "T").replace(/([+-]\d{2})$/, "$1:00");
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "12 Jun 2026" — the course and session designs. */
function shortDate(value) {
  const d = toDate(value);
  return d ? d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : null;
}

/** "6 October 2026" — the learning path design. */
function longDate(value) {
  const d = toDate(value);
  return d ? d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : null;
}

/** "45 min" under the hour, "3h 30m" over it. Null when nothing is declared. */
function formatDuration(minutes) {
  if (!minutes || minutes <= 0) return null;
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

/** Escape anything interpolated into the document's HTML. */
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]),
  );
}

/**
 * The tenant's uploaded logo, as an absolute URL, or null.
 *
 * Absolutised because the print window is `about:blank` and the preview is a
 * `srcdoc` iframe — a root-relative `/uploads/...` resolves against neither.
 */
function logoSrc(cert) {
  const raw = cert.organizationLogoUrl;
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (typeof window === "undefined") return raw;
  try {
    return new URL(raw, window.location.origin).href;
  } catch {
    return null;
  }
}

/**
 * WHAT THE DOCUMENT SAYS, per kind — wording and details, never layout.
 *
 * A detail with nothing behind it is OMITTED rather than printed as an em
 * dash: on a formal document a dash reads as a mistake, not an absence.
 */
function documentContent(cert) {
  if (cert.kind === "path") {
    const courses = cert.path?.courses ?? [];
    return {
      theme: THEMES.path,
      pill: "Learning path · Multi-course",
      label: "Certificate of Achievement",
      metaWidth: 680,
      lead: "has successfully completed the structured learning path",
      subject: cert.journeyName,
      tag: cert.path?.tag || null,
      courses,
      meta: [
        ["Courses Completed", courses.length ? `${courses.length} course${courses.length === 1 ? "" : "s"}` : null],
        ["Total Duration", formatDuration(cert.path?.durationMinutes)],
        ["Completion Date", longDate(cert.path?.completedAt || cert.issuedAt)],
      ].filter(([, value]) => value),
    };
  }
  if (cert.kind === "session") {
    const virtual = cert.session?.mode === "virtual";
    return {
      theme: THEMES.session,
      pill: virtual ? "Virtual · Live, instructor-led" : "ILT · Live, instructor-led",
      label: "Certificate of Participation",
      metaWidth: 520,
      lead: "attended and actively participated in the live training session",
      subject: cert.session?.title || cert.courseName,
      tag: null,
      courses: [],
      meta: [
        ["Delivery Mode", virtual ? "Virtual (Live Online)" : "Instructor-Led (Classroom)"],
        ["Trainer", cert.session?.trainer],
        ["Date", shortDate(cert.session?.date || cert.issuedAt)],
        ["Duration", formatDuration(cert.durationMinutes)],
        ["Venue", cert.session?.venue],
      ].filter(([, value]) => value),
    };
  }
  return {
    theme: THEMES.course,
    pill: "E-learning · Self-paced",
    label: "Certificate of Completion",
    metaWidth: 680,
    lead: "has successfully completed the e-learning course",
    subject: cert.courseName,
    tag: null,
    courses: [],
    meta: [
      ["Category", cert.category],
      ["Issue Date", shortDate(cert.issuedAt)],
      ["Duration", formatDuration(cert.durationMinutes)],
    ].filter(([, value]) => value),
  };
}

/**
 * The whole document, as one standalone HTML page.
 *
 * `forPrint` adds the Download / Print button and the screen backdrop; the
 * preview leaves both off and is otherwise byte-for-byte the same page.
 */
function certificateHtml(cert, { forPrint = false } = {}) {
  const c = documentContent(cert);
  const t = c.theme;
  const issuer = cert.organizationName || PRODUCT_BY.replace(/^By\s+/i, "");
  const logo = logoSrc(cert);

  // The organisation names who signs (0039). Without one, the signature IS
  // the organisation — exactly what every earlier certificate said.
  const signed = cert.signatoryName
    ? { script: cert.signatoryName, name: cert.signatoryName, title: cert.signatoryTitle || issuer }
    : { script: issuer, name: null, title: "Issuing organisation" };

  const meta = c.meta
    .map(([label, value]) => `
      <div class="meta-item">
        <div class="meta-label">${escapeHtml(label)}</div>
        <div class="meta-value">${escapeHtml(value)}</div>
      </div>`)
    .join("");

  const pathBox = c.courses.length
    ? `<div class="path">
        <div class="path-title">Courses completed in this path</div>
        <div class="path-grid">${c.courses
          .map((name, i) => `<div class="path-item"><span class="num">${i + 1}</span><span>${escapeHtml(name)}</span></div>`)
          .join("")}</div>
      </div>`
    : "";

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(c.label)} — ${escapeHtml(c.subject || "")}</title>
<style>
  @page { size: A4 landscape; margin: 0; }
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  body { font-family: Arial, Helvetica, sans-serif; color:${INK}; background:${forPrint ? "#EEF2F7" : "#fff"}; }
  ${forPrint ? `body { display:flex; align-items:center; justify-content:center; min-height:100vh; padding:24px; }` : ""}
  .page { position:relative; width:${PAGE_W}px; height:${PAGE_H}px; background:#fff; overflow:hidden; ${forPrint ? "box-shadow:0 10px 40px rgba(15,23,42,.12);" : ""} }
  .bar { position:absolute; top:0; left:0; right:0; height:10px; background:linear-gradient(90deg, ${t.from}, ${t.to}); }
  .frame { position:absolute; top:20px; left:20px; right:20px; bottom:20px; border:2px solid ${t.frame}; }
  .corner { position:absolute; width:42px; height:42px; border-color:${t.corner}; border-style:solid; border-width:0; }
  .tl { top:30px; left:30px; border-top-width:4px; border-left-width:4px; }
  .tr { top:30px; right:30px; border-top-width:4px; border-right-width:4px; }
  .bl { bottom:30px; left:30px; border-bottom-width:4px; border-left-width:4px; }
  .br { bottom:30px; right:30px; border-bottom-width:4px; border-right-width:4px; }

  .head { position:absolute; top:66px; left:88px; right:88px; display:flex; align-items:center; justify-content:space-between; }
  .logo img { display:block; max-height:52px; max-width:280px; object-fit:contain; }
  .wordmark { font-size:40px; font-weight:800; letter-spacing:-.02em; color:#111827; }
  .pill { background:${t.soft}; color:${t.main}; font-size:13px; font-weight:700; letter-spacing:.12em; text-transform:uppercase; padding:8px 20px; border-radius:999px; white-space:nowrap; }

  .body { position:absolute; top:130px; left:88px; right:88px; bottom:180px; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; }
  .eyebrow { font-family: Georgia, "Times New Roman", serif; font-size:16px; font-weight:700; letter-spacing:.32em; text-transform:uppercase; color:${t.main}; }
  .certify { font-family: Georgia, "Times New Roman", serif; font-style:italic; font-size:38px; color:${SLATE}; margin-top:20px; }
  .name { font-family: Georgia, "Times New Roman", serif; font-weight:700; font-size:54px; color:${t.main}; margin-top:12px; line-height:1.15; }
  .rule { width:420px; height:3px; margin:18px auto 22px; background:linear-gradient(90deg, rgba(255,255,255,0), ${t.to}, rgba(255,255,255,0)); }
  .lead { font-size:16px; color:${MUTED}; }
  .subject { font-size:28px; font-weight:700; color:${INK}; margin-top:8px; }
  .tag { font-size:16px; color:${MUTED}; margin-top:10px; }
  .path { width:780px; margin:22px auto 0; background:#F8FAFC; border:1px solid #E5E7EB; border-radius:10px; padding:16px 28px 18px; }
  .path-title { font-size:12px; font-weight:700; letter-spacing:.14em; text-transform:uppercase; color:${FAINT}; margin-bottom:12px; }
  .path-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px 32px; text-align:left; }
  .path-item { display:flex; align-items:center; gap:12px; font-size:15px; color:${SLATE}; line-height:1.3; }
  .num { flex:none; width:26px; height:26px; border-radius:50%; background:linear-gradient(135deg, ${t.from}, ${t.to}); color:#fff; font-size:12px; font-weight:700; display:flex; align-items:center; justify-content:center; }
  /* Per kind: narrow enough that a session's five details wrap 3 + 2 as the
     reference does, wide enough that a path's three never wrap at all. */
  .meta { display:flex; flex-wrap:wrap; justify-content:center; gap:18px 48px; max-width:${c.metaWidth}px; margin-top:${c.courses.length ? 24 : 14}px; }
  .meta-item { text-align:center; }
  .meta-label { font-size:12px; letter-spacing:.1em; text-transform:uppercase; color:${FAINT}; margin-bottom:4px; }
  .meta-value { font-size:17px; font-weight:700; color:${INK}; }

  .foot { position:absolute; left:88px; right:88px; bottom:44px; border-top:1px solid #E2E8F0; padding-top:44px; text-align:center; }
  .script { font-family: Georgia, "Times New Roman", serif; font-style:italic; font-size:26px; color:${t.main}; }
  .sig-line { width:244px; height:3px; background:${INK}; margin:6px auto 10px; }
  .sig-name { font-size:16px; font-weight:700; color:${INK}; }
  .sig-title { font-size:13.5px; color:${MUTED}; margin-top:2px; }
  .code { position:absolute; right:88px; bottom:46px; font-size:10.5px; color:${FAINT}; letter-spacing:.04em; }

  .print-btn { position:fixed; top:16px; right:16px; background:${t.main}; color:#fff; border:none; border-radius:8px; padding:10px 20px; font-size:14px; font-weight:700; cursor:pointer; font-family:Arial, Helvetica, sans-serif; }
  @media print {
    .print-btn { display:none; }
    body { background:#fff; padding:0; display:block; min-height:0; }
    .page { box-shadow:none; }
  }
</style>
</head>
<body>
${forPrint ? `<button class="print-btn" onclick="window.print()">Download / Print</button>` : ""}
<div class="page">
  <div class="bar"></div>
  <div class="frame"></div>
  <div class="corner tl"></div><div class="corner tr"></div>
  <div class="corner bl"></div><div class="corner br"></div>

  <div class="head">
    <div class="logo">${
      logo ? `<img src="${escapeHtml(logo)}" alt="${escapeHtml(issuer)}" />` : `<div class="wordmark">${escapeHtml(issuer)}</div>`
    }</div>
    <div class="pill">${escapeHtml(c.pill)}</div>
  </div>

  <div class="body">
    <div class="eyebrow">${escapeHtml(c.label)}</div>
    <div class="certify">This is to certify that</div>
    <div class="name">${escapeHtml(cert.learnerName || "Learner")}</div>
    <div class="rule"></div>
    <div class="lead">${escapeHtml(c.lead)}</div>
    <div class="subject">${escapeHtml(c.subject || "")}</div>
    ${c.tag ? `<div class="tag">${escapeHtml(c.tag)}</div>` : ""}
    ${pathBox}
    <div class="meta">${meta}</div>
  </div>

  <div class="foot">
    <div class="script">${escapeHtml(signed.script)}</div>
    <div class="sig-line"></div>
    ${signed.name ? `<div class="sig-name">${escapeHtml(signed.name)}</div>` : ""}
    <div class="sig-title">${escapeHtml(signed.title)}</div>
  </div>
  <div class="code">Certificate ID: ${escapeHtml(cert.certificateCode || "—")}</div>
</div>
</body>
</html>`;
}

function printCertificate(cert) {
  const win = window.open("", "_blank", "width=1200,height=900");
  if (!win) return;
  win.document.write(certificateHtml(cert, { forPrint: true }));
  win.document.close();
}

/**
 * The same page the download writes, scaled to the dialog.
 *
 * `sandbox` with no allowances: the document has no script, and an iframe
 * fed our own HTML should not be given the ability to run any.
 */
function CertificatePreview({ cert }) {
  const wrapRef = useRef(null);
  const [scale, setScale] = useState(0.6);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const fit = () => setScale(el.clientWidth / PAGE_W);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <Box
      ref={wrapRef}
      className="relative w-full overflow-hidden border border-line"
      style={{ height: PAGE_H * scale }}
    >
      <Box
        as="iframe"
        title="Certificate preview"
        sandbox=""
        srcDoc={certificateHtml(cert)}
        className="absolute left-0 top-0 border-0"
        style={{ width: PAGE_W, height: PAGE_H, transform: `scale(${scale})`, transformOrigin: "0 0" }}
      />
    </Box>
  );
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

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{cert ? documentContent(cert).label : "Certificate"}</DialogTitle>
        </DialogHeader>

        {loading && (
          <Box className="space-y-4 py-2">
            <Skeleton className="h-6 w-40 mx-auto" />
            <Skeleton className="h-8 w-64 mx-auto" />
            <Skeleton className="h-32 w-full" />
          </Box>
        )}

        {!loading && error && (
          <Box className="py-8 text-center">
            <Text as="p" className="text-error text-sm">{error}</Text>
          </Box>
        )}

        {!loading && cert && <CertificatePreview cert={cert} />}

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
