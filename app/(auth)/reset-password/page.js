"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Eye, EyeOff, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import Box from "@/components/ui/box";
import Text from "@/components/ui/text";
import { PRODUCT_BY, PRODUCT_NAME } from "@/lib/brand";
import { checkResetToken, resetPassword } from "@/services/api/auth";

/**
 * Choose a new password, from the link in the email.
 *
 * ## The link is checked BEFORE the form is offered
 *
 * An expired link discovered after somebody has typed a password twice is a
 * wasted effort and an avoidable one: the check is a single cheap request
 * and the answer is known before the first keystroke. The three refusals
 * are three different sentences, because the useful next step differs —
 * ask again, ask again, or go and sign in with the password you already
 * changed.
 *
 * ## The rules are shown, not just enforced
 *
 * The same four the API checks, lit up live. A flat "does not meet
 * requirements" after submission leaves somebody guessing which one —
 * which is exactly why `changePassword` reports them field by field, and
 * this screen is the other half of that decision.
 */

const RULES = [
  { key: "minLength", label: "At least 8 characters", test: (v) => v.length >= 8 },
  { key: "uppercase", label: "One uppercase letter", test: (v) => /[A-Z]/.test(v) },
  { key: "number", label: "One number", test: (v) => /[0-9]/.test(v) },
  {
    key: "special",
    label: "One special character",
    test: (v) => /[^A-Za-z0-9]/.test(v),
  },
];

/** What each refusal means, and what to do about it. */
const REFUSALS = {
  not_found: {
    title: "This link is not valid",
    body:
      "It may have been altered in transit, or copied incompletely. Ask for a new one and open it directly from the email.",
  },
  used: {
    title: "This link has already been used",
    body:
      "A reset link works once. If you have already set a new password, sign in with it. If not, ask for another link.",
  },
  expired: {
    title: "This link has expired",
    body:
      "Reset links are good for 60 minutes, which keeps an old email in an inbox from staying a way into the account. Ask for a new one.",
  },
};

function ResetForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") ?? "";

  const [state, setState] = useState("checking");
  const [reason, setReason] = useState("not_found");
  // "welcome" (a first password, from the welcome email) or "reset".
  const [purpose, setPurpose] = useState("reset");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) {
      setState("invalid");
      setReason("not_found");
      return;
    }
    let cancelled = false;
    checkResetToken(token)
      .then((result) => {
        if (cancelled) return;
        if (result?.valid) {
          if (result.purpose) setPurpose(result.purpose);
          setState("ready");
        } else {
          setReason(result?.reason ?? "not_found");
          setState("invalid");
        }
      })
      .catch(() => {
        if (!cancelled) setState("unreachable");
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const passed = RULES.filter((r) => r.test(password));
  const allPassed = passed.length === RULES.length;
  const matches = password.length > 0 && password === confirm;

  // Named so the button can say WHY it is off, rather than being a dead
  // control the reader has to work out (§10.3.1.2).
  const blockedReason = !allPassed
    ? "Meet all four requirements to continue."
    : !matches
      ? "The two passwords do not match."
      : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await resetPassword({ token, newPassword: password });
      setState("done");
    } catch (err) {
      setError(err?.message ?? "We could not change your password.");
      // A used or expired token can only be discovered here if the link
      // aged out while the form was open. Swap to the refusal screen
      // rather than leaving a form that will never submit.
      if (/already been used|expired|not valid/i.test(err?.message ?? "")) {
        setReason(/expired/i.test(err.message) ? "expired" : "used");
        setState("invalid");
      }
    } finally {
      setSaving(false);
    }
  };

  if (state === "checking") {
    return (
      <Box className="space-y-3">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </Box>
    );
  }

  if (state === "unreachable") {
    return (
      <Box className="space-y-4">
        <Box className="border border-error/30 bg-error/[0.06] px-3 py-3">
          <Text as="p" className="text-[13px] leading-relaxed text-error">
            We could not reach the server to check this link. Your account is
            fine — this is a problem on our side. Try again in a moment.
          </Text>
        </Box>
        <Button
          variant="outline"
          className="w-full cursor-pointer"
          onClick={() => router.refresh()}
        >
          Try again
        </Button>
      </Box>
    );
  }

  if (state === "invalid") {
    const copy = REFUSALS[reason] ?? REFUSALS.not_found;
    return (
      <Box className="space-y-4">
        <Box className="border-l-[3px] border-warning bg-warning/[0.08] px-3 py-3">
          <Text as="p" className="text-[13px] font-semibold text-ink">
            {copy.title}
          </Text>
          <Text as="p" className="mt-1 text-[12.5px] leading-relaxed text-text-2">
            {copy.body}
          </Text>
        </Box>
        <Button
          asChild
          className="w-full bg-navy hover:bg-navy-soft text-paper cursor-pointer"
        >
          <Link href="/forgot-password">Send me a new link</Link>
        </Button>
      </Box>
    );
  }

  if (state === "done") {
    return (
      <Box className="space-y-4">
        <Box className="border-l-[3px] border-success bg-success/[0.08] px-3 py-3">
          <Text as="p" className="text-[13px] font-semibold text-ink">
            {purpose === "welcome" ? "Your password is set" : "Your password has been changed"}
          </Text>
          {/* For a RESET, said explicitly: somebody who reset a password they
              believed was compromised needs to know the other sessions are
              gone. For a WELCOME there were none — telling a new user their
              sessions were ended reads as something having gone wrong. */}
          <Text as="p" className="mt-1 text-[12.5px] leading-relaxed text-text-2">
            {purpose === "welcome"
              ? "Your account is ready. Sign in with your email address and the password you just chose."
              : "Every signed-in session has been ended, on every device. Sign in again with your new password."}
          </Text>
        </Box>
        <Button
          asChild
          className="w-full bg-navy hover:bg-navy-soft text-paper cursor-pointer"
        >
          <Link href="/login">Go to sign in</Link>
        </Button>
      </Box>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Box className="space-y-2">
        <Label htmlFor="new-password">New password</Label>
        <Box className="relative">
          <Input
            id="new-password"
            type={show ? "text" : "password"}
            autoComplete="new-password"
            autoFocus
            className="pr-9"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            title={show ? "Hide password" : "Show password"}
            aria-label={show ? "Hide password" : "Show password"}
            className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer p-1 text-text-3 hover:text-ink"
          >
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </Box>
      </Box>

      {/* Weight and colour, not colour alone: a tick that only differs by
          hue is invisible to a reader who cannot separate the two. */}
      <Box className="grid grid-cols-1 gap-1 sm:grid-cols-2">
        {RULES.map((rule) => {
          const ok = rule.test(password);
          return (
            <Box key={rule.key} className="flex items-center gap-1.5">
              {ok ? (
                <Check className="size-3.5 shrink-0 text-success" />
              ) : (
                <X className="size-3.5 shrink-0 text-text-3" />
              )}
              <Text
                as="span"
                className={`text-[11.5px] ${ok ? "font-medium text-success" : "text-text-3"}`}
              >
                {rule.label}
              </Text>
            </Box>
          );
        })}
      </Box>

      <Box className="space-y-2">
        <Label htmlFor="confirm-password">Confirm new password</Label>
        <Input
          id="confirm-password"
          type={show ? "text" : "password"}
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
        {confirm.length > 0 && !matches && (
          <Text as="p" className="text-[11px] text-error">
            The two passwords do not match.
          </Text>
        )}
      </Box>

      {error && (
        <Text as="p" className="text-sm text-error">
          {error}
        </Text>
      )}

      {blockedReason && (
        <Text as="p" className="text-[11.5px] text-text-3">
          {blockedReason}
        </Text>
      )}

      <Button
        type="submit"
        className="w-full bg-navy hover:bg-navy-soft text-paper cursor-pointer"
        disabled={saving || Boolean(blockedReason)}
        title={blockedReason ?? undefined}
      >
        {saving ? "Saving…" : "Set my new password"}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
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
          Choose your password
        </Text>
      </CardHeader>
      <CardContent>
        {/* `useSearchParams()` opts the route out of static prerendering
            unless it sits behind a boundary — the same build failure
            `(auth)/login/page.js` documents for its session notice. */}
        <Suspense fallback={<Skeleton className="h-40 w-full" />}>
          <ResetForm />
        </Suspense>
      </CardContent>
    </Card>
  );
}
