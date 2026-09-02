import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

/**
 * Design system typography (boutique direction):
 *  - Inter carries all UI / body text.
 *  - Playfair Display is the display serif — page titles, KPI values,
 *    the wordmark. Used only at large sizes.
 * Both are exposed as CSS custom properties consumed by `globals.css`.
 */
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-playfair",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Depilia",
  description: "Gestión de clínica de depilación láser",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} ${playfair.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
