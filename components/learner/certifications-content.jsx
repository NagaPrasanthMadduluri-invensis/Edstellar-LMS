"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Award,
  Download,
  Calendar,
  Hash,
  Star,
  ShieldCheck,
  ShieldOff,
  GraduationCap,
} from "lucide-react";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api-client";
import { CertificatePrintView } from "@/components/learner/certificate-print-view";

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/* ── Card gradient palette (hash-based, matches my-courses idiom) ── */
/* Thumbnail surfaces. The brand allows variety only across the paper family
   and navy, so the name hash picks a surface rather than inventing a hue. */
const GRADIENTS = [
  { bg: "#EDE9DD", iconColor: "#0A1628" },
  { bg: "#F2F0E8", iconColor: "#0A1628" },
  { bg: "#0A1628", iconColor: "#C8F135" },
  { bg: "#FAFAF7", iconColor: "#14233D" },
];

function getGradient(name) {
  let h = 0;
  for (const c of (name || "A")) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return GRADIENTS[h % GRADIENTS.length];
}

/* ── Stats bar ── */
function StatsBar({ certs }) {
  const valid = certs.filter((c) => !c.isRevoked);
  const scored = valid.filter((c) => c.finalScore !== null && c.finalScore !== undefined);
  const avgScore = scored.length
    ? Math.round(scored.reduce((s, c) => s + c.finalScore, 0) / scored.length)
    : null;

  const stats = [
    { label: "Certificates Earned", value: certs.length },
    { label: "Valid Certificates", value: valid.length },
    { label: "Average Score", value: avgScore !== null ? `${avgScore}%` : "—" },
  ];

  return (
    <Box className="relative overflow-hidden rounded-2xl bg-navy p-6 text-white">
      <Box className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/5" />
      <Box className="pointer-events-none absolute -bottom-6 right-24 h-32 w-32 rounded-full bg-white/5" />

      <Box className="mb-5 flex items-center gap-3">
        <Box className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
          <Award className="h-5 w-5 text-white" />
        </Box>
        <Box>
          <Text as="h2" className="text-lg font-bold text-white">Your Achievements</Text>
          <Text as="p" className="text-xs text-paper">
            A record of your verified skills and completed learning journeys
          </Text>
        </Box>
      </Box>

      <Box className="grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <Box key={s.label} className="rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm">
            <Text as="p" className="text-2xl font-bold text-white">{s.value}</Text>
            <Text as="p" className="mt-0.5 text-[11px] text-paper">{s.label}</Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

/* ── Certificate card ── */
function CertificateCard({ cert, onView }) {
  const grad = getGradient(cert.courseName);
  const revoked = !!cert.isRevoked;

  return (
    <Card className={cn("overflow-hidden flex flex-col border border-border shadow-sm transition-shadow duration-200", !revoked && "hover:shadow-md")}>
      {/* Emblem banner */}
      <Box
        style={{ background: grad.bg }}
        className="relative h-32 shrink-0 flex items-center justify-center"
      >
        <Box className="pointer-events-none absolute -top-10 -right-8 h-32 w-32 rounded-full bg-black/[0.03]" />
        <Box className="pointer-events-none absolute -bottom-8 -left-6 h-24 w-24 rounded-full bg-black/[0.025]" />
        <GraduationCap style={{ width: 48, height: 48, color: grad.iconColor, strokeWidth: 1.5, opacity: 0.9 }} />
        <Box className="absolute top-3 right-3">
          {revoked ? (
            <Badge className="gap-1 bg-error/10 text-error border border-error/30 text-[10px] font-bold hover:bg-error/10">
              <ShieldOff className="h-3 w-3" />
              Revoked
            </Badge>
          ) : (
            <Badge className="gap-1 bg-navy text-white border-0 text-[10px] font-bold shadow-sm hover:bg-navy-soft">
              <ShieldCheck className="h-3 w-3" />
              Verified
            </Badge>
          )}
        </Box>
      </Box>

      <CardContent className="flex flex-1 flex-col gap-3 p-5">
        <Text as="h3" className="text-base font-bold leading-snug line-clamp-2">{cert.courseName}</Text>

        <Box className="grid gap-y-2 rounded-lg bg-muted/40 px-3 py-3 text-xs">
          <Box className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="h-3.5 w-3.5 text-navy/70 shrink-0" />
            <Text as="span">Issued: <Text as="span" className="font-medium text-foreground">{formatDate(cert.issuedAt)}</Text></Text>
          </Box>
          <Box className="flex items-center gap-1.5 text-muted-foreground">
            <Star className="h-3.5 w-3.5 text-ink/70 shrink-0" />
            <Text as="span">
              Score:{" "}
              <Text as="span" className="font-semibold text-ink/70">
                {cert.finalScore !== null && cert.finalScore !== undefined ? `${cert.finalScore}%` : "N/A"}
              </Text>
            </Text>
          </Box>
          <Box className="flex items-center gap-1.5 text-muted-foreground">
            <Hash className="h-3.5 w-3.5 text-navy/70 shrink-0" />
            <Text as="span" className="font-mono text-[11px] break-all">{cert.certificateCode}</Text>
          </Box>
        </Box>

        <Box className="mt-auto pt-1">
          <Button
            variant="outline"
            className="w-full h-9 text-sm gap-1.5"
            disabled={revoked}
            onClick={() => onView(cert.id)}
          >
            <Download className="h-4 w-4" />
            {revoked ? "Unavailable" : "View & Download"}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}

/* ── Skeleton ── */
function CertificationsSkeleton() {
  return (
    <Box className="space-y-5">
      <Skeleton className="h-36 rounded-2xl w-full" />
      <Box className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {[...Array(3)].map((_, i) => (
          <Box key={i} className="flex flex-col overflow-hidden rounded-xl border">
            <Skeleton className="h-32 rounded-none" />
            <Box className="p-5 space-y-3">
              <Skeleton className="h-4 w-4/5 rounded" />
              <Skeleton className="h-20 w-full rounded-lg" />
              <Skeleton className="h-9 w-full rounded-md" />
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

/* ── Main component ── */
export function CertificationsContent() {
  const { user } = useAuth();
  const [certificates, setCertificates] = useState(null);
  const [error, setError] = useState(null);
  const [viewId, setViewId] = useState(null);

  useEffect(() => {
    if (!user) return;
    // Certificates live on the NestJS server; the HttpOnly cookie authenticates.
    apiClient("/api/learner/certificates")
      .then((d) => setCertificates(d.certificates || []))
      .catch((e) => setError(e.message));
  }, [user]);

  const sorted = useMemo(() => {
    if (!certificates) return [];
    return [...certificates].sort((a, b) => new Date(b.issuedAt) - new Date(a.issuedAt));
  }, [certificates]);

  if (error) return (
    <Card className="p-8 text-center">
      <Text as="p" className="text-error text-sm">{error}</Text>
      <Button size="sm" variant="outline" className="mt-3" onClick={() => window.location.reload()}>Retry</Button>
    </Card>
  );

  if (!certificates) return <CertificationsSkeleton />;

  if (certificates.length === 0) return (
    <Card className="flex flex-col items-center justify-center py-20 gap-4 border-dashed">
      <Box className="w-16 h-16 rounded-2xl bg-paper-cream flex items-center justify-center">
        <Award className="h-8 w-8 text-navy/70" />
      </Box>
      <Box className="text-center">
        <Text as="p" className="text-sm font-medium text-muted-foreground">
          No certificates yet — complete a course to earn one.
        </Text>
      </Box>
    </Card>
  );

  return (
    <Box className="space-y-5">
      <StatsBar certs={certificates} />

      <Box>
        <Text as="h2" className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
          Earned Certificates ({certificates.length})
        </Text>
        <Box className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {sorted.map((cert) => (
            <CertificateCard key={cert.id} cert={cert} onView={setViewId} />
          ))}
        </Box>
      </Box>

      <CertificatePrintView
        certificateId={viewId}
        open={!!viewId}
        onClose={() => setViewId(null)}
      />
    </Box>
  );
}
