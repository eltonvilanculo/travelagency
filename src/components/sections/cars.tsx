import Image from "next/image";
import Link from "next/link";
import { AnimateIn } from "@/components/ui/animate-in";
import { formatMZN, formatUSDApprox } from "@/lib/currency";
import { localizedPath, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/types";

export type CarCard = {
  id: string;
  category: string;
  brand: string;
  type: string;
  seats: number;
  luggage: number;
  transmission: string;
  pricePerDay: number;
  currency: string;
  image: string;
};

type CarsProps = {
  locale: Locale;
  copy: Dictionary["sections"]["cars"];
  cars: CarCard[];
  /** Rental period carried over from the Hero search widget — forwarded
   * onto each card's booking link so it doesn't have to be re-entered. */
  bookingDates?: { pickupDate?: string; returnDate?: string };
};

const SeatIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-darkgray">
    <path d="M5 6c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm13 12H6v-1l2-2v-3c0-1.3.84-2.4 2-2.82V9h2v.18C13.16 9.6 14 10.7 14 12v3l2 2v1zm-2 2H8v-1h8v1z" />
  </svg>
);

const LuggageIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-darkgray">
    <path d="M20 6h-2.18c.07-.44.18-.88.18-1.34C18 2.54 15.96.5 13.5.5S9 2.54 9 4.66c0 .46.1.9.18 1.34H7C5.9 6 5 6.9 5 8v13c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-8.34-1.34c0-1.02.82-1.84 1.84-1.84s1.84.82 1.84 1.84c0 .46-.1.9-.26 1.34h-3.16c-.16-.44-.26-.88-.26-1.34zM15 15H9v-2h6v2z" />
  </svg>
);

const GearIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-darkgray">
    <path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z" />
  </svg>
);

export function Cars({ locale, copy, cars, bookingDates }: CarsProps) {
  const dateParams = new URLSearchParams();
  if (bookingDates?.pickupDate) dateParams.set("date", bookingDates.pickupDate);
  if (bookingDates?.returnDate) dateParams.set("dateTo", bookingDates.returnDate);
  const dateQuery = dateParams.toString();
  return (
    <div className="px-7 lg:px-28 py-14 lg:py-28 bg-beige">
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
          href={localizedPath(locale, "/cars")}
          className="bg-orange/10 text-orange hover:bg-orange hover:text-white transition-all duration-300 rounded-3xl px-6 py-3 uppercase text-sm shrink-0"
        >
          {copy.seeAllVehicles}
        </Link>
      </div>

      {/* Car cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cars.map((car, index) => (
          <AnimateIn key={car.id} delay={Math.min(index, 4) * 120}>
          <div
            className="group bg-white rounded-2xl border border-darkgray/20 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full"
          >
            {/* Car image */}
            <div className="relative h-44 overflow-hidden">
              <Image
                src={car.image}
                alt={car.category}
                fill
                sizes="(max-width: 768px) 100vw, 25vw"
                className="object-cover group-hover:scale-105 transition-all duration-500"
                priority={index === 0}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
              <div className="absolute top-3 left-3 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1">
                <span className="text-white text-xs font-semibold uppercase tracking-wider">{car.type}</span>
              </div>
            </div>

            {/* Content */}
            <div className="p-5 flex flex-col gap-4 flex-1">
              <div>
                <h3 className="text-xl text-textdark">{car.category}</h3>
                <p className="text-xs text-darkgray mt-1">{car.brand}</p>
              </div>

              {/* Specs */}
              <div className="grid grid-cols-3 gap-3 py-3 border-y border-shadow">
                <div className="flex flex-col items-center gap-1">
                  <SeatIcon />
                  <span className="text-xs text-parablack font-medium">{car.seats}</span>
                  <span className="text-xs text-darkgray">{copy.seats}</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <LuggageIcon />
                  <span className="text-xs text-parablack font-medium">{car.luggage}</span>
                  <span className="text-xs text-darkgray">{copy.bags}</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <GearIcon />
                  <span className="text-xs text-parablack font-medium text-center leading-tight">{car.transmission.split(" ")[0]}</span>
                  <span className="text-xs text-darkgray">{copy.gearbox}</span>
                </div>
              </div>

              {/* Price + CTA — stacked, not side-by-side: at narrower card
                  widths a side-by-side row squeezed the pill button
                  (2-line text) right on top of the price digits. */}
              <div className="flex flex-col gap-3 mt-auto">
                <div>
                  <p className="text-xs text-darkgray">{copy.from}</p>
                  <p className="text-orange font-bold text-xl">
                    {formatMZN(car.pricePerDay, car.currency, locale)}
                    <span className="text-darkgray text-xs font-normal">{copy.perDay}</span>
                  </p>
                  <p className="text-darkgray text-[11px]">{formatUSDApprox(car.pricePerDay, car.currency, locale)}</p>
                </div>
                <Link
                  href={`${localizedPath(locale, "/book")}?type=car&id=${car.id}${dateQuery ? `&${dateQuery}` : ""}`}
                  className="bg-orange hover:bg-orange/90 text-white rounded-3xl px-4 py-2.5 text-xs font-semibold uppercase text-center transition-all duration-300"
                >
                  {copy.reserveCar}
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
