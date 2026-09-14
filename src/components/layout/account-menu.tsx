"use client";

import Image from "next/image";
import { useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import type { Locale } from "@/i18n/config";

const COPY = {
  pt: { signIn: "Entrar", signOut: "Sair" },
  en: { signIn: "Sign in", signOut: "Sign out" },
};

export function AccountMenu({ locale, compact = false }: { locale: Locale; compact?: boolean }) {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const t = COPY[locale];

  if (status === "loading") return null;

  if (!session?.user) {
    return (
      <button
        type="button"
        onClick={() => signIn("google")}
        className={`inline-flex items-center rounded-full border border-white/25 text-white/80 hover:bg-white/10 hover:text-white transition-all duration-300 cursor-pointer ${
          compact ? "w-8 h-8 justify-center" : "px-3 h-8 text-xs font-semibold"
        }`}
        aria-label={t.signIn}
      >
        {compact ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" />
          </svg>
        ) : (
          t.signIn
        )}
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-8 h-8 rounded-full overflow-hidden border border-white/25 shrink-0 cursor-pointer"
        aria-label={session.user.name || session.user.email || ""}
      >
        {session.user.image ? (
          <Image src={session.user.image} alt="" width={32} height={32} className="w-full h-full object-cover" />
        ) : (
          <span className="w-full h-full flex items-center justify-center bg-orange text-white text-xs font-bold">
            {(session.user.name || session.user.email || "?").charAt(0).toUpperCase()}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-44 rounded-xl border border-white/10 bg-leafy shadow-xl py-2 z-50">
          <p className="px-3 py-1.5 text-white/60 text-xs truncate">{session.user.name || session.user.email}</p>
          <button
            type="button"
            onClick={() => signOut()}
            className="w-full text-left px-3 py-1.5 text-white/80 hover:text-white hover:bg-white/10 text-xs cursor-pointer"
          >
            {t.signOut}
          </button>
        </div>
      )}
    </div>
  );
}
