import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter, Playfair_Display } from "next/font/google";
import { locales } from "@/i18n/config";
import { getLocalizedDictionary } from "@/i18n/server";
import { PublicProviders } from "./providers";
import "../globals.css";

// Playfair Display (headings) + Inter (body) — the pairing luxury/safari
// travel sites are actually built on: a warm editorial serif for
// character, a clean modern sans for legibility. This project's own
// earlier run had a THIRD, unused font (Raleway) loaded alongside these
// two, which is what actually looked mismatched — the fix there was
// dropping the dead one, not flattening headings and body to the same
// generic system sans (Lucida Sans Unicode), which is what "looks vibe
// coded": no typographic hierarchy, no personality.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair-display",
  style: ["normal", "italic"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

type LocaleParams = {
  params: Promise<{ lang: string }>;
};

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { lang } = await params;
  const { dict } = getLocalizedDictionary(lang);

  return dict.metadata.root;
}

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: ReactNode;
  params: Promise<{ lang: string }>;
}>) {
  const { lang } = await params;
  const { locale } = getLocalizedDictionary(lang);

  return (
    <html lang={locale}>
      <body className={`${inter.variable} ${playfairDisplay.variable} overflow-x-hidden`}>
        <PublicProviders>{children}</PublicProviders>
      </body>
    </html>
  );
}
