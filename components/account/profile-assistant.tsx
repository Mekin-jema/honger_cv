"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bot, LoaderCircle, Send, Sparkles } from "lucide-react";
import { withBase } from "@/lib/utils";

type Turn = { q: string; a: string };
type Message = { role: "user" | "assistant"; text: string };

export function ProfileAssistant({
  slug,
  profileName,
}: {
  slug: string;
  profileName: string;
}) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const endRef = useRef<HTMLDivElement>(null);

  const ask = async (value: string) => {
    const prompt = value.trim();
    if (!prompt || busy) return;
    setQuestion("");
    setError(undefined);
    setMessages((current) => [...current, { role: "user", text: prompt }]);
    setBusy(true);
    try {
      const history: Turn[] = [];
      for (let index = 0; index < messages.length - 1; index += 2) {
        const user = messages[index];
        const assistant = messages[index + 1];
        if (user?.role === "user" && assistant?.role === "assistant") {
          history.push({ q: user.text, a: assistant.text });
        }
      }
      const response = await fetch(withBase(`/api/account/personas/${slug}/test/`), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: prompt, history: history.slice(-6) }),
      });
      const result = (await response.json()) as { text?: string; error?: string };
      if (!response.ok || !result.text) {
        setError(result.error || "Your AI couldn't answer right now. Please try again.");
        setMessages((current) => current.slice(0, -1));
        setQuestion(prompt);
        return;
      }
      setMessages((current) => [...current, { role: "assistant", text: result.text! }]);
      requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }));
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
      setMessages((current) => current.slice(0, -1));
      setQuestion(prompt);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-dvh flex-col bg-bg text-fg">
      <header className="border-b border-line">
        <nav aria-label="Account navigation" className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-5">
          <Link href="/account/" className="font-semibold tracking-tight">Honger CV</Link>
          <span className="text-faint" aria-hidden="true">/</span>
          <Link href="/account/" className="text-sm text-muted hover:text-fg">Dashboard</Link>
          <div className="ml-auto flex items-center gap-2">
            <Link href={`/account/training/${slug}/`} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-line-strong bg-card px-3 text-sm font-semibold hover:border-accent/50">
              <Sparkles className="size-4" aria-hidden="true" /> Train AI
            </Link>
          </div>
        </nav>
      </header>

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-5 py-8">
        <Link href="/account/" className="inline-flex w-fit items-center gap-2 text-sm font-medium text-muted hover:text-fg">
          <ArrowLeft className="size-4" aria-hidden="true" /> Dashboard
        </Link>
        <section className="mt-6 flex min-h-[70dvh] flex-col overflow-hidden rounded-3xl border border-line bg-card shadow-sm">
          <header className="flex items-center gap-3 border-b border-line p-5 sm:px-6">
            <span className="grid size-11 place-items-center rounded-xl bg-accent-soft text-accent">
              <Bot className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h1 className="truncate font-semibold">{profileName}&apos;s AI</h1>
              <p className="text-sm text-muted">Private preview · answers from your profile draft</p>
            </div>
          </header>

          <div className="flex-1 space-y-4 overflow-y-auto p-5 sm:p-6" aria-live="polite" aria-label="Conversation">
            {messages.length === 0 && (
              <div className="mx-auto mt-10 max-w-lg text-center">
                <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent">
                  <Sparkles className="size-5" aria-hidden="true" />
                </span>
                <h2 className="mt-4 text-xl font-semibold">Try asking your AI</h2>
                <p className="mt-2 text-sm leading-6 text-muted">This private preview uses your latest saved training draft. Update the draft any time to teach it more.</p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {["What are my key skills?", "Summarize my experience", "Tell me about my projects"].map((suggestion) => (
                    <button key={suggestion} type="button" onClick={() => void ask(suggestion)} disabled={busy} className="min-h-10 rounded-full border border-line-strong bg-bg px-3.5 text-sm font-medium hover:border-accent/50 disabled:opacity-60">
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((message, index) => (
              <div key={`${index}-${message.role}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <p className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === "user" ? "bg-accent text-on-accent" : "border border-line bg-bg"}`}>
                  {message.text}
                </p>
              </div>
            ))}
            {busy && <div className="flex items-center gap-2 text-sm text-muted"><LoaderCircle className="size-4 animate-spin" /> Checking your profile…</div>}
            <div ref={endRef} />
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void ask(question);
            }}
            className="border-t border-line p-4 sm:p-5"
          >
            {error && <p role="alert" className="mb-3 text-sm font-medium text-accent">{error}</p>}
            <div className="flex items-end gap-2">
              <label className="sr-only" htmlFor="profile-question">Ask your AI</label>
              <textarea id="profile-question" rows={2} maxLength={300} value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask a question about your profile…" className="min-h-12 flex-1 resize-y rounded-xl border border-line-strong bg-bg px-4 py-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20" />
              <button type="submit" disabled={busy || question.trim().length < 2} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-accent px-4 font-semibold text-on-accent disabled:opacity-50" aria-label="Send question">
                {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
                <span className="hidden sm:inline">Ask</span>
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
