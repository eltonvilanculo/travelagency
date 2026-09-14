import Link from "next/link";
import { AnimateIn } from "@/components/ui/animate-in";
import { formatMZN, formatUSDApprox } from "@/lib/currency";
import { localizedPath, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/types";

export type FareCard = {
  from: string;
  to: string;
  highlight: string;
  price: number;
  currency: string;
  validity: string;
  badge: string;
  featured: boolean;
};

type PromoFaresProps = {
  locale: Locale;
  copy: Dictionary["home"]["promoFares"];
  fares: FareCard[];
};

export function PromoFares({ locale, copy, fares }: PromoFaresProps) {
  return (
    <div className="bg-leafy px-7 lg:px-28 py-14 lg:py-28 overflow-hidden">
      {/* Header */}
      <AnimateIn className="flex flex-col md:flex-row justify-between items-start md:items-end mb-14 gap-6">
        <div>
          <p className="text-orange text-sm uppercase tracking-widest mb-3">{copy.eyebrow}</p>
          <h2 className="text-4xl md:text-5xl text-white">
            {copy.title} <span className="italic">{copy.titleAccent}</span>
          </h2>
          <p className="text-white/60 text-lg mt-4 max-w-md">
            {copy.description}
          </p>
        </div>
        <Link
          href={`${localizedPath(locale, "/book")}?type=flight`}
          className="border border-white/30 text-white hover:bg-white hover:text-leafy transition-all duration-300 rounded-3xl px-6 py-3 uppercase text-sm shrink-0"
        >
          {copy.viewAllFares}
        </Link>
      </AnimateIn>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {fares.map((fare, i) => (
          <AnimateIn key={`${fare.from}-${fare.to}`} delay={i * 100}>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-5 flex flex-col gap-4 hover:bg-white/15 hover:-translate-y-1 transition-all duration-300 group overflow-hidden h-full">

              {/* Live indicator */}
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-live-pulse shrink-0" />
                <span className="text-green-400/80 text-[10px] uppercase tracking-widest font-medium">{copy.liveOffer}</span>
              </div>

              {/* Badge — featured fares get the shimmer treatment, the
                  rest a plain tint (was a raw CSS class stored as content
                  before; now a semantic flag the component styles itself) */}
              <div className={`${fare.featured ? "badge-shimmer" : "bg-white/20"} text-white text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full w-fit`}>
                {fare.badge}
              </div>

              {/* Route */}
              <div className="flex items-center gap-2 min-w-0">
                <div className="min-w-0 flex-1">
                  <p className="text-white/40 text-[10px] uppercase tracking-widest">{copy.from}</p>
                  <p className="text-white font-semibold text-sm leading-tight truncate">{fare.from}</p>
                </div>
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-orange shrink-0">
                  <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
                </svg>
                <div className="min-w-0 flex-1 text-right">
                  <p className="text-white/40 text-[10px] uppercase tracking-widest">{copy.to}</p>
                  <p className="text-white font-semibold text-sm leading-tight truncate">{fare.to}</p>
                </div>
              </div>

              {/* Highlight */}
              <p className="text-white/60 text-xs leading-relaxed">{fare.highlight}</p>

              {/* Price */}
              <div className="mt-auto pt-1">
                <p className="text-white/40 text-[10px] uppercase tracking-widest mb-1">{copy.startingFrom}</p>
                <p className="text-orange text-2xl font-bold leading-tight">
                  {formatMZN(fare.price, fare.currency, locale)}
                </p>
                <p className="text-white/40 text-[11px]">{formatUSDApprox(fare.price, fare.currency, locale)}</p>
                <p className="text-white/40 text-xs mt-0.5">{copy.perPerson}</p>
              </div>

              {/* Validity */}
              <p className="text-white/35 text-[10px] border-t border-white/10 pt-3">{fare.validity}</p>

              <Link
                href={`${localizedPath(locale, "/book")}?type=flight&from=${encodeURIComponent(fare.from)}&to=${encodeURIComponent(fare.to)}`}
                className="bg-orange hover:bg-orange/90 text-white rounded-3xl px-5 py-2.5 text-xs font-semibold uppercase transition-all duration-300 w-full text-center block group-hover:shadow-lg"
              >
                {copy.bookThisFare}
              </Link>
            </div>
          </AnimateIn>
        ))}
      </div>
    </div>
  );
}
