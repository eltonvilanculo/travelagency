"use client";

import { usePathname } from "next/navigation";
import Image from "next/image";
import { getLocaleFromPathname, getStatusCopy } from "@/i18n/status";

// Was the generic Next.js starter styling (zinc grays, a dark: variant
// that rendered near-invisible on this project's light theme) — replaced
// with the actual brand so an error page doesn't look broken on top of
// being an error page.
export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const pathname = usePathname();
  const locale = getLocaleFromPathname(pathname);
  const copy = getStatusCopy(locale).error;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-beige px-6 text-center gap-6">
      <div className="bg-leafy rounded-2xl px-6 py-5">
        <Image src="/icons/logooficial.png" alt="ZambiTour" width={280} height={228} className="h-14 w-auto object-contain" />
      </div>
      <div>
        <h1 className="text-textdark text-2xl md:text-3xl font-semibold mb-2">{copy.title}</h1>
        <p className="max-w-md text-parablack text-sm leading-relaxed">{copy.description}</p>
      </div>
      <button
        type="button"
        onClick={reset}
        className="bg-orange hover:bg-orange/90 text-white rounded-3xl px-6 py-3 text-sm font-semibold uppercase transition-all duration-300 cursor-pointer"
      >
        {copy.tryAgain}
      </button>
    </div>
  );
}
