import { Inter, IBM_Plex_Mono, Fraunces } from "next/font/google";
import { PRODUCT_FULL } from "@/lib/brand";
import { ThemeProvider } from "@/components/layout/theme-provider";
import "./globals.css";

/* Three typefaces, each with one job — the Harbor pairing.
   Fraunces       — headlines and display titles (serif voice)
   Inter          — body copy, UI, supporting text
   IBM Plex Mono  — labels, eyebrows, section markers, stat numbers

   The emphasis clause inside a hero title is Fraunces ITALIC in the accent
   (`.editorial`/`em` in globals.css), matching the reference. */

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata = {
  title: PRODUCT_FULL,
  description: "Spectra LMS — a learning management system by Edstellar",
  robots: {
    index: false,
    follow: false,
  },
};

/**
 * Next injects a default viewport meta tag, but it is declared explicitly here
 * because the whole responsive layer depends on it: without
 * `width=device-width` a phone lays the page out at ~980px and then scales it
 * down, so every breakpoint below `lg` would never match and the work in the
 * shells and grids would be invisible.
 *
 * No `maximumScale` and no `userScalable: false` — pinch-zoom stays available.
 * Disabling it is an accessibility regression, and it is the usual reason a
 * "mobile-optimised" page cannot be zoomed to read a dense table.
 */
export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${plexMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      {/* suppressHydrationWarning: next-themes sets data-theme on <html> before
          hydration, so the server/client attribute differ by design. */}
      {/* No-flash for the THEME on/off toggle (theme-toggle.jsx): apply the
          persisted plain state before first paint, so an OFF viewer never sees
          the colourful scene flash in. Mirrors what next-themes does for the
          hue. Inert and tiny; failures fall back to themed. */}
      <script
        dangerouslySetInnerHTML={{
          __html:
            "try{if(localStorage.getItem('spectra-chrome')==='plain')document.documentElement.setAttribute('data-plain','')}catch(e){}",
        }}
      />
      <body className="h-full">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
