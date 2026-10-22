"use client";

import { useState } from "react";
import { PRODUCT_BY, PRODUCT_NAME } from "@/lib/brand";
import { CURRENT_PRIVACY_VERSION } from "@/lib/consent";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { recordConsent } from "@/services/api/auth";

/**
 * Privacy notice + acceptance.
 *
 * The copy is placeholder wording until legal supplies the real notice. On
 * acceptance the API clears `consent_required`, then a hard navigation to `/`
 * re-runs every layout against the new state (and `/` routes by role) — the
 * same reason login uses `window.location.assign`.
 */
export function ConsentContent() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const accept = async () => {
    setError("");
    setLoading(true);
    try {
      await recordConsent();
      window.location.assign("/");
    } catch (err) {
      setError(err.message || "Could not record your consent. Please try again.");
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader className="text-center">
        <CardTitle>
          <Text as="h1" className="text-2xl leading-none">{PRODUCT_NAME}</Text>
          <Text
            as="p"
            className="mt-1.5 text-[11px] font-medium uppercase tracking-[0.2em] text-text-3"
          >
            {PRODUCT_BY}
          </Text>
        </CardTitle>
        <Text as="p" className="text-sm text-muted-foreground">
          Privacy notice
        </Text>
      </CardHeader>
      <CardContent className="space-y-4">
        <Box className="max-h-[50vh] space-y-3 overflow-y-auto border border-line bg-surface-2 px-4 py-3">
          <Text as="p" className="text-[13px] font-semibold text-ink">
            What we collect
          </Text>
          <Text as="p" className="text-[13px] leading-relaxed text-text-2">
            To run your learning account we store your name, work email,
            department, job role and location, along with your course
            enrolments, lesson and assessment progress, certificates and the
            time you spend learning. We also keep sign-in and security records.
          </Text>
          <Text as="p" className="text-[13px] font-semibold text-ink">
            How it is used
          </Text>
          <Text as="p" className="text-[13px] leading-relaxed text-text-2">
            This information is used to deliver training, report progress to
            your organization&apos;s administrators and managers, issue
            certificates, and keep the service secure. It is not sold.
          </Text>
          <Text as="p" className="text-[13px] font-semibold text-ink">
            Your rights
          </Text>
          <Text as="p" className="text-[13px] leading-relaxed text-text-2">
            You may ask to access or correct the personal data we hold about
            you, and to withdraw consent or request deletion, by contacting
            your organization&apos;s administrator. Withdrawing consent may
            mean you can no longer use the service.
          </Text>
          <Text as="p" className="text-[11px] text-text-3">
            Notice version {CURRENT_PRIVACY_VERSION}. Placeholder wording
            pending final legal review.
          </Text>
        </Box>

        {error && <Text as="p" className="text-sm text-error">{error}</Text>}

        <Button
          onClick={accept}
          disabled={loading}
          className="w-full bg-navy hover:bg-navy-soft text-paper"
        >
          {loading ? "Saving..." : "I accept"}
        </Button>
      </CardContent>
    </Card>
  );
}
