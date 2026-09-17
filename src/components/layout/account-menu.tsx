"use client";

import Image from "next/image";
import { useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { GoogleLogo, FacebookLogo } from "@/components/ui/social-logos";
import type { Locale } from "@/i18n/config";

const COPY = {
  pt: { signIn: "Entrar", signOut: "Sair", google: "Continuar com Google", facebook: "Continuar com Facebook" },
  en: { signIn: "Sign in", signOut: "Sign out", google: "Continue with Google", facebook: "Continue with Facebook" },
};

// The small overlapping Google+Facebook badge shown on the collapsed
// button — signals "social login available" before the visitor even
// clicks, and doubles as the thing that visually "leaves" the button when
// the dropdown opens (see the animation below).
// Collapses its own width (not just opacity/scale) when shrinking, so the
// "Entrar" label re-centers in the pill instead of leaving a lopsided gap
// where the badge used to be.
function ProviderBadgeCluster({ shrink }: { shrink: boolean }) {
  return (
    <span
      className="relative h-4 shrink-0 overflow-hidden transition-all duration-200"
      style={{ width: shrink ? 0 : "1rem", marginRight: shrink ? 0 : "0.375rem", opacity: shrink ? 0 : 1 }}
    >
      <span className="absolute left-0 top-0 w-3 h-3 rounded-full bg-white flex items-center justify-center shadow-sm">
        <GoogleLogo className="w-2 h-2" />
      </span>
      <span className="absolute right-0 bottom-0 w-3 h-3 rounded-full bg-white flex items-center justify-center shadow-sm">
        <FacebookLogo className="w-2 h-2" />
      </span>
    </span>
  );
}

export function AccountMenu({ locale, compact = false }: { locale: Locale; compact?: boolean }) {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const t = COPY[locale];

  if (status === "loading") return null;

  if (!session?.user) {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={`inline-flex items-center justify-center rounded-full border border-white/25 text-white/80 hover:bg-white/10 hover:text-white transition-all duration-300 cursor-pointer ${
            compact ? "w-8 h-8" : "px-3 h-8 text-xs font-semibold"
          }`}
          aria-label={t.signIn}
        >
          <ProviderBadgeCluster shrink={open} />
          {!compact && t.signIn}
        </button>
        {open && (
          <div className="absolute right-0 mt-2 w-56 rounded-xl border border-white/10 bg-leafy shadow-xl py-2 z-50 flex flex-col overflow-hidden">
            <button
              type="button"
              onClick={() => signIn("google")}
              className="social-drop-in w-full text-left px-3 py-2 text-white/80 hover:text-white hover:bg-white/10 text-xs cursor-pointer flex items-center gap-2.5"
              style={{ animationDelay: "40ms" }}
            >
              <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center shrink-0">
                <GoogleLogo className="w-3 h-3" />
              </span>
              {t.google}
            </button>
            <button
              type="button"
              onClick={() => signIn("facebook")}
              className="social-drop-in w-full text-left px-3 py-2 text-white/80 hover:text-white hover:bg-white/10 text-xs cursor-pointer flex items-center gap-2.5"
              style={{ animationDelay: "120ms" }}
            >
              <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center shrink-0">
                <FacebookLogo className="w-3 h-3" />
              </span>
              {t.facebook}
            </button>
          </div>
        )}
        <style jsx>{`
          @keyframes socialDropIn {
            from {
              opacity: 0;
              transform: translateY(-10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .social-drop-in {
            animation: socialDropIn 0.32s ease-out both;
          }
        `}</style>
      </div>
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
