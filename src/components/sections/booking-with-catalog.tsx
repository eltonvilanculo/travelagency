import { Booking, type BookingInitialValues } from "@/components/sections/booking";
import { getBookingCatalogOptions } from "@/lib/booking-options";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/types";

// Thin async Server Component wrapper so every page that renders the
// (client-side, interactive) booking form doesn't repeat the same catalog
// fetches — wrap this in <Suspense> from the page, same pattern as every
// other catalog-reading section on the site.
export async function BookingWithCatalog({
  locale,
  copy,
  initial,
}: {
  locale: Locale;
  copy: Dictionary["sections"]["booking"];
  initial?: BookingInitialValues;
}) {
  const { hotels, vehicles, packages, services } = await getBookingCatalogOptions(locale);
  return (
    <Booking
      locale={locale}
      copy={copy}
      hotels={hotels}
      vehicles={vehicles}
      packages={packages}
      services={services}
      initial={initial}
    />
  );
}
