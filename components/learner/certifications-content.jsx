"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import {
  Award,
  TrendingUp,
  Star,
  Clock,
  Trophy,
  Globe,
  Download,
  Share2,
  Play,
  ClipboardList,
  CircleDashed,
  XCircle,
  Target,
} from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api-client";
import { CertificatePrintView } from "@/components/learner/certificate-print-view";
import { BRAND } from "@/lib/brand";

/**
 * MY CERTIFICATES, built to the reference HTML's `renderCertificates`.
 *
 * Five tiles, a Certification Progress card with a donut and a per-course
 * breakdown, then Earned / Pending / Needs Retake as three sections — in that
 * order, because that is the order the reference puts them in and the order
 * the owner asked for.
 *
 * ## It uses the SPECTRA palette, and no exception was needed
 *
 * The reference page paints with `var(--success)`, `var(--accent)`,
 * `var(--danger)` and `var(--accent3)`, which resolve to the same hues this
 * product already carries — `#1A5E3A`, `#3B6FD4`, `#C94040`, `#8A6200`. So
 * matching it exactly cost nothing from the closed palette.
 *
 * The CERTIFICATE DOCUMENT is the one place that genuinely departs: it
 * carries a purple gradient, radii and a shadow, on the owner's explicit
 * decision. That lives in `certificate-print-view.jsx` and is argued there.
 *
 * ## Two things the reference does that this does not
 *
 *  - **Emoji.** The reference uses 🏆 ❌ ▶ 🌐 inline. Every glyph here is a
 *    lucide component (§10.3.1.6) — emoji render differently on every
 *    platform and cannot take a size or colour class.
 *  - **External certificates.** The reference splits earned certificates
 *    into internal and external, with a Verify link for the latter. This
 *    product's external certifications become ordinary completed courses on
 *    approval (§10.26) and no certificate row is marked external, so there
 *    is nothing to branch on. Rendering the split would be an empty
 *    distinction.
 */

/* The donut's three slices, in the reference's order and colours. */
const SLICES = [
  { key: "certified", label: "Certified", color: BRAND.success },
  { key: "progress", label: "In Progress", color: BRAND.accent },
  { key: "retake", label: "Needs Retake", color: BRAND.danger },
];

/**
 * Postgres hands back `2026-06-06 02:54:34.739+00`, which is not ISO.
 * Chrome parses it, Safari historically does not — and §10.3.1.15 records a
 * whole column of em dashes caused by exactly this. Normalised first.
 */
function formatDate(value) {
  if (!value) return "—";
  const iso = String(value).trim().replace(" ", "T").replace(/([+-]\d{2})$/, "$1:00");
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function isCompleted(status) {
  return status === "completed";
}

function isInProgress(status) {
  return status === "in-progress" || status === "in_progress";
}

/* ── Stat strip ────────────────────────────────────────────────────────── */

const TILE_TONE = {
  success: { tile: "tile-success", value: "text-success" },
  accent: { tile: "tile-accent", value: "text-accent-blue" },
  warning: { tile: "tile-warning", value: "text-warning" },
  danger: { tile: "tile-danger", value: "text-danger" },
};

function StatTile({ icon: Icon, label, value, sub, tone }) {
  const t = TILE_TONE[tone] ?? TILE_TONE.accent;
  return (
    <Box className="border border-line bg-surface px-3 py-2.5">
      <Box className={cn("mb-1.5 flex h-6 w-6 items-center justify-center", t.tile)}>
        <Icon className="h-3.5 w-3.5" />
      </Box>
      <Text as="p" className={cn("text-[15px] font-extrabold leading-none", t.value)}>{value}</Text>
      <Text as="p" className="mt-1 text-[11px] text-text-2">{label}</Text>
      <Text as="p" className="mt-0.5 text-[10px] text-text-3">{sub}</Text>
    </Box>
  );
}

/* ── Certification progress ────────────────────────────────────────────── */

function CertificationProgress({ counts, certRate, courses }) {
  const data = SLICES.map((s) => ({ ...s, value: counts[s.key] }));
  const hasAny = data.some((d) => d.value > 0);

  return (
    <Card className="gap-0 py-0">
      <Box className="border-b border-line px-4 py-3">
        <Text as="h3" className="text-[13px] font-semibold text-ink">Certification Progress</Text>
        <Text as="p" className="text-[11px] text-text-3">All assigned courses</Text>
      </Box>

      <Box className="p-4">
        {courses.length === 0 ? (
          <Box className="py-8 text-center">
            <ClipboardList className="mx-auto mb-2 h-8 w-8 text-text-3" />
            <Text as="p" className="text-[13px] text-text-3">No courses assigned yet.</Text>
          </Box>
        ) : (
          <>
            <Box className="mb-5 flex items-center gap-4">
              <Box className="relative h-20 w-20 shrink-0">
                {hasAny && (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data}
                        dataKey="value"
                        innerRadius="70%"
                        outerRadius="100%"
                        stroke="none"
                        isAnimationActive={false}
                      >
                        {data.map((d) => <Cell key={d.key} fill={d.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                )}
                <Box className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <Text as="p" className="text-[18px] font-extrabold text-success">{certRate}%</Text>
                </Box>
              </Box>

              {/* Capped, not `flex-1`: the reference's legend sits in a narrow
                  column beside an 80px donut. Left to fill a full-width card
                  the counts land against the right edge, yards from the label
                  they belong to. */}
              <Box className="flex w-full max-w-[220px] flex-col gap-2">
                {data.map((s) => (
                  <Box key={s.key} className="flex items-center gap-2">
                    <Box className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
                    <Text as="span" className="flex-1 text-xs text-ink">{s.label}</Text>
                    <Text as="span" className="text-xs font-bold" style={{ color: s.color }}>{s.value}</Text>
                  </Box>
                ))}
              </Box>
            </Box>

            <Box className="flex flex-col gap-2.5">
              {courses.map((lc) => {
                const passed = isCompleted(lc.status) && !lc.failed;
                const Icon = passed ? Trophy : lc.failed ? XCircle : isInProgress(lc.status) ? Play : CircleDashed;
                const color = passed
                  ? BRAND.success
                  : lc.failed
                    ? BRAND.danger
                    : isInProgress(lc.status)
                      ? BRAND.accent
                      : BRAND.text3;
                return (
                  <Box
                    key={lc.enrollmentId ?? lc.course.id}
                    className="flex items-center gap-2.5 bg-surface-2 px-2.5 py-2"
                    style={{ borderLeft: `3px solid ${color}` }}
                  >
                    <Icon className="h-4 w-4 shrink-0" style={{ color }} />
                    <Box className="min-w-0 flex-1">
                      <Text as="p" className="truncate text-xs font-semibold text-ink">{lc.course.name}</Text>
                      <Text as="p" className="text-[11px] text-text-3">Due: {lc.dueFmt || "—"}</Text>
                    </Box>
                    {lc.bestScore != null && (
                      <Text as="span" className="shrink-0 text-xs font-bold" style={{ color }}>
                        {lc.bestScore}%
                      </Text>
                    )}
                    <Text as="span" className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-text-3">
                      {String(lc.status).replace(/[-_]/g, " ")}
                    </Text>
                  </Box>
                );
              })}
            </Box>
          </>
        )}
      </Box>
    </Card>
  );
}

/* ── Earned certificate card ───────────────────────────────────────────── */

function EarnedCard({ cert, onView }) {
  return (
    <Box
      className="flex items-start gap-4 border p-5"
      style={{ borderColor: "rgba(26,94,58,.25)", background: "rgba(26,94,58,.04)" }}
    >
      <Box
        className="flex h-16 w-16 shrink-0 flex-col items-center justify-center gap-0.5 border-2"
        style={{ borderColor: "rgba(26,94,58,.3)", background: "rgba(26,94,58,.10)" }}
      >
        <Trophy className="h-6 w-6" style={{ color: BRAND.success }} />
        <Text as="span" className="text-[8px] font-extrabold uppercase tracking-wider" style={{ color: BRAND.success }}>
          Cert
        </Text>
      </Box>

      <Box className="min-w-0 flex-1">
        <Box className="mb-1.5 flex flex-wrap items-center gap-2">
          <Text as="p" className="text-base font-extrabold text-ink">
            {cert.courseName || cert.journeyName}
          </Text>
          <Text as="span" className="chip-progress text-[9px] font-bold">
            {/* The kind comes from the API, so the chip and the document's
                own heading cannot disagree. */}
            {cert.kind === "path" ? "Learning path" : cert.kind === "session" ? "Live session" : "Course"}
          </Text>
          <Text as="span" className={cert.isRevoked ? "chip-error text-[10px] font-bold" : "chip-complete text-[10px] font-bold"}>
            {cert.isRevoked ? "Revoked" : "Valid"}
          </Text>
        </Box>

        <Box className="mb-2 flex flex-wrap gap-4 text-xs">
          <Text as="span" className="text-text-2">Issued: {formatDate(cert.issuedAt)}</Text>
          <Text as="span" className="font-mono text-text-3">{cert.certificateCode}</Text>
        </Box>
      </Box>

      <Box className="flex shrink-0 flex-col gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={cert.isRevoked}
          onClick={() => onView(cert.id)}
          className="gap-1.5 text-xs"
        >
          <Download className="h-3.5 w-3.5" />
          {cert.isRevoked ? "Unavailable" : "Download"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={cert.isRevoked}
          onClick={() => shareCertificate(cert)}
          className="gap-1.5 text-xs"
        >
          <Share2 className="h-3.5 w-3.5" />
          Share
        </Button>
      </Box>
    </Box>
  );
}

/**
 * Copies a sentence about the certificate to the clipboard.
 *
 * The reference also opens LinkedIn's share composer in a new tab. That is
 * not done here: a popup fired a beat after a click is what pop-up blockers
 * exist for, and half the time the learner sees nothing happen at all. The
 * text lands on their clipboard and they choose where it goes.
 */
function shareCertificate(cert) {
  const name = cert.courseName || cert.journeyName || "a course";
  const text =
    `I've earned a certificate in "${name}". `
    + `Certificate ID: ${cert.certificateCode}.`;
  try {
    navigator.clipboard?.writeText(text);
  } catch {
    /* Clipboard is unavailable in some embedded browsers; nothing to do. */
  }
}

/* ── Skeleton ──────────────────────────────────────────────────────────── */

function CertificationsSkeleton() {
  return (
    <Box className="space-y-5">
      <Box className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-[74px]" />)}
      </Box>
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-28 w-full" />
    </Box>
  );
}

/* ── Page ──────────────────────────────────────────────────────────────── */

export function CertificationsContent() {
  const { user } = useAuth();
  const params = useSearchParams();
  const [certificates, setCertificates] = useState(null);
  const [courses, setCourses] = useState(null);
  const [error, setError] = useState(null);
  const [viewId, setViewId] = useState(null);

  useEffect(() => {
    if (!user) return;
    /*
     * Two reads, because the page is about two things: the certificates a
     * learner HOLDS and the courses that have yet to produce one. The
     * courses call is the same one My Courses makes, so the breakdown here
     * and the list there cannot disagree about a status.
     */
    Promise.all([
      apiClient("/api/learner/certificates"),
      apiClient("/api/learner/courses"),
    ])
      .then(([c, k]) => {
        setCertificates(c.certificates || []);
        setCourses(k.courses || []);
      })
      .catch((e) => setError(e.message));
  }, [user]);

  /*
   * `?certificate=<id>` opens that one straight away — the Certificate button
   * on a completed course card sends the learner here to SEE a particular
   * certificate, not to hunt for it. Checked against their own list first, so
   * a stale or hand-typed id lands on the page rather than an empty dialog.
   */
  useEffect(() => {
    if (!certificates) return;
    // The deep link now carries the certificate's public UUID (0046), matched
    // against the learner's own list; a legacy integer id still matches too.
    const wanted = params.get("certificate");
    if (
      wanted &&
      certificates.some((c) => c.publicId === wanted || String(c.id) === wanted)
    ) {
      setViewId(wanted);
    }
  }, [certificates, params]);

  const view = useMemo(() => {
    if (!certificates || !courses) return null;

    const earned = [...certificates]
      .filter((c) => !c.isRevoked)
      .sort((a, b) => String(b.issuedAt).localeCompare(String(a.issuedAt)));

    const enriched = courses.map((c) => ({
      ...c,
      failed:
        Boolean(c.hasFailed) ||
        (isCompleted(c.status) &&
          c.bestScore != null &&
          c.passingScore != null &&
          c.bestScore < c.passingScore),
    }));

    const failed = enriched.filter((c) => c.failed);
    const pending = enriched.filter((c) => !c.failed && !isCompleted(c.status));

    /*
     * The rate is certificates over everything being tracked toward one —
     * the reference's own formula. Courses already certified plus courses
     * still outstanding; a course that is complete AND certified is counted
     * once, on the earned side.
     */
    const tracked = earned.length + enriched.filter((c) => !isCompleted(c.status)).length;
    const certRate = tracked ? Math.round((earned.length / tracked) * 100) : 0;

    const scores = earned.map((c) => c.finalScore).filter((s) => s != null);
    const avgScore = scores.length
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : null;

    return { earned, enriched, failed, pending, certRate, avgScore };
  }, [certificates, courses]);

  if (error) {
    return (
      <Card className="p-8 text-center">
        <Text as="p" className="text-sm text-danger">{error}</Text>
        <Button size="sm" variant="outline" className="mt-3" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </Card>
    );
  }

  if (!view) return <CertificationsSkeleton />;

  const { earned, enriched, failed, pending, certRate, avgScore } = view;

  if (earned.length === 0 && pending.length === 0 && failed.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center gap-4 border-dashed py-20">
        <Target className="h-12 w-12 text-text-3" />
        <Box className="max-w-sm text-center">
          <Text as="p" className="text-base font-bold text-ink">No certificates yet</Text>
          <Text as="p" className="mt-1.5 text-[13px] leading-relaxed text-text-2">
            Complete an assigned course and pass the assessment to earn your first certificate.
          </Text>
        </Box>
        {/* A Link styled with `buttonVariants`, not `<Button asChild>` — this
            project's Button has no Radix Slot, so `asChild` falls through to
            the DOM and React warns about an unrecognised attribute. Nesting a
            <button> inside an <a> would be invalid markup. */}
        <Link href="/my-courses" className={cn(buttonVariants({ size: "sm" }), "bg-navy text-paper hover:bg-navy-soft")}>
          Go to My Courses
        </Link>
      </Card>
    );
  }

  return (
    <Box className="space-y-5">
      <Box>
        <Text as="h2" className="mb-2.5 font-mono text-[11px] uppercase tracking-wider text-text-3">
          Your Certification Summary
        </Text>
        <Box className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          <StatTile
            icon={Award} tone="success"
            label="Certificates Earned" value={earned.length}
            sub="Issued and valid"
          />
          <StatTile
            icon={TrendingUp} tone="success"
            label="Certification Rate" value={`${certRate}%`}
            sub={`${earned.length} of ${enriched.length} courses`}
          />
          <StatTile
            icon={Star} tone="warning"
            label="Avg Score"
            /* An em dash, never a 0 — "no score yet" and "scored zero" are
               different facts, and several certificates here are session
               trainings that carry no score at all. */
            value={avgScore == null ? "—" : `${avgScore}%`}
            sub="Across earned certificates"
          />
          <StatTile
            icon={Clock} tone="warning"
            label="In Progress" value={pending.length}
            sub="Pending certificate"
          />
          <StatTile
            icon={TrendingUp} tone={failed.length > 0 ? "danger" : "success"}
            label="Needs Retake" value={failed.length}
            sub={failed.length > 0 ? "Below pass mark" : "All passed"}
          />
        </Box>
      </Box>

      <CertificationProgress
        counts={{ certified: earned.length, progress: pending.length, retake: failed.length }}
        certRate={certRate}
        courses={enriched}
      />

      {earned.length > 0 && (
        <Box>
          <Text as="h2" className="mb-2.5 font-mono text-[11px] uppercase tracking-wider text-text-3">
            Earned Certificates
          </Text>
          <Box className="flex flex-col gap-3.5">
            {earned.map((c) => <EarnedCard key={c.id} cert={c} onView={setViewId} />)}
          </Box>
        </Box>
      )}

      {pending.length > 0 && (
        <Box>
          <Text as="h2" className="mb-2.5 font-mono text-[11px] uppercase tracking-wider text-text-3">
            Pending Certificates
          </Text>
          <Box className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {pending.map((lc) => {
              const started = isInProgress(lc.status);
              return (
                <Box key={lc.enrollmentId ?? lc.course.id} className="flex flex-col gap-2.5 border border-line bg-surface p-4">
                  <Box className="flex items-center gap-2.5">
                    <Box className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-dashed border-line-strong bg-surface-2">
                      {started
                        ? <Play className="h-4 w-4 text-accent-blue" />
                        : <ClipboardList className="h-4 w-4 text-text-3" />}
                    </Box>
                    <Box className="min-w-0 flex-1">
                      <Text as="p" className="truncate text-[13px] font-bold text-ink">{lc.course.name}</Text>
                      <Text as="p" className="text-[11px] text-text-3">Due: {lc.dueFmt || "—"}</Text>
                    </Box>
                  </Box>

                  {started && (
                    <Box>
                      <Box className="mb-1 flex justify-between text-[11px] text-text-3">
                        <Text as="span">Progress</Text>
                        <Text as="span" className="font-bold text-accent-blue">{lc.progressPct}%</Text>
                      </Box>
                      <Box className="h-1.5 w-full bg-surface-3">
                        <Box className="h-1.5 bg-accent-blue" style={{ width: `${lc.progressPct}%` }} />
                      </Box>
                    </Box>
                  )}

                  <Link
                    href={`/my-courses/${lc.course.public_id ?? lc.course.id}`}
                    className={cn(buttonVariants({ size: "sm" }), "w-full bg-navy text-paper hover:bg-navy-soft")}
                  >
                    {started ? "Continue" : "Start course"}
                  </Link>
                </Box>
              );
            })}
          </Box>
        </Box>
      )}

      {failed.length > 0 && (
        <Box>
          <Text as="h2" className="mb-2.5 font-mono text-[11px] uppercase tracking-wider text-text-3">
            Needs Retake
          </Text>
          <Box className="flex flex-col gap-3">
            {failed.map((lc) => (
              <Box
                key={lc.enrollmentId ?? lc.course.id}
                className="flex items-center gap-3.5 border p-4"
                style={{ borderColor: "rgba(201,64,64,.2)", background: "rgba(201,64,64,.03)" }}
              >
                <Box
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2"
                  style={{ borderColor: "rgba(201,64,64,.25)", background: "rgba(201,64,64,.1)" }}
                >
                  <XCircle className="h-5 w-5 text-danger" />
                </Box>
                <Box className="flex-1">
                  <Text as="p" className="mb-1 text-sm font-bold text-ink">{lc.course.name}</Text>
                  <Box className="flex flex-wrap gap-3 text-xs">
                    {lc.bestScore != null && (
                      <Text as="span" className="font-bold text-danger">Score: {lc.bestScore}%</Text>
                    )}
                    {lc.passingScore != null && (
                      <Text as="span" className="text-text-3">Pass mark: {lc.passingScore}%</Text>
                    )}
                    {lc.bestScore != null && lc.passingScore != null && (
                      <Text as="span" className="text-text-3">
                        Gap: {Math.max(0, lc.passingScore - lc.bestScore)}% needed
                      </Text>
                    )}
                  </Box>
                </Box>
                <Link
                  href={`/my-courses/${lc.course.public_id ?? lc.course.id}`}
                  className={cn(buttonVariants({ size: "sm" }), "shrink-0 bg-danger text-white hover:bg-danger/90")}
                >
                  Retake
                </Link>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      <CertificatePrintView
        certificateId={viewId}
        open={!!viewId}
        onClose={() => setViewId(null)}
      />
    </Box>
  );
}
