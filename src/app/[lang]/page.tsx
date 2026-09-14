import { Suspense } from "react";
import { Shell } from "@/components/layout/shell";
import { AncillaryServices, type AncillaryServiceCard } from "@/components/sections/ancillary-services";
import { BookingOptions } from "@/components/sections/booking-options";
import { Hero } from "@/components/sections/hero";
import { PromoFares, type FareCard } from "@/components/sections/promo-fares";
import { SectionSkeleton } from "@/components/ui/skeleton";
import { getLocalizedDictionary } from "@/i18n/server";
import { PromoFareService } from "@/lib/data-access/promo-fares";
import { ServiceService } from "@/lib/data-access/services";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/types";

// Reads live catalog data — must not be statically prerendered at build
// time (see the identical note on the destinations page).
export const dynamic = "force-dynamic";

type LocalePageProps = {
  params: Promise<{ lang: string }>;
};

async function PromoFaresSection({ locale, copy }: { locale: Locale; copy: Dictionary["home"]["promoFares"] }) {
  const promoFares = await PromoFareService.findAll({ status: "PUBLISHED" });
  // findAll's query already restricts to flightOfferId != null, but Prisma's
  // types can't express that from the where-clause — narrow it here too.
  const activeFares = promoFares.filter(
    (f): f is typeof f & { flightOffer: NonNullable<typeof f.flightOffer> } =>
      f.flightOffer !== null && f.active && f.startsAt <= new Date() && f.endsAt >= new Date()
  );
  const fareCards: FareCard[] = activeFares.map((f) => ({
    from: f.flightOffer.origin,
    to: f.flightOffer.destinationLabel,
    highlight: (locale === "pt" ? f.highlightPt : f.highlightEn) || "",
    price: Number(f.promoPrice),
    currency: f.currency,
    validity:
      (locale === "pt" ? "Válido até " : "Valid until ") +
      f.endsAt.toLocaleDateString(locale === "pt" ? "pt-PT" : "en-US", { day: "numeric", month: "short", year: "numeric" }),
    badge: locale === "pt" ? f.labelPt : f.labelEn,
    featured: f.featured,
  }));

  if (fareCards.length === 0) return null;
  return <PromoFares locale={locale} copy={copy} fares={fareCards} />;
}

async function AncillaryServicesSection({ locale, copy }: { locale: Locale; copy: Dictionary["sections"]["services"] }) {
  const services = await ServiceService.findAll({ status: "PUBLISHED" });
  const serviceCards: AncillaryServiceCard[] = services.map((s) => ({
    id: s.id,
    name: locale === "pt" ? s.namePt : s.nameEn,
    description: locale === "pt" ? s.descriptionPt : s.descriptionEn,
    icon: s.icon,
    price: s.basePrice != null ? Number(s.basePrice) : null,
    currency: s.currency,
  }));

  if (serviceCards.length === 0) return null;
  return <AncillaryServices locale={locale} copy={copy} services={serviceCards} />;
}

export default async function Home({ params }: LocalePageProps) {
  const { lang } = await params;
  const { locale, dict } = getLocalizedDictionary(lang);

  return (
    <Shell locale={locale} copy={dict.layout}>
      <Hero locale={locale} copy={dict.home.hero} />
      <BookingOptions locale={locale} copy={dict.home.bookingOptions} />
      {/* id lives on this wrapper, not inside the async section itself, so
          the anchor target exists in the very first HTML sent to the
          browser — the "extra services" links from the About page jump
          here (?# servicos-extras), and that only works if the id is
          already in place before the real content streams in. */}
      <div id="servicos-extras" className="scroll-mt-24">
        <Suspense
          fallback={
            <SectionSkeleton
              eyebrow={dict.sections.services.eyebrow}
              title={dict.sections.services.title}
              titleAccent={dict.sections.services.titleAccent}
              description={dict.sections.services.description}
              bgClassName="bg-leafy"
              titleClassName="text-white"
              descriptionClassName="text-white/60"
            />
          }
        >
          <AncillaryServicesSection locale={locale} copy={dict.sections.services} />
        </Suspense>
      </div>
      <Suspense
        fallback={
          <SectionSkeleton
            eyebrow={dict.home.promoFares.eyebrow}
            title={dict.home.promoFares.title}
            titleAccent={dict.home.promoFares.titleAccent}
            description={dict.home.promoFares.description}
            bgClassName="bg-leafy"
            titleClassName="text-white"
            descriptionClassName="text-white/60"
          />
        }
      >
        <PromoFaresSection locale={locale} copy={dict.home.promoFares} />
      </Suspense>
    </Shell>
  );
}
