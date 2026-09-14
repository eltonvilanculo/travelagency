"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { CitySelect } from "@/components/ui/city-select";
import { formatMZN, formatUSDApprox } from "@/lib/currency";
import { useTrip, type TripItem } from "@/lib/trip-context";
import type { Dictionary } from "@/i18n/types";
import type { Locale } from "@/i18n/config";

type ServiceTab = "flight" | "hotel" | "car" | "package" | "service";

export type CatalogOption = { id: string; name: string; price: number; currency: string; included?: string[]; city?: string };

// Ancillary services are the one catalog type that can be genuinely
// priceless (basePrice null = quote-only, e.g. visa guidance) — kept as
// its own type rather than widening CatalogOption.price everywhere else.
export type ServiceOption = { id: string; name: string; price: number | null; currency: string };

export type BookingInitialValues = {
  tab?: ServiceTab;
  itemId?: string;
  from?: string;
  to?: string;
  /** Start date — departure (flight), check-in (hotel), or pickup (car). */
  date?: string;
  /** End date — return (flight, round-trip only), check-out (hotel), or drop-off (car). */
  dateTo?: string;
  passengers?: number;
  rooms?: number;
};

type BookingProps = {
  locale: Locale;
  copy: Dictionary["sections"]["booking"];
  hotels: CatalogOption[];
  vehicles: CatalogOption[];
  packages: CatalogOption[];
  services: ServiceOption[];
  initial?: BookingInitialValues;
};

const inputClass =
  "w-full bg-transparent border border-white/30 rounded-lg px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-orange transition-colors text-sm";

const labelClass = "block text-xs mb-1.5 text-white/70 uppercase tracking-wide";

const PlaneIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 shrink-0">
    <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
  </svg>
);
const BedIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 shrink-0">
    <path d="M7 13c1.66 0 3-1.34 3-3S8.66 7 7 7s-3 1.34-3 3 1.34 3 3 3zm12-6h-8v7H3V5H1v15h2v-3h18v3h2v-9c0-2.21-1.79-4-4-4z" />
  </svg>
);
const CarIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 shrink-0">
    <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" />
  </svg>
);
const PackageIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 shrink-0">
    <path d="M21 16.5c0 .38-.21.71-.53.88l-7.9 4.44c-.16.12-.36.18-.57.18s-.41-.06-.57-.18l-7.9-4.44A1 1 0 0 1 3 16.5v-9c0-.38.21-.71.53-.88l7.9-4.44c.16-.12.36-.18.57-.18s.41.06.57.18l7.9 4.44c.32.17.53.5.53.88v9zM12 4.15L6.04 7.5 12 10.85l5.96-3.35L12 4.15zM5 15.91l6 3.38v-6.71l-6-3.37v6.7zm14 0v-6.7l-6 3.37v6.71l6-3.38z" />
  </svg>
);
const ServiceIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 shrink-0">
    <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
  </svg>
);

function countLabel(count: number, singular: string, plural: string) {
  return `${count} ${count > 1 ? plural : singular}`;
}

function daysBetween(from: string, to: string): number {
  if (!from || !to) return 0;
  const ms = new Date(to).getTime() - new Date(from).getTime();
  return Math.round(ms / 86_400_000);
}

// Local calendar date, not UTC — see the identical note in hero.tsx.
function formatDateShort(iso: string, locale: Locale): string {
  return new Date(iso).toLocaleDateString(locale === "pt" ? "pt-PT" : "en-US", { day: "2-digit", month: "short" });
}

function todayStr(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

type QuoteState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; total: number; currency: string };

type SubmitState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; reference: string };

export function Booking({ locale, copy, hotels, vehicles, packages, services, initial }: BookingProps) {
  const today = todayStr();
  const [activeTab, setActiveTab] = useState<ServiceTab>(initial?.tab ?? "flight");

  const [origin, setOrigin] = useState(initial?.tab === "flight" ? initial?.from ?? "" : "");
  const [destinationCity, setDestinationCity] = useState(initial?.tab === "flight" ? initial?.to ?? "" : "");
  const [departureDate, setDepartureDate] = useState(initial?.tab === "flight" ? initial?.date ?? "" : "");
  const [returnDate, setReturnDate] = useState(initial?.tab === "flight" ? initial?.dateTo ?? "" : "");
  const [passengers, setPassengers] = useState(initial?.tab === "flight" ? initial?.passengers ?? 1 : 1);

  const handleDepartureDateChange = (value: string) => {
    setDepartureDate(value);
    if (returnDate && value && returnDate < value) setReturnDate("");
  };

  const [hotelId, setHotelId] = useState(
    (initial?.tab === "hotel" && initial?.itemId) || hotels[0]?.id || ""
  );
  const [checkIn, setCheckIn] = useState(initial?.tab === "hotel" ? initial?.date ?? "" : "");
  const [checkOut, setCheckOut] = useState(initial?.tab === "hotel" ? initial?.dateTo ?? "" : "");
  const [rooms, setRooms] = useState(initial?.tab === "hotel" ? initial?.rooms ?? 1 : 1);

  const handleCheckInChange = (value: string) => {
    setCheckIn(value);
    if (checkOut && value && checkOut < value) setCheckOut("");
  };

  const [vehicleId, setVehicleId] = useState(
    (initial?.tab === "car" && initial?.itemId) || vehicles[0]?.id || ""
  );
  const [pickupDate, setPickupDate] = useState(initial?.tab === "car" ? initial?.date ?? "" : "");
  const [carReturnDate, setCarReturnDate] = useState(initial?.tab === "car" ? initial?.dateTo ?? "" : "");

  const handlePickupDateChange = (value: string) => {
    setPickupDate(value);
    if (carReturnDate && value && carReturnDate < value) setCarReturnDate("");
  };

  const [packageId, setPackageId] = useState(
    (initial?.tab === "package" && initial?.itemId) || packages[0]?.id || ""
  );
  const [packagePassengers, setPackagePassengers] = useState(1);

  const [serviceItemId, setServiceItemId] = useState(
    (initial?.tab === "service" && initial?.itemId) || services[0]?.id || ""
  );
  const [serviceQuantity, setServiceQuantity] = useState(1);

  const [flightCityError, setFlightCityError] = useState(false);
  const [dateError, setDateError] = useState(false);
  const selectedPackage = packages.find((p) => p.id === packageId);
  const selectedService = services.find((s) => s.id === serviceItemId);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [remarks, setRemarks] = useState("");

  const [quote, setQuote] = useState<QuoteState>({ status: "idle" });
  const [submit, setSubmit] = useState<SubmitState>({ status: "idle" });

  const { items: tripItems, addItem, open: openTrip } = useTrip();
  const [justAdded, setJustAdded] = useState(false);

  const tabs: { id: ServiceTab; label: string; Icon: () => React.ReactElement }[] = [
    { id: "flight", label: copy.tabs.flight, Icon: PlaneIcon },
    { id: "hotel", label: copy.tabs.hotel, Icon: BedIcon },
    { id: "car", label: copy.tabs.car, Icon: CarIcon },
    { id: "package", label: copy.tabs.package, Icon: PackageIcon },
    { id: "service", label: copy.tabs.service, Icon: ServiceIcon },
  ];

  const nights = daysBetween(checkIn, checkOut);
  const carDays = daysBetween(pickupDate, carReturnDate);

  // Live price estimate — debounced, only for tabs backed by a real
  // catalog item (flights are open routes, priced by an agent later).
  // Every setQuote call below runs inside the deferred timer callback,
  // never synchronously in the effect body itself (react-hooks/set-state
  // -in-effect) — including the "nothing to price" reset case.
  useEffect(() => {
    let body: Record<string, unknown> | null = null;
    if (activeTab === "hotel" && hotelId && nights > 0 && rooms > 0) {
      body = { serviceType: "HOTEL", itemId: hotelId, nights, rooms };
    } else if (activeTab === "car" && vehicleId && carDays > 0) {
      body = { serviceType: "CAR", itemId: vehicleId, days: carDays };
    } else if (activeTab === "package" && packageId && packagePassengers > 0) {
      body = { serviceType: "PACKAGE", itemId: packageId, passengers: packagePassengers };
    } else if (activeTab === "service" && serviceItemId && serviceQuantity > 0 && selectedService?.price != null) {
      body = { serviceType: "SERVICE", itemId: serviceItemId, quantity: serviceQuantity };
    }

    let cancelled = false;

    if (!body) {
      const resetTimer = setTimeout(() => {
        if (!cancelled) setQuote({ status: "idle" });
      }, 0);
      return () => {
        cancelled = true;
        clearTimeout(resetTimer);
      };
    }

    const fetchTimer = setTimeout(async () => {
      if (cancelled) return;
      setQuote({ status: "loading" });
      try {
        const response = await fetch("/api/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await response.json();
        if (cancelled) return;
        if (!response.ok) {
          setQuote({ status: "error", message: data.error || copy.price.unavailable });
          return;
        }
        setQuote({ status: "ready", total: data.total, currency: data.currency });
      } catch {
        if (!cancelled) setQuote({ status: "error", message: copy.price.unavailable });
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(fetchTimer);
    };
  }, [activeTab, hotelId, nights, rooms, vehicleId, carDays, packageId, packagePassengers, serviceItemId, serviceQuantity, selectedService?.price, copy.price.unavailable]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Guard against double-clicks/double-submits firing two requests for
    // the same person while the first one is still in flight.
    if (submit.status === "loading") return;

    if (activeTab === "flight" && origin && destinationCity && origin === destinationCity) {
      setFlightCityError(true);
      return;
    }
    setFlightCityError(false);

    const [startDate, endDate] =
      activeTab === "flight"
        ? [departureDate, returnDate]
        : activeTab === "hotel"
          ? [checkIn, checkOut]
          : activeTab === "car"
            ? [pickupDate, carReturnDate]
            : [null, null];
    if ((startDate && startDate < today) || (startDate && endDate && endDate < startDate)) {
      setDateError(true);
      return;
    }
    setDateError(false);

    setSubmit({ status: "loading" });

    let payload: Record<string, unknown>;
    switch (activeTab) {
      case "flight":
        payload = { serviceType: "FLIGHT", origin, destinationCity, passengers };
        break;
      case "hotel":
        payload = { serviceType: "HOTEL", itemId: hotelId, nights, rooms };
        break;
      case "car":
        payload = { serviceType: "CAR", itemId: vehicleId, days: carDays };
        break;
      case "package":
        payload = { serviceType: "PACKAGE", itemId: packageId, passengers: packagePassengers };
        break;
      case "service":
        payload = { serviceType: "SERVICE", itemId: serviceItemId, quantity: serviceQuantity };
        break;
    }

    payload.locale = locale;
    payload.customerRemarks = remarks || undefined;
    payload.customer = { fullName, phone, email: email || undefined };

    try {
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        setSubmit({ status: "error", message: data.error || copy.status.errorTitle });
        return;
      }
      setSubmit({ status: "success", reference: data.reference });
    } catch {
      setSubmit({ status: "error", message: copy.status.errorTitle });
    }
  };

  // Stacks the current tab's selection into the "Minha Viagem" trip
  // builder instead of submitting it right away — same field validation
  // as handleSubmit (same-city, date-range), same price the live-quote
  // panel is already showing, just routed to the drawer instead of the
  // API. Resets only the item-selection fields for this tab afterwards,
  // not the contact fields below (those belong to the trip as a whole,
  // filled in once in the drawer at actual submit time).
  const handleAddToTrip = () => {
    if (activeTab === "flight" && origin && destinationCity && origin === destinationCity) {
      setFlightCityError(true);
      return;
    }
    setFlightCityError(false);

    const [startDate, endDate] =
      activeTab === "flight"
        ? [departureDate, returnDate]
        : activeTab === "hotel"
          ? [checkIn, checkOut]
          : activeTab === "car"
            ? [pickupDate, carReturnDate]
            : [null, null];
    if ((startDate && startDate < today) || (startDate && endDate && endDate < startDate)) {
      setDateError(true);
      return;
    }
    setDateError(false);

    let item: Omit<TripItem, "localId"> | null = null;

    switch (activeTab) {
      case "flight": {
        if (!origin || !destinationCity || !departureDate) return;
        const range = returnDate ? `${formatDateShort(departureDate, locale)} → ${formatDateShort(returnDate, locale)}` : formatDateShort(departureDate, locale);
        item = {
          serviceType: "FLIGHT",
          origin,
          destinationCity,
          passengers,
          dateFrom: departureDate,
          dateTo: returnDate || undefined,
          name: `${origin} → ${destinationCity}`,
          detail: `${range} · ${countLabel(passengers, copy.passengers.singular, copy.passengers.plural)}`,
          price: null,
          currency: "MZN",
          city: destinationCity,
        };
        break;
      }
      case "hotel": {
        const hotel = hotels.find((h) => h.id === hotelId);
        if (!hotel || !checkIn || !checkOut) return;
        item = {
          serviceType: "HOTEL",
          itemId: hotelId,
          nights,
          rooms,
          dateFrom: checkIn,
          dateTo: checkOut,
          name: hotel.name,
          detail: `${formatDateShort(checkIn, locale)} → ${formatDateShort(checkOut, locale)} · ${countLabel(rooms, copy.rooms.singular, copy.rooms.plural)}`,
          price: quote.status === "ready" ? quote.total : null,
          currency: quote.status === "ready" ? quote.currency : hotel.currency,
          city: hotel.city,
        };
        break;
      }
      case "car": {
        const vehicle = vehicles.find((v) => v.id === vehicleId);
        if (!vehicle || !pickupDate || !carReturnDate) return;
        item = {
          serviceType: "CAR",
          itemId: vehicleId,
          days: carDays,
          dateFrom: pickupDate,
          dateTo: carReturnDate,
          name: vehicle.name,
          detail: `${formatDateShort(pickupDate, locale)} → ${formatDateShort(carReturnDate, locale)}`,
          price: quote.status === "ready" ? quote.total : null,
          currency: quote.status === "ready" ? quote.currency : vehicle.currency,
        };
        break;
      }
      case "package": {
        if (!selectedPackage) return;
        item = {
          serviceType: "PACKAGE",
          itemId: packageId,
          passengers: packagePassengers,
          name: selectedPackage.name,
          detail: countLabel(packagePassengers, copy.passengers.singular, copy.passengers.plural),
          price: quote.status === "ready" ? quote.total : null,
          currency: quote.status === "ready" ? quote.currency : selectedPackage.currency,
          city: selectedPackage.city,
        };
        break;
      }
      case "service": {
        if (!selectedService) return;
        item = {
          serviceType: "SERVICE",
          itemId: serviceItemId,
          quantity: serviceQuantity,
          name: selectedService.name,
          detail: countLabel(serviceQuantity, copy.units.singular, copy.units.plural),
          price: quote.status === "ready" ? quote.total : null,
          currency: quote.status === "ready" ? quote.currency : selectedService.currency,
        };
        break;
      }
    }

    if (!item) return;
    addItem(item);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2000);
  };


  if (submit.status === "success") {
    return (
      <div className="bg-beige px-7 lg:px-28 py-14 lg:py-28">
        <div className="max-w-lg mx-auto bg-leafy rounded-2xl px-8 py-12 text-white text-center">
          <div className="w-14 h-14 rounded-full bg-orange/20 text-orange flex items-center justify-center mx-auto mb-6">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-7 h-7">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl md:text-3xl mb-3">{copy.status.successTitle}</h2>
          <p className="text-white/60 text-sm mb-6">{copy.status.successBody}</p>
          <p className="text-white/40 text-xs uppercase tracking-wide mb-1">{copy.status.reference}</p>
          <p className="text-orange text-xl font-semibold mb-8">{submit.reference}</p>
          <button
            type="button"
            onClick={() => setSubmit({ status: "idle" })}
            className="border border-white/30 hover:bg-white/10 text-white rounded-3xl px-6 py-3 uppercase text-sm font-semibold transition-all duration-300"
          >
            {copy.status.newRequest}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-beige px-7 lg:px-28 pt-14 lg:pt-28 pb-14 lg:pb-28 relative overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-stretch">
        {/* Left: full-height cover image */}
        <div className="relative hidden lg:block rounded-2xl overflow-hidden min-h-[500px]">
          <Image src="/images/desc2.jpg" alt={copy.imageAlt} fill sizes="50vw" className="object-cover object-center" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
          <div className="absolute bottom-10 left-10 right-10">
            <p className="text-orange text-xs uppercase tracking-widest font-semibold mb-3">{copy.brand}</p>
            <p className="text-white text-3xl leading-snug">
              {copy.imageTitleLine1}<br />{copy.imageTitleLine2}
            </p>
            <div className="mt-6 flex items-center gap-3">
              <div className="w-8 h-px bg-orange" />
              <p className="text-white/60 text-sm">{copy.tagline}</p>
            </div>
          </div>
        </div>

        {/* Right: form */}
        <div className="bg-leafy rounded-2xl px-8 py-10 text-white">
          <h2 className="text-3xl md:text-4xl text-white mb-2 leading-tight">
            {copy.title} <span className="italic">{copy.titleAccent}</span>
          </h2>
          <p className="text-white/50 text-sm mb-8">{copy.description}</p>

          <div className="flex gap-1 mb-8 p-1 bg-white/10 rounded-xl flex-wrap">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 min-w-[70px] inline-flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs uppercase font-semibold tracking-wide transition-all duration-300 cursor-pointer ${
                  activeTab === tab.id ? "bg-orange text-white shadow" : "text-white/60 hover:text-white"
                }`}
              >
                <tab.Icon />
                {tab.label}
              </button>
            ))}
          </div>

          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            {activeTab === "flight" && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>{copy.labels.from}</label>
                    <CitySelect
                      required
                      value={origin}
                      onChange={(v) => { setOrigin(v); setFlightCityError(false); }}
                      placeholder={copy.placeholders.departureCity}
                      className={inputClass + " bg-leafy"}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>{copy.labels.to}</label>
                    <CitySelect
                      required
                      value={destinationCity}
                      onChange={(v) => { setDestinationCity(v); setFlightCityError(false); }}
                      placeholder={copy.placeholders.destinationCity}
                      className={inputClass + " bg-leafy"}
                    />
                  </div>
                </div>
                {flightCityError && (
                  <p className="text-red-300 text-xs -mt-2">{copy.errors.sameCity}</p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>{copy.labels.departureDate}</label>
                    <input required type="date" min={today} value={departureDate} onChange={(e) => handleDepartureDateChange(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>{copy.labels.returnDate}</label>
                    <input type="date" min={departureDate || today} value={returnDate} onChange={(e) => setReturnDate(e.target.value)} className={inputClass} />
                  </div>
                </div>
                {dateError && <p className="text-red-300 text-xs -mt-2">{copy.errors.invalidDates}</p>}
                <div>
                  <label className={labelClass}>{copy.labels.passengers}</label>
                  <select value={passengers} onChange={(e) => setPassengers(Number(e.target.value))} className={inputClass + " bg-leafy"}>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                      <option key={n} value={n}>{countLabel(n, copy.passengers.singular, copy.passengers.plural)}</option>
                    ))}
                  </select>
                </div>
                <p className="text-white/40 text-xs">{copy.price.quoteOnRequest}</p>
              </>
            )}

            {activeTab === "hotel" && (
              <>
                <div>
                  <label className={labelClass}>{copy.labels.selectHotel}</label>
                  <select required value={hotelId} onChange={(e) => setHotelId(e.target.value)} className={inputClass + " bg-leafy"}>
                    {hotels.length === 0 && <option value="">{copy.placeholders.selectHotel}</option>}
                    {hotels.map((h) => (
                      <option key={h.id} value={h.id}>{h.name} · {formatMZN(h.price, h.currency, locale)}{copy.price.perNight}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>{copy.labels.checkIn}</label>
                    <input required type="date" min={today} value={checkIn} onChange={(e) => handleCheckInChange(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>{copy.labels.checkOut}</label>
                    <input required type="date" min={checkIn || today} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className={inputClass} />
                  </div>
                </div>
                {dateError && <p className="text-red-300 text-xs -mt-2">{copy.errors.invalidDates}</p>}
                <div>
                  <label className={labelClass}>{copy.labels.rooms}</label>
                  <select value={rooms} onChange={(e) => setRooms(Number(e.target.value))} className={inputClass + " bg-leafy"}>
                    {[1, 2, 3, 4].map((n) => (
                      <option key={n} value={n}>{countLabel(n, copy.rooms.singular, copy.rooms.plural)}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {activeTab === "car" && (
              <>
                <div>
                  <label className={labelClass}>{copy.labels.selectVehicle}</label>
                  <select required value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} className={inputClass + " bg-leafy"}>
                    {vehicles.length === 0 && <option value="">{copy.placeholders.selectVehicle}</option>}
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>{v.name} · {formatMZN(v.price, v.currency, locale)}{copy.price.perDay}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>{copy.labels.pickupDate}</label>
                    <input required type="date" min={today} value={pickupDate} onChange={(e) => handlePickupDateChange(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>{copy.labels.returnDateRequired}</label>
                    <input required type="date" min={pickupDate || today} value={carReturnDate} onChange={(e) => setCarReturnDate(e.target.value)} className={inputClass} />
                  </div>
                </div>
                {dateError && <p className="text-red-300 text-xs -mt-2">{copy.errors.invalidDates}</p>}
              </>
            )}

            {activeTab === "package" && (
              <>
                <div>
                  <label className={labelClass}>{copy.labels.selectPackage}</label>
                  <select required value={packageId} onChange={(e) => setPackageId(e.target.value)} className={inputClass + " bg-leafy"}>
                    {packages.length === 0 && <option value="">{copy.placeholders.selectPackage}</option>}
                    {packages.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} · {formatMZN(p.price, p.currency, locale)}{copy.price.perPerson}</option>
                    ))}
                  </select>
                </div>
                {selectedPackage && selectedPackage.included && selectedPackage.included.length > 0 && (
                  <div className="rounded-lg bg-white/5 border border-white/10 px-4 py-3">
                    <p className="text-white/50 text-xs uppercase tracking-wide mb-2">{copy.labels.included}</p>
                    <ul className="flex flex-col gap-1.5">
                      {selectedPackage.included.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-white/70 text-xs leading-relaxed">
                          <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-orange shrink-0 mt-0.5">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div>
                  <label className={labelClass}>{copy.labels.passengers}</label>
                  <select value={packagePassengers} onChange={(e) => setPackagePassengers(Number(e.target.value))} className={inputClass + " bg-leafy"}>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                      <option key={n} value={n}>{countLabel(n, copy.passengers.singular, copy.passengers.plural)}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {activeTab === "service" && (
              <>
                <div>
                  <label className={labelClass}>{copy.labels.selectService}</label>
                  <select required value={serviceItemId} onChange={(e) => setServiceItemId(e.target.value)} className={inputClass + " bg-leafy"}>
                    {services.length === 0 && <option value="">{copy.placeholders.selectService}</option>}
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}{s.price != null ? ` · ${formatMZN(s.price, s.currency, locale)}${copy.price.perUnit}` : ` · ${copy.price.quoteOnRequest}`}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>{copy.labels.quantity}</label>
                  <select value={serviceQuantity} onChange={(e) => setServiceQuantity(Number(e.target.value))} className={inputClass + " bg-leafy"}>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                      <option key={n} value={n}>{countLabel(n, copy.units.singular, copy.units.plural)}</option>
                    ))}
                  </select>
                </div>
                {selectedService?.price == null && (
                  <p className="text-white/40 text-xs">{copy.price.quoteOnRequest}</p>
                )}
              </>
            )}

            {/* Live price */}
            {activeTab !== "flight" && !(activeTab === "service" && selectedService?.price == null) && (
              <div className="rounded-lg bg-white/5 border border-white/10 px-4 py-3 flex items-center justify-between">
                <span className="text-white/50 text-xs uppercase tracking-wide">{copy.price.estimate}</span>
                {quote.status === "loading" && <span className="text-white/40 text-sm">{copy.price.calculating}</span>}
                {quote.status === "ready" && (
                  <div className="text-right">
                    <span className="text-orange font-bold text-lg block">{formatMZN(quote.total, quote.currency, locale)}</span>
                    <span className="text-white/40 text-[11px]">{formatUSDApprox(quote.total, quote.currency, locale)}</span>
                  </div>
                )}
                {quote.status === "error" && <span className="text-red-300 text-xs">{quote.message}</span>}
                {quote.status === "idle" && <span className="text-white/30 text-sm">—</span>}
              </div>
            )}

            {/* Divider */}
            <div className="border-t border-white/10 pt-4">
              <p className="text-white/40 text-xs uppercase tracking-wider mb-4">{copy.labels.yourDetails}</p>
              <div className="flex flex-col gap-4">
                <div>
                  <label className={labelClass}>{copy.labels.fullName}</label>
                  <input required type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={copy.placeholders.fullName} className={inputClass} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>{copy.labels.phone}</label>
                    <input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={copy.placeholders.phone} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>{copy.labels.email}</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={copy.placeholders.email} className={inputClass} />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>{copy.labels.remarks}</label>
                  <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder={copy.placeholders.remarks}
                    rows={2}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            {submit.status === "error" && (
              <p className="text-red-300 text-sm text-center">{submit.message}</p>
            )}

            <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 flex items-center justify-between gap-3">
              <p className="text-white/60 text-xs leading-relaxed">{copy.addToTripHint}</p>
              <button
                type="button"
                onClick={handleAddToTrip}
                className="bg-white/15 hover:bg-white/25 text-white rounded-3xl px-4 py-2.5 uppercase text-xs font-semibold transition-all duration-300 cursor-pointer whitespace-nowrap shrink-0 inline-flex items-center gap-2"
              >
                {justAdded ? copy.addedToTrip : copy.addToTrip}
                {tripItems.length > 0 && (
                  <span className="bg-orange text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center normal-case">
                    {tripItems.length}
                  </span>
                )}
              </button>
            </div>

            <button
              type="submit"
              disabled={submit.status === "loading"}
              className="bg-orange hover:bg-orange/90 text-white rounded-3xl px-8 py-3 uppercase text-sm font-semibold transition-all duration-300 w-full cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submit.status === "loading" ? copy.status.submitting : copy.submit}
            </button>
            <p className="text-center text-white/30 text-xs">{copy.note}</p>
            {tripItems.length > 0 && (
              <button type="button" onClick={openTrip} className="text-center text-orange text-xs underline cursor-pointer">
                {copy.viewTrip.replace("{count}", String(tripItems.length))}
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
