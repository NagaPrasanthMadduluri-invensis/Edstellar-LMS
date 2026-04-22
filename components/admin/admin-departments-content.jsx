"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PieChart, Pie, Cell } from "recharts";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api-client";
import { Building2, Users } from "lucide-react";

const STATUS_COLORS = {
  Completed:   "hsl(142 71% 45%)",
  "In Progress": "hsl(221 83% 53%)",
  "Not Started": "hsl(215 16% 47%)",
  Failed:      "hsl(0 72% 51%)",
};

const DEPT_ACCENT_COLORS = [
  "border-indigo-500",
  "border-emerald-500",
  "border-amber-500",
  "border-violet-500",
  "border-pink-500",
  "border-cyan-500",
  "border-orange-500",
  "border-teal-500",
  "border-rose-500",
  "border-lime-500",
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

  if (error) return <Card className="p-6 text-center"><Text as="p" className="text-red-500 text-sm">{error}</Text></Card>;
  if (!departments) return (
    <Box className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
    </Box>
  );

  if (departments.length === 0) return (
    <Card className="p-16 text-center">
      <Building2 className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
      <Text as="p" className="text-sm text-muted-foreground">No departments yet. Users will appear here once they register with a department.</Text>
    </Card>
  );

  return (
    <Box className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {departments.map((dept, idx) => {
        const accentBorder = DEPT_ACCENT_COLORS[idx % DEPT_ACCENT_COLORS.length];
        const chartData = [
          { name: "Completed", value: dept.completed, fill: STATUS_COLORS["Completed"] },
          { name: "In Progress", value: dept.in_progress, fill: STATUS_COLORS["In Progress"] },
          { name: "Not Started", value: dept.not_started, fill: STATUS_COLORS["Not Started"] },
          { name: "Failed", value: dept.failed, fill: STATUS_COLORS["Failed"] },
        ].filter((d) => d.value > 0);

        const chartConfig = {
          Completed:    { color: STATUS_COLORS["Completed"] },
          "In Progress": { color: STATUS_COLORS["In Progress"] },
          "Not Started": { color: STATUS_COLORS["Not Started"] },
          Failed:       { color: STATUS_COLORS["Failed"] },
        };

        return (
          <Card key={dept.dept} className={`overflow-hidden border-l-4 ${accentBorder}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
              <Box>
                <CardTitle className="text-sm font-bold">{dept.dept}</CardTitle>
                <Text as="p" className="text-[11px] text-muted-foreground mt-0.5">
                  <Users className="h-3 w-3 inline mr-1" />
                  {dept.total} learner{dept.total !== 1 ? "s" : ""}
                  {dept.avg_score != null && ` · Avg Score: ${dept.avg_score}%`}
                </Text>
              </Box>
              <Text as="p" className="text-2xl font-extrabold text-indigo-600">{dept.completion_pct}%</Text>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              {/* Progress bar */}
              <Box>
                <Box className="flex justify-between text-[10px] text-muted-foreground mb-1">
                  <Text as="span">Completion</Text>
                  <Text as="span">{dept.completed}/{dept.total}</Text>
                </Box>
                <Box className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <Box
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${dept.completion_pct}%` }}
                  />
                </Box>
              </Box>

              {/* 4-stat mini grid */}
              <Box className="grid grid-cols-2 gap-2">
                {[
                  { label: "Completed", val: dept.completed, color: "text-emerald-600" },
                  { label: "In Progress", val: dept.in_progress, color: "text-blue-600" },
                  { label: "Not Started", val: dept.not_started, color: "text-muted-foreground" },
                  { label: "Failed", val: dept.failed, color: "text-red-500" },
                ].map((s) => (
                  <Box key={s.label} className="bg-muted/40 rounded-lg p-2 text-center">
                    <Text as="p" className={`text-base font-bold ${s.color}`}>{s.val}</Text>
                    <Text as="p" className="text-[10px] text-muted-foreground">{s.label}</Text>
                  </Box>
                ))}
              </Box>

              {/* Mini donut chart */}
              {chartData.length > 0 && (
                <ChartContainer config={chartConfig} className="h-[100px]">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={28}
                      outerRadius={42}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {chartData.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  </PieChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        );
      })}
    </Box>
  );
}
