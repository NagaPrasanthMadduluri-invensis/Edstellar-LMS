"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Play, FileArchive, CheckCircle2, Clock, Trophy, BookOpen,
} from "lucide-react";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api-client";

const VERSION_CFG = {
  "1.2":  { label: "SCORM 1.2",  cls: "bg-blue-100 text-blue-700 border-0"    },
  "2004": { label: "SCORM 2004", cls: "bg-violet-100 text-violet-700 border-0" },
};

function statusConfig(pkg) {
  const raw = pkg.lesson_status ?? pkg.completion_status ?? "not attempted";
  if (raw === "passed" || raw === "completed") {
    return { label: "Completed", cls: "bg-emerald-100 text-emerald-700 border-0", icon: CheckCircle2, iconCls: "text-emerald-500" };
  }
  if (raw === "incomplete" || raw === "in_progress") {
    return { label: "In Progress", cls: "bg-blue-100 text-blue-600 border-0", icon: Clock, iconCls: "text-blue-500" };
  }
  if (raw === "failed") {
    return { label: "Failed", cls: "bg-red-100 text-red-600 border-0", icon: Clock, iconCls: "text-red-400" };
  }
  return { label: "Not Started", cls: "bg-gray-100 text-gray-500 border-0", icon: Play, iconCls: "text-muted-foreground" };
}

function ScormSkeleton() {
  return (
    <Box className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-[160px] rounded-xl" />
      ))}
    </Box>
  );
}

export function LearnerScormContent() {
  const { token } = useAuth();
  const [packages, setPackages] = useState(null);

  useEffect(() => {
    if (!token) return;
    apiClient("/api/learner/scorm", { token })
      .then((d) => setPackages(d.packages || []))
      .catch(() => setPackages([]));
  }, [token]);

  if (!packages) return <ScormSkeleton />;

  if (packages.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center py-20 gap-4">
        <Box className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center">
          <FileArchive className="h-7 w-7 text-indigo-400" />
        </Box>
        <Box className="text-center">
          <Text as="h3" className="text-sm font-semibold">No SCORM courses assigned</Text>
          <Text as="p" className="text-xs text-muted-foreground mt-1">
            Your admin will assign SCORM packages to you. Check back later.
          </Text>
        </Box>
      </Card>
    );
  }

  const completed  = packages.filter((p) => ["passed", "completed"].includes(p.lesson_status ?? p.completion_status)).length;
  const inProgress = packages.filter((p) => ["incomplete"].includes(p.lesson_status ?? p.completion_status)).length;

  return (
    <Box className="space-y-5">

      {/* ── Summary bar ── */}
      <Box className="flex items-center gap-6 flex-wrap text-sm">
        <Box className="flex items-center gap-1.5">
          <FileArchive className="h-4 w-4 text-indigo-400" />
          <Text as="span" className="font-semibold">{packages.length}</Text>
          <Text as="span" className="text-muted-foreground">Assigned</Text>
        </Box>
        <Box className="flex items-center gap-1.5">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <Text as="span" className="font-semibold">{completed}</Text>
          <Text as="span" className="text-muted-foreground">Completed</Text>
        </Box>
        <Box className="flex items-center gap-1.5">
          <Clock className="h-4 w-4 text-blue-500" />
          <Text as="span" className="font-semibold">{inProgress}</Text>
          <Text as="span" className="text-muted-foreground">In Progress</Text>
        </Box>
      </Box>

      {/* ── Package grid ── */}
      <Box className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {packages.map((pkg) => {
          const vCfg  = VERSION_CFG[pkg.version] || VERSION_CFG["1.2"];
          const sCfg  = statusConfig(pkg);
          const score = pkg.score_raw !== null && pkg.score_raw !== undefined ? Math.round(Number(pkg.score_raw)) : null;
          const StatusIcon = sCfg.icon;

          return (
            <Card key={pkg.id} className="p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">

              {/* Badges */}
              <Box className="flex items-center gap-2 flex-wrap">
                <Badge className={`text-[11px] font-medium ${vCfg.cls}`}>{vCfg.label}</Badge>
                <Badge className={`text-[11px] font-medium ${sCfg.cls}`}>
                  <StatusIcon className={cn("h-3 w-3 mr-1", sCfg.iconCls)} />
                  {sCfg.label}
                </Badge>
              </Box>

              {/* Title */}
              <Box className="flex-1">
                <Text as="h3" className="text-[15px] font-bold leading-snug">{pkg.title}</Text>
                {pkg.course_name && (
                  <Box className="flex items-center gap-1 mt-1 text-xs text-indigo-600">
                    <BookOpen className="h-3.5 w-3.5" />{pkg.course_name}
                  </Box>
                )}
              </Box>

              {/* Score / Time */}
              <Box className="flex items-center gap-4 text-xs text-muted-foreground">
                {score !== null && (
                  <Box className="flex items-center gap-1">
                    <Trophy className="h-3.5 w-3.5 text-amber-500" />
                    <Text as="span" className="font-semibold text-foreground">{score}%</Text>
                    <Text as="span">score</Text>
                  </Box>
                )}
                {pkg.total_time && (
                  <Box className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    <Text as="span">{pkg.total_time}</Text>
                  </Box>
                )}
              </Box>

              {/* Launch */}
              <Button
                className="w-full gap-2 mt-1"
                variant={sCfg.label === "Completed" ? "outline" : "default"}
                onClick={() => window.open(`/scorm-player/${pkg.id}`, "_blank")}
              >
                <Play className="h-4 w-4" />
                {sCfg.label === "Not Started"  && "Launch"}
                {sCfg.label === "In Progress"  && "Resume"}
                {sCfg.label === "Completed"    && "Review"}
                {sCfg.label === "Failed"       && "Retry"}
              </Button>
            </Card>
          );
        })}
      </Box>
    </Box>
  );
}
