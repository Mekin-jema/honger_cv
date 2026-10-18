"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { useRouter } from "next/navigation";
import { maskCode, unlockWithCode } from "./access";
import { looksLikeAccessCode } from "./persona/access-code";
import type { PersonaApi } from "./persona/context";
import type { Block, Question } from "./persona/types";
import { plain } from "./utils";
import { postApi } from "./visitor";

export type Phase = "thinking" | "streaming" | "done";

export type UserMessage = { id: string; role: "user"; text: string };

/** A free-form question on its way to, or back from, the AI (POST /api/ask). */
export type AiState =
  | { status: "loading"; requestId: string }
  /** `topicId` when the AI chose a curated topic and wrote tailored text above that topic's cards. */
  | {
      status: "ready";
      answerId: string;
      text: string;
      cards: Block[];
      suggestedTopics: string[];
      topicId?: string;
      gated?: boolean;
      notice?: boolean;
    }
  /** The visitor pressed Stop (or asked something else) before the answer arrived. */
  | { status: "stopped" };

export type AssistantMessage = {
  id: string;
  role: "assistant";
  /** The curated answer to play; "ai" while the AI handles a free-form question, "fallback" when nothing fits. */
  intentId: string;
  variant: number;
  phase: Phase;
  /** False for answers that should appear instantly (deep links, reduced motion). */
  animate: boolean;
  /** The visitor's own words (free-form questions only). */
  question?: string;
  ai?: AiState;
};
export type Message = UserMessage | AssistantMessage;

/** What the server did with a free-form question. */
export type AiResult =
  | {
      route: "topic";
      intentId: string;
      answerId: string;
      text?: string;
      cards: Block[];
      suggestedTopics: string[];
    }
  | {
      route: "answer" | "gated";
      answerId: string;
      text: string;
      cards: Block[];
      suggestedTopics: string[];
    }
  /** The site's own reply (an access code was typed): no AI badge, no votes. */
  | {
      route: "notice";
      answerId: string;
      text: string;
      cards: Block[];
      suggestedTopics: string[];
    }
  | { route: "decline" | "failed" };

type State = { messages: Message[]; seq: number };

type Action =
  | {
      type: "ask";
      intentId: string;
      text: string;
      variant: number;
      ai?: AiState;
    }
  | { type: "ai-result"; requestId: string; result: AiResult }
  | { type: "phase"; id: string; phase: Phase }
  | { type: "stop" }
  | { type: "regenerate"; id: string }
  | { type: "reset" };

const finishAll = (messages: Message[]) =>
  messages.map((m) =>
    m.role === "assistant" && m.phase !== "done"
      ? {
          ...m,
          phase: "done" as const,
          ai:
            m.ai?.status === "loading" ? { status: "stopped" as const } : m.ai,
        }
      : m,
  );

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "ask": {
      const seq = state.seq + 2;
      return {
        seq,
        messages: [
          ...finishAll(state.messages),
          { id: `u${seq}`, role: "user", text: action.text },
          {
            id: `a${seq}`,
            role: "assistant",
            intentId: action.intentId,
            variant: action.variant,
            phase: "thinking",
            animate: true,
            question: action.ai ? action.text : undefined,
            ai: action.ai,
          },
        ],
      };
    }
    case "ai-result":
      return {
        ...state,
        messages: state.messages.map((m) => {
          if (
            m.role !== "assistant" ||
            m.ai?.status !== "loading" ||
            m.ai.requestId !== action.requestId
          )
            return m;
          const r = action.result;
          // A curated topic fits. Without tailored text the curated answer plays as is; with it, the
          // model's words lead and the topic's cards and follow-ups come along.
          if (r.route === "topic") {
            if (!r.text)
              return { ...m, intentId: r.intentId, variant: 0, ai: undefined };
            return {
              ...m,
              intentId: r.intentId,
              ai: {
                status: "ready",
                answerId: r.answerId,
                text: r.text,
                cards: r.cards,
                suggestedTopics: r.suggestedTopics,
                topicId: r.intentId,
              },
            };
          }
          if (
            r.route === "answer" ||
            r.route === "gated" ||
            r.route === "notice"
          )
            return {
              ...m,
              ai: {
                status: "ready",
                answerId: r.answerId,
                text: r.text,
                cards: r.cards,
                suggestedTopics: r.suggestedTopics,
                gated: r.route === "gated",
                notice: r.route === "notice",
              },
            };
          return { ...m, intentId: "fallback", ai: undefined };
        }),
      };
    case "phase":
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.id === action.id && m.role === "assistant"
            ? { ...m, phase: action.phase }
            : m,
        ),
      };
    case "stop":
      return { ...state, messages: finishAll(state.messages) };
    case "regenerate":
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.id === action.id && m.role === "assistant"
            ? { ...m, variant: m.variant + 1, phase: "thinking", animate: true }
            : m,
        ),
      };
    case "reset":
      return { messages: [], seq: state.seq };
  }
}

const syncUrl = (path: string) => {
  if (typeof window !== "undefined" && window.location.pathname !== path)
    window.history.replaceState(null, "", path);
};

const randomId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

/** The question to render for a message: a curated one, or a one-off built from the AI's answer. */
export function resolveIntent(
  msg: AssistantMessage,
  persona: PersonaApi,
): Question {
  const ai = msg.ai;
  if (!ai) return persona.get(msg.intentId) ?? persona.fallback;
  const base = {
    id: "ai",
    label: persona.labels.aiLabel,
    prompt: msg.question ?? "",
    icon: "sparkles",
    keywords: [] as string[],
  };
  if (ai.status === "ready")
    return {
      ...base,
      label: (ai.topicId && persona.get(ai.topicId)?.label) || base.label,
      answers: [ai.text],
      blocks: ai.cards,
      followUps: ai.suggestedTopics,
    };
  if (ai.status === "stopped")
    return {
      ...base,
      answers: [persona.labels.aiStopped],
      blocks: [],
      followUps: persona.defaultFollowUps,
    };
  return { ...base, answers: [""], blocks: [], followUps: [] };
}

const MAX_TURNS = 6;

/** The last few question/answer pairs, so the AI can resolve "tell me more about that". */
function buildHistory(
  messages: Message[],
  persona: PersonaApi,
): { q: string; a: string }[] {
  const turns: { q: string; a: string }[] = [];
  for (let i = 0; i < messages.length - 1; i++) {
    const m = messages[i];
    const next = messages[i + 1];
    if (m.role !== "user" || next.role !== "assistant") continue;
    if (next.ai && (next.ai.status !== "ready" || next.ai.notice)) continue;
    const intent = resolveIntent(next, persona);
    const a = plain(intent.answers[next.variant % intent.answers.length] ?? "");
    if (a) turns.push({ q: m.text.slice(0, 300), a: a.slice(0, 600) });
  }
  return turns.slice(-MAX_TURNS);
}

export function useChat(
  persona: PersonaApi,
  initialIntent?: string,
  options: { aiApiPath?: string; syncUrlPaths?: boolean } = {},
) {
  const { aiApiPath = "/api/ask/", syncUrlPaths = true } = options;
  const [state, dispatch] = useReducer(
    reducer,
    { persona, initialIntent },
    (): State => ({ messages: [], seq: 0 }),
  );
  const router = useRouter();
  // The latest messages and persona, for building the AI's history outside React's render.
  const messagesRef = useRef(state.messages);
  const personaRef = useRef(persona);
  useEffect(() => {
    messagesRef.current = state.messages;
    personaRef.current = persona;
  }, [state.messages, persona]);

  const askAi = useCallback((question: string) => {
    const requestId = randomId();
    const p = personaRef.current;
    const history = buildHistory(messagesRef.current, p);
    dispatch({
      type: "ask",
      intentId: "ai",
      text: question,
      variant: 0,
      ai: { status: "loading", requestId },
    });
    postApi(aiApiPath, { question, history, lang: p.lang }).then((res) => {
      const common = {
        answerId: typeof res.answerId === "string" ? res.answerId : requestId,
        cards: Array.isArray(res.cards) ? (res.cards as Block[]) : [],
        suggestedTopics: Array.isArray(res.suggestedTopics)
          ? (res.suggestedTopics as string[])
          : [],
      };
      const result: AiResult = !res.ok
        ? { route: "failed" }
        : res.route === "topic" && typeof res.intentId === "string"
          ? {
              route: "topic",
              intentId: res.intentId,
              text:
                typeof res.text === "string" && res.text ? res.text : undefined,
              ...common,
            }
          : (res.route === "answer" || res.route === "gated") &&
              typeof res.text === "string"
            ? { route: res.route, text: res.text, ...common }
            : { route: "decline" };
      dispatch({ type: "ai-result", requestId, result });
      if (syncUrlPaths && result.route === "topic") syncUrl(p.askPath(result.intentId));
    });
  }, [aiApiPath, syncUrlPaths]);

  // An access code typed in the box unlocks the private details; it never goes to the AI.
  const unlock = useCallback(
    (code: string) => {
      const requestId = randomId();
      const p = personaRef.current;
      dispatch({
        type: "ask",
        intentId: "ai",
        text: maskCode(code),
        variant: 0,
        ai: { status: "loading", requestId },
      });
      void unlockWithCode(code).then((res) => {
        const result: AiResult = res.ok
          ? {
              route: "notice",
              answerId: requestId,
              text: p.labels.codeUnlocked,
              cards: [],
              suggestedTopics: p.defaultFollowUps,
            }
          : {
              route: "notice",
              answerId: requestId,
              text: res.limited ? p.labels.codeLimited : p.labels.codeWrong,
              cards: [{ kind: "request-access" }],
              suggestedTopics: [],
            };
        dispatch({ type: "ai-result", requestId, result });
        // The server renders this visitor's unlocked view (more answers, cards and the document).
        if (res.ok) router.refresh();
      });
    },
    [router],
  );

  const ask = useCallback(
    (intentId: string, text?: string) => {
      const p0 = personaRef.current;
      if (text && p0.access.mode !== "open" && looksLikeAccessCode(text))
        return unlock(text.trim());
      // Free-form text: the AI decides whether a curated answer fits or writes one from the persona's notes.
      if (intentId === "ai" && text?.trim()) return askAi(text.trim());
      const p = personaRef.current;
      const intent = p.get(intentId) ?? p.fallback;
      // "Surprise me" starts on a random wording; everything else starts on the first.
      const variant = intent.random
        ? Math.floor(Math.random() * intent.answers.length)
        : 0;
      dispatch({
        type: "ask",
        intentId: intent.id,
        text: text?.trim() || intent.prompt,
        variant,
      });
      if (syncUrlPaths && intent.id !== "fallback") syncUrl(p.askPath(intent.id));
    },
    [askAi, syncUrlPaths, unlock],
  );

  const setPhase = useCallback(
    (id: string, phase: Phase) => dispatch({ type: "phase", id, phase }),
    [],
  );
  const stop = useCallback(() => dispatch({ type: "stop" }), []);
  const regenerate = useCallback(
    (id: string) => dispatch({ type: "regenerate", id }),
    [],
  );
  const reset = useCallback(() => {
    dispatch({ type: "reset" });
    if (syncUrlPaths) syncUrl(personaRef.current.href("/"));
  }, [syncUrlPaths]);

  const generating = state.messages.some(
    (m) => m.role === "assistant" && m.phase !== "done",
  );

  return {
    messages: state.messages,
    generating,
    ask,
    setPhase,
    stop,
    regenerate,
    reset,
  };
}

export type Chat = ReturnType<typeof useChat>;
