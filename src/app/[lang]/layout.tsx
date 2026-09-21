import type { Metadata } from "next";
import type { ReactNode } from "react";
import { locales } from "@/i18n/config";
import { getLocalizedDictionary } from "@/i18n/server";
import { PublicProviders } from "./providers";
import "../globals.css";

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
      <body className="overflow-x-hidden">
        <PublicProviders>{children}</PublicProviders>
      </body>
    </html>
  );
}
