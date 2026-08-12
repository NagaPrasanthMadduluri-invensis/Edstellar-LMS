"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Search, Award, ShieldCheck, ShieldOff, Ban, RotateCcw } from "lucide-react";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api-client";

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function CertificatesTable() {
  const { user } = useAuth();

  const [certificates, setCertificates] = useState(null);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [filterLearner, setFilterLearner] = useState("all");
  const [filterCourse, setFilterCourse] = useState("all");
  const [confirmRevoke, setConfirmRevoke] = useState(null);
  const [revoking, setRevoking] = useState(false);
  const [confirmReissue, setConfirmReissue] = useState(null);
  const [reissuing, setReissuing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      // Certificates live on the NestJS server; the HttpOnly cookie authenticates.
      const d = await apiClient("/api/admin/certificates");
      setCertificates(d.certificates || []);
    } catch (e) {
      setError(e.message);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const handleRevoke = async () => {
    if (!confirmRevoke) return;
    setRevoking(true);
    try {
      await apiClient(`/api/admin/certificates/${confirmRevoke.id}`, { method: "DELETE" });
      setCertificates((prev) =>
        prev.map((c) => (c.id === confirmRevoke.id ? { ...c, isRevoked: true } : c))
      );
      setConfirmRevoke(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setRevoking(false);
    }
  };

  const handleReissue = async () => {
    if (!confirmReissue) return;
    setReissuing(true);
    try {
      const d = await apiClient(`/api/admin/certificates/${confirmReissue.id}`, { method: "PATCH" });
      setCertificates((prev) =>
        prev.map((c) =>
          c.id === confirmReissue.id
            ? {
                ...c,
                isRevoked: false,
                certificateCode: d.certificate?.certificateCode ?? c.certificateCode,
                issuedAt: d.certificate?.issuedAt ?? c.issuedAt,
              }
            : c
        )
      );
      setConfirmReissue(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setReissuing(false);
    }
  };

  const learners = useMemo(
    () => [...new Set((certificates || []).map((c) => c.learnerName).filter(Boolean))].sort(),
    [certificates]
  );
  const courses = useMemo(
    () => [...new Set((certificates || []).map((c) => c.courseName).filter(Boolean))].sort(),
    [certificates]
  );

  const filtered = useMemo(() => {
    if (!certificates) return [];
    const q = search.trim().toLowerCase();
    return certificates.filter((c) => {
      const haystack = `${c.learnerName} ${c.courseName} ${c.certificateCode}`.toLowerCase();
      const matchSearch = !q || haystack.includes(q);
      const matchLearner = filterLearner === "all" || c.learnerName === filterLearner;
      const matchCourse = filterCourse === "all" || c.courseName === filterCourse;
      return matchSearch && matchLearner && matchCourse;
    });
  }, [certificates, search, filterLearner, filterCourse]);

  if (error) return (
    <Card className="p-6 text-center">
      <Text as="p" className="text-error text-sm">{error}</Text>
      <Button size="sm" variant="outline" className="mt-3" onClick={() => window.location.reload()}>Retry</Button>
    </Card>
  );

  if (!certificates) return (
    <Box className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
    </Box>
  );

  const hasFilters = search || filterLearner !== "all" || filterCourse !== "all";

  return (
    <Box>
      <Card className="overflow-hidden">
        {/* ── Header ── */}
        <Box className="flex items-center justify-between px-6 py-4 border-b">
          <Box>
            <Text as="h2" className="text-base font-bold">Issued Certificates</Text>
            <Text as="p" className="text-xs text-muted-foreground mt-0.5">
              {filtered.length} of {certificates.length} certificates shown
            </Text>
          </Box>
        </Box>

        {/* ── Filter Bar ── */}
        <Box className="px-6 py-3 border-b space-y-2.5">
          <Box className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink/45" />
            <Input
              placeholder="Search by learner, course or code…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoComplete="off"
              className="pl-10 h-10 text-sm bg-paper-cream border-border placeholder:text-ink/45 focus-visible:ring-1 focus-visible:ring-navy focus-visible:bg-white transition-colors"
            />
          </Box>
          <Box className="flex flex-wrap items-center gap-2">
            <Text as="span" className="text-xs font-medium text-ink/45 mr-1">Filter by:</Text>
            <Select value={filterLearner} onValueChange={setFilterLearner}>
              <SelectTrigger className={`h-8 text-xs w-[180px] bg-paper-cream border-border hover:bg-paper-cream transition-colors ${filterLearner === "all" ? "text-ink/45" : "text-ink font-medium"}`}>
                <SelectValue>{filterLearner === "all" ? "All Learners" : filterLearner}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Learners</SelectItem>
                {learners.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterCourse} onValueChange={setFilterCourse}>
              <SelectTrigger className={`h-8 text-xs w-[200px] bg-paper-cream border-border hover:bg-paper-cream transition-colors ${filterCourse === "all" ? "text-ink/45" : "text-ink font-medium"}`}>
                <SelectValue>{filterCourse === "all" ? "All Courses" : filterCourse}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courses</SelectItem>
                {courses.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-3 text-xs text-ink/45 hover:text-ink/70 hover:bg-paper-cream"
                onClick={() => { setSearch(""); setFilterLearner("all"); setFilterCourse("all"); }}
              >
                × Clear filters
              </Button>
            )}
          </Box>
        </Box>

        {/* ── Table ── */}
        {filtered.length === 0 ? (
          <Box className="py-16 text-center">
            <Award className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
            <Text as="p" className="text-sm text-muted-foreground">
              {hasFilters ? "No certificates match your filters." : "No certificates issued yet."}
            </Text>
          </Box>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20">
                {["Learner", "Course", "Code", "Issued", "Score", "Status", "Actions"].map((h) => (
                  <TableHead key={h} className="text-[11px] font-semibold text-muted-foreground tracking-wide uppercase px-4 py-3">
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((cert) => (
                <TableRow key={cert.id}>
                  <TableCell className="px-4 py-3.5">
                    <Text as="span" className="text-sm font-semibold text-foreground">{cert.learnerName}</Text>
                  </TableCell>
                  <TableCell className="px-4 py-3.5">
                    <Text as="span" className="text-sm">{cert.courseName}</Text>
                  </TableCell>
                  <TableCell className="px-4 py-3.5">
                    <Text as="span" className="font-mono text-[11px] text-muted-foreground">{cert.certificateCode}</Text>
                  </TableCell>
                  <TableCell className="px-4 py-3.5">
                    <Text as="span" className="text-sm">{formatDate(cert.issuedAt)}</Text>
                  </TableCell>
                  <TableCell className="px-4 py-3.5">
                    <Text as="span" className="text-sm font-semibold text-ink/70">
                      {cert.finalScore !== null && cert.finalScore !== undefined ? `${cert.finalScore}%` : "N/A"}
                    </Text>
                  </TableCell>
                  <TableCell className="px-4 py-3.5">
                    {cert.isRevoked ? (
                      <Badge className="gap-1.5 bg-error/10 text-error border border-error/30 font-medium text-xs px-2.5 hover:bg-error/10">
                        <ShieldOff className="h-3 w-3" />
                        Revoked
                      </Badge>
                    ) : (
                      <Badge className="gap-1.5 bg-paper-cream text-navy border border-navy/20 font-medium text-xs px-2.5 hover:bg-paper-cream">
                        <ShieldCheck className="h-3 w-3" />
                        Valid
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="px-4 py-3.5">
                    {cert.isRevoked ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-3 text-xs font-medium text-navy border-navy/20 hover:bg-paper-cream hover:text-navy gap-1.5"
                        onClick={() => setConfirmReissue({ id: cert.id, learnerName: cert.learnerName, courseName: cert.courseName })}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Re-issue
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-3 text-xs font-medium text-error border-error/30 hover:bg-error/10 hover:text-error gap-1.5"
                        onClick={() => setConfirmRevoke({ id: cert.id, learnerName: cert.learnerName, courseName: cert.courseName })}
                      >
                        <Ban className="h-3.5 w-3.5" />
                        Revoke
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* ── Confirm Revoke ── */}
      <AlertDialog open={!!confirmRevoke} onOpenChange={(o) => { if (!o) setConfirmRevoke(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Certificate</AlertDialogTitle>
            <AlertDialogDescription>
              This will revoke the certificate for <strong>{confirmRevoke?.learnerName}</strong> on{" "}
              <strong>{confirmRevoke?.courseName}</strong>. The learner will no longer be able to download it and
              verification will show it as revoked.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revoking}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              disabled={revoking}
              className="bg-error hover:bg-error text-white"
            >
              {revoking ? "Revoking…" : "Revoke Certificate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Confirm Re-issue (admin-only reinstate of a revoked certificate) ── */}
      <AlertDialog open={!!confirmReissue} onOpenChange={(o) => { if (!o) setConfirmReissue(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Re-issue Certificate</AlertDialogTitle>
            <AlertDialogDescription>
              This will reinstate the revoked certificate for <strong>{confirmReissue?.learnerName}</strong> on{" "}
              <strong>{confirmReissue?.courseName}</strong> with a fresh certificate code and issue date. It will become
              valid again and the learner will be able to download it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={reissuing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReissue}
              disabled={reissuing}
              className="bg-navy hover:bg-navy-soft text-paper"
            >
              {reissuing ? "Re-issuing…" : "Re-issue Certificate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Box>
  );
}
