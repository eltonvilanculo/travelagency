import { Suspense } from "react";
import type { Metadata } from "next";
import { Shell } from "@/components/layout/shell";
import { BookingWithCatalog } from "@/components/sections/booking-with-catalog";
import type { BookingInitialValues } from "@/components/sections/booking";
import { Payment } from "@/components/sections/payment";
import { BookingFormSkeleton } from "@/components/ui/skeleton";
import { getLocalizedDictionary } from "@/i18n/server";

// The booking form's hotel/car/package pickers read live catalog data.
export const dynamic = "force-dynamic";

type LocalePageProps = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{
    type?: string;
    id?: string;
    from?: string;
    to?: string;
    date?: string;
    dateTo?: string;
    passengers?: string;
    rooms?: string;
  }>;
};

export async function generateMetadata({ params }: LocalePageProps): Promise<Metadata> {
  const { lang } = await params;
  const { dict } = getLocalizedDictionary(lang);

  return dict.metadata.book;
}

const VALID_TABS = new Set(["flight", "hotel", "car", "package", "service"]);

export default async function BookPage({ params, searchParams }: LocalePageProps) {
  const { lang } = await params;
  const query = await searchParams;
  const { locale, dict } = getLocalizedDictionary(lang);
  const page = dict.pages.book;

  const initial: BookingInitialValues | undefined = query.type && VALID_TABS.has(query.type)
    ? {
        tab: query.type as BookingInitialValues["tab"],
        itemId: query.id,
        from: query.from,
        to: query.to,
        date: query.date,
        dateTo: query.dateTo,
        passengers: query.passengers ? Number(query.passengers) || undefined : undefined,
        rooms: query.rooms ? Number(query.rooms) || undefined : undefined,
      }
    : undefined;

  return (
    <Shell locale={locale} copy={dict.layout}>
      <div className="bg-leafy px-7 lg:px-28 pt-36 pb-14">
        <p className="text-orange text-xs uppercase tracking-[0.25em] font-semibold mb-3">{page.slogan}</p>
        <h1 className="text-4xl md:text-6xl text-white leading-tight">
          {page.title} <span className="italic">{page.titleAccent}</span>
        </h1>
        <p className="text-white/60 mt-4 max-w-xl text-lg">
          {page.description}
        </p>
      </div>
      <Suspense fallback={<BookingFormSkeleton />}>
        <BookingWithCatalog locale={locale} copy={dict.sections.booking} initial={initial} />
      </Suspense>
      <Payment copy={dict.sections.payment} />
    </Shell>
  );
}
