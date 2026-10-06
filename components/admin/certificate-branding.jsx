"use client";

import { useEffect, useRef, useState } from "react";
import { Upload, ShieldCheck, Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { cn } from "@/lib/utils";
import {
  fetchOwnOrganization,
  updateOwnOrganization,
  uploadOrganizationLogo,
} from "@/services/api/admin/admin-api";

/**
 * What a tenant controls about the certificate its learners download.
 *
 * It sits on the Certificates page rather than in Organization Settings
 * because this is where an admin is already looking at certificates, and
 * because two of the three fields mean nothing anywhere else.
 *
 * ## The name is the ORGANISATION's name, not a certificate-only one
 *
 * There is deliberately no separate "issuer name". A second name for one
 * organization is a second thing to keep in step, and the first time they
 * disagree nobody can say which is right. The field below writes
 * `organizations.name` — the same value Organization Settings edits and the
 * same one shown across the product — and says so, because renaming the
 * company from a panel headed "certificate branding" would otherwise be a
 * surprise.
 *
 * ## The signatory is a person this organisation names
 *
 * The certificate carries one signature: a name, and the title under it
 * (0039). Left blank, the certificate is signed by the organisation itself,
 * which is what it always said — so no tenant is shown a person nobody there
 * chose. Unlike the prefix it applies to certificates ALREADY issued: it is
 * read when a certificate is opened, not frozen when it is issued, and the
 * form says so.
 *
 * ## The prefix applies to NEW certificates only
 *
 * Stated on the form, not just in a migration comment. A certificate code is
 * printed on a document somebody already holds and is exactly what the
 * public verify route takes; rewriting issued codes would invalidate every
 * certificate in circulation. An admin who expects their rebrand to sweep
 * backwards needs to hear that before they press Save, not afterwards.
 */

const PREFIX_PATTERN = /^[A-Z0-9]{2,10}$/;
const DEFAULT_PREFIX = "EDS";

/** Accepted formats, mirroring what the upload route will actually take. */
const LOGO_ACCEPT = "image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp";
const LOGO_MAX_BYTES = 5 * 1024 * 1024;

export function CertificateBranding() {
  const [org, setOrg] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  /* The edited copy. Null until the fetch lands, so the form never renders
     with empty values that would save over real ones. */
  const [form, setForm] = useState(null);

  useEffect(() => {
    fetchOwnOrganization()
      .then((d) => {
        const o = d.organization ?? d;
        setOrg(o);
        setForm({
          name: o.name ?? "",
          logo_url: o.logo_url ?? null,
          certificate_prefix: o.certificate_prefix ?? "",
          signatory_name: o.certificate_signatory_name ?? "",
          signatory_title: o.certificate_signatory_title ?? "",
        });
      })
      .catch((e) => setError(e.message));
  }, []);

  if (error) {
    return (
      <Card className="p-5">
        <Text as="p" className="text-sm text-danger">{error}</Text>
      </Card>
    );
  }

  if (!form) {
    return (
      <Card className="gap-0 py-0">
        <Box className="border-b border-line px-4 py-3">
          <Skeleton className="h-4 w-44" />
        </Box>
        <Box className="space-y-3 p-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-9 w-full" />
        </Box>
      </Card>
    );
  }

  const prefix = form.certificate_prefix.trim().toUpperCase();
  const prefixInvalid = prefix !== "" && !PREFIX_PATTERN.test(prefix);
  const nameInvalid = form.name.trim() === "";

  const dirty =
    form.name.trim() !== (org.name ?? "") ||
    (form.logo_url ?? null) !== (org.logo_url ?? null) ||
    prefix !== String(org.certificate_prefix ?? "").toUpperCase() ||
    form.signatory_name.trim() !== (org.certificate_signatory_name ?? "") ||
    form.signatory_title.trim() !== (org.certificate_signatory_title ?? "");

  // A title with nobody to hold it would print under the organisation name,
  // which reads as the company having a job title.
  const titleWithoutName = form.signatory_title.trim() !== "" && form.signatory_name.trim() === "";

  /*
   * A SAMPLE, in the real shape — `EDS-8346A2F49BD3`.
   *
   * The course and learner ids used to sit in the middle (`EDS-19-18-…`)
   * and were removed: a code is printed on a document the learner shows to
   * other people, and it published two internal row ids. The 12 random
   * characters are what keep codes unique now, so the example shows twelve
   * rather than a shorter stand-in that would misrepresent the length.
   */
  const example = `${prefix || DEFAULT_PREFIX}-8346A2F49BD3`;

  const chooseLogo = async (file) => {
    if (!file) return;
    if (file.size > LOGO_MAX_BYTES) {
      setError(`${file.name} is larger than 5 MB.`);
      return;
    }
    setError(null);
    setUploading(true);
    try {
      /*
       * Uploaded immediately rather than at Save, because the admin needs to
       * SEE it before committing — a logo is the one field here whose effect
       * cannot be predicted from what was typed. The row still only records
       * it on Save, so an abandoned panel leaves one unreferenced file, the
       * same trade the lesson document upload makes.
       */
      const { url } = await uploadOrganizationLogo({ file });
      setForm((f) => ({ ...f, logo_url: url }));
      setSaved(false);
    } catch (e) {
      setError(e?.message ?? "The logo could not be uploaded.");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const { organization } = await updateOwnOrganization({
        data: {
          name: form.name.trim(),
          logo_url: form.logo_url,
          // "" clears it back to the built-in default; the API stores null.
          certificate_prefix: prefix === "" ? null : prefix,
          // "" clears either back to "signed by the organisation".
          certificate_signatory_name: form.signatory_name.trim() || null,
          certificate_signatory_title: form.signatory_title.trim() || null,
        },
      });
      setOrg(organization);
      setForm({
        name: organization.name ?? "",
        logo_url: organization.logo_url ?? null,
        certificate_prefix: organization.certificate_prefix ?? "",
        signatory_name: organization.certificate_signatory_name ?? "",
        signatory_title: organization.certificate_signatory_title ?? "",
      });
      setSaved(true);
    } catch (e) {
      setError(e?.message ?? "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="gap-0 py-0">
      <Box className="flex items-center gap-2 border-b border-line px-4 py-3">
        <ShieldCheck className="h-4 w-4 text-accent-blue" />
        <Box className="flex-1">
          <Text as="h3" className="text-[13px] font-semibold text-ink">Certificate branding</Text>
          <Text as="p" className="text-[11px] text-text-3">
            What your learners see on the certificate they download.
          </Text>
        </Box>
      </Box>

      <Box className="grid gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Box className="space-y-4">
          {/* ── Logo ── */}
          <Box className="space-y-1.5">
            <Label>Logo</Label>
            <input
              ref={fileRef}
              type="file"
              accept={LOGO_ACCEPT}
              className="hidden"
              onChange={(e) => { chooseLogo(e.target.files?.[0]); e.target.value = ""; }}
            />
            <Box className="flex items-center gap-3">
              <Box className="flex h-14 w-32 items-center justify-center border border-line bg-surface-2 p-1.5">
                {form.logo_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element -- an
                     arbitrary tenant upload of unknown dimensions. */
                  <img src={form.logo_url} alt="" className="max-h-full max-w-full object-contain" />
                ) : (
                  <Text as="span" className="text-[10.5px] text-text-3">No logo</Text>
                )}
              </Box>
              <Box className="flex flex-col gap-1.5">
                <Button
                  size="sm" variant="outline" className="gap-1.5"
                  disabled={uploading || saving}
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload className="h-3.5 w-3.5" />
                  {uploading ? "Uploading…" : form.logo_url ? "Replace" : "Upload logo"}
                </Button>
                {form.logo_url && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => { setForm((f) => ({ ...f, logo_url: null })); setSaved(false); }}
                    className="cursor-pointer text-left text-[11px] text-accent-blue underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:text-text-3"
                  >
                    Remove, use the default mark
                  </button>
                )}
              </Box>
            </Box>
            <Text as="p" className="text-[10.5px] text-text-3">
              PNG, JPG or WebP, up to 5 MB. Shown at its own proportions, so a wide
              wordmark is not squashed. SVG is not accepted — it can carry script.
            </Text>
          </Box>

          {/* ── Name ── */}
          <Box className="space-y-1.5">
            <Label>
              Organisation name <Text as="span" className="text-danger">*</Text>
            </Label>
            <Input
              value={form.name}
              disabled={saving}
              onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); setSaved(false); }}
              placeholder="e.g. Invensis Technologies"
            />
            <Text as="p" className="text-[10.5px] text-text-3">
              This is your organisation&apos;s name everywhere in the product, not a
              certificate-only label — changing it here changes it everywhere.
            </Text>
          </Box>

          {/* ── Signatory ── */}
          <Box className="space-y-1.5">
            <Label>Signed by</Label>
            <Box className="grid gap-2 sm:grid-cols-2">
              <Input
                value={form.signatory_name}
                disabled={saving}
                maxLength={80}
                onChange={(e) => { setForm((f) => ({ ...f, signatory_name: e.target.value })); setSaved(false); }}
                placeholder="Name, e.g. Arvind Rongala"
              />
              <Input
                value={form.signatory_title}
                disabled={saving}
                maxLength={120}
                onChange={(e) => { setForm((f) => ({ ...f, signatory_title: e.target.value })); setSaved(false); }}
                placeholder="Title, e.g. Chief Executive Officer"
                className={cn(titleWithoutName && "border-danger")}
              />
            </Box>
            <Text as="p" className={cn("text-[10.5px]", titleWithoutName ? "text-danger" : "text-text-3")}>
              {titleWithoutName
                ? "Add the name this title belongs to, or clear the title."
                : "Printed as the certificate's signature. Leave blank to sign with your organisation's name. Applies to certificates already issued, too — it is read whenever one is opened."}
            </Text>
          </Box>

          {/* ── Prefix ── */}
          <Box className="space-y-1.5">
            <Label>Certificate ID prefix</Label>
            <Input
              value={form.certificate_prefix}
              disabled={saving}
              maxLength={10}
              onChange={(e) => {
                setForm((f) => ({ ...f, certificate_prefix: e.target.value.toUpperCase() }));
                setSaved(false);
              }}
              placeholder={DEFAULT_PREFIX}
              className={cn("font-mono uppercase", prefixInvalid && "border-danger")}
            />
            <Text as="p" className={cn("text-[10.5px]", prefixInvalid ? "text-danger" : "text-text-3")}>
              {prefixInvalid
                ? "2–10 letters or digits, no spaces or punctuation — the hyphen separates the parts of the code."
                : <>New certificates will read <Text as="span" className="font-mono text-ink">{example}</Text>{prefix === "" && " (the default)"}.</>}
            </Text>
            {/* The one thing an admin must hear BEFORE pressing Save. */}
            <Box className="mt-1.5 flex items-start gap-2 border border-line bg-surface-2 px-2.5 py-2">
              <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-text-3" />
              <Text as="p" className="text-[10.5px] leading-snug text-text-2">
                Certificates already issued keep the ID they were printed with. Their
                codes are on documents learners hold and are what the public
                verification check looks up, so changing this never rewrites one.
              </Text>
            </Box>
          </Box>
        </Box>

        {/* ── Live preview of the part that changes ── */}
        <Box className="space-y-1.5">
          <Label className="text-[11px] text-text-2">Preview</Label>
          <Box className="border border-line bg-white p-4">
            {/* The course design's header: the bar, then the organisation's
                logo — or its name set as a wordmark — and the kind pill. */}
            <Box style={{ height: 5, background: "linear-gradient(90deg,#1A4DA1,#3B6FD4)" }} className="-mx-4 -mt-4 mb-4" />
            <Box className="flex items-center justify-between gap-2">
              {form.logo_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={form.logo_url} alt="" style={{ maxHeight: 28, maxWidth: 130, objectFit: "contain" }} />
              ) : (
                <Text as="p" style={{ fontSize: 17, fontWeight: 800, color: "#111827", letterSpacing: "-.02em" }}>
                  {form.name.trim() || "Your organisation"}
                </Text>
              )}
              <Text
                as="span"
                style={{
                  fontSize: 7.5, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase",
                  color: "#1E4FA3", background: "#E7EDF8", padding: "3px 8px", borderRadius: 999, whiteSpace: "nowrap",
                }}
              >
                E-learning · Self-paced
              </Text>
            </Box>
            <Box className="mt-5 text-center">
              <Text as="p" style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 15, color: "#1E4FA3" }}>
                {form.signatory_name.trim() || form.name.trim() || "Your organisation"}
              </Text>
              <Box className="mx-auto my-1" style={{ width: 130, height: 2, background: "#0F172A" }} />
              {form.signatory_name.trim() && (
                <Text as="p" style={{ fontSize: 10.5, fontWeight: 700, color: "#0F172A" }}>
                  {form.signatory_name.trim()}
                </Text>
              )}
              <Text as="p" style={{ fontSize: 9.5, color: "#64748B" }}>
                {form.signatory_name.trim()
                  ? form.signatory_title.trim() || form.name.trim()
                  : "Issuing organisation"}
              </Text>
            </Box>
            <Text as="p" className="mt-4 text-center font-mono text-[9px]" style={{ color: "#94a3b8" }}>
              Certificate ID: {example}
            </Text>
          </Box>
          <Text as="p" className="text-[10.5px] text-text-3">
            The header, signature and ID line of the downloaded certificate.
          </Text>
        </Box>
      </Box>

      <Box className="flex items-center justify-end gap-3 border-t border-line px-4 py-3">
        {saved && !dirty && (
          <Text as="p" className="text-[11.5px] text-success">Saved.</Text>
        )}
        {error && <Text as="p" className="text-[11.5px] text-danger">{error}</Text>}
        <Button
          size="sm"
          disabled={!dirty || saving || uploading || prefixInvalid || nameInvalid || titleWithoutName}
          onClick={save}
          className="bg-navy text-paper hover:bg-navy-soft"
          title={
            nameInvalid ? "The organisation needs a name."
              : prefixInvalid ? "Fix the prefix before saving."
                : titleWithoutName ? "A signatory title needs a name."
                : !dirty ? "Nothing has changed." : undefined
          }
        >
          {saving ? "Saving…" : "Save branding"}
        </Button>
      </Box>
    </Card>
  );
}
