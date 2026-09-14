import { Suspense } from "react";
import type { Metadata } from "next";
import { Shell } from "@/components/layout/shell";
import { Destinations, type DestinationCard } from "@/components/sections/destinations";
import { Packages, type PackageCard } from "@/components/sections/packages";
import { Tours, type TourCard } from "@/components/sections/tours";
import { SectionSkeleton } from "@/components/ui/skeleton";
import { getLocalizedDictionary } from "@/i18n/server";
import { DestinationService } from "@/lib/data-access/destinations";
import { PackageService } from "@/lib/data-access/packages";
import type { PackageTheme } from "@/generated/prisma/client";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/types";

const THEME_LABEL: Record<"pt" | "en", Record<PackageTheme, string>> = {
  pt: { BEACH: "PRAIA", SAFARI: "SAFARI", ISLAND: "ILHA", LUXURY: "LUXO", CULTURAL: "CULTURAL", ADVENTURE: "AVENTURA", CITY: "CIDADE" },
  en: { BEACH: "BEACH", SAFARI: "SAFARI", ISLAND: "ISLAND", LUXURY: "LUXURY", CULTURAL: "CULTURAL", ADVENTURE: "ADVENTURE", CITY: "CITY" },
};

// This page now reads live catalog data (published destinations can change
// any time an admin edits them) — must not get baked in at build time as a
// static page, or edits would only ever show up after a rebuild/redeploy.
export const dynamic = "force-dynamic";

type LocalePageProps = {
  params: Promise<{ lang: string }>;
};

export async function generateMetadata({ params }: LocalePageProps): Promise<Metadata> {
  const { lang } = await params;
  const { dict } = getLocalizedDictionary(lang);

  return dict.metadata.destinations;
}

async function DestinationsSection({ locale, copy }: { locale: Locale; copy: Dictionary["sections"]["destinations"] }) {
  const destinations = await DestinationService.findAll({ status: "PUBLISHED" });
  const destinationCards: DestinationCard[] = destinations.map((d) => ({
    name: locale === "pt" ? d.namePt : d.nameEn,
    label: (locale === "pt" ? d.taglinePt : d.taglineEn) || d.country,
    image: d.images[0] || "/images/safari1.jpg",
  }));

  if (destinationCards.length === 0) return null;
  return <Destinations copy={copy} items={destinationCards} />;
}

// RF-014 — one TravelPackage list powers both display treatments: the
// compact Tours carousel and the fuller Packages grid (2026-09-07
// decision), same as the public site's two card designs always implied.
// Both render from a single shared fetch, in one Suspense boundary, so
// they don't trigger two separate database queries for the same data.
async function ToursAndPackagesSection({
  locale,
  toursCopy,
  packagesCopy,
}: {
  locale: Locale;
  toursCopy: Dictionary["sections"]["tours"];
  packagesCopy: Dictionary["sections"]["packages"];
}) {
  const packages = await PackageService.findAll({ status: "PUBLISHED" });
  const tourCards: TourCard[] = packages.map((p) => ({
    slug: p.slug,
    name: locale === "pt" ? p.namePt : p.nameEn,
    description: locale === "pt" ? p.itineraryPt : p.itineraryEn,
    days: p.durationDays,
    price: Number(p.pricePerPerson),
    currency: p.currency,
    image: p.images[0] || "/images/safari1.jpg",
  }));
  const packageCards: PackageCard[] = packages.map((p) => ({
    id: p.id,
    title: locale === "pt" ? p.namePt : p.nameEn,
    destination: p.destination ? (locale === "pt" ? p.destination.namePt : p.destination.nameEn) : "",
    duration: `${p.durationDays} ${locale === "pt" ? "dias" : "days"}`,
    // NOTE: inclusions/exclusions are single-language in the schema (not
    // fooEn/fooPt like every other field) — same list shows in both
    // locales until that's split. Flagged, not fixed here.
    included: p.inclusions,
    priceFrom: Number(p.pricePerPerson),
    currency: p.currency,
    image: p.images[0] || "/images/safari1.jpg",
    tag: p.theme ? THEME_LABEL[locale][p.theme] : "",
  }));

  return (
    <>
      {tourCards.length > 0 && <Tours locale={locale} copy={toursCopy} tours={tourCards} />}
      {packageCards.length > 0 && <Packages locale={locale} copy={packagesCopy} packages={packageCards} />}
    </>
  );
}

export default async function DestinationsPage({ params }: LocalePageProps) {
  const { lang } = await params;
  const { locale, dict } = getLocalizedDictionary(lang);
  const page = dict.pages.destinations;

  return (
    <Shell locale={locale} copy={dict.layout}>
      <div className="bg-leafy px-7 lg:px-28 pt-36 pb-0">
        <p className="text-orange text-xs uppercase tracking-[0.25em] font-semibold mb-3">{page.slogan}</p>
        <h1 className="text-4xl md:text-6xl text-white leading-tight">
          {page.title} <span className="italic">{page.titleAccent}</span>
        </h1>
        <p className="text-white/60 mt-4 max-w-xl text-lg pb-14">
          {page.description}
        </p>
      </div>
      <Suspense
        fallback={
          <SectionSkeleton
            title={dict.sections.destinations.title}
            titleAccent={dict.sections.destinations.titleAccent}
            description={dict.sections.destinations.description}
            bgClassName="bg-beige"
            variant="carousel"
          />
        }
      >
        <DestinationsSection locale={locale} copy={dict.sections.destinations} />
      </Suspense>
      <Suspense
        fallback={
          <>
            <SectionSkeleton title={dict.sections.tours.title} description={dict.sections.tours.description} bgClassName="bg-beige" variant="carousel" />
            <SectionSkeleton
              eyebrow={dict.sections.packages.eyebrow}
              title={dict.sections.packages.title}
              titleAccent={dict.sections.packages.titleAccent}
              description={dict.sections.packages.description}
              bgClassName="bg-lightbeige"
            />
          </>
        }
      >
        <ToursAndPackagesSection locale={locale} toursCopy={dict.sections.tours} packagesCopy={dict.sections.packages} />
      </Suspense>
    </Shell>
  );
}
