import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ReservationService, getItemDisplayName } from "@/lib/data-access/reservations";
import { createTripSchema } from "@/lib/validation/reservation";
import { PricingError } from "@/lib/pricing";
import { isAllowed, isAllowedForKey, reservationRateLimit, reservationPhoneRateLimit } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email";
import { tripConfirmationEmail } from "@/lib/email-templates";
import { getCurrentCustomerUser } from "@/lib/customer-auth";
import { localizedPath } from "@/i18n/config";

// Public, unauthenticated (signing in is optional everywhere) — submits
// the whole "Minha Viagem" stack as one request. Same rate limits as a
// single reservation; a trip group is still one person's submission, not
// a bulk-import path (also capped at 10 items by createTripSchema itself).
export async function POST(request: NextRequest) {
  if (!isAllowed(request, reservationRateLimit)) {
    return NextResponse.json(
      { error: "Demasiados pedidos deste endereço, tente novamente mais tarde" },
      { status: 429 }
    );
  }

  let input: z.infer<typeof createTripSchema>;
  try {
    const body = await request.json();
    input = createTripSchema.parse(body);
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
    const customerUser = await getCurrentCustomerUser().catch(() => null);
    const { tripGroupId, items } = await ReservationService.createTripGroup(input, customerUser?.id);

    const itemSummaries = await Promise.all(
      items.map(async ({ reservation, quote }, index) => {
        const sourceItem = input.items[index];
        const itemName =
          sourceItem.serviceType === "FLIGHT" && !sourceItem.itemId
            ? `${sourceItem.origin} → ${sourceItem.destinationCity}`
            : await getItemDisplayName(sourceItem.serviceType, sourceItem.itemId!, input.locale);
        return {
          reference: reservation.reference,
          itemName,
          total: quote?.total ?? null,
          currency: quote?.currency ?? null,
        };
      })
    );

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
    const quoteUrl = `${siteUrl}${localizedPath(input.locale, `/viagem/${tripGroupId}`)}`;

    if (input.customer.email) {
      const { subject, html } = tripConfirmationEmail({
        locale: input.locale,
        customerName: input.customer.fullName,
        tripGroupId,
        items: itemSummaries,
        quoteUrl,
      });
      const emailResult = await sendEmail({ to: input.customer.email, subject, html });
      if (!emailResult.success) {
        console.error(`Trip confirmation email failed for trip ${tripGroupId}:`, emailResult.error);
      }
    }

    return NextResponse.json({ tripGroupId, items: itemSummaries, quoteUrl }, { status: 201 });
  } catch (error) {
    if (error instanceof PricingError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Error creating trip group:", error);
    return NextResponse.json({ error: "Não foi possível concluir o seu pedido, tente novamente" }, { status: 500 });
  }
}
