import { requirePagePermission } from "@/lib/require-permission";
import { canManageUsers } from "@/lib/permissions";
import { ClientesClient } from "./clientes-client";

export default async function ClientesPage() {
  await requirePagePermission(canManageUsers);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900 mb-1">Clientes</h1>
      <p className="text-slate-500 text-sm mb-6">Contas de cliente criadas via sessão Google ou Facebook — separado dos contactos de reserva como convidado.</p>
      <ClientesClient />
    </div>
  );
}
