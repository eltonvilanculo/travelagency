import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/require-permission";
import { canManageUsers } from "@/lib/permissions";
import { AuditService } from "@/lib/data-access/audit";

// Administrator-only, same gate as Utilizadores — the audit trail records
// every other admin's actions, so it belongs with the other
// account-oversight screen, not open to every role.
export async function GET() {
  const { response } = await requirePermission(canManageUsers);
  if (response) return response;

  const entries = await AuditService.findRecent(100);
  return NextResponse.json(entries);
}
