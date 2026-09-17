import Image from "next/image";
import Link from "next/link";
import { AnimateIn } from "@/components/ui/animate-in";
import { formatMZN, formatUSDApprox } from "@/lib/currency";
import { localizedPath, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/types";

export type HotelCard = {
  id: string;
  name: string;
  location: string;
  stars: number;
  priceFrom: number;
  currency: string;
  description: string;
  amenities: string[];
  image: string;
};

type HotelsProps = {
  locale: Locale;
  copy: Dictionary["sections"]["hotels"];
  hotels: HotelCard[];
  /** Dates carried over from the Hero search widget — forwarded onto each
   * card's booking link so the customer doesn't have to re-enter them. */
  bookingDates?: { checkIn?: string; checkOut?: string; rooms?: string };
};

const StarIcon = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-yellow-400">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

const LocationIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-orange shrink-0">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
  </svg>
);

export function Hotels({ locale, copy, hotels, bookingDates }: HotelsProps) {
  const dateParams = new URLSearchParams();
  if (bookingDates?.checkIn) dateParams.set("date", bookingDates.checkIn);
  if (bookingDates?.checkOut) dateParams.set("dateTo", bookingDates.checkOut);
  if (bookingDates?.rooms) dateParams.set("rooms", bookingDates.rooms);
  const dateQuery = dateParams.toString();
  return (
    <div className="px-7 lg:px-28 py-14 lg:py-28 bg-lightbeige">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
        <div>
          <p className="text-orange text-sm uppercase tracking-widest mb-3">{copy.eyebrow}</p>
          <h2 className="text-4xl md:text-5xl text-textdark">
            {copy.title} <span className="italic">{copy.titleAccent}</span>
          </h2>
          <p className="text-parablack text-lg mt-4 max-w-md">
            {copy.description}
          </p>
        </div>
        <Link
          href={localizedPath(locale, "/hotels")}
          className="bg-orange/10 text-orange hover:bg-orange hover:text-white transition-all duration-300 rounded-3xl px-6 py-3 uppercase text-sm shrink-0"
        >
          {copy.browseAllHotels}
        </Link>
      </div>

      {/* Hotel cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {hotels.map((hotel, index) => (
          <AnimateIn key={hotel.id} delay={Math.min(index, 4) * 120}>
          <div
            className="group bg-white rounded-2xl border border-darkgray/20 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full"
          >
            {/* Image */}
            <div className="relative h-44 overflow-hidden">
              <Image
                src={hotel.image}
                alt={hotel.name}
                fill
                sizes="(max-width: 768px) 100vw, 25vw"
                className="object-cover group-hover:scale-105 transition-all duration-500"
                priority={index === 0}
              />
              {/* Stars overlay */}
              <div className="absolute top-3 left-3 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-1">
                {Array.from({ length: hotel.stars }).map((_, i) => (
                  <StarIcon key={i} />
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="p-5 flex flex-col gap-3 flex-1">
              <div className="flex items-start gap-1">
                <LocationIcon />
                <p className="text-xs text-darkgray">{hotel.location}</p>
              </div>
              <h3 className="text-lg text-textdark leading-tight">{hotel.name}</h3>
              <p className="text-parablack text-xs leading-relaxed">{hotel.description}</p>

              {/* Amenities */}
              <div className="flex flex-wrap gap-2 mt-auto">
                {hotel.amenities.map((a) => (
                  <span key={a} className="bg-beige text-parablack text-xs px-2.5 py-1 rounded-full">
                    {a}
                  </span>
                ))}
              </div>

              {/* Price + CTA */}
              <div className="flex items-center justify-between pt-3 border-t border-shadow mt-2">
                <div>
                  <p className="text-xs text-darkgray">{copy.from}</p>
                  <p className="text-orange font-bold text-lg">
                    {formatMZN(hotel.priceFrom, hotel.currency, locale)}
                    <span className="text-darkgray text-xs font-normal">{copy.perNight}</span>
                  </p>
                  <p className="text-darkgray text-[11px]">{formatUSDApprox(hotel.priceFrom, hotel.currency, locale)}</p>
                </div>
                <Link
                  href={`${localizedPath(locale, "/book")}?type=hotel&id=${hotel.id}${dateQuery ? `&${dateQuery}` : ""}`}
                  className="bg-orange hover:bg-orange/90 text-white rounded-3xl px-4 py-2 text-xs font-semibold uppercase transition-all duration-300"
                >
                  {copy.checkAvailability}
                </Link>
              </div>
            </div>
          </div>
          </AnimateIn>
        ))}
      </div>
    </div>
  );
}
