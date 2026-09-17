import type { ReactNode } from "react";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  canManageCatalog,
  canManageFaq,
  canManagePayments,
  canManageReservations,
  canManageUsers,
} from "@/lib/permissions";
import { LogoutButton } from "./logout-button";

// Server-side check, independent of proxy.ts. Server Actions and some
// request shapes can bypass a proxy matcher (see proxy.ts and Next's own
// data-security guidance) — a layout-level check like this one is the
// authoritative gate, proxy.ts is just the fast path that avoids a
// full render for the common "not logged in at all" case.
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/admin/login");
  }

  const role = session.user.role;

  const navItems = [
    { href: "/admin", label: "Painel", visible: true },
    { href: "/admin/catalogo", label: "Catálogo", visible: canManageCatalog(role) },
    { href: "/admin/reservas", label: "Reservas", visible: canManageReservations(role) },
    { href: "/admin/pagamentos", label: "Pagamentos", visible: canManagePayments(role) },
    { href: "/admin/faq", label: "FAQ", visible: canManageFaq(role) },
    { href: "/admin/clientes", label: "Clientes", visible: canManageUsers(role) },
    { href: "/admin/utilizadores", label: "Utilizadores", visible: canManageUsers(role) },
    { href: "/admin/auditoria", label: "Auditoria", visible: canManageUsers(role) },
  ].filter((item) => item.visible);

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Mobile top bar — the fixed-width sidebar below never fit a phone
       * screen (confirmed: it ate ~60% of a 390px viewport and caused real
       * content overlap on the dashboard). A native <details> disclosure
       * needs no client component / new state — this layout stays a
       * server component. */}
      <div className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <Image
          src="/icons/logooficial.png"
          alt="ZambiTour"
          width={280}
          height={228}
          className="h-8 w-auto object-contain invert"
        />
        <details className="relative">
          <summary className="list-none cursor-pointer p-2 -m-2 rounded-lg hover:bg-slate-100 [&::-webkit-details-marker]:hidden">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6 text-slate-700">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </summary>
          <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white shadow-xl py-2 z-50">
            <nav className="flex flex-col gap-1 px-2">
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  {item.label}
                </a>
              ))}
            </nav>
            <div className="px-5 py-3 mt-1 border-t border-slate-200">
              <p className="text-sm font-medium text-slate-900 truncate">{session.user.name}</p>
              <p className="text-xs text-slate-500 truncate">{session.user.role}</p>
              <LogoutButton />
            </div>
          </div>
        </details>
      </div>

      <aside className="hidden md:flex w-60 shrink-0 bg-white border-r border-slate-200 flex-col">
        <div className="px-5 py-5 border-b border-slate-200">
          <Image
            src="/icons/logooficial.png"
            alt="ZambiTour"
            width={280}
            height={228}
            className="h-10 w-auto object-contain invert mb-2"
          />
          <p className="text-xs text-slate-500 uppercase tracking-wide">Backoffice · Viaje. Descubra. Viva.</p>
        </div>
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 transition-colors"
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="px-5 py-4 border-t border-slate-200">
          <p className="text-sm font-medium text-slate-900 truncate">{session.user.name}</p>
          <p className="text-xs text-slate-500 truncate">{session.user.role}</p>
          <LogoutButton />
        </div>
      </aside>
      <main className="flex-1 p-4 md:p-8 min-w-0">{children}</main>
    </div>
  );
}
