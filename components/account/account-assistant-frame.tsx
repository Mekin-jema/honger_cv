"use client";

import { ChatApp } from "@/components/chat-app";
import { PersonaProvider } from "@/lib/persona/context";
import type { ClientPersona } from "@/lib/persona/types";

export function AccountAssistantFrame({ slug, persona, aiEnabled, initialQuestion }: { slug: string; persona: ClientPersona; aiEnabled: boolean; initialQuestion?: string }) {
  return (
    <PersonaProvider value={persona}>
      <ChatApp
        aiEnabled={aiEnabled}
        initialQuestion={initialQuestion}
        aiApiPath={`/api/account/personas/${slug}/test/`}
        trackEvents={false}
        syncUrlPaths={false}
        privateMode
      />
    </PersonaProvider>
  );
}
