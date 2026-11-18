"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarClock, ShieldX, Trash2 } from "lucide-react";

import Box from "@/components/ui/box";
import Text from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";

const DEFAULT_GRACE_DAYS = 30;

/** A date in local time, "18 Dec 2026". Postgres "+00" offsets are repaired. */
function formatDay(value) {
  if (!value) return "—";
  const t = Date.parse(String(value).replace(" ", "T").replace(/([+-]\d{2})$/, "$1:00"));
  if (Number.isNaN(t)) return String(value);
  return new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function daysFromNow(value) {
  const t = Date.parse(String(value).replace(" ", "T").replace(/([+-]\d{2})$/, "$1:00"));
  return Math.ceil((t - Date.now()) / 86_400_000);
}

/** yyyy-mm-dd for a date input, `days` from today. */
function inputDate(days) {
  const d = new Date(Date.now() + days * 86_400_000);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Client offboarding (BACKEND_STRUCTURE §10.48): schedule the deletion of a
 * departed client's personal data. The nightly retention sweep carries it out.
 *
 * The API decides every rule and this panel only states them before the click:
 * access must be switched off first, the date must be at least a day away, and
 * a deletion that has run is final. What it deletes is listed in the confirm,
 * because a platform admin who cannot see the consequence cannot consent to it.
 */
export function OrganizationDataDeletion({ organizationId, organizationName, accessEnabled }) {
  const [deletion, setDeletion] = useState(null);
  const [date, setDate] = useState(inputDate(DEFAULT_GRACE_DAYS));
  const [confirm, setConfirm] = useState(null); // 'schedule' | 'cancel'
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const d = await apiClient(`/api/platform/organizations/${organizationId}/data-deletion`);
      setDeletion(d.deletion);
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  }, [organizationId]);

  // Re-read when access is switched, since that is what unlocks scheduling.
  useEffect(() => { load(); }, [load, accessEnabled]);

  async function act() {
    setBusy(true);
    setError(null);
    try {
      const d = confirm === "schedule"
        ? await apiClient(`/api/platform/organizations/${organizationId}/data-deletion`, {
            method: "PUT",
            // End of the chosen local day, so "the 18th" means the whole 18th.
            body: { due_at: new Date(`${date}T23:59:00`).toISOString() },
          })
        : await apiClient(`/api/platform/organizations/${organizationId}/data-deletion`, {
            method: "DELETE",
          });
      setDeletion(d.deletion);
      setConfirm(null);
    } catch (e) {
      setError(e.message);
      setConfirm(null);
    } finally {
      setBusy(false);
    }
  }

  if (!deletion) {
    return error ? (
      <Card className="gap-0 p-5">
        <Text as="p" className="text-sm text-error">{error}</Text>
      </Card>
    ) : null;
  }

  const minDate = inputDate(1);
  const tooSoon = date < minDate;

  return (
    <Card className={cn("gap-0 p-5", deletion.state === "scheduled" && "border-danger/40")}>
      <Box className="flex flex-wrap items-start justify-between gap-4">
        <Box className="min-w-0 max-w-2xl">
          <Text as="p" className="inline-flex items-center gap-2 font-semibold text-ink">
            <ShieldX className="h-4 w-4 text-text-3" />
            Data deletion on offboarding
          </Text>
          <Text as="p" className="mt-1 text-sm text-text-2">
            When {organizationName} leaves, its people&apos;s personal data must be
            deleted after the agreed grace period. On the date set here, the nightly
            retention job anonymises every person in the organization and removes
            its messages, community content, notifications and logs. Courses and
            other content it created are kept.
          </Text>
        </Box>

        {deletion.state === "deleted" && (
          <Text as="span" className="chip chip-error">Deleted {formatDay(deletion.deleted_at)}</Text>
        )}
        {deletion.state === "scheduled" && (
          <Text as="span" className="chip chip-warning">
            Scheduled for {formatDay(deletion.due_at)}
          </Text>
        )}
      </Box>

      <Box className="mt-4 border-t border-line pt-4">
        {deletion.state === "deleted" && (
          <Text as="p" className="text-sm text-text-2">
            The personal data was deleted on {formatDay(deletion.deleted_at)}. This cannot be undone.
          </Text>
        )}

        {deletion.state === "scheduled" && (
          <Box className="flex flex-wrap items-center justify-between gap-3">
            <Text as="p" className="inline-flex items-center gap-2 text-sm text-ink">
              <CalendarClock className="h-4 w-4 text-warning" />
              Runs on the night of {formatDay(deletion.due_at)}
              {daysFromNow(deletion.due_at) > 0 && ` (in ${daysFromNow(deletion.due_at)} days)`}.
              Until then it can be cancelled.
            </Text>
            <Button variant="outline" onClick={() => setConfirm("cancel")} disabled={busy}>
              Cancel deletion
            </Button>
          </Box>
        )}

        {deletion.state === "none" && deletion.access_enabled && (
          <Text as="p" className="text-sm text-text-3">
            Switch off this organization&apos;s access first (Deactivate, above). A deletion
            can only be scheduled for a client nobody can sign in to.
          </Text>
        )}

        {deletion.state === "none" && !deletion.access_enabled && (
          <Box className="flex flex-wrap items-end gap-3">
            <Box className="space-y-1.5">
              <Label htmlFor="deletion-date">Delete personal data on</Label>
              <Input
                id="deletion-date"
                type="date"
                min={minDate}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-48"
              />
            </Box>
            <Button
              variant="destructive"
              onClick={() => setConfirm("schedule")}
              disabled={busy || !date || tooSoon}
              title={tooSoon ? "Choose a date at least one day from now" : undefined}
              className="gap-1.5"
            >
              <Trash2 className="h-4 w-4" />
              Schedule deletion
            </Button>
            <Text as="p" className="w-full text-xs text-text-3">
              Suggested: {DEFAULT_GRACE_DAYS} days after the contract ends, or whatever the
              client&apos;s data processing agreement says. Export anything the client
              needs before then.
            </Text>
          </Box>
        )}

        {error && <Text as="p" className="mt-3 text-sm text-error">{error}</Text>}
      </Box>

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm === "schedule"
                ? `Schedule deletion of ${organizationName}'s data?`
                : "Cancel the scheduled deletion?"}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <Box className="space-y-2 text-sm text-text-2">
                {confirm === "schedule" ? (
                  <>
                    <Text as="p">On the night of {formatDay(new Date(`${date}T23:59:00`).toISOString())}, permanently:</Text>
                    <Box as="ul" className="list-disc space-y-1 pl-5">
                      <Text as="li">every person in the organization is anonymised: names, emails, photos, phone numbers and IP addresses are removed everywhere they appear</Text>
                      <Text as="li">direct messages, community posts and their files are deleted</Text>
                      <Text as="li">notifications, the activity feed, the audit log, email records and privacy requests are deleted</Text>
                    </Box>
                    <Text as="p">Learning figures stay, without names. Courses are kept. You can cancel until the date.</Text>
                  </>
                ) : (
                  <Text as="p">Nothing will be deleted. The organization stays switched off.</Text>
                )}
              </Box>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Keep as it is</AlertDialogCancel>
            <AlertDialogAction
              onClick={act}
              disabled={busy}
              className={confirm === "schedule" ? "bg-error text-paper hover:bg-error/90" : undefined}
            >
              {busy ? "Please wait…" : confirm === "schedule" ? "Schedule deletion" : "Cancel deletion"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
