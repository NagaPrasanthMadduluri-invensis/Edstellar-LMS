"use client";

import { useState } from "react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Award,
  Download,
  Share2,
  CheckCircle2,
  Calendar,
  Building2,
  Hash,
  Star,
  BookOpen,
  Sparkles,
  Copy,
  Check,
} from "lucide-react";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";

const CERTIFICATES = [
  {
    id: "CERT-2024-AIBK-4721",
    courseName: "AI for Banking",
    description:
      "Mastery of Artificial Intelligence applications in modern banking, covering machine learning models, risk analysis automation, fraud detection, and data-driven financial decision-making.",
    issuedBy: "Bank of Jordan",
    completedDate: "December 12, 2024",
    validUntil: "December 12, 2027",
    grade: "Distinction",
    score: 94,
    skills: [
      "AI & Machine Learning",
      "Banking Technology",
      "Risk Analysis",
      "Data-Driven Finance",
    ],
    image: "/Sample%20certificate%20AI%20for%20Banking%20Bank%20of%20Jordan.jpg",
  },
];

const SKILL_COLORS = [
  "bg-indigo-50 text-indigo-700 border-indigo-200",
  "bg-emerald-50 text-emerald-700 border-emerald-200",
  "bg-amber-50 text-amber-700 border-amber-200",
  "bg-violet-50 text-violet-700 border-violet-200",
];

function StatsBar({ certs }) {
  const totalSkills = [...new Set(certs.flatMap((c) => c.skills))].length;
  const avgScore = Math.round(certs.reduce((s, c) => s + c.score, 0) / certs.length);

  const stats = [
    { label: "Certificates Earned", value: certs.length },
    { label: "Courses Completed", value: certs.length },
    { label: "Average Score", value: `${avgScore}%` },
    { label: "Skills Verified", value: totalSkills },
  ];

  return (
    <Box className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 p-6 text-white">
      <Box className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/5" />
      <Box className="pointer-events-none absolute -bottom-6 right-24 h-32 w-32 rounded-full bg-white/5" />

      <Box className="mb-5 flex items-center gap-3">
        <Box className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
          <Award className="h-5 w-5 text-white" />
        </Box>
        <Box>
          <Text as="h2" className="text-lg font-bold text-white">Your Achievements</Text>
          <Text as="p" className="text-xs text-indigo-200">
            A record of your verified skills and completed learning journeys
          </Text>
        </Box>
      </Box>

      <Box className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <Box key={s.label} className="rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm">
            <Text as="p" className="text-2xl font-bold text-white">{s.value}</Text>
            <Text as="p" className="mt-0.5 text-[11px] text-indigo-200">{s.label}</Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

function CertificateCard({ cert }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(cert.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="overflow-hidden border border-border/60 shadow-sm">
      {/* Certificate display area */}
      <Box className="relative w-full bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 px-8 py-6" style={{ aspectRatio: "2.2 / 1" }}>
        {/* subtle corner accents */}
        <Box className="pointer-events-none absolute left-4 top-4 h-6 w-6 rounded-tl border-l-2 border-t-2 border-amber-400/50" />
        <Box className="pointer-events-none absolute right-4 top-4 h-6 w-6 rounded-tr border-r-2 border-t-2 border-amber-400/50" />
        <Box className="pointer-events-none absolute bottom-4 left-4 h-6 w-6 rounded-bl border-b-2 border-l-2 border-amber-400/50" />
        <Box className="pointer-events-none absolute bottom-4 right-4 h-6 w-6 rounded-br border-b-2 border-r-2 border-amber-400/50" />

        <Box className="relative h-full w-full overflow-hidden rounded-md shadow-[0_8px_40px_rgba(0,0,0,0.5)]">
          <Image
            src={cert.image}
            alt={`${cert.courseName} certificate`}
            fill
            className="object-contain"
            priority
          />
        </Box>

        {/* Verified badge */}
        <Box className="absolute right-6 top-6 flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 shadow-lg">
          <CheckCircle2 className="h-3 w-3 text-white" />
          <Text as="span" className="text-[10px] font-bold text-white">Verified</Text>
        </Box>
      </Box>

      <CardContent className="p-5">
        <Box className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          {/* Left: details */}
          <Box className="flex-1 space-y-3">
            {/* Title + grade */}
            <Box className="flex items-start gap-3">
              <Box className="flex-1">
                <Text as="h3" className="text-lg font-bold leading-tight">{cert.courseName}</Text>
                <Box className="mt-1 flex items-center gap-1.5 text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5 shrink-0" />
                  <Text as="span" className="text-sm">{cert.issuedBy}</Text>
                </Box>
              </Box>
              <Badge className="shrink-0 bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">
                <Star className="mr-1 h-3 w-3 fill-amber-500 text-amber-500" />
                {cert.grade}
              </Badge>
            </Box>

            {/* Description */}
            <Text as="p" className="text-sm text-muted-foreground leading-relaxed">
              {cert.description}
            </Text>

            {/* Meta grid */}
            <Box className="grid grid-cols-2 gap-y-2 rounded-lg bg-muted/40 px-3 py-3 text-xs">
              <Box className="flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="h-3.5 w-3.5 text-indigo-400" />
                <Text as="span">Issued: <Text as="span" className="font-medium text-foreground">{cert.completedDate}</Text></Text>
              </Box>
              <Box className="flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="h-3.5 w-3.5 text-emerald-400" />
                <Text as="span">Valid till: <Text as="span" className="font-medium text-foreground">{cert.validUntil}</Text></Text>
              </Box>
              <Box className="col-span-2 flex items-center gap-1.5 text-muted-foreground">
                <Hash className="h-3.5 w-3.5 text-violet-400" />
                <Text as="span" className="font-mono text-[11px]">{cert.id}</Text>
                <button
                  onClick={handleCopy}
                  className="ml-1 rounded p-0.5 hover:bg-muted transition-colors"
                  title="Copy certificate ID"
                >
                  {copied
                    ? <Check className="h-3 w-3 text-emerald-500" />
                    : <Copy className="h-3 w-3 text-muted-foreground" />}
                </button>
              </Box>
              <Box className="col-span-2 flex items-center gap-1.5 text-muted-foreground">
                <Star className="h-3.5 w-3.5 text-amber-400" />
                <Text as="span">Score: <Text as="span" className="font-semibold text-amber-600">{cert.score}%</Text></Text>
              </Box>
            </Box>

            {/* Skills */}
            <Box className="flex flex-wrap gap-1.5">
              {cert.skills.map((skill, i) => (
                <Badge
                  key={skill}
                  variant="outline"
                  className={`text-[10px] font-medium ${SKILL_COLORS[i % SKILL_COLORS.length]}`}
                >
                  {skill}
                </Badge>
              ))}
            </Box>

            {/* Disabled actions */}
            <Box className="flex gap-2 pt-1">
              <Button disabled className="flex-1 h-9 text-sm" variant="outline">
                <Download className="h-4 w-4 mr-1.5" />
                Download
              </Button>
              <Button disabled variant="outline" className="h-9 px-4 text-sm">
                <Share2 className="h-4 w-4 mr-1.5" />
                Share
              </Button>
            </Box>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export function CertificationsContent() {
  return (
    <Box className="space-y-5">
      <StatsBar certs={CERTIFICATES} />

      <Box>
        <Text as="h2" className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
          Earned Certificates ({CERTIFICATES.length})
        </Text>
        <Box className="space-y-5">
          {CERTIFICATES.map((cert) => (
            <CertificateCard key={cert.id} cert={cert} />
          ))}
        </Box>
      </Box>
    </Box>
  );
}
