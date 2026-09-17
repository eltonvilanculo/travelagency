"use client";

import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import type { Dictionary } from "@/i18n/types";

export type DestinationCard = {
  name: string;
  label: string;
  image: string;
};

type DestinationsProps = {
  copy: Dictionary["sections"]["destinations"];
  items: DestinationCard[];
};

export function Destinations({ copy, items }: DestinationsProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "start", slidesToScroll: 1 });

  return (
    <div className="px-7 lg:px-28 py-14 lg:py-28 bg-beige md:pt-36 lg:pt-44 md:rounded-t-[44%] relative mt-28 lg:mt-44">
      {/* Quote */}
      <div className="text-center mb-14 lg:mb-28">
        <p className="text-3xl md:text-5xl text-textdark max-w-4xl mx-auto leading-tight italic font-light">
          &ldquo;{copy.quote}&rdquo;
        </p>
      </div>

      {/* Section header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
        <div>
          <h2 className="text-4xl md:text-5xl text-textdark">
            {copy.title} <span className="italic">{copy.titleAccent}</span> {copy.titleRest}
          </h2>
          <p className="text-parablack text-lg mt-4 max-w-xl">
            {copy.description}
          </p>
        </div>
        <div className="flex gap-3 shrink-0">
          <button
            onClick={() => emblaApi?.scrollPrev()}
            className="w-11 h-11 rounded-full border border-textdark flex items-center justify-center hover:bg-textdark hover:text-white transition-all duration-300"
            aria-label={copy.previous}
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <button
            onClick={() => emblaApi?.scrollNext()}
            className="w-11 h-11 rounded-full border border-textdark flex items-center justify-center hover:bg-textdark hover:text-white transition-all duration-300"
            aria-label={copy.next}
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Carousel */}
      <div
        className="embla__viewport [mask-image:linear-gradient(to_right,black_calc(100%-32px),transparent)] [-webkit-mask-image:linear-gradient(to_right,black_calc(100%-32px),transparent)]"
        ref={emblaRef}
      >
        <div className="embla__container flex gap-4">
          {items.map((d) => (
            <div
              key={d.name}
              className="embla__slide embla__slide--dest shrink-0"
            >
              <div className="relative h-72 rounded-xl overflow-hidden group cursor-pointer">
                <Image
                  src={d.image}
                  alt={d.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover object-center group-hover:scale-105 transition-all duration-500"
                />
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-all duration-300" />
                <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-orange" />
                    <span className="text-sm text-white/80">{d.name}</span>
                  </div>
                  <p className="text-2xl font-semibold">{d.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
