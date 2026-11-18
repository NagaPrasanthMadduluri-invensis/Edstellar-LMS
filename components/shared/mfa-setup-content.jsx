"use client";

import Link from "next/link";
import { PRODUCT_BY, PRODUCT_NAME } from "@/lib/brand";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { TwoFactorSection } from "@/components/shared/two-factor-section";

/**
 * Where an admin without two-step sign-in is held (2026-11-18). One job: set
 * it up. The same panel as My Profile, so the two flows cannot drift; once the
 * recovery codes are saved, a hard navigation to `/` re-runs every layout
 * against the new state (the same reason the consent page uses one).
 */
export function MfaSetupContent() {
  return (
    <Card className="w-full max-w-xl">
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
          Set up two-step sign-in
        </Text>
      </CardHeader>
      <CardContent className="space-y-3 px-0">
        <Text as="p" className="px-5 text-[13px] leading-relaxed text-text-2">
          Admin accounts can change who sees everyone&apos;s data, so they need a
          second step at sign-in. Choose how you want to get your code: an
          authenticator app (Google Authenticator, Microsoft Authenticator,
          1Password or similar), or a code emailed to you each time you sign in.
          It takes about a minute, and you can switch method later from My
          Profile.
        </Text>
        <TwoFactorSection onComplete={() => window.location.assign("/")} />
        <Box className="px-5 pt-1">
          <Link href="/logout" className="text-[12px] text-text-3 underline-offset-2 hover:underline">
            Sign out instead
          </Link>
        </Box>
      </CardContent>
    </Card>
  );
}
