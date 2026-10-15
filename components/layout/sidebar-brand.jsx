"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useTheme } from "next-themes";

import { PRODUCT_NAME, THEMES } from "@/lib/brand";
import { cn } from "@/lib/utils";
import Box from "@/components/ui/box";
import Text from "@/components/ui/text";

/**
 * The sidebar's brand header: the Spectra diamond, the name, and a strip of
 * VIBGYOR theme swatches that change the theme in place.
 *
 * It sits in every portal's `SidebarHeader`. Collapsed (the default icon rail)
 * it shows the logo tile and a compact colour strip; expanded (toggled or
 * hovered) it also shows "Spectra LMS / by Edstellar". The reveal rides on the
 * same `group-data-[collapsible=icon]` the nav uses, so the name appears and
 * hides exactly as the nav labels do.
 *
 * The strip is the SAME theme picker as the top-bar account menu
 * (`theme-switcher.jsx`) — `next-themes` persists the choice and applies it as
 * `data-theme` on <html>; the swatch hex is the one place a raw colour is the
 * data (the licence charts and the certificate take). Only the seven Colour
 * themes are shown here; the Scenes stay in the fuller account-menu picker.
 */
export function SidebarBrand() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const colours = THEMES.filter((t) => t.group === "Colours");

  return (
    <Box className="flex flex-col gap-2">
      <Box className="flex items-center gap-2 overflow-hidden">
        {/* The logo tile. A light backing lifts the rainbow diamond off the
            themed chrome; it stays the same size collapsed or expanded so the
            rail does not jump when it opens. */}
        <Box className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/90 p-0.5 shadow-sm ring-1 ring-black/5">
          <Image
            src="/brand/spectra-logo.png"
            alt="Spectra LMS"
            width={28}
            height={28}
            className="object-contain"
            priority
          />
        </Box>
        {/* Name + byline, hidden on the icon rail and revealed on expand. */}
        <Box className="flex min-w-0 flex-col leading-none group-data-[collapsible=icon]:hidden">
          <Text as="span" className="truncate font-mono text-sm font-semibold tracking-tight text-sidebar-foreground">
            {PRODUCT_NAME}
          </Text>
          <Text as="span" className="truncate text-[10px] font-medium text-sidebar-foreground/60">
            by Edstellar
          </Text>
        </Box>
      </Box>

      {/* Theme strip. One continuous segmented bar; the active theme is boxed
          in white. Clickable in both states — on the narrow rail the segments
          are small, but hovering expands the rail and makes them easy to hit. */}
      <Box
        role="group"
        aria-label="Theme"
        className="flex h-2.5 w-full items-stretch gap-px"
      >
        {colours.map((t, i) => {
          const active = mounted && theme === t.key;
          return (
            <button
              key={t.key}
              type="button"
              title={`${t.label} theme`}
              aria-label={`${t.label} theme`}
              aria-pressed={active}
              onClick={() => setTheme(t.key)}
              className={cn(
                "h-full flex-1 cursor-pointer transition-transform hover:scale-y-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                i === 0 && "rounded-l-full",
                i === colours.length - 1 && "rounded-r-full",
                active && "z-10 rounded-[3px] outline outline-2 outline-white",
              )}
              style={{ background: t.swatch }}
            />
          );
        })}
      </Box>
    </Box>
  );
}
