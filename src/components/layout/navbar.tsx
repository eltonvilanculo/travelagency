"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  getLocalizedPathname,
  localeOptions,
  locales,
  localizedPath,
  type Locale,
} from "@/i18n/config";
import type { Dictionary } from "@/i18n/types";
import { AccountMenu } from "@/components/layout/account-menu";

type NavbarProps = {
  locale: Locale;
  copy: Dictionary["layout"]["nav"];
};

export function Navbar({ locale, copy }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = [
    { label: copy.home, href: localizedPath(locale, "/") },
    { label: copy.destinations, href: localizedPath(locale, "/destinations") },
    { label: copy.hotels, href: localizedPath(locale, "/hotels") },
    { label: copy.cars, href: localizedPath(locale, "/cars") },
    { label: copy.about, href: localizedPath(locale, "/about") },
  ];

  const languageSwitcher = (compact = false) => (
    <div
      className={`flex items-center gap-1 rounded-full border p-1 shadow-lg shadow-black/10 ${
        compact
          ? "border-white/40 bg-leafy/85 backdrop-blur-md"
          : "border-white/25 bg-white/10"
      }`}
      aria-label={copy.language}
    >
      {locales.map((option) => {
        const isActive = option === locale;
        const label = localeOptions[option];

        return (
          <Link
            key={option}
            href={`/api/locale?locale=${option}&next=${encodeURIComponent(getLocalizedPathname(pathname, option))}`}
            onClick={() => setMobileOpen(false)}
            aria-label={`${copy.switchTo} ${label.label}`}
            aria-current={isActive ? "page" : undefined}
            className={`inline-flex items-center justify-center rounded-full font-semibold transition-all duration-300 ${
              compact ? "h-8 w-9 text-base" : "h-8 min-w-14 gap-1 px-2 text-xs"
            } ${
              isActive
                ? "bg-white text-leafy"
                : "text-white/80 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Image
              src={`https://flagcdn.com/w40/${label.flagCountryCode}.png`}
              alt=""
              aria-hidden="true"
              width={20}
              height={14}
              className="rounded-[2px] object-cover shrink-0"
            />
            <span className={compact ? "sr-only" : ""}>{label.shortLabel}</span>
          </Link>
        );
      })}
    </div>
  );

  return (
    <>
      {/* Desktop navbar */}
      <div
        className={`text-white hidden lg:flex flex-row items-center justify-between py-5 px-10 fixed w-full z-50 top-0 border-b border-lightbeige/20 transition-all duration-300 ${
          scrolled ? "bg-leafy/95 backdrop-blur-sm" : "bg-transparent"
        }`}
      >
        <Link href={localizedPath(locale, "/")}>
          <Image
            src="/icons/logooficial.png"
            alt="ZambiTour"
            width={280}
            height={228}
            className="h-16 w-auto object-contain"
          />
        </Link>

        <ul className="flex flex-row justify-center gap-8 items-center text-sm font-medium">
          {navLinks.map((link) => (
            <li key={link.label} className="hover:text-orange transition-all duration-300">
              <Link href={link.href}>{link.label}</Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3">
          {languageSwitcher()}
          <AccountMenu locale={locale} />
          <Link
            href={localizedPath(locale, "/book")}
            className="bg-orange hover:bg-orange/90 text-white transition-all duration-300 rounded-3xl px-6 py-3 uppercase text-sm font-semibold"
          >
            {copy.bookNow}
          </Link>
        </div>
      </div>

      {/* Mobile navbar */}
      <div
        className={`border-b border-lightbeige/20 lg:hidden flex flex-row items-center justify-between py-3 px-6 md:px-10 fixed w-full z-50 top-0 transition-all duration-300 ${
          scrolled ? "bg-leafy/95 backdrop-blur-sm" : "bg-black/60"
        }`}
      >
        <Link href={localizedPath(locale, "/")} className="shrink-0">
          <Image
            src="/icons/logooficial.png"
            alt="ZambiTour"
            width={280}
            height={228}
            className="h-12 w-auto max-w-[110px] object-contain sm:h-14 sm:max-w-none"
          />
        </Link>
        <div className="flex items-center gap-2">
          {languageSwitcher(true)}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="text-white p-2"
            aria-label={copy.toggleMenu}
          >
            {mobileOpen ? (
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-leafy pt-16 overflow-y-auto">
          <div className="flex flex-col gap-6 px-6 py-8 text-white text-lg">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="hover:text-orange transition-colors"
              >
                {link.label}
              </Link>
            ))}
            {languageSwitcher()}
            <AccountMenu locale={locale} />
            <Link
              href={localizedPath(locale, "/book")}
              onClick={() => setMobileOpen(false)}
              className="bg-orange rounded-3xl px-6 py-3 text-center uppercase text-sm font-semibold w-fit hover:bg-orange/90 transition-all"
            >
              {copy.bookNow}
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
