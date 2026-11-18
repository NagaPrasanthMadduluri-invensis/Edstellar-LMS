"use client";

import { useEffect, useState } from "react";
import { Copy, Download, Mail, ShieldCheck, Smartphone } from "lucide-react";

import Box from "@/components/ui/box";
import Text from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  disableMfa,
  emailMfaCode,
  enableMfa,
  fetchMfaStatus,
  setupMfa,
} from "@/services/api/auth";

/**
 * Two-step sign-in, for every role (2026-11-18): MANDATORY for admin
 * accounts, optional for everyone else. Each person chooses the method: an
 * authenticator app, or a code emailed at each sign-in (0069). Recovery codes
 * work with either.
 *
 * Used in two places with one flow so they cannot drift: the My Profile
 * dialog, and the /mfa-setup page an admin is held at until it is on. The
 * API says whether it is `required`; the panel only hides "Turn off" on that,
 * and the API refuses the disable regardless. `onComplete` runs once the
 * recovery codes are saved, which is how the setup page moves on.
 *
 * Switching method runs the new method's setup while the current one stays
 * active; the API swaps them only when the new code is confirmed.
 */
const METHOD_LABEL = { totp: "Authenticator app", email: "Email code" };
export function TwoFactorSection({ onComplete } = {}) {
  const [status, setStatus] = useState(null);
  const [failed, setFailed] = useState(false);
  const [step, setStep] = useState("idle"); // idle | setup | codes | disable
  const [setup, setSetup] = useState(null);
  const [code, setCode] = useState("");
  const [codes, setCodes] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    let alive = true;
    fetchMfaStatus()
      .then((d) => alive && setStatus(d))
      .catch(() => alive && setFailed(true));
    return () => { alive = false; };
  }, []);

  // Secondary panel: a failed fetch renders nothing, like EmailPreferences.
  // On the mandatory setup page there is nowhere else to go, so say so.
  if (failed) {
    return onComplete ? (
      <Box className="px-5 py-4">
        <Text as="p" className="text-sm text-danger">
          Could not load two-step sign-in. Refresh the page to try again.
        </Text>
      </Box>
    ) : null;
  }

  if (!status) {
    return (
      <Box className="border-t border-line px-5 py-4">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="mt-3 h-8 w-full" />
      </Box>
    );
  }

  const reset = () => {
    setStep("idle");
    setSetup(null);
    setCode("");
    setError(null);
    setNotice(null);
  };

  const run = async (fn) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await fn();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const start = (method) =>
    run(async () => {
      setSetup(await setupMfa({ method }));
      setCode("");
      setStep("setup");
    });

  const resendSetup = () =>
    run(async () => {
      setSetup(await setupMfa({ method: "email" }));
      setNotice("A new code is on its way.");
    });

  const sendDisableCode = () =>
    run(async () => {
      const d = await emailMfaCode();
      setNotice(`We emailed a code to ${d.sent_to}.`);
    });

  const enable = () =>
    run(async () => {
      const d = await enableMfa({ code: code.trim() });
      setCodes(d.recoveryCodes ?? []);
      setStatus((prev) => ({ ...prev, enrolled: true, enabled: true, method: d.method, pending_method: null }));
      setCode("");
      setSetup(null);
      setStep("codes");
    });

  const disable = () =>
    run(async () => {
      await disableMfa({ code: code.trim() });
      setStatus((prev) => ({ ...prev, enrolled: false, enabled: false, method: null }));
      reset();
    });

  const copyCodes = () => navigator.clipboard?.writeText(codes.join("\n"));

  const downloadCodes = () => {
    const url = URL.createObjectURL(
      new Blob([codes.join("\n") + "\n"], { type: "text/plain" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "recovery-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const enabled = status.enabled;
  // Admins cannot turn it off (mandatory since 2026-11-18); the API refuses too.
  const required = status.required === true;
  const available = status.methods_available ?? { totp: true, email: false };
  const methods = ["totp", "email"].filter((m) => available[m]);
  const other = methods.find((m) => m !== status.method);

  const methodButtons = (
    <Box className="flex flex-wrap gap-2">
      {methods.map((m) => (
        <Button
          key={m}
          size="sm"
          variant="outline"
          onClick={() => start(m)}
          disabled={busy}
          className="gap-1.5"
        >
          {m === "totp" ? <Smartphone className="size-3.5" /> : <Mail className="size-3.5" />}
          {METHOD_LABEL[m]}
        </Button>
      ))}
    </Box>
  );

  return (
    <Box className="border-t border-line px-5 py-4">
      <Text as="p" className="mb-1 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-text-3">
        Two-step sign-in
      </Text>

      {status.configured === false ? (
        <Text as="p" className="text-[11.5px] leading-relaxed text-text-3">
          Two-step sign-in is not available on this server.
        </Text>
      ) : step === "codes" ? (
        <Box className="space-y-2.5">
          <Box className="border border-warning/30 bg-warning/10 px-3 py-2">
            <Text as="p" className="text-[12.5px] font-semibold text-ink">
              Save these recovery codes now.
            </Text>
            <Text as="p" className="text-[11.5px] leading-relaxed text-text-2">
              They are shown only once. Each works once if you lose access to
              your authenticator app or email.
            </Text>
          </Box>
          <Box className="grid grid-cols-2 gap-px border border-line bg-line">
            {codes.map((c) => (
              <Text key={c} as="p" className="bg-surface px-3 py-1.5 font-mono text-[12.5px] text-ink">
                {c}
              </Text>
            ))}
          </Box>
          <Box className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={copyCodes} className="gap-1.5">
              <Copy className="size-3.5" />Copy
            </Button>
            <Button variant="outline" size="sm" onClick={downloadCodes} className="gap-1.5">
              <Download className="size-3.5" />Download
            </Button>
            <Button
              size="sm"
              onClick={() => { setCodes([]); reset(); onComplete?.(); }}
              className="rounded-none bg-navy text-accent-soft hover:bg-accent-blue hover:text-white"
            >
              I have saved them
            </Button>
          </Box>
        </Box>
      ) : step === "setup" && setup ? (
        <Box className="space-y-3">
          {setup.method === "email" ? (
            <Box className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <Text as="p" className="text-[11.5px] leading-relaxed text-text-3">
                We emailed a 6-digit code to {setup.sentTo}. Enter it below. It
                expires in 10 minutes.
              </Text>
              <Button variant="link" size="sm" onClick={resendSetup} disabled={busy} className="h-auto p-0 text-[11.5px]">
                Send again
              </Button>
            </Box>
          ) : (
          <>
          <Text as="p" className="text-[11.5px] leading-relaxed text-text-3">
            Scan this QR code with an authenticator app, then enter the 6-digit
            code it shows.
          </Text>
          <Box className="flex flex-wrap items-center gap-4">
            {/* A data: URL generated by the API, which next/image cannot
                optimise; a plain img is the correct element here. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={setup.qrDataUrl} alt="Authenticator QR code" className="size-36 border border-line bg-white" />
            <Box className="min-w-0">
              <Text as="p" className="text-[11px] text-text-3">Or enter this key manually</Text>
              <Text as="p" className="mt-0.5 break-all font-mono text-[12.5px] text-ink">
                {setup.secret}
              </Text>
            </Box>
          </Box>
          </>
          )}
          <Box className="max-w-[200px] space-y-1.5">
            <Label htmlFor="mfa-enable-code">6-digit code</Label>
            <Input
              id="mfa-enable-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </Box>
          <Box className="flex gap-2">
            <Button variant="outline" size="sm" onClick={reset} disabled={busy}>Cancel</Button>
            <Button
              size="sm"
              onClick={enable}
              disabled={busy || code.trim().length < 6}
              className="rounded-none bg-navy text-accent-soft hover:bg-accent-blue hover:text-white"
            >
              {busy ? "Confirming…" : status.enabled ? "Switch" : "Enable"}
            </Button>
          </Box>
        </Box>
      ) : step === "disable" ? (
        <Box className="space-y-3">
          <Text as="p" className="text-[11.5px] leading-relaxed text-text-3">
            {status.method === "email"
              ? "Enter a code we email you (or a recovery code) to turn two-step sign-in off."
              : "Enter a code from your authenticator app (or a recovery code) to turn two-step sign-in off."}
          </Text>
          {status.method === "email" && (
            <Button variant="outline" size="sm" onClick={sendDisableCode} disabled={busy} className="gap-1.5">
              <Mail className="size-3.5" />Email me a code
            </Button>
          )}
          <Box className="max-w-[200px] space-y-1.5">
            <Label htmlFor="mfa-disable-code">Code</Label>
            <Input
              id="mfa-disable-code"
              autoComplete="one-time-code"
              maxLength={16}
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </Box>
          <Box className="flex gap-2">
            <Button variant="outline" size="sm" onClick={reset} disabled={busy}>Cancel</Button>
            <Button
              size="sm"
              variant="outline"
              onClick={disable}
              disabled={busy || !code.trim()}
              className="text-danger hover:text-danger"
            >
              {busy ? "Disabling…" : "Turn off"}
            </Button>
          </Box>
        </Box>
      ) : enabled ? (
        <Box className="flex flex-wrap items-center justify-between gap-2">
          <Box>
            <Text as="p" className="flex items-center gap-1.5 text-[12.5px] font-semibold text-ink">
              <ShieldCheck className="size-4 text-success" />
              On · {METHOD_LABEL[status.method] ?? "Authenticator app"}
            </Text>
            {required && (
              <Text as="p" className="mt-0.5 text-[11px] text-text-3">Required for admin accounts</Text>
            )}
          </Box>
          <Box className="flex flex-wrap gap-2">
            {other && (
              <Button variant="outline" size="sm" onClick={() => start(other)} disabled={busy}>
                Switch to {METHOD_LABEL[other].toLowerCase()}
              </Button>
            )}
            {!required && (
              <Button variant="outline" size="sm" onClick={() => setStep("disable")}>
                Turn off
              </Button>
            )}
          </Box>
        </Box>
      ) : (
        <Box className="space-y-2.5">
          <Text as="p" className="text-[11.5px] leading-relaxed text-text-3">
            {required
              ? "Required for admin accounts. Choose how you want to receive your sign-in code."
              : "Optional: add a second step to your sign-in. Choose how you want to receive the code."}
          </Text>
          {methodButtons}
        </Box>
      )}

      {notice && !error && (
        <Text as="p" className="mt-2 text-[11.5px] text-success">{notice}</Text>
      )}
      {error && (
        <Box className="mt-2 border border-danger/30 bg-danger/10 px-3 py-2">
          <Text as="p" className="text-[12.5px] text-danger">{error}</Text>
        </Box>
      )}
    </Box>
  );
}

