import Image from "next/image";
import Link from "next/link";
import { ReservationService } from "@/lib/data-access/reservations";
import { formatMZN, formatUSDApprox } from "@/lib/currency";
import { localizedPath, isLocale, defaultLocale } from "@/i18n/config";
import { getCurrentCustomerUser } from "@/lib/customer-auth";
import { PrintButton } from "./print-button";
import { PaymentPanel } from "@/components/trip/payment-panel";
import { FaqInline } from "@/components/faq/faq-inline";

const PAYABLE_STATUSES = new Set(["RECEIVED", "IN_REVIEW", "QUOTE_SENT", "AWAITING_PAYMENT", "PAYMENT_PENDING"]);

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ lang: string; tripGroupId: string }>;
};

const COPY = {
  pt: {
    title: "Cotação da Viagem",
    subtitle: "Resumo dos itens pedidos e o valor estimado de cada um.",
    item: "Item",
    dates: "Datas",
    price: "Valor estimado",
    payment: "Pagamento",
    total: "Total estimado",
    quotePending: "Sob consulta",
    customer: "Cliente",
    download: "Descarregar / Imprimir PDF",
    backHome: "Voltar ao site",
    footerNote: "Este documento é uma cotação, não uma fatura. Itens com valor já confirmado podem ser pagos online diretamente aqui; itens ainda sob consulta são confirmados por um dos nossos agentes antes do pagamento.",
    notFoundTitle: "Cotação não encontrada",
    notFoundBody: "Verifique o link recebido por email ou contacte-nos.",
  },
  en: {
    title: "Trip Quote",
    subtitle: "Summary of the requested items and each one's estimated value.",
    item: "Item",
    dates: "Dates",
    price: "Estimated price",
    payment: "Payment",
    total: "Estimated total",
    quotePending: "On request",
    customer: "Customer",
    download: "Download / Print PDF",
    backHome: "Back to the site",
    footerNote: "This document is a quote, not an invoice. Items with a confirmed price can be paid online right here; items still on request are confirmed by one of our agents before payment.",
    notFoundTitle: "Quote not found",
    notFoundBody: "Check the link from your email, or contact us.",
  },
};

const ITEM_NAME_LOCALE_FIELD = { pt: "namePt", en: "nameEn" } as const;

function itemName(r: Awaited<ReturnType<typeof ReservationService.findByTripGroupId>>[number], locale: "pt" | "en") {
  const field = ITEM_NAME_LOCALE_FIELD[locale];
  if (r.flightOffer) return `${r.flightOffer.origin} → ${r.flightOffer.destinationLabel}`;
  if (r.hotel) return r.hotel[field];
  if (r.vehicle) return `${r.vehicle.category} · ${r.vehicle.model}`;
  if (r.package) return r.package[field];
  if (r.ancillaryService) return r.ancillaryService[field];
  if (r.serviceType === "FLIGHT" && r.origin && r.destinationCity) return `${r.origin} → ${r.destinationCity}`;
  return "—";
}

function formatDateRange(from: Date | null, to: Date | null, locale: "pt" | "en") {
  const fmt = (d: Date) => d.toLocaleDateString(locale === "pt" ? "pt-PT" : "en-US", { day: "2-digit", month: "short", year: "numeric" });
  if (from && to) return `${fmt(from)} — ${fmt(to)}`;
  if (from) return fmt(from);
  return "—";
}

export default async function TripQuotePage({ params }: PageProps) {
  const { lang, tripGroupId } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const t = COPY[locale];

  const [reservations, viewer] = await Promise.all([
    ReservationService.findByTripGroupId(tripGroupId),
    getCurrentCustomerUser(),
  ]);

  if (reservations.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-beige px-7 text-center">
        <div>
          <h1 className="text-3xl text-textdark mb-2">{t.notFoundTitle}</h1>
          <p className="text-parablack mb-6">{t.notFoundBody}</p>
          <Link href={localizedPath(locale, "/")} className="text-orange underline">
            {t.backHome}
          </Link>
        </div>
      </div>
    );
  }

  const customer = reservations[0].customer;
  const grandTotal = reservations.reduce((sum, r) => (r.quotedPrice != null ? sum + Number(r.quotedPrice) : sum), 0);
  const currency = reservations.find((r) => r.quotedCurrency)?.quotedCurrency ?? "MZN";
  const hasAnyPrice = reservations.some((r) => r.quotedPrice != null);

  // Only the signed-in owner of a reservation can pay for it online (see
  // /api/reservations/[id]/pay) — an older guest-checkout reservation with
  // no linked account, or someone just viewing the link, gets no payment
  // column at all rather than a button that would 401/404 if clicked.
  const isPayable = (r: (typeof reservations)[number]) =>
    !!viewer && r.customerUserId === viewer.id && r.quotedPrice != null && r.quotedCurrency != null && PAYABLE_STATUSES.has(r.status);
  const showPaymentColumn = reservations.some(isPayable);

  return (
    <div className="min-h-screen bg-beige py-10 px-4 print:bg-white print:py-0">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-darkgray/20 overflow-hidden print:border-0 print:rounded-none">
        <div className="bg-leafy px-8 py-8 flex items-center justify-between print:bg-white print:border-b print:border-black">
          {/* The logo art is white-on-transparent; the header itself turns
              white for print (see the parent div below), so without
              inverting here the logo would be invisible on a printed
              page — this is the actual fix for "the PDF needs our logo". */}
          <Image src="/icons/logooficial.png" alt="ZambiTour" width={280} height={228} className="h-12 w-auto object-contain print:invert" />
          <div className="text-right">
            <h1 className="text-white text-xl print:text-black">{t.title}</h1>
            <p className="text-white/50 text-xs print:text-black">{tripGroupId.slice(0, 8).toUpperCase()}</p>
          </div>
        </div>

        <div className="px-8 py-8">
          <p className="text-parablack text-sm mb-6">{t.subtitle}</p>

          <div className="mb-6 text-sm">
            <p className="text-darkgray text-xs uppercase tracking-wide mb-1">{t.customer}</p>
            <p className="text-textdark font-medium">{customer.fullName}</p>
            <p className="text-parablack">{customer.phone}{customer.email ? ` · ${customer.email}` : ""}</p>
          </div>

          <table className="w-full text-sm mb-6">
            <thead>
              <tr className="border-b border-darkgray/20 text-left text-xs uppercase text-darkgray">
                <th className="py-2 font-medium">{t.item}</th>
                <th className="py-2 font-medium">{t.dates}</th>
                <th className="py-2 font-medium text-right">{t.price}</th>
                {showPaymentColumn && <th className="py-2 font-medium text-right print:hidden">{t.payment}</th>}
              </tr>
            </thead>
            <tbody>
              {reservations.map((r) => (
                <tr key={r.id} className="border-b border-darkgray/10">
                  <td className="py-3 pr-3 text-textdark">
                    {itemName(r, locale)}
                    <span className="block text-darkgray text-xs">{r.reference}</span>
                  </td>
                  <td className="py-3 pr-3 text-parablack">{formatDateRange(r.dateFrom, r.dateTo, locale)}</td>
                  <td className="py-3 text-right">
                    {r.quotedPrice != null && r.quotedCurrency ? (
                      <>
                        <span className="block text-orange font-semibold">{formatMZN(Number(r.quotedPrice), r.quotedCurrency, locale)}</span>
                        <span className="block text-darkgray text-[11px]">{formatUSDApprox(Number(r.quotedPrice), r.quotedCurrency, locale)}</span>
                      </>
                    ) : (
                      <span className="text-darkgray">{t.quotePending}</span>
                    )}
                  </td>
                  {showPaymentColumn && (
                    <td className="py-3 pl-3 text-right print:hidden">
                      {isPayable(r) && (
                        <PaymentPanel
                          reservationId={r.id}
                          itemName={itemName(r, locale)}
                          amount={Number(r.quotedPrice)}
                          currency={r.quotedCurrency as string}
                          locale={locale}
                        />
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            {hasAnyPrice && (
              <tfoot>
                <tr className="border-t-2 border-orange">
                  <td className="py-3 font-semibold text-textdark" colSpan={2}>{t.total}</td>
                  <td className="py-3 text-right">
                    <span className="block text-orange font-bold text-lg">{formatMZN(grandTotal, currency, locale)}</span>
                    <span className="block text-darkgray text-[11px]">{formatUSDApprox(grandTotal, currency, locale)}</span>
                  </td>
                  {showPaymentColumn && <td className="print:hidden" />}
                </tr>
              </tfoot>
            )}
          </table>

          <p className="text-darkgray text-xs leading-relaxed mb-6 print:mb-0">{t.footerNote}</p>

          {showPaymentColumn && (
            <div className="mb-6 print:hidden">
              <FaqInline
                ids={["faq-mpesa-emola-failed", "faq-bank-transfer", "faq-payment-failed", "faq-double-charge"]}
                locale={locale}
              />
            </div>
          )}

          <div className="flex items-center justify-between print:hidden">
            <Link href={localizedPath(locale, "/")} className="text-sm text-parablack hover:text-orange underline">
              {t.backHome}
            </Link>
            <PrintButton label={t.download} />
          </div>
        </div>
      </div>
    </div>
  );
}
