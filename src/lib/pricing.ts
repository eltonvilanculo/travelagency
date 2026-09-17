import { prisma } from "@/lib/prisma";
import { toMZN } from "@/lib/currency";
import type { Currency, ReservationServiceType } from "@/generated/prisma/client";

// Single source of truth for "what does this reservation cost" — used by
// the public booking form's live estimate, the reservation-submission API,
// and (later) an agent adjusting a quote in the admin queue. Nobody else
// should compute a price by hand; that's how a promo or a pricing rule
// quietly stops applying somewhere.

export type QuoteInput =
  | { serviceType: "FLIGHT"; itemId: string; passengers: number }
  | { serviceType: "HOTEL"; itemId: string; nights: number; rooms: number }
  | { serviceType: "CAR"; itemId: string; days: number }
  | { serviceType: "PACKAGE"; itemId: string; passengers: number }
  | { serviceType: "SERVICE"; itemId: string; quantity: number };

export type PriceQuote = {
  unitPrice: number;
  quantity: number;
  subtotal: number;
  promoApplied: boolean;
  promoId: string | null;
  total: number;
  currency: Currency;
};

export class PricingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PricingError";
  }
}

/** Finds a currently-active promo for this exact item, if one exists.
 * "Active" = the active flag is set and today falls inside its validity
 * window — an expired or not-yet-started promo never silently applies. */
async function findActivePromo(serviceType: ReservationServiceType, itemId: string) {
  const now = new Date();
  const base = { active: true, startsAt: { lte: now }, endsAt: { gte: now } };

  switch (serviceType) {
    case "FLIGHT":
      return prisma.promoOffer.findFirst({ where: { ...base, flightOfferId: itemId } });
    case "HOTEL":
      return prisma.promoOffer.findFirst({ where: { ...base, hotelId: itemId } });
    case "CAR":
      return prisma.promoOffer.findFirst({ where: { ...base, vehicleId: itemId } });
    case "PACKAGE":
      return prisma.promoOffer.findFirst({ where: { ...base, packageId: itemId } });
    case "SERVICE":
      return prisma.promoOffer.findFirst({ where: { ...base, ancillaryServiceId: itemId } });
    default:
      return null;
  }
}

/** Computes the quote for one catalog item. Throws PricingError (never a
 * generic Error) for anything the caller needs to show the customer —
 * item not found, item not published, or an invalid quantity — so
 * callers can catch specifically for that and respond with a clean 4xx
 * instead of leaking a stack trace. */
export async function calculateQuote(input: QuoteInput): Promise<PriceQuote> {
  let basePrice: number;
  let currency: Currency;
  let quantity: number;

  switch (input.serviceType) {
    case "FLIGHT": {
      if (input.passengers < 1) throw new PricingError("Número de passageiros inválido");
      const flight = await prisma.flightOffer.findUnique({ where: { id: input.itemId } });
      if (!flight || flight.status !== "PUBLISHED") throw new PricingError("Voo não disponível");
      basePrice = Number(flight.price);
      currency = flight.currency;
      quantity = input.passengers;
      break;
    }
    case "HOTEL": {
      if (input.nights < 1) throw new PricingError("Número de noites inválido");
      if (input.rooms < 1) throw new PricingError("Número de quartos inválido");
      const hotel = await prisma.hotel.findUnique({ where: { id: input.itemId } });
      if (!hotel || hotel.status !== "PUBLISHED") throw new PricingError("Hotel não disponível");
      basePrice = Number(hotel.pricePerNight);
      currency = hotel.currency;
      quantity = input.nights * input.rooms;
      break;
    }
    case "CAR": {
      if (input.days < 1) throw new PricingError("Número de dias inválido");
      const vehicle = await prisma.vehicle.findUnique({ where: { id: input.itemId } });
      if (!vehicle || vehicle.status !== "PUBLISHED") throw new PricingError("Viatura não disponível");
      basePrice = Number(vehicle.pricePerDay);
      currency = vehicle.currency;
      quantity = input.days;
      break;
    }
    case "PACKAGE": {
      if (input.passengers < 1) throw new PricingError("Número de pessoas inválido");
      const pkg = await prisma.travelPackage.findUnique({ where: { id: input.itemId } });
      if (!pkg || pkg.status !== "PUBLISHED") throw new PricingError("Pacote não disponível");
      if (pkg.capacity && input.passengers > pkg.capacity) {
        throw new PricingError(`Este pacote tem capacidade máxima de ${pkg.capacity} pessoas`);
      }
      basePrice = Number(pkg.pricePerPerson);
      currency = pkg.currency;
      quantity = input.passengers;
      break;
    }
    case "SERVICE": {
      if (input.quantity < 1) throw new PricingError("Quantidade inválida");
      const service = await prisma.ancillaryService.findUnique({ where: { id: input.itemId } });
      if (!service || service.status !== "PUBLISHED") throw new PricingError("Serviço não disponível");
      if (service.basePrice == null) {
        throw new PricingError("Este serviço é apenas sob consulta, sem preço fixo");
      }
      basePrice = Number(service.basePrice);
      currency = service.currency;
      quantity = input.quantity;
      break;
    }
  }

  const promo = await findActivePromo(input.serviceType, input.itemId);
  const sourceCurrency = promo ? promo.currency : currency;
  const unitPrice = promo ? Number(promo.promoPrice) : basePrice;
  const subtotal = basePrice * quantity;
  const total = unitPrice * quantity;

  // A quote is always in MZN, regardless of which currency the catalog
  // item (or its promo) happens to be priced in — Payen's Mpesa/eMola
  // gateway only accepts MZN, and a quote that silently stayed in USD/ZAR
  // meant a hotel priced in USD could never actually be paid online.
  return {
    unitPrice: toMZN(unitPrice, sourceCurrency),
    quantity,
    subtotal: toMZN(subtotal, sourceCurrency),
    promoApplied: promo !== null,
    promoId: promo?.id ?? null,
    total: toMZN(total, sourceCurrency),
    currency: "MZN",
  };
}
