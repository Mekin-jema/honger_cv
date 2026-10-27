import type { ReactNode } from "react";
import { requireCustomer } from "@/server/admin-session";
import { enText } from "@/lib/persona/edit";
import { PersonaDocShape } from "@/lib/persona/schema";
import { getAccountDraft, getAccountOwnedPersonas } from "@/server/persona/account-data";
import { AccountShell } from "@/components/account/account-shell";
import { hasCvPass, hasPortfolioPro } from "@/server/billing";

export const dynamic = "force-dynamic";

export default async function AccountLayout({ children }: { children: ReactNode }) {
  const customer = await requireCustomer();
  const [owned, cvPassActive, portfolioProActive] = await Promise.all([
    getAccountOwnedPersonas(customer.userId),
    hasCvPass(customer.userId),
    hasPortfolioPro(customer.userId),
  ]);
  const loaded = await Promise.all(owned.map(async (persona) => {
    const draft = await getAccountDraft(persona.slug);
    const parsed = PersonaDocShape.safeParse(draft?.doc);
    const identityName = parsed.success ? enText(parsed.data.identity.name) || persona.name : persona.name;
    return {
      slug: persona.slug,
      name: parsed.success ? parsed.data.name : persona.name,
      identityName,
      role: parsed.success ? enText(parsed.data.identity.role ?? parsed.data.identity.headline) : "",
      publishedVersionId: persona.publishedVersionId,
    };
  }));
  return (
    <AccountShell
      name={customer.name}
      email={customer.email}
      avatar={customer.image}
      personas={loaded}
      cvPassActive={cvPassActive}
      portfolioProActive={portfolioProActive}
    >
      {children}
    </AccountShell>
  );
}
