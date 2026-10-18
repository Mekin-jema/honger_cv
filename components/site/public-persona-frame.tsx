import { PersonaProvider } from "@/lib/persona/context";
import { clientView } from "@/server/persona/compile";
import type { ResolvedPersona } from "@/server/persona/resolve";

export function PublicPersonaFrame({
  persona,
  children,
}: {
  persona: ResolvedPersona;
  children: React.ReactNode;
}) {
  return (
    <PersonaProvider value={clientView(persona.compiled, "public", persona.lang)} base={persona.base}>
      {children}
    </PersonaProvider>
  );
}
