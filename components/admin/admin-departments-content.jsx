"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api-client";
import { Building2 } from "lucide-react";
import { BRAND } from "@/lib/brand";

const DEPT_PALETTE = [
  { border: "border-navy/20",    pct: "text-navy",    bar: "bg-navy"    },
  { border: "border-navy/20", pct: "text-navy", bar: "bg-navy" },
  { border: "border-border",   pct: "text-ink/70",   bar: "bg-navy"   },
  { border: "border-navy/20",  pct: "text-navy",  bar: "bg-navy"  },
  { border: "border-navy/20",    pct: "text-navy",    bar: "bg-navy"    },
  { border: "border-navy/20",    pct: "text-navy",    bar: "bg-navy"    },
  { border: "border-border",  pct: "text-ink/70",  bar: "bg-navy"  },
  { border: "border-navy/20",    pct: "text-navy",    bar: "bg-navy"    },
  { border: "border-error/30",    pct: "text-error",    bar: "bg-error"    },
  { border: "border-navy/20",    pct: "text-navy",    bar: "bg-navy"    },
];

const LEGEND_ITEMS = [
  { label: "Completed",   color: BRAND.navy },
  { label: "In Progress", color: BRAND.lime },
  { label: "Not Started", color: BRAND.limeSoft },
  { label: "Failed",      color: BRAND.error },
];

export function AdminDepartmentsContent() {
  const { user } = useAuth();
  const [departments, setDepartments] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return;
    apiClient("/api/admin/departments")
      .then((d) => setDepartments(d.departments || []))
      .catch((e) => setError(e.message));
  }, [user]);

  if (error) return (
    <Card className="p-6 text-center">
      <Text as="p" className="text-error text-sm">{error}</Text>
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
          { label: "Completed",   val: dept.completed,   color: "text-navy", bg: "bg-paper-cream dark:bg-navy" },
          { label: "In Progress", val: dept.in_progress, color: "text-navy",    bg: "bg-paper-cream dark:bg-navy"       },
          { label: "Not Started", val: dept.not_started, color: "text-ink/60",    bg: "bg-paper-cream dark:bg-navy"      },
          { label: "Failed",      val: dept.failed,      color: "text-error",     bg: "bg-error/10 dark:bg-navy"         },
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
