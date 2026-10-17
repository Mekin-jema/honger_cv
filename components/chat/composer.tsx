"use client";

import { forwardRef, useId, useImperativeHandle, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUp, CornerDownLeft, Sparkles, Square } from "lucide-react";
import { exactIntent, matchIntents } from "@/lib/match-intent";
import { usePersona } from "@/lib/persona/context";
import { QIcon } from "@/lib/persona/icons";
import type { Question } from "@/lib/persona/types";
import { cn, withBase } from "@/lib/utils";
import { RichText } from "./rich-text";

type Props = {
  onSubmit: (intentId: string, text?: string) => void;
  generating: boolean;
  onStop: () => void;
  className?: string;
  /** Typed questions go to the AI (which may still play a ready-made answer) instead of the keyword match. */
  aiEnabled?: boolean;
};

/** What typed text can turn into: a ready-made answer, or a question for the AI. */
type Option = { kind: "intent"; intent: Question } | { kind: "ask" };

export type ComposerHandle = { focus: () => void; showAll: () => void };

export const Composer = forwardRef<ComposerHandle, Props>(function Composer({ onSubmit, generating, onStop, className, aiEnabled = false }, ref) {
  const persona = usePersona();
  const { questions, labels } = persona;
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  useImperativeHandle(
    ref,
    () => ({
      focus: () => inputRef.current?.focus(),
      // "More" chip: open the list of everything you can ask.
      showAll: () => {
        setValue("/");
        setOpen(true);
        setActive(0);
        inputRef.current?.focus();
      },
    }),
    [],
  );

  const q = value.trim();
  const matches = useMemo(() => (q ? matchIntents(q, questions) : []), [q, questions]);
  // With the AI on, typed text is a question for it (Enter), unless it is exactly a topic's name or a
  // single keyword, which the ready-made answer covers at once. The arrow keys still pick any ready-made
  // answer, and "/" lists them all as before.
  const options = useMemo<Option[]>(() => {
    const ready = matches.map((intent): Option => ({ kind: "intent", intent }));
    if (!aiEnabled || !q || q.startsWith("/")) return ready;
    const exact = exactIntent(q, questions, matches[0]);
    if (exact) return [{ kind: "intent", intent: exact }, { kind: "ask" }, ...ready.filter((o) => o.kind === "intent" && o.intent.id !== exact.id)];
    return [{ kind: "ask" }, ...ready];
  }, [aiEnabled, q, matches, questions]);
  const showList = open && q.length > 0;

  const send = (intentId: string, text?: string) => {
    onSubmit(intentId, text);
    setValue("");
    setOpen(false);
    setActive(0);
  };

  const submitWith = (chosen: Option | undefined) => {
    if (generating) return onStop();
    if (!q) return;
    // The owner's shortcut to the admin sign-in (the page is public; nothing is checked here).
    if (q.toLowerCase() === "/admin") return window.location.assign(withBase("/admin/login/"));
    if (chosen?.kind === "intent") return send(chosen.intent.id);
    send(chosen ? "ai" : "fallback", q);
  };
  const submit = () => submitWith(options[active] ?? options[0]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" && options.length) {
      e.preventDefault();
      setOpen(true);
      setActive((a) => (a + 1) % options.length);
    } else if (e.key === "ArrowUp" && options.length) {
      e.preventDefault();
      setActive((a) => (a - 1 + options.length) % options.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      submit();
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className={cn("relative", className)}>
      <AnimatePresence>
        {showList && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="absolute inset-x-0 bottom-full z-20 mb-2 overflow-hidden rounded-3xl border border-line bg-card shadow-[0_18px_50px_-12px_rgb(0_0_0/0.25)]"
          >
            {options.length ? (
              <ul id={listId} role="listbox" aria-label="Questions you can ask" className="max-h-[50vh] overflow-y-auto p-1.5">
                {options.map((o, i) => (
                  <li
                    key={o.kind === "ask" ? "ask" : o.intent.id}
                    id={`${listId}-${i}`}
                    role="option"
                    aria-selected={i === active}
                    onMouseEnter={() => setActive(i)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      submitWith(o);
                    }}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-2xl px-3.5 py-2.5",
                      i === active && "bg-surface",
                    )}
                  >
                    {o.kind === "ask" ? (
                      <>
                        <Sparkles className="size-[18px] shrink-0 text-accent" aria-hidden="true" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold">Ask: &ldquo;{q}&rdquo;</span>
                          <span className="block truncate text-sm text-muted">{matches.length ? labels.askHint : labels.askHintNoMatch}</span>
                        </span>
                      </>
                    ) : (
                      <>
                        <QIcon name={o.intent.icon} className="size-[18px] shrink-0 text-faint" />
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold">{o.intent.label}</span>
                          <span className="block truncate text-sm text-muted">{o.intent.prompt}</span>
                        </span>
                      </>
                    )}
                    {i === active && <CornerDownLeft className="size-4 shrink-0 text-faint" aria-hidden="true" />}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-4 text-[15px] text-muted">
                <RichText text={labels.composerNoMatch} />
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-2 rounded-[1.75rem] border border-line-strong bg-card p-2 pl-5 shadow-[0_6px_30px_-12px_rgb(0_0_0/0.18)] transition-[border-color,box-shadow] focus-within:border-accent focus-within:shadow-[0_0_0_1px_var(--accent),0_8px_34px_-12px_rgb(0_0_0/0.28)]">
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value.slice(0, aiEnabled ? 300 : 80));
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
          placeholder={aiEnabled ? labels.composerPlaceholderAi : labels.composerPlaceholder}
          aria-label={labels.composerAria}
          role="combobox"
          aria-expanded={showList}
          aria-controls={showList && options.length ? listId : undefined}
          aria-autocomplete="list"
          aria-activedescendant={showList && options.length ? `${listId}-${active}` : undefined}
          enterKeyHint="send"
          autoComplete="off"
          spellCheck={false}
          className="min-w-0 flex-1 bg-transparent py-2.5 text-[17px] font-medium outline-none placeholder:font-normal placeholder:text-faint"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!generating && !q}
          aria-label={generating ? "Stop generating" : "Send"}
          className="grid size-11 shrink-0 place-items-center rounded-full bg-fg text-bg transition-opacity disabled:opacity-25"
        >
          {generating ? <Square className="size-4 fill-current" /> : <ArrowUp className="size-5" strokeWidth={2.5} />}
        </button>
      </div>
    </div>
  );
});
