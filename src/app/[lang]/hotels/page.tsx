import { Suspense } from "react";
import type { Metadata } from "next";
import { Shell } from "@/components/layout/shell";
import { BookingWithCatalog } from "@/components/sections/booking-with-catalog";
import type { BookingInitialValues } from "@/components/sections/booking";
import { Hotels, type HotelCard } from "@/components/sections/hotels";
import { SectionSkeleton, BookingFormSkeleton } from "@/components/ui/skeleton";
import { getLocalizedDictionary } from "@/i18n/server";
import { HotelService } from "@/lib/data-access/hotels";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/types";

// Reads live catalog data — must not be statically prerendered at build
// time (see the identical note on the destinations page).
export const dynamic = "force-dynamic";

type LocalePageProps = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ destination?: string; checkIn?: string; checkOut?: string; rooms?: string }>;
};

export async function generateMetadata({ params }: LocalePageProps): Promise<Metadata> {
  const { lang } = await params;
  const { dict } = getLocalizedDictionary(lang);

  return dict.metadata.hotels;
}

async function HotelsSection({
  locale,
  copy,
  destinationFilter,
  bookingDates,
}: {
  locale: Locale;
  copy: Dictionary["sections"]["hotels"];
  destinationFilter?: string;
  bookingDates: { checkIn?: string; checkOut?: string; rooms?: string };
}) {
  const hotels = await HotelService.findAll({ status: "PUBLISHED" });
  const needle = destinationFilter?.trim().toLowerCase();
  const filtered = needle
    ? hotels.filter(
        (h) =>
          h.destination.namePt.toLowerCase().includes(needle) ||
          h.destination.nameEn.toLowerCase().includes(needle) ||
          h.destination.country.toLowerCase().includes(needle)
      )
    : hotels;

  const hotelCards: HotelCard[] = filtered.map((h) => ({
    id: h.id,
    name: locale === "pt" ? h.namePt : h.nameEn,
    location: `${h.destination[locale === "pt" ? "namePt" : "nameEn"]}, ${h.destination.country}`,
    stars: h.stars ?? 0,
    priceFrom: Number(h.pricePerNight),
    currency: h.currency,
    description: locale === "pt" ? h.descriptionPt : h.descriptionEn,
    amenities: h.amenities,
    image: h.images[0] || "/images/safari1.jpg",
  }));

  if (hotelCards.length === 0) return null;
  return <Hotels locale={locale} copy={copy} hotels={hotelCards} bookingDates={bookingDates} />;
}

export default async function HotelsPage({ params, searchParams }: LocalePageProps) {
  const { lang } = await params;
  const { destination, checkIn, checkOut, rooms } = await searchParams;
  const { locale, dict } = getLocalizedDictionary(lang);
  const page = dict.pages.hotels;

  const initial: BookingInitialValues | undefined = checkIn || checkOut
    ? { tab: "hotel", date: checkIn, dateTo: checkOut, rooms: rooms ? Number(rooms) || undefined : undefined }
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
            eyebrow={dict.sections.hotels.eyebrow}
            title={dict.sections.hotels.title}
            titleAccent={dict.sections.hotels.titleAccent}
            description={dict.sections.hotels.description}
          />
        }
      >
        <HotelsSection locale={locale} copy={dict.sections.hotels} destinationFilter={destination} bookingDates={{ checkIn, checkOut, rooms }} />
      </Suspense>
      <Suspense fallback={<BookingFormSkeleton />}>
        <BookingWithCatalog locale={locale} copy={dict.sections.booking} initial={initial} />
      </Suspense>
    </Shell>
  );
}
