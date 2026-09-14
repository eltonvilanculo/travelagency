export const locales = ["pt", "en"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "pt";

export const localeOptions: Record<
  Locale,
  {
    label: string;
    shortLabel: string;
    /** ISO 3166-1 alpha-2 country code used to render a real flag image
     * (via flagcdn.com) — not a Unicode flag emoji. English maps to South
     * Africa rather than the UK: it's the region's actual English-speaking
     * market, which is what this site serves. */
    flagCountryCode: string;
  }
> = {
  pt: {
    label: "Português",
    shortLabel: "PT",
    flagCountryCode: "mz",
  },
  en: {
    label: "English",
    shortLabel: "EN",
    flagCountryCode: "za",
  },
};

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

export function localizedPath(locale: Locale, path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return normalizedPath === "/" ? `/${locale}` : `/${locale}${normalizedPath}`;
}

export function stripLocaleFromPath(pathname: string) {
  const segments = pathname.split("/");
  const maybeLocale = segments[1];

  if (!isLocale(maybeLocale)) {
    return pathname || "/";
  }

  const pathWithoutLocale = `/${segments.slice(2).join("/")}`;

  return pathWithoutLocale === "/" ? "/" : pathWithoutLocale.replace(/\/$/, "");
}

export function getLocalizedPathname(pathname: string, locale: Locale) {
  return localizedPath(locale, stripLocaleFromPath(pathname));
}
