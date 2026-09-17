import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ReservationService, getItemDisplayName } from "@/lib/data-access/reservations";
import { createReservationSchema } from "@/lib/validation/reservation";
import { PricingError } from "@/lib/pricing";
import { isAllowed, isAllowedForKey, reservationRateLimit, reservationPhoneRateLimit } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email";
import { reservationConfirmationEmail } from "@/lib/email-templates";
import { getCurrentCustomerUser } from "@/lib/customer-auth";

// This is what the booking form on the public site submits to. A signed-in
// customer is now required (2026-09-16 decision — replaces the earlier
// guest-checkout design) — enforced here, not just in the form UI, since a
// UI-only gate is not a real gate. Rate-limited against scripted floods on
// top of that; every other failure mode (bad input, item unavailable,
// pricing error) returns a clean 4xx the form can show directly.
export async function POST(request: NextRequest) {
  if (!isAllowed(request, reservationRateLimit)) {
    return NextResponse.json(
      { error: "Demasiados pedidos deste endereço, tente novamente mais tarde" },
      { status: 429 }
    );
  }

  const customerUser = await getCurrentCustomerUser().catch(() => null);
  if (!customerUser) {
    return NextResponse.json(
      { error: "É necessário iniciar sessão com Google para enviar um pedido de reserva" },
      { status: 401 }
    );
  }

  let input: z.infer<typeof createReservationSchema>;
  try {
    const body = await request.json();
    input = createReservationSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Pedido inválido" }, { status: 400 });
  }

  const normalizedPhone = input.customer.phone.replace(/[\s-]/g, "");
  if (!isAllowedForKey(normalizedPhone, reservationPhoneRateLimit)) {
    return NextResponse.json(
      { error: "Já recebemos vários pedidos seus recentemente, aguarde para enviar outro" },
      { status: 429 }
    );
  }

  try {
    const { reservation, quote } = await ReservationService.create(input, customerUser.id);

    // Open flight quote request (no matching published fare) has no
    // catalog item to name — fall back to the route the customer typed.
    const itemName =
      input.serviceType === "FLIGHT" && !input.itemId
        ? `${input.origin} → ${input.destinationCity}`
        : await getItemDisplayName(input.serviceType, input.itemId!, input.locale);

    // Email is a side effect, not a precondition — a down SMTP server
    // must never turn a successful reservation into a failed request.
    if (input.customer.email) {
      const { subject, html } = reservationConfirmationEmail({
        locale: input.locale,
        customerName: input.customer.fullName,
        reference: reservation.reference,
        itemName,
        total: quote?.total ?? null,
        currency: quote?.currency ?? null,
      });
      const emailResult = await sendEmail({ to: input.customer.email, subject, html });
      if (!emailResult.success) {
        console.error(`Confirmation email failed for reservation ${reservation.reference}:`, emailResult.error);
      }
    }

    return NextResponse.json(
      {
        reference: reservation.reference,
        itemName,
        quote,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof PricingError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Error creating reservation:", error);
    return NextResponse.json({ error: "Não foi possível concluir o seu pedido, tente novamente" }, { status: 500 });
  }
}
