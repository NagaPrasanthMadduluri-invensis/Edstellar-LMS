import { Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

/* Two typefaces, each with one job — the Spectra pairing.
   Inter          — headlines, display, body copy, UI, supporting text
   IBM Plex Mono  — labels, eyebrows, section markers, technical text

   There is no serif. Emphasis inside a headline is upright Inter at a
   heavier weight (the `.editorial` class in globals.css), not an italic. */

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

export const metadata = {
  title: "Edstellar LMS",
  description: "Edstellar Learning Management System",
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
      className={`${inter.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="h-full">{children}</body>
    </html>
  );
}
