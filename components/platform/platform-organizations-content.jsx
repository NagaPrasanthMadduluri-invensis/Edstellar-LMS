"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Building2, ChevronRight } from "lucide-react";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api-client";

const EMPTY_FORM = { name: "", slug: "" };

function OrganizationsSkeleton() {
  return (
    <Box className="space-y-5">
      <Box className="flex items-center justify-between">
        <Skeleton className="h-4 w-40 rounded" />
        <Skeleton className="h-10 w-40 rounded-lg" />
      </Box>
      <Skeleton className="h-96 rounded-xl" />
    </Box>
  );
}

export function PlatformOrganizationsContent() {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState(null);
  const [error, setError] = useState(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    apiClient("/api/platform/organizations")
      .then((d) => setOrganizations(d.organizations || []))
      .catch((e) => setError(e.message));
  }, [user]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFormError(null);
    setDialogOpen(true);
  };

  const handleCreate = async () => {
    if (!form.name.trim()) {
      setFormError("Organisation name is required");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      const { organization } = await apiClient("/api/platform/organizations", {
        method: "POST",
        body: { name: form.name.trim(), slug: form.slug.trim() || undefined },
      });
      setOrganizations((prev) => [
        { ...organization, learners: 0, admins: 0, courses: 0, sessions: 0, completions: 0, trackedMinutes: 0 },
        ...(prev || []),
      ]);
      setDialogOpen(false);
    } catch (e) {
      setFormError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (error) {
    return (
      <Card className="p-8 text-center">
        <Text as="p" className="text-error text-sm">{error}</Text>
      </Card>
    );
  }

  if (!organizations) return <OrganizationsSkeleton />;

  return (
    <Box className="space-y-5">
      <Box className="flex items-center justify-between">
        <Text as="p" className="text-sm text-muted-foreground">
          {organizations.length} organisation{organizations.length !== 1 ? "s" : ""}
        </Text>
        <Button className="h-10 bg-navy hover:bg-navy-soft text-paper gap-2 px-5" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          New organisation
        </Button>
      </Box>

      {organizations.length === 0 ? (
        <Card className="p-16 text-center">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <Text as="p" className="text-sm text-muted-foreground">
            No organisations yet. Create the first one to get started.
          </Text>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organisation</TableHead>
                  <TableHead className="text-right">Learners</TableHead>
                  <TableHead className="text-right">Admins</TableHead>
                  <TableHead className="text-right">Courses</TableHead>
                  <TableHead className="text-right">Sessions</TableHead>
                  <TableHead className="text-right">Completions</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {organizations.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell>
                      <Link
                        href={`/platform/organizations/${org.id}`}
                        className="text-sm font-medium text-navy hover:underline"
                      >
                        {org.name}
                      </Link>
                      <Text as="p" className="text-xs text-muted-foreground mt-0.5">/{org.slug}</Text>
                    </TableCell>
                    <TableCell className="text-right text-sm">{org.learners}</TableCell>
                    <TableCell className="text-right text-sm">{org.admins}</TableCell>
                    <TableCell className="text-right text-sm">{org.courses}</TableCell>
                    <TableCell className="text-right text-sm">{org.sessions}</TableCell>
                    <TableCell className="text-right text-sm">{org.completions}</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] ${org.isActive ? "bg-paper-cream text-navy" : "bg-paper-warm text-ink/60"}`}
                      >
                        {org.isActive ? "Active" : "Inactive"}
                      </Badge>
                      {org.isPlatform && (
                        <Badge variant="secondary" className="ml-1.5 text-[10px] bg-paper-cream text-ink/60">
                          Platform
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Link href={`/platform/organizations/${org.id}`}>
                        <ChevronRight className="h-4 w-4 text-ink/40" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">New organisation</DialogTitle>
          </DialogHeader>

          <Box className="space-y-4 py-2">
            <Box className="space-y-1.5">
              <Label htmlFor="org-name">Name</Label>
              <Input
                id="org-name"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Acme Corporation"
              />
            </Box>
            <Box className="space-y-1.5">
              <Label htmlFor="org-slug">Slug (optional)</Label>
              <Input
                id="org-slug"
                value={form.slug}
                onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
                placeholder="acme-corporation"
              />
              <Text as="p" className="text-xs text-muted-foreground">
                Derived from the name if left blank. Must be unique.
              </Text>
            </Box>
            {formError && <Text as="p" className="text-xs text-error">{formError}</Text>}
          </Box>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              className="bg-navy hover:bg-navy-soft text-paper"
              onClick={handleCreate}
              disabled={submitting}
            >
              {submitting ? "Creating…" : "Create organisation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
