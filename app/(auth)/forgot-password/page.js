"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, MailCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Box from "@/components/ui/box";
import Text from "@/components/ui/text";
import { PRODUCT_BY, PRODUCT_NAME } from "@/lib/brand";
import { requestPasswordReset } from "@/services/api/auth";

/**
 * "I forgot my password".
 *
 * Until this existed, a learner who forgot theirs had to ask an admin to set
 * a new one and read it out — which is why TASTE §10.3.1.11 has the admin's
 * temporary-password field rendered unmasked in the first place.
 *
 * ## The screen never says whether the address has an account
 *
 * One sentence on success, and the SAME sentence when there is no such
 * user, when the account is deactivated, when the rate limit is hit and
 * when the send itself fails. The API already answers identically (§5.3
 * makes that rule for login — "or the form becomes an account-enumeration
 * oracle"), and the temptation to be more helpful lives here, in the UI:
 * "we couldn't find that email" reads like good UX and is a free membership
 * check against any address somebody cares to type.
 *
 * So the success state is deliberately phrased as a conditional — "if that
 * address has an account" — rather than "we've sent you an email", which
 * would be a claim the page cannot make truthfully.
 *
 * `"use client"` sits on the page rather than a leaf, matching
 * `(auth)/login/page.js`: this route IS the form, there is no static shell
 * worth separating, and the two pages should not disagree about their own
 * shape.
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await requestPasswordReset(email.trim());
      // The API owns this wording so the two cannot drift apart.
      setMessage(result?.message ?? "");
      setSent(true);
    } catch (err) {
      // Only a malformed address or a network failure reaches here — a
      // missing account is a 200. Anything else is genuinely our problem
      // and says so rather than implying the address was wrong.
      setError(
        err?.message ??
          "We could not reach the server. Your account is fine — try again in a moment.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle>
          <Text as="h1" className="text-2xl leading-none">
            {PRODUCT_NAME}
          </Text>
          <Text
            as="p"
            className="mt-1.5 text-[11px] font-medium uppercase tracking-[0.2em] text-text-3"
          >
            {PRODUCT_BY}
          </Text>
        </CardTitle>
        <Text as="p" className="text-muted-foreground text-sm">
          {sent ? "Check your email" : "Reset your password"}
        </Text>
      </CardHeader>

      <CardContent>
        {sent ? (
          <Box className="space-y-5">
            <Box className="flex items-start gap-3 border border-line bg-surface-2 px-3 py-3">
              <MailCheck className="mt-0.5 size-4 shrink-0 text-success" />
              <Text as="p" className="text-[13px] leading-relaxed text-text-2">
                {message}
              </Text>
            </Box>

            {/* Said here as well as in the email, because somebody who
                mistyped their address will otherwise sit waiting for a
                message that was never going anywhere. */}
            <Text as="p" className="text-[11.5px] leading-relaxed text-text-3">
              The link is good for 60 minutes and can be used once. If nothing
              arrives, check the address you typed and try again — or ask your
              administrator, who can set a password for you directly.
            </Text>

            <Button
              variant="outline"
              className="w-full cursor-pointer"
              onClick={() => {
                setSent(false);
                setMessage("");
              }}
            >
              Use a different email
            </Button>
          </Box>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Text as="p" className="text-[13px] leading-relaxed text-text-2">
              Enter the email address you sign in with and we will send you a
              link to choose a new password.
            </Text>

            <Box className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                autoFocus
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Box>

            {error && (
              <Text as="p" className="text-sm text-error">
                {error}
              </Text>
            )}

            <Button
              type="submit"
              className="w-full bg-navy hover:bg-navy-soft text-paper cursor-pointer"
              disabled={loading || !email.trim()}
            >
              {loading ? "Sending…" : "Send me a reset link"}
            </Button>
          </form>
        )}

        <Box className="mt-5 border-t border-line pt-4 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-[13px] text-accent-blue hover:underline"
          >
            <ArrowLeft className="size-3.5" />
            Back to sign in
          </Link>
        </Box>
      </CardContent>
    </Card>
  );
}
