"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, ExternalLink, FileText } from "lucide-react";

import { ApiError } from "@/lib/api-client";
import { certificateFileUrl } from "@/services/api/external-certifications-api";

import Box from "@/components/ui/box";
import Text from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * The review list, shared by the manager and the admin.
 *
 * ONE component for both steps because the decision is the same shape —
 * read the claim, open the document, approve or refuse with a reason — and
 * two copies would drift on the thing that matters most: what each button
 * actually does next. What differs is passed in: the fetch, the decision
 * call, and the SENTENCE describing the consequence, which is genuinely
 * different at the two steps and is the one thing neither approver should
 * have to infer.
 *
 * A refusal REQUIRES a reason. The API enforces it; Decline stays disabled
 * until there is one, so the approver hears it while typing rather than
 * after pressing (§10.3.1.2).
 */
export function CertificationApprovals({
  title,
  blurb,
  emptyText,
  approveLabel,
  approveConsequence,
  fetchQueue,
  decide,
  showLearner = true,
}) {
  const [rows, setRows] = useState(null);
  const [target, setTarget] = useState(null);
  const [error, setError] = useState(null);
  const [note, setNote] = useState(null);

  const load = useCallback(async () => {
    try {
      const d = await fetchQueue();
      setRows(d.certifications || []);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load the queue");
      setRows([]);
    }
  }, [fetchQueue]);

  useEffect(() => {
    load();
  }, [load]);

  // Nothing waiting renders nothing at all. This sits inside a bigger page
  // in both portals, and a permanent empty panel headed "approvals" is how
  // a section becomes furniture people stop reading.
  if (rows !== null && rows.length === 0 && !error && !note) return null;

  return (
    <Box className="space-y-3">
      <Box>
        <Text as="h2" className="text-base font-semibold">{title}</Text>
        <Text as="p" className="text-xs text-muted-foreground">{blurb}</Text>
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
        <Card className="border-dashed p-5 text-center">
          <Text as="p" className="text-[13px] text-muted-foreground">{emptyText}</Text>
        </Card>
      ) : (
        rows.map((r) => (
          <Card key={r.id} className="gap-0 p-4">
            <Box className="flex flex-wrap items-start gap-3">
              <Box className="mt-0.5 flex size-9 shrink-0 items-center justify-center bg-accent-tint">
                <FileText className="size-4 text-accent-blue" />
              </Box>
              <Box className="min-w-0 flex-1">
                <Text as="p" className="text-sm font-semibold leading-snug">
                  {r.course_name}
                </Text>
                <Text as="p" className="mt-0.5 text-xs text-muted-foreground">
                  {showLearner && `${r.learner_name} · `}
                  {r.authorized_body} · {r.course_hours} h
                </Text>
                {/* Shown because it is the thing being checked: the name on
                    the document, which is often not the name on the account. */}
                <Text as="p" className="mt-0.5 text-[11px] text-text-3">
                  Certificate issued to {r.name_on_certificate}
                </Text>
                {r.manager_note && (
                  <Text as="p" className="mt-1.5 text-[11px] text-muted-foreground">
                    <Text as="span" className="font-semibold">
                      {r.manager_name || "Manager"}:
                    </Text>{" "}
                    {r.manager_note}
                  </Text>
                )}
              </Box>
              <Box className="flex shrink-0 flex-col items-end gap-2">
                <a
                  href={certificateFileUrl(r.id)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-[11px] text-accent-blue hover:underline"
                >
                  <ExternalLink className="size-3.5" /> Open certificate
                </a>
                <Box className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 cursor-pointer text-xs"
                    onClick={() => setTarget({ row: r, approve: false })}
                  >
                    Decline
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 cursor-pointer text-xs"
                    onClick={() => setTarget({ row: r, approve: true })}
                  >
                    {approveLabel}
                  </Button>
                </Box>
              </Box>
            </Box>
          </Card>
        ))
      )}

      {target && (
        <DecisionDialog
          target={target}
          approveConsequence={approveConsequence}
          onClose={() => setTarget(null)}
          onDone={async (message) => {
            setTarget(null);
            setNote(message);
            await load();
          }}
          decide={decide}
        />
      )}
    </Box>
  );
}

function DecisionDialog({ target, approveConsequence, onClose, onDone, decide }) {
  const { row, approve } = target;
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const blocked = !approve && !text.trim();

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await decide(row.id, approve, text.trim() || null);
      await onDone(
        approve
          ? `"${row.course_name}" approved.`
          : `"${row.course_name}" declined — ${row.learner_name} has been told why.`,
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "That did not work");
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="gap-0 p-0 sm:max-w-md">
        <DialogHeader className="surface-dark px-4 py-3">
          <DialogTitle className="text-white">
            {approve ? "Approve" : "Decline"} &ldquo;{row.course_name}&rdquo;
          </DialogTitle>
          <Text as="p" className="mt-1 text-[12px] text-accent-soft">
            {approve
              ? approveConsequence
              : `${row.learner_name} sees your reason. Nothing is added to their record.`}
          </Text>
        </DialogHeader>

        <Box className="space-y-2 px-4 py-4">
          {error && (
            <Box className="border border-danger/40 bg-danger/10 px-3 py-2">
              <Text as="p" className="text-[13px] text-danger">{error}</Text>
            </Box>
          )}
          <Text as="label" className="text-[12px] font-semibold text-ink">
            {approve ? "Note (optional)" : "Why not?"}
          </Text>
          <Textarea
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={450}
            placeholder={
              approve
                ? "Anything worth recording alongside the decision."
                : "e.g. the certificate is for a different person, or the hours look wrong."
            }
            className="resize-none"
          />
        </Box>

        <DialogFooter className="mx-0 mb-0 border-t border-line bg-surface-2 px-4 py-3">
          <Text as="p" className="mr-auto text-[11px] text-text-3">
            {blocked ? "A reason is required to decline." : ""}
          </Text>
          <Button variant="outline" onClick={onClose} disabled={saving} className="cursor-pointer">
            Cancel
          </Button>
          <Button
            onClick={save}
            disabled={saving || blocked}
            title={blocked ? "A reason is required to decline" : undefined}
            className="cursor-pointer"
          >
            {saving ? "Saving…" : approve ? (
              <><CheckCircle2 className="mr-1.5 size-3.5" /> Approve</>
            ) : (
              <><AlertTriangle className="mr-1.5 size-3.5" /> Decline</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
