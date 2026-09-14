import Image from "next/image";
import Link from "next/link";
import { formatMZN, formatUSDApprox } from "@/lib/currency";
import { localizedPath, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/types";

export type PackageCard = {
  id: string;
  title: string;
  destination: string;
  duration: string;
  included: string[];
  priceFrom: number;
  currency: string;
  image: string;
  tag: string;
};

type PackagesProps = {
  locale: Locale;
  copy: Dictionary["sections"]["packages"];
  packages: PackageCard[];
};

const CheckIcon = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-orange shrink-0 mt-0.5">
    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
  </svg>
);

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-darkgray">
    <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z" />
  </svg>
);

export function Packages({ locale, copy, packages }: PackagesProps) {
  return (
    <div className="px-7 lg:px-28 py-14 lg:py-28 bg-lightbeige">
      {/* Header */}
      <div className="text-center mb-14">
        <p className="text-orange text-sm uppercase tracking-widest mb-3">{copy.eyebrow}</p>
        <h2 className="text-4xl md:text-5xl text-textdark">
          {copy.title} <span className="italic">{copy.titleAccent}</span>
        </h2>
        <p className="text-parablack text-lg mt-4 max-w-xl mx-auto">
          {copy.description}
        </p>
      </div>

      {/* Package cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {packages.map((pkg) => (
          <div
            key={pkg.id}
            className="bg-white rounded-2xl border border-darkgray/20 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col group"
          >
            {/* Image */}
            <div className="relative h-52 overflow-hidden">
              <Image
                src={pkg.image}
                alt={pkg.title}
                fill
                sizes="(max-width: 768px) 100vw, 25vw"
                className="object-cover group-hover:scale-105 transition-all duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              {/* Tag */}
              <div className="absolute top-3 right-3 bg-orange text-white text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                {pkg.tag}
              </div>
              {/* Duration */}
              <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1">
                <ClockIcon />
                <span className="text-white text-xs">{pkg.duration}</span>
              </div>
            </div>

            {/* Content */}
            <div className="p-5 flex flex-col gap-4 flex-1">
              <div>
                <h3 className="text-xl text-textdark leading-tight">{pkg.title}</h3>
                <p className="text-xs text-orange mt-1">{pkg.destination}</p>
              </div>

              {/* Included */}
              <ul className="flex flex-col gap-2">
                {pkg.included.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckIcon />
                    <span className="text-xs text-parablack leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>

              {/* Price + CTA */}
              <div className="flex items-center justify-between pt-3 border-t border-shadow mt-auto">
                <div>
                  <p className="text-xs text-darkgray">{copy.from}</p>
                  <p className="text-orange font-bold text-xl">
                    {formatMZN(pkg.priceFrom, pkg.currency, locale)}
                    <span className="text-darkgray text-xs font-normal">{copy.perPerson}</span>
                  </p>
                  <p className="text-darkgray text-[11px]">{formatUSDApprox(pkg.priceFrom, pkg.currency, locale)}</p>
                </div>
                <Link
                  href={`${localizedPath(locale, "/book")}?type=package&id=${pkg.id}`}
                  className="bg-orange hover:bg-orange/90 text-white rounded-3xl px-4 py-2 text-xs font-semibold uppercase transition-all duration-300"
                >
                  {copy.bookPackage}
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
