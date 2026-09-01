"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Building2, Users, ShieldCheck, BookOpen, CalendarCheck, CheckCircle2, Clock,
} from "lucide-react";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api-client";

function DashboardSkeleton() {
  return (
    <Box className="space-y-5">
      <Box className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </Box>
      <Skeleton className="h-96 rounded-xl" />
    </Box>
  );
}

export function PlatformDashboardContent() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return;
    apiClient("/api/platform/analytics")
      .then(setData)
      .catch((e) => setError(e.message));
  }, [user]);

  if (error) {
    return (
      <Card className="p-8 text-center">
        <Text as="p" className="text-error text-sm">{error}</Text>
      </Card>
    );
  }

  if (!data) return <DashboardSkeleton />;

  const { byOrganization = [], totals = {} } = data;
  const hours = Math.round(((totals.trackedMinutes || 0) / 60) * 10) / 10;

  const statCards = [
    { label: "Organisations", value: totals.organizations ?? 0, icon: Building2 },
    { label: "Learners",      value: totals.learners ?? 0,      icon: Users },
    { label: "Admins",        value: totals.admins ?? 0,        icon: ShieldCheck },
    { label: "Courses",       value: totals.courses ?? 0,       icon: BookOpen },
    { label: "Sessions",      value: totals.sessions ?? 0,      icon: CalendarCheck },
    { label: "Completions",   value: totals.completions ?? 0,   icon: CheckCircle2 },
    { label: "Hours tracked", value: hours,                     icon: Clock },
  ];

  if (byOrganization.length === 0) {
    return (
      <Card className="p-16 text-center">
        <Building2 className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
        <Text as="p" className="text-sm text-muted-foreground">
          No organisations yet. Create one to see it here.
        </Text>
      </Card>
    );
  }

  return (
    <Box className="space-y-5">
      <Box className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((s) => (
          <Card key={s.label} className="p-4 hover:shadow-md transition-shadow">
            <Box className="flex items-start gap-3">
              <Box className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-paper-cream text-navy">
                <s.icon className="h-4 w-4" />
              </Box>
              <Box>
                <Text as="p" className="text-xl font-bold leading-none">{s.value}</Text>
                <Text as="p" className="text-xs text-muted-foreground mt-1">{s.label}</Text>
              </Box>
            </Box>
          </Card>
        ))}
      </Box>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <Box className="px-5 py-4 border-b border-border">
            <Text as="h3" className="text-base font-bold">Organisation comparison</Text>
            <Text as="p" className="text-xs text-muted-foreground mt-0.5">
              Every tenant, ranked by nothing — this is a comparison, not a leaderboard.
            </Text>
          </Box>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organisation</TableHead>
                <TableHead className="text-right">Learners</TableHead>
                <TableHead className="text-right">Admins</TableHead>
                <TableHead className="text-right">Courses</TableHead>
                <TableHead className="text-right">Sessions</TableHead>
                <TableHead className="text-right">Completions</TableHead>
                <TableHead className="text-right">Hours</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {byOrganization.map((org) => (
                <TableRow key={org.organizationId}>
                  <TableCell>
                    <Link
                      href={`/platform/organizations/${org.organizationId}`}
                      className="text-sm font-medium text-navy hover:underline"
                    >
                      {org.name}
                    </Link>
                    {org.isPlatform && (
                      <Badge variant="secondary" className="ml-2 text-[10px] bg-paper-cream text-ink/60">
                        Platform
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-sm">{org.learners}</TableCell>
                  <TableCell className="text-right text-sm">{org.admins}</TableCell>
                  <TableCell className="text-right text-sm">{org.courses}</TableCell>
                  <TableCell className="text-right text-sm">{org.sessions}</TableCell>
                  <TableCell className="text-right text-sm">{org.completions}</TableCell>
                  <TableCell className="text-right text-sm">
                    {Math.round(((org.trackedMinutes || 0) / 60) * 10) / 10}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={`text-[10px] ${org.isActive ? "bg-paper-cream text-navy" : "bg-paper-warm text-ink/60"}`}
                    >
                      {org.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Box>
  );
}
