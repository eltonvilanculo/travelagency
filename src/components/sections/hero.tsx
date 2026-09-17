"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { CitySelect } from "@/components/ui/city-select";
import { localizedPath, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/types";
import { useTrip } from "@/lib/trip-context";

type Tab = "flight" | "hotel" | "car";

type HeroProps = {
  locale: Locale;
  copy: Dictionary["home"]["hero"];
};

const PlaneIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 shrink-0">
    <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
  </svg>
);

const BedIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 shrink-0">
    <path d="M7 13c1.66 0 3-1.34 3-3S8.66 7 7 7s-3 1.34-3 3 1.34 3 3 3zm12-6h-8v7H3V5H1v15h2v-3h18v3h2v-9c0-2.21-1.79-4-4-4z" />
  </svg>
);

const CarIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 shrink-0">
    <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" />
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-orange/70 shrink-0">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
  </svg>
);

type TabItem = { id: Tab; label: string; Icon: () => React.ReactElement };

function countLabel(count: number, singular: string, plural: string) {
  return `${count} ${count > 1 ? plural : singular}`;
}

// Local calendar date, not UTC — a native <input type="date"> shows and
// validates against the browser's local date, so computing "today" via
// toISOString() (always UTC) silently rejects the user's actual today
// whenever their timezone is far enough ahead of UTC to have already
// crossed midnight UTC while their own clock hasn't (true for Maputo,
// UTC+2, every night from 22:00 local).
function todayStr(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function Hero({ locale, copy }: HeroProps) {
  const router = useRouter();
  const { items: tripItems, open: openTrip } = useTrip();
  const [tab, setTab] = useState<Tab>("flight");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  // One generic date pair, relabelled per tab: departure/return for
  // flights, check-in/check-out for hotels, pickup/drop-off for cars.
  // The return/end date is always shown but never required — leaving it
  // blank on a flight search is simply a one-way trip, no separate
  // "trip type" choice needed up front.
  const [date, setDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [passengers, setPassengers] = useState(1);
  const [rooms, setRooms] = useState(1);
  const [carType, setCarType] = useState("");
  const [error, setError] = useState<string | null>(null);

  const tabItems: TabItem[] = [
    { id: "flight", label: copy.tabs.flight, Icon: PlaneIcon },
    { id: "hotel", label: copy.tabs.hotel, Icon: BedIcon },
    { id: "car", label: copy.tabs.car, Icon: CarIcon },
  ];

  const handleTabChange = (next: Tab) => {
    setTab(next);
    setError(null);
  };

  const handleDateChange = (value: string) => {
    setDate(value);
    if (endDate && value && endDate < value) setEndDate("");
  };

  const handleSearch = () => {
    setError(null);

    if (tab === "flight" && from && to && from === to) {
      setError(copy.sameCityError);
      return;
    }
    if (date && endDate && endDate < date) {
      setError(copy.dateError);
      return;
    }

    if (tab === "flight") {
      const params = new URLSearchParams({ type: "flight" });
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (date) params.set("date", date);
      if (endDate) params.set("dateTo", endDate);
      params.set("passengers", String(passengers));
      router.push(`${localizedPath(locale, "/book")}?${params.toString()}`);
      return;
    }

    if (tab === "hotel") {
      const params = new URLSearchParams();
      if (to) params.set("destination", to);
      if (date) params.set("checkIn", date);
      if (endDate) params.set("checkOut", endDate);
      params.set("rooms", String(rooms));
      const query = params.toString();
      router.push(`${localizedPath(locale, "/hotels")}${query ? `?${query}` : ""}`);
      return;
    }

    // Cars aren't modelled per-destination in the catalog (a fleet, not
    // city-scoped listings) — nothing to filter the list by, but the
    // rental period still carries through to prefill the booking form.
    const params = new URLSearchParams();
    if (date) params.set("pickupDate", date);
    if (endDate) params.set("returnDate", endDate);
    const query = params.toString();
    router.push(`${localizedPath(locale, "/cars")}${query ? `?${query}` : ""}`);
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col justify-center">
      <Image
        src="/images/safari1.jpg"
        alt={copy.imageAlt}
        fill
        className="object-cover object-center animate-ken-burns"
        priority
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/55 to-black/20" />

      <div className="absolute right-0 top-0 h-full w-1/3 hidden lg:flex items-center pointer-events-none opacity-20">
        <Image src="/images/path.svg" alt="" width={600} height={600} className="w-full" />
      </div>

      <div className="relative z-10 px-7 lg:px-28 pt-28 pb-20">
        {/* Slogan */}
        <p className="text-orange text-xs sm:text-sm uppercase tracking-[0.25em] font-semibold mb-4 animate-fade-up">
          {copy.slogan}
        </p>
        {/* Headline */}
        <h1 className="text-5xl md:text-7xl lg:text-8xl text-white leading-none mb-5 max-w-3xl animate-fade-up" style={{ animationDelay: "150ms" }}>
          {copy.title}<br />
          <span className="italic text-orange">{copy.titleAccent}</span>
        </h1>
        <p className="text-white/65 text-lg mb-10 max-w-lg leading-relaxed animate-fade-up" style={{ animationDelay: "300ms" }}>
          {copy.subtitle}<br />
          {copy.region}
        </p>

        {/* Booking widget */}
        <div className="bg-black/35 backdrop-blur-md rounded-2xl p-2 max-w-4xl border border-white/10 animate-fade-up" style={{ animationDelay: "450ms" }}>
          {/* Service tabs */}
          <div className="flex gap-1 px-1 pt-1 mb-2">
            {tabItems.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleTabChange(t.id)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer ${
                  tab === t.id
                    ? "bg-orange text-white shadow"
                    : "text-white/60 hover:text-white hover:bg-white/10"
                }`}
              >
                <t.Icon />
                {t.label}
              </button>
            ))}
          </div>

          {/* Search fields — a real grid instead of a wrapping flex row:
              the flex-wrap version let the search button orphan onto its
              own half-empty line at in-between widths (looked like a
              layout bug, not a deliberate full-width CTA). Location/date
              fields group into one balanced grid; the count select and
              search button get their own row so the button always reads
              as an intentional, full-width action. */}
          <div className="flex flex-col gap-2 p-2 bg-white rounded-xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {tab !== "hotel" && (
                <CitySelect
                  value={from}
                  onChange={setFrom}
                  placeholder={tab === "car" ? copy.fields.pickupCity : copy.fields.from}
                  className="w-full border border-shadow rounded-lg px-4 py-3 text-parablack text-sm focus:outline-none focus:border-orange bg-white"
                />
              )}
              <CitySelect
                value={to}
                onChange={setTo}
                placeholder={tab === "car" ? copy.fields.dropOffCity : tab === "hotel" ? copy.fields.destination : copy.fields.to}
                className="w-full border border-shadow rounded-lg px-4 py-3 text-parablack text-sm focus:outline-none focus:border-orange bg-white"
              />
              <div className="border border-shadow rounded-lg px-3 py-1.5 focus-within:border-orange">
                <label className="block text-[9px] uppercase tracking-wide text-darkgray leading-none pt-0.5">
                  {tab === "hotel" ? copy.fields.checkIn : tab === "car" ? copy.fields.pickupDate : copy.fields.departureDate}
                </label>
                <input
                  type="date"
                  min={todayStr()}
                  value={date}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="w-full text-parablack text-sm focus:outline-none -ml-px"
                />
              </div>
              <div className="border border-shadow rounded-lg px-3 py-1.5 focus-within:border-orange">
                <label className="block text-[9px] uppercase tracking-wide text-darkgray leading-none pt-0.5">
                  {tab === "hotel" ? copy.fields.checkOut : tab === "car" ? copy.fields.dropOffDate : copy.fields.returnDateOptional}
                </label>
                <input
                  type="date"
                  min={date || todayStr()}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full text-parablack text-sm focus:outline-none -ml-px"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
              <select
                value={tab === "hotel" ? rooms : tab === "car" ? carType : passengers}
                onChange={(e) =>
                  tab === "hotel"
                    ? setRooms(Number(e.target.value))
                    : tab === "car"
                      ? setCarType(e.target.value)
                      : setPassengers(Number(e.target.value))
                }
                className="w-full border border-shadow rounded-lg px-4 py-3 text-parablack text-sm focus:outline-none focus:border-orange bg-white"
              >
                {tab === "hotel" ? (
                  <>{[1, 2, 3, 4].map((n) => <option key={n} value={n}>{countLabel(n, copy.rooms.singular, copy.rooms.plural)}</option>)}</>
                ) : tab === "car" ? (
                  <>{copy.carTypes.map((type) => <option key={type} value={type}>{type}</option>)}</>
                ) : (
                  <>{[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{countLabel(n, copy.passengers.singular, copy.passengers.plural)}</option>)}</>
                )}
              </select>
              <button
                type="button"
                onClick={handleSearch}
                className="bg-orange hover:bg-orange/90 text-white rounded-lg px-10 py-3 text-sm font-bold uppercase transition-all duration-300 text-center whitespace-nowrap cursor-pointer"
              >
                {copy.search}
              </button>
            </div>
          </div>
          {error && <p className="text-orange text-xs px-2 pt-2">{error}</p>}
        </div>

        {/* Trip builder hint — planted right where someone is already
            thinking about one service, to nudge that a flight + hotel +
            car (+ services) can go in the same request. */}
        <p className="text-white/50 text-xs mt-4 animate-fade-up" style={{ animationDelay: "500ms" }}>
          {tripItems.length > 0 ? (
            <button type="button" onClick={openTrip} className="underline text-white/80 hover:text-white cursor-pointer">
              {copy.tripHintWithItems.replace("{count}", String(tripItems.length))}
            </button>
          ) : (
            <>
              {copy.tripHint}{" "}
              <button type="button" onClick={openTrip} className="underline text-white/80 hover:text-white cursor-pointer">
                {copy.tripHintCta}
              </button>
            </>
          )}
        </p>

        {/* Trust badges */}
        <div className="flex flex-wrap gap-6 mt-8 animate-fade-up" style={{ animationDelay: "600ms" }}>
          {copy.trustItems.map((item) => (
            <div key={item} className="flex items-center gap-2">
              <CheckIcon />
              <span className="text-white/55 text-sm">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
