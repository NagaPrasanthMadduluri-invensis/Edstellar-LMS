"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, GraduationCap } from "lucide-react";

import { Card } from "@/components/ui/card";
import Box from "@/components/ui/box";
import Text from "@/components/ui/text";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchMyCompetencies } from "@/services/api/learner/learner-api";
import { cn } from "@/lib/utils";

const LEVEL = {
  beginner: { label: "Beginner", cls: "bg-surface-3 text-text-2", dots: 1 },
  intermediate: { label: "Intermediate", cls: "bg-accent-tint text-accent-blue", dots: 2 },
  advanced: { label: "Advanced", cls: "bg-success/10 text-success", dots: 3 },
};

/**
 * "My skills": every skill this learner has gained, grouped by area, with the
 * level held and the course it came from. The same rows the admin's Skills
 * page counts, so the two cannot disagree. Its own fetch: a failure hides only
 * this card. `compact` is the short version for pages where it is secondary.
 */
export function MySkillsCard({ compact = false, className }) {
  const [rows, setRows] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetchMyCompetencies()
      .then((d) => setRows(d.competencies ?? []))
      .catch(() => setFailed(true));
  }, []);

  if (failed) return null;

  const groups = new Map();
  for (const r of rows ?? []) {
    const key = r.domain || "General";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }

  return (
    <Card className={cn("gap-0 overflow-hidden p-0", className)}>
      <Box className="flex items-start justify-between gap-4 border-b border-line px-4 py-3">
        <Box className="min-w-0">
          <Text as="h3" className="text-sm font-semibold leading-tight">My skills</Text>
          <Text as="p" className="mt-0.5 text-[11px] text-text-3">
            Earned by completing courses that teach them
          </Text>
        </Box>
        {rows && rows.length > 0 && (
          <Text as="span" className="whitespace-nowrap rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-bold text-success">
            {rows.length} skill{rows.length === 1 ? "" : "s"}
          </Text>
        )}
      </Box>
      <Box className="p-4">
        {rows === null ? (
          <Box className="space-y-2">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-6 w-1/2" />
          </Box>
        ) : rows.length === 0 ? (
          <Box className="flex items-start gap-3 py-2">
            <GraduationCap className="mt-0.5 h-5 w-5 shrink-0 text-text-3" />
            <Text as="p" className="text-[13px] text-text-2">
              No skills yet. Finish a course and the skills it teaches appear here.{" "}
              <Link href="/my-courses" className="font-semibold text-accent-blue hover:underline">Go to My Courses</Link>
            </Text>
          </Box>
        ) : (
          <Box className="flex flex-col gap-3.5">
            {Array.from(groups.entries()).map(([domain, list]) => (
              <Box key={domain}>
                <Text as="p" className="mb-2 font-mono text-[10px] font-bold uppercase tracking-wide text-text-3">{domain}</Text>
                <Box className={cn("grid gap-2", compact ? "grid-cols-1" : "sm:grid-cols-2")}>
                  {list.map((r) => {
                    const lvl = LEVEL[r.level] ?? LEVEL.intermediate;
                    return (
                      <Box key={r.skill_id} className="flex items-center justify-between gap-2 rounded-lg border border-line bg-surface-2 px-3 py-2">
                        <Box className="min-w-0">
                          <Text as="p" className="flex items-center gap-1.5 truncate text-[13px] font-semibold text-ink">
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" />
                            {r.skill}
                          </Text>
                          {!compact && r.source_course && (
                            <Text as="p" className="truncate text-[11px] text-text-3">From {r.source_course}</Text>
                          )}
                        </Box>
                        <Text
                          as="span"
                          title={`${lvl.label} level`}
                          className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold", lvl.cls)}
                        >
                          {[1, 2, 3].map((n) => (
                            <Box key={n} as="span" className={cn("h-1.5 w-1.5 rounded-full", n <= lvl.dots ? "bg-current" : "bg-current opacity-25")} />
                          ))}
                          <Text as="span" className="ml-0.5 text-[length:inherit] text-inherit">{lvl.label}</Text>
                        </Text>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Card>
  );
}
