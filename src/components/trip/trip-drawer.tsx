"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession, signIn } from "next-auth/react";
import { useTrip } from "@/lib/trip-context";
import { GoogleLogo, FacebookLogo } from "@/components/ui/social-logos";
import { analyzeTripWarnings, type TripWarning } from "@/lib/trip-warnings";
import { formatMZN, formatUSDApprox } from "@/lib/currency";
import type { Locale } from "@/i18n/config";

const COPY = {
  pt: {
    trigger: "Minha Viagem",
    title: "Minha Viagem",
    empty: "A sua viagem está vazia.",
    emptyHint: "Adicione voos, hotéis, carros ou serviços — tudo junto, num único pedido.",
    remove: "Remover",
    total: "Total estimado",
    quotePending: "Sob consulta",
    fullName: "Nome Completo *",
    phone: "Telefone *",
    email: "Email",
    remarksLabel: "Observações (opcional)",
    submit: "Enviar Pedido de Viagem",
    submitting: "A enviar...",
    signInGoogle: "Iniciar Sessão com Google para Reservar",
    signInFacebook: "Iniciar Sessão com Facebook para Reservar",
    successTitle: "Pedido enviado!",
    successBody: "Vai receber um email de confirmação. Pode também ver e descarregar a cotação já.",
    transferHint: "Guarde a referência acima — também pode pagar por transferência bancária no nosso escritório, apresentando este código.",
    reloadNotice: "Esta página vai recarregar automaticamente em breve.",
    downloadQuote: "Ver / Descarregar Cotação",
    newTrip: "Começar nova viagem",
    errorGeneric: "Algo correu mal, tente novamente.",
    signedInAs: "Sessão iniciada como",
    accountRequired: "É necessário iniciar sessão (Google ou Facebook) para enviar o pedido — os seus dados não se perdem.",
    close: "Fechar",
    dismiss: "Ignorar",
    warningDuplicate: (name: string) => `Já tem "${name}" na sua viagem.`,
    warningOverlappingCars: (a: string, b: string) => `"${a}" e "${b}" têm datas sobrepostas — não pode usar os dois ao mesmo tempo.`,
    warningDateOutlier: (name: string) => `As datas de "${name}" não coincidem com o resto da sua viagem.`,
    warningCityMismatch: (cities: string) => `A sua viagem tem itens em cidades diferentes (${cities}) — é uma viagem com várias cidades?`,
    warningPackageOverlapsHotel: (pkg: string, hotel: string) => `O pacote "${pkg}" pode já incluir alojamento — tem a certeza que também quer "${hotel}"?`,
  },
  en: {
    trigger: "My Trip",
    title: "My Trip",
    empty: "Your trip is empty.",
    emptyHint: "Add flights, hotels, cars or services — all together, in one request.",
    remove: "Remove",
    total: "Estimated total",
    quotePending: "On request",
    fullName: "Full Name *",
    phone: "Phone *",
    email: "Email",
    remarksLabel: "Notes (optional)",
    submit: "Send Trip Request",
    submitting: "Sending...",
    signInGoogle: "Sign in with Google to Book",
    signInFacebook: "Sign in with Facebook to Book",
    successTitle: "Request sent!",
    successBody: "You'll receive a confirmation email. You can also view and download the quote now.",
    transferHint: "Keep the reference above — you can also pay by bank transfer at our office by presenting this code.",
    reloadNotice: "This page will reload automatically shortly.",
    downloadQuote: "View / Download Quote",
    newTrip: "Start a new trip",
    errorGeneric: "Something went wrong, please try again.",
    signedInAs: "Signed in as",
    accountRequired: "You need to sign in (Google or Facebook) to send the request — your details won't be lost.",
    close: "Close",
    dismiss: "Dismiss",
    warningDuplicate: (name: string) => `You already have "${name}" in your trip.`,
    warningOverlappingCars: (a: string, b: string) => `"${a}" and "${b}" have overlapping dates — you can't use both at once.`,
    warningDateOutlier: (name: string) => `"${name}"'s dates don't match the rest of your trip.`,
    warningCityMismatch: (cities: string) => `Your trip has items in different cities (${cities}) — is this a multi-city trip?`,
    warningPackageOverlapsHotel: (pkg: string, hotel: string) => `The "${pkg}" package may already include accommodation — are you sure you also want "${hotel}"?`,
  },
};

const TripIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M20 6h-2.18c.07-.44.18-.88.18-1.34C18 2.54 15.96.5 13.5.5S9 2.54 9 4.66c0 .46.1.9.18 1.34H7C5.9 6 5 6.9 5 8v13c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-8.34-1.34c0-1.02.82-1.84 1.84-1.84s1.84.82 1.84 1.84c0 .46-.1.9-.26 1.34h-3.16c-.16-.44-.26-.88-.26-1.34zM15 15H9v-2h6v2z" />
  </svg>
);

type SubmitState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; tripGroupId: string; quoteUrl: string };

export function TripDrawer({ locale }: { locale: Locale }) {
  const t = COPY[locale];
  const { items, removeItem, clear, isOpen, open, close, contact, setContact } = useTrip();
  const { data: session, status: sessionStatus } = useSession();

  const [submit, setSubmit] = useState<SubmitState>({ status: "idle" });
  const [dismissedWarnings, setDismissedWarnings] = useState<Set<string>>(new Set());

  // Slide-in/out instead of a hard cut — keep the panel mounted for the
  // close transition's duration, and drive the transform/opacity off a
  // separate `visible` flag so the "just mounted" frame renders off-screen
  // before transitioning to its resting position on the next frame.
  const [shouldRender, setShouldRender] = useState(false);
  const [visible, setVisible] = useState(false);
  // Split into two effects so the "mount off-screen, THEN transition to
  // visible" sequencing is guaranteed: the second effect only runs once
  // shouldRender has actually committed a render with visible still
  // false, which is what makes the CSS transition animate instead of
  // jumping straight to its end state. Every setState call is deferred
  // (setTimeout/rAF callback), never synchronous in the effect body
  // itself, per react-hooks/set-state-in-effect.
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setShouldRender(true), 0);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => setShouldRender(false), 300);
    return () => clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    if (shouldRender && isOpen) {
      const raf = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf);
    }
    const timer = setTimeout(() => setVisible(false), 0);
    return () => clearTimeout(timer);
  }, [shouldRender, isOpen]);

  // Auto-reload after a successful submission — long enough to read/copy
  // the reference and click the quote link (opens in a new tab, so the
  // reload here doesn't interrupt it), then resets to a clean form.
  useEffect(() => {
    if (submit.status !== "success") return;
    const timer = setTimeout(() => window.location.reload(), 8000);
    return () => clearTimeout(timer);
  }, [submit.status]);

  const warningKey = (w: TripWarning) => `${w.type}-${w.localId}`;
  const warnings = useMemo(() => analyzeTripWarnings(items), [items]);
  const visibleWarnings = warnings.filter((w) => !dismissedWarnings.has(warningKey(w)));

  const warningMessage = (w: TripWarning) => {
    switch (w.type) {
      case "duplicate":
        return t.warningDuplicate(w.itemName);
      case "overlappingCars":
        return t.warningOverlappingCars(w.itemNameA, w.itemNameB);
      case "dateOutlier":
        return t.warningDateOutlier(w.itemName);
      case "cityMismatch":
        return t.warningCityMismatch(w.cities.join(", "));
      case "packageOverlapsHotel":
        return t.warningPackageOverlapsHotel(w.packageName, w.hotelName);
    }
  };

  const grandTotal = items.reduce((sum, i) => (i.price != null ? sum + i.price : sum), 0);
  const currency = items.find((i) => i.price != null)?.currency ?? "MZN";
  const hasAnyPrice = items.some((i) => i.price != null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submit.status === "loading") return;

    // Account creation is mandatory to submit — but the fields above are
    // already saved to localStorage via TripProvider's contact state, so
    // the OAuth round-trip doesn't lose anything typed so far. This is a
    // fallback only (e.g. Enter key in a text field) — the normal path is
    // one of the two provider-specific buttons below, which call signIn
    // directly and never reach here. No provider specified here on
    // purpose: NextAuth's own sign-in page lists both.
    if (!session?.user) {
      signIn();
      return;
    }

    setSubmit({ status: "loading" });

    try {
      const response = await fetch("/api/reservations/trip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale,
          customerRemarks: contact.remarks || undefined,
          customer: { fullName: contact.fullName, phone: contact.phone, email: contact.email || undefined },
          items: items.map((i) => ({
            serviceType: i.serviceType,
            itemId: i.itemId,
            nights: i.nights,
            rooms: i.rooms,
            days: i.days,
            passengers: i.passengers,
            quantity: i.quantity,
            origin: i.origin,
            destinationCity: i.destinationCity,
            dateFrom: i.dateFrom,
            dateTo: i.dateTo,
          })),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setSubmit({ status: "error", message: data.error || t.errorGeneric });
        return;
      }
      setSubmit({ status: "success", tripGroupId: data.tripGroupId, quoteUrl: data.quoteUrl });
      clear();
    } catch {
      setSubmit({ status: "error", message: t.errorGeneric });
    }
  };

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          onClick={open}
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 bg-leafy text-white rounded-full pl-3 pr-4 py-2.5 sm:pl-4 sm:pr-5 sm:py-3 flex items-center gap-2 shadow-xl hover:bg-leafy/90 transition-all duration-300 cursor-pointer"
        >
          <TripIcon />
          <span className="text-sm font-semibold">{t.trigger}</span>
          {items.length > 0 && (
            <span className="bg-orange text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">{items.length}</span>
          )}
        </button>
      )}

      {shouldRender && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}
            onClick={close}
          />
          <div
            className={`relative w-full max-w-sm bg-white h-full overflow-y-auto flex flex-col transition-transform duration-300 ease-out ${
              visible ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <div className="bg-leafy px-6 py-5 flex items-center justify-between shrink-0">
              <h2 className="text-white text-lg">{t.title}</h2>
              <button type="button" onClick={close} aria-label={t.close} className="text-white/70 hover:text-white cursor-pointer">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {submit.status === "success" ? (
              <div className="p-6 flex-1 flex flex-col items-center text-center justify-center gap-4">
                <div className="w-14 h-14 rounded-full bg-orange/10 text-orange flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-7 h-7">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-textdark text-xl">{t.successTitle}</h3>
                <p className="text-parablack text-sm">{t.successBody}</p>
                <p className="text-darkgray text-xs leading-relaxed max-w-[260px]">{t.transferHint}</p>
                <Link
                  href={submit.quoteUrl}
                  target="_blank"
                  className="bg-orange hover:bg-orange/90 text-white rounded-3xl px-6 py-3 text-sm font-semibold uppercase transition-all duration-300"
                >
                  {t.downloadQuote}
                </Link>
                <button
                  type="button"
                  onClick={() => setSubmit({ status: "idle" })}
                  className="text-parablack text-sm underline"
                >
                  {t.newTrip}
                </button>
                <p className="text-darkgray/60 text-[11px]">{t.reloadNotice}</p>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-3">
                  {items.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-textdark text-sm font-medium mb-1">{t.empty}</p>
                      <p className="text-darkgray text-xs leading-relaxed max-w-[220px] mx-auto">{t.emptyHint}</p>
                    </div>
                  )}
                  {items.map((item) => (
                    <div key={item.localId} className="border border-darkgray/20 rounded-xl p-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-textdark text-sm font-medium truncate">{item.name}</p>
                        <p className="text-darkgray text-xs">{item.detail}</p>
                        {item.price != null ? (
                          <p className="text-orange text-sm font-semibold mt-1">{formatMZN(item.price, item.currency, locale)}</p>
                        ) : (
                          <p className="text-darkgray text-xs mt-1">{t.quotePending}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.localId)}
                        aria-label={t.remove}
                        className="text-darkgray hover:text-red-500 shrink-0 cursor-pointer"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}

                  {visibleWarnings.map((w) => (
                    <div key={warningKey(w)} className="bg-amber-50 border border-amber-300 rounded-xl p-3 flex items-start gap-2 animate-drop-in">
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-amber-500 shrink-0 mt-0.5">
                        <path d="M12 2L1 21h22L12 2zm0 5.5L18.8 19H5.2L12 7.5zM11 10v4h2v-4h-2zm0 5v2h2v-2h-2z" />
                      </svg>
                      <div className="flex-1 min-w-0">
                        <p className="text-amber-800 text-xs leading-relaxed">{warningMessage(w)}</p>
                        <button
                          type="button"
                          onClick={() => setDismissedWarnings((prev) => new Set(prev).add(warningKey(w)))}
                          className="text-amber-700 text-[11px] underline mt-1 cursor-pointer"
                        >
                          {t.dismiss}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {items.length > 0 && (
                  <form onSubmit={handleSubmit} className="border-t border-darkgray/15 p-6 flex flex-col gap-3 shrink-0">
                    {hasAnyPrice && (
                      <div className="flex items-center justify-between pb-2">
                        <span className="text-darkgray text-xs uppercase tracking-wide">{t.total}</span>
                        <div className="text-right">
                          <span className="block text-orange font-bold">{formatMZN(grandTotal, currency, locale)}</span>
                          <span className="block text-darkgray text-[11px]">{formatUSDApprox(grandTotal, currency, locale)}</span>
                        </div>
                      </div>
                    )}

                    <input required value={contact.fullName} onChange={(e) => setContact({ fullName: e.target.value })} placeholder={t.fullName} className="border border-shadow rounded-lg px-3 py-2 text-sm" />
                    <input required type="tel" value={contact.phone} onChange={(e) => setContact({ phone: e.target.value })} placeholder={t.phone} className="border border-shadow rounded-lg px-3 py-2 text-sm" />
                    <input type="email" value={contact.email} onChange={(e) => setContact({ email: e.target.value })} placeholder={t.email} className="border border-shadow rounded-lg px-3 py-2 text-sm" />
                    <textarea value={contact.remarks} onChange={(e) => setContact({ remarks: e.target.value })} placeholder={t.remarksLabel} rows={2} className="border border-shadow rounded-lg px-3 py-2 text-sm" />

                    {submit.status === "error" && <p className="text-red-500 text-xs">{submit.message}</p>}

                    {session?.user ? (
                      <button
                        type="submit"
                        disabled={submit.status === "loading"}
                        className="bg-orange hover:bg-orange/90 text-white rounded-3xl px-6 py-3 text-sm font-semibold uppercase transition-all duration-300 cursor-pointer disabled:opacity-60"
                      >
                        {submit.status === "loading" ? t.submitting : t.submit}
                      </button>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => signIn("google")}
                          disabled={sessionStatus === "loading"}
                          className="bg-leafy hover:bg-leafy/90 text-white rounded-3xl px-6 py-2 text-sm font-semibold uppercase transition-all duration-300 cursor-pointer disabled:opacity-60 flex items-center justify-center gap-3"
                        >
                          <span className="w-7 h-7 rounded-full bg-white flex items-center justify-center shrink-0">
                            <GoogleLogo className="w-3.5 h-3.5" />
                          </span>
                          {t.signInGoogle}
                        </button>
                        <button
                          type="button"
                          onClick={() => signIn("facebook")}
                          disabled={sessionStatus === "loading"}
                          className="bg-[#1877F2] hover:bg-[#1877F2]/90 text-white rounded-3xl px-6 py-2 text-sm font-semibold uppercase transition-all duration-300 cursor-pointer disabled:opacity-60 flex items-center justify-center gap-3"
                        >
                          <span className="w-7 h-7 rounded-full bg-white flex items-center justify-center shrink-0">
                            <FacebookLogo className="w-3.5 h-3.5" />
                          </span>
                          {t.signInFacebook}
                        </button>
                      </div>
                    )}

                    <p className="text-center text-xs text-darkgray">
                      {session?.user?.email ? (
                        <>{t.signedInAs} {session.user.name || session.user.email}</>
                      ) : (
                        t.accountRequired
                      )}
                    </p>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
