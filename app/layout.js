import { Sora, Cormorant_Garamond, DM_Sans, DM_Mono } from "next/font/google";
import "./globals.css";

/* Four typefaces, each with one job. Nothing else is loaded.
   Sora      — headlines and display
   Cormorant — selective editorial emphasis inside headlines (italic only)
   DM Sans   — body copy, UI, supporting text
   DM Mono   — labels, eyebrows, section markers, technical text */

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["italic"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
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
      className={`${sora.variable} ${cormorant.variable} ${dmSans.variable} ${dmMono.variable} h-full antialiased`}
    >
      <body className="h-full">{children}</body>
    </html>
  );
}
