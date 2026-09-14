import type { TripItem } from "@/lib/trip-context";

// Soft, non-blocking sanity checks across the whole trip stack — never a
// reason to refuse submission (this agency's model is "collect intent, an
// agent sorts out the real details," and a genuine multi-city trip or a
// standalone insurance purchase can legitimately look "wrong" by these
// rules). These exist purely to catch the everyday slip: picked a car for
// the wrong week, forgot the hotel dates were already set, added the same
// hotel twice.
export type TripWarning =
  | { type: "duplicate"; localId: string; itemName: string }
  | { type: "overlappingCars"; localId: string; itemNameA: string; itemNameB: string }
  | { type: "dateOutlier"; localId: string; itemName: string }
  | { type: "cityMismatch"; localId: string; cities: string[] }
  | { type: "packageOverlapsHotel"; localId: string; packageName: string; hotelName: string };

const DAY_MS = 86_400_000;
// A hotel checkout and a car pickup the same day (or a couple of days
// either side) is completely normal trip logistics, not a mismatch — only
// flag a gap wide enough that the item is very unlikely to be part of the
// same trip.
const ENVELOPE_BUFFER_MS = 3 * DAY_MS;

function toTime(iso: string): number {
  return new Date(iso).getTime();
}

function rangesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

export function analyzeTripWarnings(items: TripItem[]): TripWarning[] {
  const warnings: TripWarning[] = [];

  // Same catalog item added twice (double-click, or forgot it was already there).
  const seen = new Map<string, TripItem>();
  for (const item of items) {
    if (!item.itemId) continue;
    const key = `${item.serviceType}:${item.itemId}`;
    if (seen.has(key)) {
      warnings.push({ type: "duplicate", localId: item.localId, itemName: item.name });
    } else {
      seen.set(key, item);
    }
  }

  // Two car rentals for overlapping dates — can't be in two rental cars at once.
  const cars = items.filter((i) => i.serviceType === "CAR" && i.dateFrom && i.dateTo);
  for (let i = 0; i < cars.length; i++) {
    for (let j = i + 1; j < cars.length; j++) {
      const a = cars[i];
      const b = cars[j];
      if (rangesOverlap(toTime(a.dateFrom!), toTime(a.dateTo!), toTime(b.dateFrom!), toTime(b.dateTo!))) {
        warnings.push({ type: "overlappingCars", localId: `${a.localId}-${b.localId}`, itemNameA: a.name, itemNameB: b.name });
      }
    }
  }

  // An item whose dates sit entirely outside every other item's dates
  // (padded by a few days) — the literal "car for a date outside the rest
  // of the trip" case.
  const dated = items.filter((i) => i.dateFrom);
  for (const item of dated) {
    const others = dated.filter((i) => i.localId !== item.localId);
    if (others.length === 0) continue;

    const otherStart = Math.min(...others.map((i) => toTime(i.dateFrom!)));
    const otherEnd = Math.max(...others.map((i) => toTime(i.dateTo || i.dateFrom!)));
    const itemStart = toTime(item.dateFrom!);
    const itemEnd = toTime(item.dateTo || item.dateFrom!);

    const overlapsEnvelope = rangesOverlap(
      itemStart,
      itemEnd,
      otherStart - ENVELOPE_BUFFER_MS,
      otherEnd + ENVELOPE_BUFFER_MS
    );
    if (!overlapsEnvelope) {
      warnings.push({ type: "dateOutlier", localId: item.localId, itemName: item.name });
    }
  }

  // Different destination cities across the trip — could be a genuine
  // multi-city itinerary, so this is a nudge, not an error. Cars and
  // services carry no city in the catalog (a fleet/business-wide offering,
  // not tied to one destination) so they're silently excluded rather than
  // treated as "no city" = mismatch.
  const citiedItems = items.filter((i) => i.city);
  const distinctCities = [...new Set(citiedItems.map((i) => i.city!))];
  if (distinctCities.length > 1) {
    warnings.push({ type: "cityMismatch", localId: "trip-cities", cities: distinctCities });
  }

  // A package and a standalone hotel for the same destination — packages
  // typically already include accommodation, so this is likely a double
  // booking rather than two things the customer actually wants both of.
  const packages = items.filter((i) => i.serviceType === "PACKAGE" && i.city);
  const hotelHere = items.filter((i) => i.serviceType === "HOTEL" && i.city);
  for (const pkg of packages) {
    const clashingHotel = hotelHere.find((h) => h.city === pkg.city);
    if (clashingHotel) {
      warnings.push({
        type: "packageOverlapsHotel",
        localId: `${pkg.localId}-${clashingHotel.localId}`,
        packageName: pkg.name,
        hotelName: clashingHotel.name,
      });
    }
  }

  return warnings;
}
