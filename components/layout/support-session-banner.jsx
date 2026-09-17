"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, ShieldAlert } from "lucide-react";

import Box from "@/components/ui/box";
import Text from "@/components/ui/text";
import { exitSupportSession } from "@/services/api/platform/platform-api";

/**
 * "You are inside somebody else's account."
 *
 * The one genuinely dangerous outcome of the support-session feature is a
 * platform admin forgetting whose tenant they are in and making a change in
 * the wrong one. Everything about this bar is chosen against that:
 *
 *   * it is the FIRST element in the shell and sticky, so it cannot be
 *     scrolled away from or hidden behind a dialog's backdrop;
 *   * it names the organization, not just the state — "you are impersonating"
 *     answers the wrong question;
 *   * `danger` is correct here under §10.1 rather than an exception to it.
 *     This is not emphasis; acting on the wrong tenant's data IS the failure,
 *     and the bar is the only thing standing between the admin and it;
 *   * it is not dismissible. A banner you can close is a banner that is closed
 *     exactly when it matters.
 *
 * The rest of the shell is deliberately untouched — the tenant's own sidebar,
 * their own data, their own permissions — because the point of the session is
 * to see what they see.
 */
export function SupportSessionBanner({ session }) {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState(null);

  if (!session) return null;

  async function leave() {
    setLeaving(true);
    setError(null);
    try {
      await exitSupportSession();
      // A hard navigation, not `router.push`. The cookie changed underneath
      // the app, and every cached RSC payload on the client still belongs to
      // the tenant — a soft navigation would render the platform console from
      // the tenant's session data.
      window.location.href = "/platform/tenants";
    } catch (e) {
      setError(e.message);
      setLeaving(false);
    }
  }

  return (
    <Box className="sticky top-0 z-50 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-danger bg-danger px-4 py-2 text-white">
      <ShieldAlert className="size-4 shrink-0" />
      <Text as="p" className="min-w-0 flex-1 text-[12.5px] leading-snug text-white">
        Support session — you are signed in to{" "}
        {/* `text-white` restated: Text's default ink colour wins over the
            parent's otherwise, and the tenant name — the one word on this bar
            that must be legible — came out muddy against the red. */}
        <Text as="span" className="font-bold text-white">
          {session.organizationName}
        </Text>
        {". "}
        <Text as="span" className="text-white/80">
          Anything you change here is their live data, and their activity log
          records that {session.byName} opened this session.
        </Text>
      </Text>

      {error && (
        <Text as="span" className="text-[11.5px] font-semibold text-white">
          {error}
        </Text>
      )}

      <button
        type="button"
        onClick={leave}
        disabled={leaving}
        className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 border border-white/70 px-2.5 py-1 text-[11.5px] font-bold text-white transition-colors hover:bg-white hover:text-danger disabled:cursor-wait disabled:opacity-70"
      >
        <LogOut className="size-3.5" />
        {leaving ? "Leaving…" : "Exit to platform"}
      </button>
    </Box>
  );
}
