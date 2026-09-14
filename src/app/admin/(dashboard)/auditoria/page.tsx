import { requirePagePermission } from "@/lib/require-permission";
import { canManageUsers } from "@/lib/permissions";
import { AuditoriaClient } from "./auditoria-client";

export default async function AuditoriaPage() {
  await requirePagePermission(canManageUsers);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900 mb-1">Auditoria</h1>
      <p className="text-slate-500 text-sm mb-6">Registo de ações da equipa: mudanças de estado, edições de catálogo e de contas.</p>
      <AuditoriaClient />
    </div>
  );
}
