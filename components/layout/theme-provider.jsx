"use client";

import { ThemeProvider as NextThemeProvider } from "next-themes";

import { THEMES, DEFAULT_THEME } from "@/lib/brand";

/**
 * The VIBGYOR theme provider. A thin client wrapper around `next-themes` so the
 * root layout (a Server Component) can mount it.
 *
 * - `attribute="data-theme"` writes the chosen theme onto <html>, which is what
 *   the `:root[data-theme="…"]` blocks in globals.css key off.
 * - `enableSystem={false}` — these are brand themes, not a light/dark pair, so
 *   there is no OS preference to follow.
 * - `next-themes` persists the choice to localStorage and injects a no-flash
 *   script, so no hand-rolled script is needed.
 *
 * The theme list and default live in lib/brand.js (`THEMES`, `DEFAULT_THEME`)
 * beside the swatches the switcher renders, so the two cannot drift.
 */
export function ThemeProvider({ children }) {
  return (
    <NextThemeProvider
      attribute="data-theme"
      defaultTheme={DEFAULT_THEME}
      enableSystem={false}
      themes={THEMES.map((t) => t.key)}
      disableTransitionOnChange
    >
      {children}
    </NextThemeProvider>
  );
}
