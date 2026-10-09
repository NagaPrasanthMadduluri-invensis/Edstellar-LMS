"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Check } from "lucide-react";

import { THEMES } from "@/lib/brand";
import { cn } from "@/lib/utils";
import Box from "@/components/ui/box";

/**
 * The VIBGYOR picker — a row of seven swatches in the top-bar account menu.
 *
 * `next-themes` persists the choice (localStorage) and applies it as
 * `data-theme` on <html>; the actual accent + background each key maps to lives
 * in globals.css. The swatch colour is the one place a raw hex is legitimate
 * (it IS the data), the same licence charts and the certificate take.
 *
 * `mounted` guards the active ring: the theme is unknown during SSR, so without
 * it the server and client would disagree about which dot is selected.
 */
export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <Box className="flex flex-wrap items-center gap-1.5">
      {THEMES.map((t) => {
        const active = mounted && theme === t.key;
        return (
          <button
            key={t.key}
            type="button"
            title={t.label}
            aria-label={`${t.label} theme`}
            aria-pressed={active}
            onClick={() => setTheme(t.key)}
            className={cn(
              "flex size-5 items-center justify-center rounded-full border border-black/10 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active && "ring-2 ring-foreground/60 ring-offset-1",
            )}
            style={{ backgroundColor: t.swatch }}
          >
            {active && <Check className="size-3 text-white" strokeWidth={3} />}
          </button>
        );
      })}
    </Box>
  );
}
