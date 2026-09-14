"use client";

import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import { formatMZN, formatUSDApprox } from "@/lib/currency";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/types";

export type TourCard = {
  slug: string;
  name: string;
  description: string;
  days: number;
  price: number;
  currency: string;
  image: string;
};

type ToursProps = {
  locale: Locale;
  copy: Dictionary["sections"]["tours"];
  tours: TourCard[];
};

const ClockIcon = () => (
  <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" className="text-darkgray" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
    <path d="M256 0a256 256 0 1 1 0 512A256 256 0 1 1 256 0zM232 120V256c0 8 4 15.5 10.7 20l96 64c11 7.4 25.9 4.4 33.3-6.7s4.4-25.9-6.7-33.3L280 243.2V120c0-13.3-10.7-24-24-24s-24 10.7-24 24z"/>
  </svg>
);

const TagIcon = () => (
  <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" className="text-darkgray" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
    <path d="M442 107v141L229.2 451.7c8 8 20.8 12.3 28.8 12.3s22.8-3.7 31.4-12.3L480 272V144l-38-37z"/>
    <path d="M384 48H224L44.3 235.6c-8 8-12 17.8-12.3 28.4-.3 11.3 3.7 23.3 12.3 31.9l123.8 123.6c8 8 20.8 12.5 28.8 12.5s22.7-3.9 31.3-12.5L416 240V80l-32-32zm-30.7 102.7c-21.7 6.1-41.3-10-41.3-30.7 0-17.7 14.3-32 32-32 20.7 0 36.8 19.6 30.7 41.3-2.9 10.3-11.1 18.5-21.4 21.4z"/>
  </svg>
);

const ArrowIcon = () => (
  <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 448 512" className="text-orange text-3xl -rotate-45 hover:rotate-0 transition-all duration-300" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
    <path d="M438.6 278.6c12.5-12.5 12.5-32.8 0-45.3l-160-160c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L338.8 224 32 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l306.7 0L233.4 393.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0l160-160z"/>
  </svg>
);

export function Tours({ locale, copy, tours }: ToursProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "start", slidesToScroll: 1 });

  return (
    <div className="pb-14 lg:pb-28 bg-beige">
      {/* Header */}
      <div className="px-7 lg:px-28 flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
        <div>
          <h2 className="text-4xl md:text-5xl text-textdark">{copy.title}</h2>
          <p className="text-parablack max-w-xl text-lg pt-6">
            {copy.description}
          </p>
        </div>
        <button
          type="button"
          className="bg-orange/80 text-white hover:bg-orange transition-all duration-300 rounded-3xl px-6 py-3 uppercase text-sm shrink-0 cursor-pointer"
        >
          {copy.viewMore}
        </button>
      </div>

      {/* Carousel */}
      <div className="relative">
        <div className="embla__viewport px-7 lg:px-28" ref={emblaRef}>
          <div className="embla__container flex gap-6">
            {tours.map((tour) => (
              <div
                key={tour.slug}
                className="embla__slide embla__slide--tours shrink-0"
              >
                <div className="cursor-pointer">
                  <div className="grid border border-darkgray/50 bg-white/50 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300">
                    <div className="flex flex-col gap-4 px-6 py-8">
                      <div className="flex flex-row justify-between items-center">
                        <h3 className="text-textdark text-3xl hover:text-orange transition-colors duration-300">
                          {tour.name}
                        </h3>
                        <ArrowIcon />
                      </div>
                      <p className="text-parablack border-b border-darkgray pb-4">{tour.description}</p>
                      <div className="flex flex-row justify-between items-center">
                        <div className="inline-flex gap-3 items-center">
                          <ClockIcon />
                          <p className="italic text-textdark">{tour.days} {copy.days}</p>
                        </div>
                        <div className="inline-flex gap-3 items-center">
                          <TagIcon />
                          <div>
                            <p className="italic text-textdark">{copy.from} {formatMZN(tour.price, tour.currency, locale)}</p>
                            <p className="text-darkgray text-[11px]">{formatUSDApprox(tour.price, tour.currency, locale)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="relative h-56 overflow-hidden">
                      <Image
                        src={tour.image}
                        alt={tour.name}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="object-cover object-center hover:scale-105 transition-all duration-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Nav arrows */}
        <button
          onClick={() => emblaApi?.scrollPrev()}
          className="absolute left-2 lg:left-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white border border-darkgray flex items-center justify-center hover:bg-orange hover:text-white hover:border-orange transition-all duration-300 z-10"
          aria-label={copy.previous}
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <button
          onClick={() => emblaApi?.scrollNext()}
          className="absolute right-2 lg:right-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white border border-darkgray flex items-center justify-center hover:bg-orange hover:text-white hover:border-orange transition-all duration-300 z-10"
          aria-label={copy.next}
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
