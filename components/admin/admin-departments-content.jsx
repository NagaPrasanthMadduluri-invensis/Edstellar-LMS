"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api-client";
import { Building2 } from "lucide-react";

const DEPT_PALETTE = [
  { border: "border-blue-500",    pct: "text-blue-500",    bar: "bg-blue-500"    },
  { border: "border-emerald-500", pct: "text-emerald-500", bar: "bg-emerald-500" },
  { border: "border-amber-500",   pct: "text-amber-500",   bar: "bg-amber-500"   },
  { border: "border-violet-500",  pct: "text-violet-500",  bar: "bg-violet-500"  },
  { border: "border-pink-500",    pct: "text-pink-500",    bar: "bg-pink-500"    },
  { border: "border-cyan-500",    pct: "text-cyan-500",    bar: "bg-cyan-500"    },
  { border: "border-orange-500",  pct: "text-orange-500",  bar: "bg-orange-500"  },
  { border: "border-teal-500",    pct: "text-teal-500",    bar: "bg-teal-500"    },
  { border: "border-rose-500",    pct: "text-rose-500",    bar: "bg-rose-500"    },
  { border: "border-lime-600",    pct: "text-lime-600",    bar: "bg-lime-600"    },
];

const LEGEND_ITEMS = [
  { label: "Completed",   color: "#22c55e" },
  { label: "In Progress", color: "#3b82f6" },
  { label: "Not Started", color: "#6b7280" },
  { label: "Failed",      color: "#ef4444" },
];

export function AdminDepartmentsContent() {
  const { token } = useAuth();
  const [departments, setDepartments] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) return;
    apiClient("/api/admin/departments", { token })
      .then((d) => setDepartments(d.departments || []))
      .catch((e) => setError(e.message));
  }, [token]);

  if (error) return (
    <Card className="p-6 text-center">
      <Text as="p" className="text-red-500 text-sm">{error}</Text>
    </Card>
  );

  if (!departments) return (
    <Box className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
    </Box>
  );

  if (departments.length === 0) return (
    <Card className="p-16 text-center">
      <Building2 className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
      <Text as="p" className="text-sm text-muted-foreground">
        No departments yet. Users will appear here once they register with a department.
      </Text>
    </Card>
  );

  return (
    <Box className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {departments.map((dept, idx) => {
        const { border, pct: pctColor, bar: barColor } = DEPT_PALETTE[idx % DEPT_PALETTE.length];

        const stats = [
          { label: "Completed",   val: dept.completed,   color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
          { label: "In Progress", val: dept.in_progress, color: "text-blue-500",    bg: "bg-blue-50 dark:bg-blue-950/30"       },
          { label: "Not Started", val: dept.not_started, color: "text-gray-500",    bg: "bg-gray-100 dark:bg-gray-800/40"      },
          { label: "Failed",      val: dept.failed,      color: "text-red-500",     bg: "bg-red-50 dark:bg-red-950/30"         },
        ];

        return (
          <Card key={dept.dept} className={`border-l-4 ${border} overflow-hidden`}>
            <CardContent className="p-0">

              {/* ── Top row: name + percentage (gray header) ── */}
              <Box className="bg-muted/50 px-5 py-4 border-b border-border">
                <Box className="flex items-start justify-between gap-3">
                  <Box>
                    <Text as="h3" className="text-base font-bold leading-tight">{dept.dept}</Text>
                    <Text as="p" className="text-xs text-muted-foreground mt-0.5">
                      {dept.total} employee{dept.total !== 1 ? "s" : ""}
                      {dept.avg_score != null && ` • Avg Score: ${dept.avg_score}%`}
                    </Text>
                  </Box>
                  <Text as="p" className={`text-3xl font-extrabold leading-none shrink-0 ${pctColor}`}>
                    {dept.completion_pct}%
                  </Text>
                </Box>
              </Box>

              {/* ── Body: completion bar + stats ── */}
              <Box className="px-5 py-4 space-y-4">

                {/* ── Completion bar ── */}
                <Box>
                  <Box className="flex items-center justify-between mb-1.5">
                    <Text as="span" className="text-xs font-medium">Completion</Text>
                    <Text as="span" className="text-xs text-muted-foreground">
                      {dept.completed}/{dept.total}
                    </Text>
                  </Box>
                  <Box className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <Box
                      className={`h-full rounded-full transition-all ${barColor}`}
                      style={{ width: `${dept.completion_pct}%` }}
                    />
                  </Box>
                </Box>

                {/* ── Stats 2×2 grid + color legend ── */}
                <Box className="flex items-start justify-between gap-4">

                  {/* Stats — light bg tiles */}
                  <Box className="grid grid-cols-2 gap-2 flex-1">
                    {stats.map((s) => (
                      <Box key={s.label} className={`rounded-lg px-3 py-2 ${s.bg}`}>
                        <Text as="p" className={`text-xl font-bold leading-none ${s.color}`}>{s.val}</Text>
                        <Text as="p" className="text-xs text-muted-foreground mt-0.5">{s.label}</Text>
                      </Box>
                    ))}
                  </Box>

                  {/* Legend */}
                  <Box className="flex flex-col gap-2 shrink-0">
                    {LEGEND_ITEMS.map((item) => (
                      <Box key={item.label} className="flex items-center gap-2">
                        <Box
                          className="w-5 h-2.5 rounded-sm shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <Text as="span" className="text-xs text-muted-foreground">{item.label}</Text>
                      </Box>
                    ))}
                  </Box>

                </Box>
              </Box>
            </CardContent>
          </Card>
        );
      })}
    </Box>
  );
}
