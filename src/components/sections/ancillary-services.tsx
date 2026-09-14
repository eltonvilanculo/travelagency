import Image from "next/image";
import Link from "next/link";
import { formatMZN, formatUSDApprox } from "@/lib/currency";
import { localizedPath, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/types";

export type AncillaryServiceCard = {
  id: string;
  name: string;
  description: string;
  icon: string | null;
  price: number | null;
  currency: string;
};

type AncillaryServicesProps = {
  locale: Locale;
  copy: Dictionary["sections"]["services"];
  services: AncillaryServiceCard[];
};

const DefaultIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-orange">
    <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
  </svg>
);

// The corporate profile's ancillary offerings (visa/documentation support,
// travel insurance, tour guides, protocol) — real, bookable catalog items
// (ReservationServiceType "SERVICE"), not just marketing copy. This is the
// live, DB-driven grid; FullServices on /about is the static 8-item
// overview of the whole business, this is specifically these 4 shown with
// real pricing and a working booking link.
export function AncillaryServices({ locale, copy, services }: AncillaryServicesProps) {
  return (
    <div className="px-7 lg:px-28 py-14 lg:py-28 bg-leafy">
      <div className="text-center mb-14">
        <p className="text-orange text-sm uppercase tracking-widest mb-3">{copy.eyebrow}</p>
        <h2 className="text-4xl md:text-5xl text-white">
          {copy.title} <span className="italic">{copy.titleAccent}</span>
        </h2>
        <p className="text-white/60 text-lg mt-4 max-w-xl mx-auto">{copy.description}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {services.map((service) => (
          <div
            key={service.id}
            className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-3 hover:bg-white/10 hover:-translate-y-1 transition-all duration-300"
          >
            <div className="w-11 h-11 rounded-xl bg-orange/10 flex items-center justify-center">
              {service.icon ? (
                <Image src={service.icon} alt="" width={24} height={24} className="w-6 h-6 object-contain" />
              ) : (
                <DefaultIcon />
              )}
            </div>
            <h3 className="text-white text-lg leading-tight">{service.name}</h3>
            <p className="text-white/60 text-sm leading-relaxed flex-1">{service.description}</p>
            <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
              <div>
                {service.price != null ? (
                  <>
                    <p className="text-orange font-bold text-sm">
                      {copy.from} {formatMZN(service.price, service.currency, locale)}
                    </p>
                    <p className="text-white/40 text-[11px]">{formatUSDApprox(service.price, service.currency, locale)}</p>
                  </>
                ) : (
                  <p className="text-white/50 text-xs uppercase tracking-wide">{copy.quoteOnly}</p>
                )}
              </div>
              <Link
                href={`${localizedPath(locale, "/book")}?type=service&id=${service.id}`}
                className="bg-orange hover:bg-orange/90 text-white rounded-3xl px-4 py-2 text-xs font-semibold uppercase transition-all duration-300 shrink-0"
              >
                {copy.cta}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
