import { requirePagePermission } from "@/lib/require-permission";
import { canManageFaq } from "@/lib/permissions";
import { FaqClient } from "./faq-client";

// Server-side gate — the sidebar only hides this link from the wrong role,
// it doesn't stop direct navigation. This is the real check (see
// require-permission.ts). The interactive list/form lives in the client
// component since it needs useState/fetch.
export default async function FaqPage() {
  await requirePagePermission(canManageFaq);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900 mb-1">FAQ</h1>
      <p className="text-slate-500 text-sm mb-6">
        Perguntas e respostas PT/EN para o bot do site, e o registo de perguntas sem resposta para revisão.
      </p>
      <FaqClient />
    </div>
  );
}
