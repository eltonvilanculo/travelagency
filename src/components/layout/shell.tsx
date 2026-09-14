import type { ReactNode } from "react";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { TripDrawer } from "@/components/trip/trip-drawer";
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
      <main className="flex-1">{children}</main>
      <Footer locale={locale} copy={copy.footer} />
      <TripDrawer locale={locale} />
    </>
  );
}
