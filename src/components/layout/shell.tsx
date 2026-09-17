import type { ReactNode } from "react";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { TripDrawer } from "@/components/trip/trip-drawer";
import { FaqChat } from "@/components/faq/faq-chat";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/types";

type ShellProps = {
  children: ReactNode;
  locale: Locale;
  copy: Dictionary["layout"];
};

export function Shell({ children, locale, copy }: ShellProps) {
  return (
    <>
      <Navbar locale={locale} copy={copy.nav} />
      {/* Bottom padding on mobile reserves space for TripDrawer's fixed
       * "Minha Viagem" trigger button — it otherwise sits on top of
       * whatever content ends up in that screen band while scrolling
       * (confirmed: covered form fields, CTAs, and badge chips at 390px). */}
      <main className="flex-1 pb-24 sm:pb-0">{children}</main>
      <Footer locale={locale} copy={copy.footer} />
      <TripDrawer locale={locale} />
      <FaqChat locale={locale} />
    </>
  );
}
