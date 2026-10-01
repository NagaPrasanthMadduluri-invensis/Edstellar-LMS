"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Plus,
  Upload,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { ApiError } from "@/lib/api-client";
import {
  certificateFileUrl,
  fetchMyExternalCertifications,
  submitExternalCertification,
} from "@/services/api/external-certifications-api";

import Box from "@/components/ui/box";
import Text from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * "I did this somewhere else" — the learner's own claims, and the form that
 * files one.
 *
 * WHAT THE PAGE HAS TO BE HONEST ABOUT is that submitting changes nothing.
 * A form that takes five fields and a file looks like it does something, and
 * this one deliberately does not until two other people have acted: no
 * course, no hours, no progress. The empty state and the dialog both say so
 * before the learner spends five minutes on it, because discovering it from
 * a status chip afterwards reads as the feature being broken.
 *
 * The chip is the API's `status_label`, never recomputed here. Which of four
 * states a claim is in — and whether one or two approvals remain — depends
 * on whether the learner had a manager at submission, which is a fact on the
 * row rather than something the browser can work out.
 */

const STATUS_TONE = {
  pending_manager: { bg: "rgba(138,98,0,.12)", fg: "var(--spectra-warning)", Icon: Clock },
  pending_admin: { bg: "rgba(59,111,212,.12)", fg: "var(--spectra-accent-blue)", Icon: Clock },
  approved: { bg: "rgba(26,94,58,.12)", fg: "var(--spectra-success)", Icon: CheckCircle2 },
  rejected: { bg: "rgba(201,64,64,.12)", fg: "var(--spectra-danger)", Icon: AlertTriangle },
};

const EMPTY = {
  name_on_certificate: "",
  course_name: "",
  course_hours: "",
  authorized_body: "",
};

export function ExternalCertifications() {
  const [rows, setRows] = useState(null);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const d = await fetchMyExternalCertifications();
      setRows(d.certifications || []);
      setError(null);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not load your submissions",
      );
      setRows([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Box className="space-y-3">
      <Box className="flex flex-wrap items-center justify-between gap-2">
        <Box>
          <Text as="h2" className="text-base font-semibold">
            Certifications from elsewhere
          </Text>
          <Text as="p" className="text-xs text-muted-foreground">
            Training you completed outside this platform. Once your manager and
            your L&amp;D team have both confirmed it, it joins My Courses and
            its hours count towards your total.
          </Text>
        </Box>
        <Button size="sm" className="cursor-pointer" onClick={() => setOpen(true)}>
          <Plus className="mr-1.5 size-4" /> Add external certification
        </Button>
      </Box>

      {note && (
        <Box className="border border-success/40 bg-success/10 px-3 py-2">
          <Text as="p" className="text-[13px] text-success">{note}</Text>
        </Box>
      )}
      {error && (
        <Box className="border border-danger/40 bg-danger/10 px-3 py-2">
          <Text as="p" className="text-[13px] text-danger">{error}</Text>
        </Box>
      )}

      {rows === null ? (
        <Box className="h-24 animate-pulse bg-paper-warm" />
      ) : rows.length === 0 ? (
        <Card className="border-dashed p-6 text-center">
          <FileText className="mx-auto size-8 text-muted-foreground/40" />
          <Text as="p" className="mt-2 text-sm font-semibold">
            Nothing submitted yet
          </Text>
          <Text as="p" className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
            Finished a qualification elsewhere? Send it here with a copy of the
            certificate. Nothing is added to your record until it has been
            approved.
          </Text>
        </Card>
      ) : (
        <Box className="space-y-2">
          {rows.map((r) => (
            <SubmissionRow key={r.id} row={r} />
          ))}
        </Box>
      )}

      {open && (
        <SubmitDialog
          onClose={() => setOpen(false)}
          onDone={async (message) => {
            setOpen(false);
            setNote(message);
            await load();
          }}
        />
      )}
    </Box>
  );
}

function SubmissionRow({ row }) {
  const tone = STATUS_TONE[row.status] ?? STATUS_TONE.pending_admin;
  const { Icon } = tone;

  return (
    <Card className="gap-0 p-0">
      <Box className="flex flex-wrap items-start gap-3 p-4">
        <Box className="mt-0.5 flex size-9 shrink-0 items-center justify-center bg-paper-warm">
          <Icon className="size-4" style={{ color: tone.fg }} />
        </Box>

        <Box className="min-w-0 flex-1">
          <Text as="p" className="text-sm font-semibold leading-snug">
            {row.course_name}
          </Text>
          <Text as="p" className="mt-0.5 text-xs text-muted-foreground">
            {row.authorized_body} · {row.course_hours} h · issued to{" "}
            {row.name_on_certificate}
          </Text>

          {/* The decisions, in the order they happen. A manager's yes is
              shown as a step rather than an outcome, because the hours have
              not moved yet and saying "approved" here would suggest they had. */}
          {row.manager_note && (
            <Text as="p" className="mt-1.5 text-[11px] text-muted-foreground">
              <Text as="span" className="font-semibold">
                {row.manager_name || "Your manager"}:
              </Text>{" "}
              {row.manager_note}
            </Text>
          )}
          {row.admin_note && (
            <Text as="p" className="mt-1 text-[11px] text-muted-foreground">
              <Text as="span" className="font-semibold">L&amp;D:</Text>{" "}
              {row.admin_note}
            </Text>
          )}
        </Box>

        <Box className="flex shrink-0 items-center gap-2">
          <a
            href={certificateFileUrl(row.id)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-[11px] text-accent-blue hover:underline"
          >
            <ExternalLink className="size-3.5" /> Certificate
          </a>
          <Text
            as="span"
            className="px-2 py-0.5 text-[10px] font-bold"
            style={{ background: tone.bg, color: tone.fg }}
          >
            {row.status_label}
          </Text>
        </Box>
      </Box>
    </Card>
  );
}

function SubmitDialog({ onClose, onDone }) {
  const [form, setForm] = useState(EMPTY);
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  // Every field is required, so the button says which one is missing rather
  // than sitting disabled with no explanation (§10.3.1.2).
  const missing =
    (!form.name_on_certificate.trim() && "the name on the certificate") ||
    (!form.course_name.trim() && "the course name") ||
    (!String(form.course_hours).trim() && "the course hours") ||
    (!form.authorized_body.trim() && "the awarding body") ||
    (!file && "a copy of the certificate") ||
    null;

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await submitExternalCertification(
        { ...form, course_hours: Number(form.course_hours) },
        file,
      );
      await onDone(`Sent to ${res.sent_to}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not submit that");
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-lg">
        <DialogHeader className="surface-dark px-4 py-3">
          <DialogTitle className="text-white">
            Add an external certification
          </DialogTitle>
          {/* Said before the form, not after it. Five fields and an upload
              look like they do something immediately; these do not. */}
          <Text as="p" className="mt-1 text-[12px] text-accent-soft">
            Nothing is added to your record yet. Your manager confirms you
            completed it, then your L&amp;D team gives the final approval —
            only then does it appear in My Courses and count towards your
            hours.
          </Text>
        </DialogHeader>

        <Box className="space-y-4 px-4 py-4">
          {error && (
            <Box className="border border-danger/40 bg-danger/10 px-3 py-2">
              <Text as="p" className="text-[13px] text-danger">{error}</Text>
            </Box>
          )}

          <Box className="space-y-1.5">
            <Label>
              Name as per certificate <Text as="span" className="text-danger">*</Text>
            </Label>
            <Input
              value={form.name_on_certificate}
              onChange={set("name_on_certificate")}
              placeholder="Exactly as it is printed"
              maxLength={160}
            />
            {/* Why it is asked separately from the name on their account —
                otherwise it reads as a field the system already knows. */}
            <Text as="p" className="text-[11px] text-text-3">
              Certificates often carry a different spelling or a former name.
              Whoever checks it compares this against the document.
            </Text>
          </Box>

          <Box className="space-y-1.5">
            <Label>
              Course name <Text as="span" className="text-danger">*</Text>
            </Label>
            <Input
              value={form.course_name}
              onChange={set("course_name")}
              placeholder="e.g. PRINCE2 Practitioner"
              maxLength={200}
            />
          </Box>

          <Box className="grid gap-3 sm:grid-cols-2">
            <Box className="space-y-1.5">
              <Label>
                Course hours <Text as="span" className="text-danger">*</Text>
              </Label>
              <Input
                type="number"
                min="0.25"
                step="0.25"
                value={form.course_hours}
                onChange={set("course_hours")}
                placeholder="e.g. 21"
              />
              <Text as="p" className="text-[11px] text-text-3">
                Added to your learning hours once approved.
              </Text>
            </Box>
            <Box className="space-y-1.5">
              <Label>
                Authorising body <Text as="span" className="text-danger">*</Text>
              </Label>
              <Input
                value={form.authorized_body}
                onChange={set("authorized_body")}
                placeholder="e.g. AXELOS"
                maxLength={160}
              />
            </Box>
          </Box>

          <Box className="space-y-1.5">
            <Label>
              Certificate <Text as="span" className="text-danger">*</Text>
            </Label>
            {file ? (
              <Box className="flex items-center gap-2 border border-line bg-surface-2 px-3 py-2">
                <FileText className="size-4 shrink-0 text-accent-blue" />
                <Text as="span" className="min-w-0 flex-1 truncate text-[12px]">
                  {file.name}
                </Text>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  title="Remove this file"
                  aria-label="Remove this file"
                  className="cursor-pointer text-text-3 hover:text-danger"
                >
                  <X className="size-4" />
                </button>
              </Box>
            ) : (
              <label className="flex cursor-pointer items-center justify-center gap-2 border border-dashed border-line-strong bg-surface-2 px-3 py-4 text-[12px] text-text-2 hover:border-accent-blue">
                <Upload className="size-4" />
                Choose a file
                <input
                  type="file"
                  className="hidden"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </label>
            )}
            <Text as="p" className="text-[11px] text-text-3">
              PDF, JPG, PNG or WebP, up to 10 MB. Only you, your manager and
              your L&amp;D team can open it.
            </Text>
          </Box>
        </Box>

        {/* p-0 above means the footer's own -mx-4 -mb-4 has nothing to
            cancel, so both are reset (§10.3.1.11). */}
        <DialogFooter className="mx-0 mb-0 border-t border-line bg-surface-2 px-4 py-3">
          <Text as="p" className="mr-auto text-[11px] text-text-3">
            {missing ? `Still needs ${missing}.` : "Ready to send."}
          </Text>
          <Button variant="outline" onClick={onClose} disabled={saving} className="cursor-pointer">
            Cancel
          </Button>
          <Button
            onClick={save}
            disabled={saving || !!missing}
            title={missing ? `Still needs ${missing}` : undefined}
            className="cursor-pointer"
          >
            {saving ? "Sending…" : "Submit for approval"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
