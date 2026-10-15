"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import Text from "@/components/ui/text";

/**
 * The top-bar THEME on/off switch.
 *
 * ON (the default) is the colourful scene — the body mesh and the themed chrome
 * gradient, today's look. OFF drops to a neutral/plain surface by setting
 * `data-plain` on <html>, which globals.css keys off to remove the gradients.
 * The choice persists in localStorage; the inline script in `app/layout.js`
 * applies it before first paint so there is no themed flash for an OFF viewer.
 *
 * It is SEPARATE from the sidebar colour strip: the strip picks WHICH hue
 * (next-themes, `data-theme`), this toggles WHETHER the colourful scene shows at
 * all. The two are orthogonal, so flipping back ON restores the chosen hue.
 */
const STORAGE_KEY = "spectra-chrome";

function applyPlain(plain) {
  const el = document.documentElement;
  if (plain) el.setAttribute("data-plain", "");
  else el.removeAttribute("data-plain");
}

export function ThemeToggle({ className }) {
  const [plain, setPlain] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      setPlain(localStorage.getItem(STORAGE_KEY) === "plain");
    } catch {
      /* private mode / blocked storage — stay themed */
    }
  }, []);

  function toggle() {
    const next = !plain;
    setPlain(next);
    applyPlain(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "plain" : "themed");
    } catch {
      /* ignore */
    }
  }

  // "on" means themed. Before mount the server-rendered default is themed, so
  // render it on to match and avoid a hydration mismatch on the switch.
  const on = mounted ? !plain : true;

  return (
    <button
      type="button"
      onClick={toggle}
      role="switch"
      aria-checked={on}
      aria-label="Colourful theme"
      title={on ? "Theme on — tap for plain" : "Theme off — tap for colour"}
      className={cn(
        "flex items-center gap-2 rounded-full px-1 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <Text
        as="span"
        className="hidden font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground sm:inline"
      >
        Theme
      </Text>
      <span
        className={cn(
          "relative inline-block h-[19px] w-[34px] shrink-0 rounded-full border transition-colors",
          on ? "border-transparent bg-[var(--spectra-accent)]" : "border-border bg-muted",
        )}
      >
        <span
          className={cn(
            "absolute top-[1px] size-[15px] rounded-full bg-white shadow transition-[left]",
            on ? "left-[16px]" : "left-[1px]",
          )}
        />
      </span>
    </button>
  );
}
