import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { calculateQuote, type PriceQuote } from "@/lib/pricing";
import type { CreateReservationInput, CreateTripInput, TripItemInput } from "@/lib/validation/reservation";
import type { ReservationServiceType, ReservationStatus } from "@/generated/prisma/client";

export type { CreateReservationInput };

const SERVICE_TYPE_FK: Record<ReservationServiceType, string | null> = {
  FLIGHT: "flightOfferId",
  HOTEL: "hotelId",
  CAR: "vehicleId",
  PACKAGE: "packageId",
  SERVICE: "ancillaryServiceId",
  CUSTOM: null,
};

// Never spread a full AdminUser into an API response — it carries
// passwordHash. Every place an agent/note-author gets included below
// selects exactly these fields, nothing more.
const SAFE_ADMIN_SELECT = { id: true, name: true, email: true, role: true } as const;

/** ZT-YYMMDD-XXXX — human-facing, not guessable enough to matter for a
 * booking reference (RF-024), unique-checked with a short retry loop
 * since a collision is astronomically unlikely but not impossible. */
async function generateReference(): Promise<string> {
  const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  for (let attempt = 0; attempt < 5; attempt++) {
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    const reference = `ZT-${datePart}-${suffix}`;
    const existing = await prisma.reservation.findUnique({ where: { reference } });
    if (!existing) return reference;
  }
  throw new Error("Could not generate a unique reservation reference after 5 attempts");
}

/** Localized display name for whatever was booked — used in the
 * confirmation email and the submission response, not stored anywhere. */
export async function getItemDisplayName(
  serviceType: ReservationServiceType,
  itemId: string,
  locale: "pt" | "en"
): Promise<string> {
  const pick = (pt: string, en: string) => (locale === "pt" ? pt : en);
  switch (serviceType) {
    case "FLIGHT": {
      const f = await prisma.flightOffer.findUnique({ where: { id: itemId } });
      return f ? `${f.origin} → ${f.destinationLabel}` : "";
    }
    case "HOTEL": {
      const h = await prisma.hotel.findUnique({ where: { id: itemId } });
      return h ? pick(h.namePt, h.nameEn) : "";
    }
    case "CAR": {
      const v = await prisma.vehicle.findUnique({ where: { id: itemId } });
      return v ? `${v.category} · ${v.model}` : "";
    }
    case "PACKAGE": {
      const p = await prisma.travelPackage.findUnique({ where: { id: itemId } });
      return p ? pick(p.namePt, p.nameEn) : "";
    }
    case "SERVICE": {
      const s = await prisma.ancillaryService.findUnique({ where: { id: itemId } });
      return s ? pick(s.namePt, s.nameEn) : "";
    }
    default:
      return "";
  }
}

// Two carve-outs leave a null quote instead of pricing/erroring: an open
// flight route with no matching published fare (nothing to price against
// yet), and a quote-only ancillary service (basePrice deliberately null,
// e.g. visa guidance) — both are normal quote requests an agent prices by
// hand, not a validation failure. Shared by both create() and
// createTripGroup() so a flight/service item prices identically whichever
// path it comes through.
async function priceItem(item: TripItemInput): Promise<PriceQuote | null> {
  if (item.serviceType === "FLIGHT") {
    if (!item.itemId) return null;
    return calculateQuote({ serviceType: "FLIGHT", itemId: item.itemId, passengers: item.passengers });
  }
  if (item.serviceType === "SERVICE") {
    const service = await prisma.ancillaryService.findUnique({ where: { id: item.itemId } });
    if (service?.basePrice == null) return null;
    return calculateQuote(item);
  }
  return calculateQuote(item);
}

// Customer.phone is indexed, not unique (a household/company phone can
// legitimately belong to more than one customer record) — so this is a
// manual find-then-create/update, not a true upsert.
async function upsertCustomerByPhone(input: { fullName: string; phone: string; email?: string }) {
  const existing = await prisma.customer.findFirst({ where: { phone: input.phone } });
  return existing
    ? prisma.customer.update({
        where: { id: existing.id },
        data: { fullName: input.fullName, email: input.email || undefined },
      })
    : prisma.customer.create({
        data: { fullName: input.fullName, phone: input.phone, email: input.email || undefined },
      });
}

export class ReservationService {
  static async create(input: CreateReservationInput, customerUserId?: string) {
    // Price it first — calculateQuote throws PricingError for anything the
    // customer needs to see as a clean validation message (item not
    // found/published, bad quantity), before any database write happens.
    const quote = await priceItem(input);
    const customer = await upsertCustomerByPhone(input.customer);

    const reference = await generateReference();
    const fkField = SERVICE_TYPE_FK[input.serviceType];

    const reservation = await prisma.reservation.create({
      data: {
        reference,
        customerId: customer.id,
        customerUserId,
        serviceType: input.serviceType,
        status: "RECEIVED",
        ...(fkField ? { [fkField]: input.itemId } : {}),
        passengers: "passengers" in input ? input.passengers : 1,
        dateFrom: input.dateFrom ? new Date(input.dateFrom) : undefined,
        dateTo: input.dateTo ? new Date(input.dateTo) : undefined,
        origin: input.serviceType === "FLIGHT" ? input.origin : undefined,
        destinationCity: input.serviceType === "FLIGHT" ? input.destinationCity : undefined,
        customerRemarks: input.customerRemarks,
        // RF-027 — the price is frozen at submission time, not left to
        // float with later catalog changes. Stays null for an unpriced
        // flight quote request until an agent sends one (QUOTE_SENT).
        quotedPrice: quote?.total,
        quotedCurrency: quote?.currency,
        quoteSentAt: quote ? new Date() : undefined,
      },
    });

    return { reservation, customer, quote };
  }

  /** "Minha Viagem" trip builder — several items (a flight quote, a hotel,
   * a package, a service...) submitted together under one shared
   * tripGroupId, one contact record, one consolidated confirmation email.
   * Each item is still priced and stored exactly like a single-item
   * reservation — a trip group is a join key, not a different data shape. */
  static async createTripGroup(input: CreateTripInput, customerUserId?: string) {
    const customer = await upsertCustomerByPhone(input.customer);
    const tripGroupId = randomUUID();

    const results = [];
    for (const item of input.items) {
      const quote = await priceItem(item);
      const reference = await generateReference();
      const fkField = SERVICE_TYPE_FK[item.serviceType];

      const reservation = await prisma.reservation.create({
        data: {
          reference,
          customerId: customer.id,
          customerUserId,
          tripGroupId,
          serviceType: item.serviceType,
          status: "RECEIVED",
          ...(fkField ? { [fkField]: item.itemId } : {}),
          passengers: "passengers" in item ? item.passengers : 1,
          dateFrom: item.dateFrom ? new Date(item.dateFrom) : undefined,
          dateTo: item.dateTo ? new Date(item.dateTo) : undefined,
          origin: item.serviceType === "FLIGHT" ? item.origin : undefined,
          destinationCity: item.serviceType === "FLIGHT" ? item.destinationCity : undefined,
          customerRemarks: input.customerRemarks,
          quotedPrice: quote?.total,
          quotedCurrency: quote?.currency,
          quoteSentAt: quote ? new Date() : undefined,
        },
      });

      results.push({ reservation, quote });
    }

    return { tripGroupId, customer, items: results };
  }

  static async findByTripGroupId(tripGroupId: string) {
    return prisma.reservation.findMany({
      where: { tripGroupId },
      include: {
        customer: true,
        flightOffer: true,
        hotel: true,
        vehicle: true,
        package: true,
        ancillaryService: true,
      },
      orderBy: { createdAt: "asc" },
    });
  }

  static async findAll(options: { status?: ReservationStatus; serviceType?: ReservationServiceType } = {}) {
    return prisma.reservation.findMany({
      where: {
        status: options.status,
        serviceType: options.serviceType,
      },
      include: {
        customer: true,
        flightOffer: true,
        hotel: true,
        vehicle: true,
        package: true,
        ancillaryService: true,
        agent: { select: SAFE_ADMIN_SELECT },
        payments: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  static async findById(id: string) {
    return prisma.reservation.findUnique({
      where: { id },
      include: {
        customer: true,
        flightOffer: true,
        hotel: true,
        vehicle: true,
        package: true,
        ancillaryService: true,
        agent: { select: SAFE_ADMIN_SELECT },
        payments: true,
        agentNotes: { include: { author: { select: SAFE_ADMIN_SELECT } }, orderBy: { createdAt: "desc" } },
      },
    });
  }

  static async updateStatus(id: string, status: ReservationStatus, agentId: string, actorId: string) {
    const before = await prisma.reservation.findUnique({ where: { id } });
    if (!before) return null;

    if (status === "CONFIRMED") {
      const payment = await prisma.payment.findFirst({
        where: { reservationId: id },
        orderBy: { createdAt: "desc" },
      });
      if (payment?.method === "TRANSFER" && !payment.agentReceiptData) {
        throw new Error("É obrigatório anexar o comprovativo da agência antes de confirmar a transferência");
      }
    }

    const after = await prisma.reservation.update({
      where: { id },
      data: {
        status,
        agentId,
        confirmedAt: status === "CONFIRMED" ? new Date() : undefined,
      },
    });

    const { logAudit } = await import("@/lib/audit");
    await logAudit({
      actorId,
      action: `reservation.status:${status}`,
      entityType: "Reservation",
      entityId: id,
      before,
      after,
    });

    return after;
  }

  static async summary() {
    const counts = await prisma.reservation.groupBy({ by: ["status"], _count: { _all: true } });
    const statuses: ReservationStatus[] = [
      "RECEIVED", "IN_REVIEW", "QUOTE_SENT", "AWAITING_PAYMENT", "PAYMENT_PENDING",
      "CONFIRMED", "REJECTED", "CANCELLED", "COMPLETED",
    ];
    const result = Object.fromEntries(statuses.map((s) => [s, 0])) as Record<ReservationStatus, number>;
    for (const c of counts) result[c.status] = c._count._all;
    const total = counts.reduce((sum, c) => sum + c._count._all, 0);
    return { total, byStatus: result, needsAttention: result.RECEIVED + result.IN_REVIEW };
  }

  static async findRecent(limit = 8) {
    return prisma.reservation.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        reference: true,
        status: true,
        serviceType: true,
        createdAt: true,
        customer: { select: { fullName: true } },
      },
    });
  }

  static async addNote(reservationId: string, authorId: string, body: string) {
    return prisma.reservationNote.create({
      data: { reservationId, authorId, body },
      include: { author: { select: SAFE_ADMIN_SELECT } },
    });
  }
}
