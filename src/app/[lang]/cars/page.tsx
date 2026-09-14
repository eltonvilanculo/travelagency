import { Suspense } from "react";
import type { Metadata } from "next";
import { Shell } from "@/components/layout/shell";
import { BookingWithCatalog } from "@/components/sections/booking-with-catalog";
import type { BookingInitialValues } from "@/components/sections/booking";
import { Cars, type CarCard } from "@/components/sections/cars";
import { SectionSkeleton, BookingFormSkeleton } from "@/components/ui/skeleton";
import { getLocalizedDictionary } from "@/i18n/server";
import { VehicleService } from "@/lib/data-access/vehicles";
import type { Dictionary } from "@/i18n/types";
import type { Locale } from "@/i18n/config";

// Reads live catalog data — must not be statically prerendered at build
// time (see the identical note on the destinations page).
export const dynamic = "force-dynamic";

type LocalePageProps = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ pickupDate?: string; returnDate?: string }>;
};

export async function generateMetadata({ params }: LocalePageProps): Promise<Metadata> {
  const { lang } = await params;
  const { dict } = getLocalizedDictionary(lang);

  return dict.metadata.cars;
}

async function CarsSection({
  locale,
  copy,
  bookingDates,
}: {
  locale: Locale;
  copy: Dictionary["sections"]["cars"];
  bookingDates: { pickupDate?: string; returnDate?: string };
}) {
  const vehicles = await VehicleService.findAll({ status: "PUBLISHED" });
  const carCards: CarCard[] = vehicles.map((v) => ({
    id: v.id,
    category: v.category,
    brand: v.model,
    type: v.type || v.category,
    seats: v.seats,
    luggage: v.luggage ?? 0,
    transmission: v.transmission || "Manual",
    pricePerDay: Number(v.pricePerDay),
    currency: v.currency,
    image: v.images[0] || "/images/safari1.jpg",
  }));

  if (carCards.length === 0) return null;
  return <Cars locale={locale} copy={copy} cars={carCards} bookingDates={bookingDates} />;
}

export default async function CarsPage({ params, searchParams }: LocalePageProps) {
  const { lang } = await params;
  const { pickupDate, returnDate } = await searchParams;
  const { locale, dict } = getLocalizedDictionary(lang);
  const page = dict.pages.cars;

  const initial: BookingInitialValues | undefined = pickupDate || returnDate
    ? { tab: "car", date: pickupDate, dateTo: returnDate }
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
      <Suspense
        fallback={
          <SectionSkeleton
            eyebrow={dict.sections.cars.eyebrow}
            title={dict.sections.cars.title}
            titleAccent={dict.sections.cars.titleAccent}
            description={dict.sections.cars.description}
            bgClassName="bg-beige"
          />
        }
      >
        <CarsSection locale={locale} copy={dict.sections.cars} bookingDates={{ pickupDate, returnDate }} />
      </Suspense>
      <Suspense fallback={<BookingFormSkeleton />}>
        <BookingWithCatalog locale={locale} copy={dict.sections.booking} initial={initial} />
      </Suspense>
    </Shell>
  );
}
