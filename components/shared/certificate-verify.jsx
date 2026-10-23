"use client";

import { useEffect, useState } from "react";
import {
  BadgeCheck,
  ShieldCheck,
  ShieldX,
  ShieldAlert,
  Calendar,
  Clock,
  Building2,
  GraduationCap,
  Route,
  Users,
} from "lucide-react";

import Box from "@/components/ui/box";
import Text from "@/components/ui/text";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/lib/api-client";
import { PRODUCT_NAME, PRODUCT_BY } from "@/lib/brand";

/* Postgres timestamps (and bare dates) need the offset repaired before Date. */
function toDate(value) {
  if (!value) return null;
  const d = new Date(String(value).trim().replace(" ", "T").replace(/([+-]\d{2})$/, "$1:00"));
  return Number.isNaN(d.getTime()) ? null : d;
}
function longDate(value) {
  const d = toDate(value);
  return d ? d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "—";
}
function duration(minutes) {
  if (minutes === null || minutes === undefined) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

const KIND_META = {
  course: { label: "Certificate of Completion", icon: GraduationCap },
  path: { label: "Certificate of Achievement", icon: Route },
  session: { label: "Certificate of Participation", icon: Users },
};

function DetailRow({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <Box className="flex items-start gap-3 py-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-text-3" />
      <Box className="min-w-0">
        <Text as="p" className="text-[11px] font-medium uppercase tracking-wide text-text-3">
          {label}
        </Text>
        <Text as="p" className="break-words text-sm font-semibold text-ink">{value}</Text>
      </Box>
    </Box>
  );
}

export function CertificateVerify({ code }) {
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    apiClient(`/api/certificates/verify/${encodeURIComponent(code)}`)
      .then((d) => live && setData(d))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [code]);

  return (
    <Box className="mx-auto w-full max-w-xl">
      {/* Masthead */}
      <Box className="mb-6 text-center">
        <Text as="p" className="text-2xl font-bold leading-none text-ink">{PRODUCT_NAME}</Text>
        <Text as="p" className="mt-1.5 text-[11px] font-medium uppercase tracking-[0.2em] text-text-3">
          {PRODUCT_BY}
        </Text>
        <Text as="p" className="mt-4 text-sm font-semibold text-ink">Certificate verification</Text>
      </Box>

      {failed ? (
        <Card className="p-6 text-center">
          <Text as="p" className="text-sm text-danger">
            We could not check this certificate right now. Please try again shortly.
          </Text>
        </Card>
      ) : data === null ? (
        <Card className="space-y-4 p-6">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-24 w-full" />
        </Card>
      ) : (
        <Result code={code} data={data} />
      )}

      <Text as="p" className="mt-6 text-center text-[11px] text-text-3">
        This page confirms a certificate issued through {PRODUCT_NAME}. The certificate ID is
        printed on the document and encoded in its QR code.
      </Text>
    </Box>
  );
}

function Result({ code, data }) {
  const kind = KIND_META[data.kind] || KIND_META.course;

  // Three states: not found, revoked, valid — each with its own banner.
  let banner;
  if (!data.found) {
    banner = {
      tone: "bg-surface-2 text-text-2",
      icon: ShieldX,
      title: "No certificate found",
      sub: `No certificate matches the ID ${code}. Check the ID and try again.`,
    };
  } else if (data.isRevoked) {
    banner = {
      tone: "bg-danger/10 text-danger",
      icon: ShieldAlert,
      title: "This certificate has been revoked",
      sub: "It was issued but is no longer valid. Contact the issuing organisation.",
    };
  } else {
    banner = {
      tone: "bg-success/10 text-success",
      icon: ShieldCheck,
      title: "Verified — this certificate is genuine",
      sub: `Issued through ${PRODUCT_NAME}.`,
    };
  }

  const Banner = banner.icon;

  return (
    <Card className="overflow-hidden p-0">
      <Box className={`flex items-center gap-3 px-6 py-5 ${banner.tone}`}>
        <Banner className="h-7 w-7 shrink-0" />
        <Box className="min-w-0">
          <Text as="p" className="text-sm font-bold leading-tight">{banner.title}</Text>
          <Text as="p" className="mt-0.5 text-xs opacity-90">{banner.sub}</Text>
        </Box>
      </Box>

      {data.found && (
        <Box className="px-6 py-5">
          <Box className="flex items-center gap-2">
            <kind.icon className="h-4 w-4 text-accent-blue" />
            <Text as="p" className="text-[11px] font-semibold uppercase tracking-wide text-accent-blue">
              {kind.label}
            </Text>
          </Box>
          <Text as="h1" className="mt-1 text-xl font-bold leading-snug text-ink">
            {data.title || "—"}
          </Text>

          <Box className="mt-3 divide-y divide-line border-t border-line">
            <DetailRow icon={BadgeCheck} label="Awarded to" value={data.learnerName} />
            <DetailRow icon={Building2} label="Issued by" value={data.organizationName} />
            <DetailRow icon={Calendar} label="Issued on" value={longDate(data.issuedAt)} />
            <DetailRow icon={Clock} label="Duration" value={duration(data.durationMinutes)} />
            {data.kind === "course" && <DetailRow icon={GraduationCap} label="Category" value={data.category} />}
            {data.kind === "path" && <DetailRow icon={Route} label="Path" value={data.pathTag} />}
            {data.kind === "session" && (
              <>
                <DetailRow icon={Users} label="Format" value={data.session?.format} />
                <DetailRow icon={Calendar} label="Session date" value={longDate(data.session?.date)} />
                <DetailRow icon={BadgeCheck} label="Trainer" value={data.session?.trainer} />
              </>
            )}
          </Box>

          <Box className="mt-4 rounded-lg bg-surface-2 px-3 py-2">
            <Text as="p" className="text-[11px] uppercase tracking-wide text-text-3">Certificate ID</Text>
            <Text as="p" className="font-mono text-sm font-semibold tracking-wider text-ink">
              {data.certificateCode}
            </Text>
          </Box>
        </Box>
      )}
    </Card>
  );
}
