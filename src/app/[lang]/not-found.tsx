"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { localizedPath } from "@/i18n/config";
import { getLocaleFromPathname, getStatusCopy } from "@/i18n/status";

export default function NotFound() {
  const pathname = usePathname();
  const locale = getLocaleFromPathname(pathname);
  const copy = getStatusCopy(locale).notFound;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-beige px-6 text-center gap-6">
      <div className="bg-leafy rounded-2xl px-6 py-5">
        <Image src="/icons/logooficial.png" alt="ZambiTour" width={280} height={228} className="h-14 w-auto object-contain" />
      </div>
      <div>
        <p className="text-orange text-xs font-semibold uppercase tracking-widest mb-2">{copy.code}</p>
        <h1 className="text-textdark text-2xl md:text-3xl font-semibold mb-2">{copy.title}</h1>
        <p className="max-w-md text-parablack text-sm leading-relaxed">{copy.description}</p>
      </div>
      <Link
        href={localizedPath(locale, "/")}
        className="bg-orange hover:bg-orange/90 text-white rounded-3xl px-6 py-3 text-sm font-semibold uppercase transition-all duration-300"
      >
        {copy.returnHome}
      </Link>
    </div>
  );
}
