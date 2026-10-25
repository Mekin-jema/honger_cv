"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Check, Copy, FileText, RefreshCw, Sparkles, ThumbsDown, ThumbsUp, Volume2, VolumeX } from "lucide-react";
import { AnimatedBlocks, loadGsap } from "@/components/blocks/animated-blocks";
import { BlockView } from "@/components/blocks/blocks";
import { resolveIntent, type AssistantMessage as AssistantMsg, type Phase } from "@/lib/chat";
import { usePersona } from "@/lib/persona/context";
import { cn, plain } from "@/lib/utils";
import { postApi, readVotes, rememberVote } from "@/lib/visitor";
import { RichText } from "./rich-text";
import { SuggestionChips } from "./suggestion-chips";

export function UserMessage({ text }: { text: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="flex justify-end"
    >
      <p className="max-w-[85%] rounded-[1.6rem] rounded-br-lg bg-surface px-5 py-3 text-[17px] leading-snug font-medium md:text-lg">
        {text}
      </p>
    </motion.div>
  );
}

export function AssistantAvatar() {
  const { identity } = usePersona();
  return (
    <span className="grid size-8 shrink-0 place-items-center rounded-[0.7rem] bg-fg text-[15px] font-bold text-bg md:size-9">
      <span aria-hidden="true">{identity.shortName.slice(0, 1).toUpperCase()}</span>
      <span className="sr-only">{`${identity.shortName}:`}</span>
    </span>
  );
}

type Props = {
  msg: AssistantMsg;
  isLast: boolean;
  onPhase: (id: string, phase: Phase) => void;
  onAsk: (intentId: string) => void;
  onRegenerate: (id: string) => void;
  privateMode?: boolean;
};

export function AssistantMessage({ msg, isLast, onPhase, onAsk, onRegenerate, privateMode = false }: Props) {
  const persona = usePersona();
  const intent = resolveIntent(msg, persona);
  // If AI selected a curated topic, keep its corresponding indexable page link.
  const pageIntentId = msg.ai?.status === "ready" ? msg.ai.topicId : intent.id;
  const availableBlocks = privateMode
    ? intent.blocks.filter((block) => !["contact-form", "feedback-form", "request-access"].includes(block.kind))
    : intent.blocks;
  const blocks =
    !privateMode && pageIntentId === "contact" && !availableBlocks.some((block) => block.kind === "contact-form")
      ? [...availableBlocks, { kind: "contact-form" as const }]
      : availableBlocks;
  const page = !privateMode && pageIntentId ? persona.get(pageIntentId)?.page : undefined;
  const text = intent.answers[msg.variant % intent.answers.length];
  const words = text.split(/(\s+)/);
  const reduced = useReducedMotion();
  const instant = !msg.animate || !!reduced;
  const [count, setCount] = useState(0);
  const [copied, setCopied] = useState(false);
  // AI answers are rated one by one (each is unique); curated ones per wording.
  const aiAnswerId = msg.ai?.status === "ready" ? msg.ai.answerId : undefined;
  // The site's own replies (an access code was typed) are not rated.
  const notice = msg.ai?.status === "ready" && !!msg.ai.notice;
  const voteKey = aiAnswerId ? `ai:${aiAnswerId}` : `${intent.id}:${msg.variant % intent.answers.length}`;
  const [vote, setVote] = useState<"up" | "down" | null>(null);
  const [voteNote, setVoteNote] = useState(false);
  const [voteError, setVoteError] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [speechError, setSpeechError] = useState("");
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(
    () => () => {
      if (utteranceRef.current) {
        utteranceRef.current.onend = null;
        utteranceRef.current.onerror = null;
        window.speechSynthesis?.cancel();
      }
    },
    [],
  );

  // The "couldn't save" note clears itself after a few seconds.
  useEffect(() => {
    if (!voteError) return;
    const t = setTimeout(() => setVoteError(false), 4000);
    return () => clearTimeout(t);
  }, [voteError]);

  // Warm up the animation library while "thinking", so the cards can animate as soon as they appear.
  useEffect(() => {
    if (msg.animate && blocks.length) loadGsap().catch(() => {});
  }, [msg.animate, blocks.length]);

  // Restore this visitor's earlier vote on this exact wording.
  useEffect(() => {
    const saved = readVotes()[voteKey] ?? null;
    if (saved) queueMicrotask(() => setVote(saved));
  }, [voteKey]);

  const castVote = async (value: "up" | "down") => {
    const next = vote === value ? null : value;
    setVote(next);
    setVoteError(false);
    // A failed thumbs-down keeps its "Tell me what was missing" note open, next to the error below.
    setVoteNote(next === "down");
    rememberVote(voteKey, next);
    const res = await postApi("/api/vote/", { intentId: intent.id, variant: aiAnswerId ? 0 : msg.variant % intent.answers.length, answerId: aiAnswerId, value: next });
    if (!res.ok) {
      setVote(vote);
      rememberVote(voteKey, vote);
      setVoteError(true);
    }
  };

  // thinking → streaming → done. Stopping (phase forced to "done") short-circuits everything.
  useEffect(() => {
    if (msg.phase === "thinking") {
      // A free-form question stays on "Reading my CV..." until the AI answers, then types straight away.
      if (msg.ai?.status === "loading") return;
      if (instant) return onPhase(msg.id, "done");
      if (msg.ai) return onPhase(msg.id, "streaming");
      const t = setTimeout(() => onPhase(msg.id, "streaming"), 450 + Math.random() * 300);
      return () => clearTimeout(t);
    }
    if (msg.phase === "streaming") {
      if (count >= words.length) return onPhase(msg.id, "done");
      const t = setTimeout(() => setCount((c) => Math.min(words.length, c + 2)), 24);
      return () => clearTimeout(t);
    }
  }, [msg.phase, msg.id, msg.ai, count, words.length, instant, onPhase]);

  const done = msg.phase === "done";
  const shown = done ? text : words.slice(0, count).join("");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(plain(text));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const toggleSpeech = () => {
    if (!("speechSynthesis" in window)) {
      setSpeechError("Audio playback is not supported by this browser.");
      return;
    }
    setSpeechError("");
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(plain(text));
    utteranceRef.current = utterance;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  };

  const appear = (i: number) =>
    msg.animate
      ? {
          initial: { opacity: 0, y: 10 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.35, delay: 0.06 * i, ease: [0.22, 1, 0.36, 1] as const },
        }
      : {};

  return (
    <div className="flex gap-3 md:gap-4">
      <AssistantAvatar />
      <div className="min-w-0 flex-1 pt-0.5">
        {msg.phase === "thinking" ? (
          <p className="shimmer text-[17px] font-medium md:text-lg">{persona.labels.thinking}</p>
        ) : (
          <p className="text-[18px] leading-[1.65] text-fg/90 md:text-[19px]">
            <RichText text={shown} />
          </p>
        )}

        {done && msg.ai?.status === "ready" && !msg.ai.notice && !msg.ai.gated && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-faint">
            <Sparkles className="size-3.5 shrink-0" aria-hidden="true" /> {persona.labels.aiDisclaimer}
          </p>
        )}

        {done && (
          <>
            {blocks.length > 0 && (
              <AnimatedBlocks animate={msg.animate} className="mt-5 -ml-11 space-y-4 md:ml-0">
                {blocks.map((b, i) => (
                  <div key={i}>
                    <BlockView block={b} onAsk={onAsk} />
                  </div>
                ))}
              </AnimatedBlocks>
            )}

            <motion.div {...appear(intent.blocks.length)} className="mt-3 -ml-[3.375rem] inline-flex items-center gap-1 rounded-xl border border-line bg-bg-soft/70 p-1 shadow-sm md:-ml-2.5">
              <button
                type="button"
                className={cn(
                  "icon-btn size-9 border border-line bg-card text-fg shadow-sm hover:border-line-strong hover:bg-surface",
                  speaking && "border-accent bg-accent-soft text-accent",
                )}
                onClick={toggleSpeech}
                aria-label={speaking ? "Stop reading answer aloud" : "Read answer aloud"}
                title={speaking ? "Stop reading answer aloud" : "Read answer aloud"}
                aria-pressed={speaking}
              >
                {speaking ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
              </button>
              <button type="button" className="icon-btn size-9 border border-line bg-card text-fg shadow-sm hover:border-line-strong hover:bg-surface" onClick={copy} aria-label="Copy answer" title="Copy answer">
                {copied ? <Check className="size-4 text-accent" /> : <Copy className="size-4" />}
              </button>
              {page && (
                <a href={persona.href(page)} className="icon-btn size-9 border border-line bg-card text-fg shadow-sm hover:border-line-strong hover:bg-surface" aria-label="Open the related portfolio page" title="Open portfolio page">
                  <FileText className="size-4" />
                </a>
              )}
              {!privateMode && !notice && (
                <>
                <button
                  type="button"
                  className={cn(
                    "icon-btn size-9 border border-line bg-card text-fg shadow-sm hover:border-line-strong hover:bg-surface",
                    vote === "up" && "border-accent bg-accent-soft text-accent hover:bg-accent-soft",
                  )}
                  onClick={() => castVote("up")}
                  aria-label="Good answer"
                  title="Good answer"
                  aria-pressed={vote === "up"}
                >
                  <ThumbsUp className={cn("size-4", vote === "up" && "fill-current")} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className={cn(
                    "icon-btn size-9 border border-line bg-card text-fg shadow-sm hover:border-line-strong hover:bg-surface",
                    vote === "down" && "border-accent bg-accent-soft text-accent hover:bg-accent-soft",
                  )}
                  onClick={() => castVote("down")}
                  aria-label="Bad answer"
                  title="Bad answer"
                  aria-pressed={vote === "down"}
                >
                  <ThumbsDown className={cn("size-4", vote === "down" && "fill-current")} aria-hidden="true" />
                </button>
                </>
              )}
              {intent.id !== "fallback" && !msg.ai && (
                <button type="button" className="icon-btn size-9 border border-line bg-card text-fg shadow-sm hover:border-line-strong hover:bg-surface" onClick={() => onRegenerate(msg.id)} aria-label="Regenerate answer" title="Regenerate answer">
                  <RefreshCw className="size-4" />
                </button>
              )}
              {vote === "up" && <span className="ml-1 text-sm text-faint">Thanks!</span>}
            </motion.div>
            {speechError && (
              <p role="status" aria-live="polite" className="-ml-11 mt-1 text-sm text-muted md:ml-0">
                {speechError}
              </p>
            )}
            <p role="status" aria-live="polite" className={cn("-ml-11 text-sm text-muted md:ml-0", voteError ? "mt-1" : "sr-only")}>
              {voteError ? "Couldn't save your vote - try again." : ""}
            </p>
            {!privateMode && voteNote && persona.get("feedback") && (
              <p className="mt-1 -ml-11 text-sm text-muted md:ml-0">
                Sorry it missed.{" "}
                <button type="button" className="font-semibold text-fg underline-offset-4 hover:underline" onClick={() => onAsk("feedback")}>
                  Tell me what was missing
                </button>
              </p>
            )}

            {isLast && intent.followUps.length > 0 && (
              <motion.div {...appear(blocks.length + 1)} className="mt-3 -ml-11 md:ml-0">
                <SuggestionChips ids={intent.followUps} onPick={onAsk} wrap />
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
