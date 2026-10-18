import type { ReactNode } from "react";
import { requireCustomer } from "@/server/admin-session";
import { enText } from "@/lib/persona/edit";
import { PersonaDocShape } from "@/lib/persona/schema";
import { roleCvName } from "@/lib/persona/training";
import { listOwnedPersonas, loadDraft } from "@/server/persona/repo";
import { AccountShell } from "@/components/account/account-shell";

export const dynamic = "force-dynamic";

export default async function AccountLayout({ children }: { children: ReactNode }) {
  const customer = await requireCustomer();
  const owned = await listOwnedPersonas(customer.userId);
  const loaded = await Promise.all(owned.map(async (persona) => {
    const draft = await loadDraft(persona.slug);
    const parsed = PersonaDocShape.safeParse(draft?.doc);
    const identityName = parsed.success ? enText(parsed.data.identity.name) || persona.name : persona.name;
    return {
      slug: persona.slug,
      identityName,
      role: parsed.success ? enText(parsed.data.identity.role ?? parsed.data.identity.headline) : "",
      publishedVersionId: persona.publishedVersionId,
    };
  }));
  const usedNames = new Map<string, number>();
  const personas = loaded.map((persona) => {
    const nameKey = roleCvName(persona.role).toLowerCase();
    const number = (usedNames.get(nameKey) ?? 0) + 1;
    usedNames.set(nameKey, number);
    return { ...persona, name: roleCvName(persona.role, number) };
  });
  return <AccountShell name={customer.name} personas={personas}>{children}</AccountShell>;
}
