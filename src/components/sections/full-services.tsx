import Link from "next/link";
import { localizedPath, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/types";

type FullServicesProps = {
  locale: Locale;
  copy: Dictionary["sections"]["fullServices"];
};

// The corporate profile's own "Nossos Serviços" — a marketing overview of
// all 8 offerings, four of which are the core catalog types (their own
// admin sections + public pages) and four of which are the ancillary
// services (AncillaryService catalog type, shown live on the homepage's
// #servicos-extras section — those four items link there instead of to
// /book, so "extra services" actually shows the extra services). This
// section itself is still static copy, not database-driven — it exists to
// mirror the source document's scope statement, not to duplicate the
// ancillary-services grid.
function serviceHref(locale: Locale, href: string): string {
  return href.startsWith("#") ? `${localizedPath(locale, "/")}${href}` : localizedPath(locale, href);
}

export function FullServices({ locale, copy }: FullServicesProps) {
  return (
    <div className="px-7 lg:px-28 py-14 lg:py-28 bg-lightbeige">
      <div className="text-center mb-14">
        <p className="text-orange text-sm uppercase tracking-widest mb-3">{copy.eyebrow}</p>
        <h2 className="text-4xl md:text-5xl text-textdark">
          {copy.title} <span className="italic">{copy.titleAccent}</span>
        </h2>
        <p className="text-parablack text-lg mt-4 max-w-xl mx-auto">{copy.description}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {copy.items.map((item, i) => (
          <Link
            key={item.title}
            href={serviceHref(locale, item.href)}
            className={`rounded-xl p-6 flex flex-col gap-2 border transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
              i % 2 === 0 ? "bg-leafy border-leafy text-white" : "bg-white border-darkgray/20 text-textdark"
            }`}
          >
            <h3 className="text-lg leading-tight">{item.title}</h3>
            <p className="text-xs uppercase tracking-wide text-orange">{item.subtitle}</p>
            <p className={`text-sm leading-relaxed mt-1 ${i % 2 === 0 ? "text-white/70" : "text-parablack"}`}>
              {item.description}
            </p>
          </Link>
        ))}
      </div>

      <div className="mt-10 bg-orange/10 border border-orange/30 rounded-xl p-6 max-w-3xl mx-auto text-center">
        <p className="text-orange text-xs uppercase tracking-widest mb-2">{copy.calloutLabel}</p>
        <p className="text-parablack text-base leading-relaxed">{copy.callout}</p>
      </div>
    </div>
  );
}
