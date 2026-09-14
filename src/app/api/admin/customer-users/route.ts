import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/require-permission";
import { canManageUsers } from "@/lib/permissions";
import { CustomerUserService } from "@/lib/data-access/customer-users";

// Administrator-only, same gate as Utilizadores — this is account
// oversight (who has a customer login), not day-to-day booking work.
export async function GET() {
  const { response } = await requirePermission(canManageUsers);
  if (response) return response;

  const users = await CustomerUserService.findAll();
  return NextResponse.json(users);
}
