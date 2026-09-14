import Link from "next/link";
import { AnimateIn } from "@/components/ui/animate-in";
import { localizedPath, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/types";

type BookingOptionsProps = {
  locale: Locale;
  copy: Dictionary["home"]["bookingOptions"];
};

const FlightIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
    <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
  </svg>
);

const HotelIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
    <path d="M7 13c1.66 0 3-1.34 3-3S8.66 7 7 7s-3 1.34-3 3 1.34 3 3 3zm12-6h-8v7H3V5H1v15h2v-3h18v3h2v-9c0-2.21-1.79-4-4-4z" />
  </svg>
);

const CarIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
    <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" />
  </svg>
);

const icons = {
  flights: FlightIcon,
  hotels: HotelIcon,
  cars: CarIcon,
};

export function BookingOptions({ locale, copy }: BookingOptionsProps) {
  const hrefs = {
    flights: localizedPath(locale, "/book"),
    hotels: localizedPath(locale, "/hotels"),
    cars: localizedPath(locale, "/cars"),
  };

  return (
    <div className="px-7 lg:px-28 py-14 lg:py-28 bg-beige">
      <AnimateIn className="text-center mb-14">
        <h2 className="text-4xl md:text-5xl text-textdark">
          {copy.title} <span className="italic">{copy.titleAccent}</span>
        </h2>
        <p className="text-parablack text-lg mt-4 max-w-xl mx-auto">
          {copy.description}
        </p>
      </AnimateIn>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {copy.options.map((opt, i) => {
          const Icon = icons[opt.id as keyof typeof icons];
          const href = hrefs[opt.id as keyof typeof hrefs];

          return (
            <AnimateIn key={opt.id} delay={i * 120}>
              <div className="bg-white border border-darkgray/30 rounded-2xl p-6 sm:p-8 flex flex-col items-center text-center gap-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group h-full">
                <div className="w-16 h-16 rounded-full bg-beige group-hover:bg-orange/10 flex items-center justify-center text-orange transition-colors duration-300 shrink-0">
                  <Icon />
                </div>
                <div>
                  <h3 className="text-2xl text-textdark mb-3">{opt.title}</h3>
                  <p className="text-parablack leading-relaxed text-sm">{opt.description}</p>
                </div>
                <Link
                  href={href}
                  className="mt-auto bg-orange/10 text-orange hover:bg-orange hover:text-white transition-all duration-300 rounded-3xl px-6 py-3 text-sm font-semibold uppercase"
                >
                  {opt.cta}
                </Link>
              </div>
            </AnimateIn>
          );
        })}
      </div>
    </div>
  );
}
