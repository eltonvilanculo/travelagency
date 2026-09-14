import { z } from "zod";

// Base fields every reservation needs, regardless of what's being booked.
// itemId is deliberately NOT here — it's required for every service type
// except FLIGHT (see below), so each variant declares it explicitly
// rather than relying on spread-override order to get that right.
const baseFields = {
  locale: z.enum(["pt", "en"]).default("pt"),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  customerRemarks: z.string().max(2000).optional(),
  customer: z.object({
    fullName: z.string().min(1, "Nome é obrigatório").max(200),
    phone: z.string().min(6, "Telefone inválido").max(30),
    email: z.string().email("Email inválido").optional().or(z.literal("")),
  }),
};

// One shape per service type, discriminated so the right quantity field
// is required for the right booking — matches calculateQuote's own
// per-type validation in src/lib/pricing.ts.
export const createReservationSchema = z.discriminatedUnion("serviceType", [
  // Flight routes are open — any city pair, not restricted to the small
  // set of published FlightOffer rows — so itemId is optional here: set
  // only when the customer picked a specific published fare/promo, in
  // which case it's priced instantly; otherwise this is a quote request
  // an agent prices by hand (RF-026's normal RECEIVED -> QUOTE_SENT flow).
  z.object({
    serviceType: z.literal("FLIGHT"),
    itemId: z.string().optional(),
    origin: z.string().min(1, "Origem é obrigatória"),
    destinationCity: z.string().min(1, "Destino é obrigatório"),
    passengers: z.number().int().positive(),
    ...baseFields,
  }),
  z.object({ serviceType: z.literal("HOTEL"), itemId: z.string().min(1), nights: z.number().int().positive(), rooms: z.number().int().positive(), ...baseFields }),
  z.object({ serviceType: z.literal("CAR"), itemId: z.string().min(1), days: z.number().int().positive(), ...baseFields }),
  z.object({ serviceType: z.literal("PACKAGE"), itemId: z.string().min(1), passengers: z.number().int().positive(), ...baseFields }),
  z.object({ serviceType: z.literal("SERVICE"), itemId: z.string().min(1), quantity: z.number().int().positive(), ...baseFields }),
]);

export type CreateReservationInput = z.infer<typeof createReservationSchema>;

// Same per-type shape, without the customer block — used by the
// live-quote endpoint before the customer has filled in their details.
// Flight has no quote-request variant: an open route with no itemId has
// nothing to price yet, so the form simply doesn't call this for flights
// unless the customer picked a specific published fare/promo.
export const quoteRequestSchema = z.discriminatedUnion("serviceType", [
  z.object({ serviceType: z.literal("FLIGHT"), itemId: z.string().min(1), passengers: z.number().int().positive() }),
  z.object({ serviceType: z.literal("HOTEL"), itemId: z.string().min(1), nights: z.number().int().positive(), rooms: z.number().int().positive() }),
  z.object({ serviceType: z.literal("CAR"), itemId: z.string().min(1), days: z.number().int().positive() }),
  z.object({ serviceType: z.literal("PACKAGE"), itemId: z.string().min(1), passengers: z.number().int().positive() }),
  z.object({ serviceType: z.literal("SERVICE"), itemId: z.string().min(1), quantity: z.number().int().positive() }),
]);

// One item inside a "Minha Viagem" trip group — the same per-type shape as
// createReservationSchema, minus customer/locale/customerRemarks (those
// are hoisted to one shared block on createTripSchema below, since a trip
// group has one contact and one note for the whole submission, not one
// per item).
const dateFields = { dateFrom: z.string().optional(), dateTo: z.string().optional() };
export const tripItemSchema = z.discriminatedUnion("serviceType", [
  z.object({
    serviceType: z.literal("FLIGHT"),
    itemId: z.string().optional(),
    origin: z.string().min(1, "Origem é obrigatória"),
    destinationCity: z.string().min(1, "Destino é obrigatório"),
    passengers: z.number().int().positive(),
    ...dateFields,
  }),
  z.object({ serviceType: z.literal("HOTEL"), itemId: z.string().min(1), nights: z.number().int().positive(), rooms: z.number().int().positive(), ...dateFields }),
  z.object({ serviceType: z.literal("CAR"), itemId: z.string().min(1), days: z.number().int().positive(), ...dateFields }),
  z.object({ serviceType: z.literal("PACKAGE"), itemId: z.string().min(1), passengers: z.number().int().positive(), ...dateFields }),
  z.object({ serviceType: z.literal("SERVICE"), itemId: z.string().min(1), quantity: z.number().int().positive(), ...dateFields }),
]);

export type TripItemInput = z.infer<typeof tripItemSchema>;

export const createTripSchema = z.object({
  locale: z.enum(["pt", "en"]).default("pt"),
  customerRemarks: z.string().max(2000).optional(),
  customer: baseFields.customer,
  // Capped — this is a trip builder for a real itinerary, not a bulk
  // import path; the same per-phone rate limit as single reservations
  // still applies on top of this.
  items: z.array(tripItemSchema).min(1).max(10),
});

export type CreateTripInput = z.infer<typeof createTripSchema>;
