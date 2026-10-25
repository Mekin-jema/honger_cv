"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Mic, MicOff, RotateCcw, Volume2, X } from "lucide-react";

type Turn = { role: "interviewer" | "candidate"; text: string };
type VoiceResult = { isFinal: boolean; 0: { transcript: string } };
type VoiceRecognitionEvent = {
  resultIndex: number;
  results: ArrayLike<VoiceResult>;
};
type VoiceRecognitionError = { error: string };
type VoiceRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: VoiceRecognitionEvent) => void) | null;
  onerror: ((event: VoiceRecognitionError) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};
type VoiceWindow = Window & {
  SpeechRecognition?: new () => VoiceRecognition;
  webkitSpeechRecognition?: new () => VoiceRecognition;
};

function errorMessage(value: unknown): string {
  if (value instanceof Error) return value.message;
  return "Something went wrong. Please try again.";
}

export function VoiceInterview({
  candidateName,
  onClose,
}: {
  candidateName: string;
  onClose: () => void;
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [status, setStatus] = useState("Ready when you are");
  const [interim, setInterim] = useState("");
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [unsupported, setUnsupported] = useState(false);
  const turnsRef = useRef<Turn[]>([]);
  const recognitionRef = useRef<VoiceRecognition | null>(null);
  const enabledRef = useRef(false);
  const busyRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const historyRef = useRef<{ question: string; answer: string }[]>([]);
  const speechCursorRef = useRef(0);
  const speechPendingRef = useRef(0);
  const responseCompleteRef = useRef(false);
  const nativeSpeechAvailableRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  const replaceTurns = useCallback((next: Turn[]) => {
    turnsRef.current = next;
    setTurns(next);
  }, []);

  const clearFallbackAudio = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    audioUrlRef.current = null;
  }, []);

  const playFallbackSpeech = useCallback(
    async (text: string, signal: AbortSignal) => {
      const response = await fetch("/api/voice/speech/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        signal,
      });
      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(result?.error || "Could not generate spoken audio.");
      }

      const url = URL.createObjectURL(await response.blob());
      audioUrlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;
      try {
        await new Promise<void>((resolve, reject) => {
          const onAbort = () => reject(new DOMException("Speech playback was stopped.", "AbortError"));
          const cleanup = () => signal.removeEventListener("abort", onAbort);
          audio.onended = () => {
            cleanup();
            resolve();
          };
          audio.onerror = () => {
            cleanup();
            reject(new Error("The browser could not play the generated audio."));
          };
          signal.addEventListener("abort", onAbort, { once: true });
          if (signal.aborted) {
            onAbort();
            return;
          }
          audio.play().catch((error: unknown) => {
            cleanup();
            reject(error);
          });
        });
      } finally {
        if (audioRef.current === audio) clearFallbackAudio();
      }
    },
    [clearFallbackAudio],
  );

  const startRecognition = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition || !enabledRef.current || busyRef.current) return;
    try {
      recognition.start();
      setListening(true);
      setStatus("Listening for the interviewer...");
    } catch (error) {
      if (error instanceof DOMException && error.name === "InvalidStateError") return;
      setStatus("Could not start the microphone. Check browser permissions and try again.");
      setListening(false);
    }
  }, []);

  const finishSpeech = useCallback(() => {
    responseCompleteRef.current = false;
    busyRef.current = false;
    setBusy(false);
    if (enabledRef.current) {
      setStatus("Listening for the next question...");
      window.setTimeout(startRecognition, 300);
    } else {
      setStatus("Voice interview paused.");
    }
  }, [startRecognition]);

  const queueSpeech = useCallback(
    (text: string, final = false) => {
      if (!("speechSynthesis" in window)) return;
      const queue = (sentence: string) => {
        if (!sentence || !nativeSpeechAvailableRef.current) return;
        const synthesis = window.speechSynthesis;
        const utterance = new SpeechSynthesisUtterance(sentence);
        utterance.lang = "en-US";
        const voices = synthesis.getVoices();
        utterance.voice =
          voices.find((voice) => voice.lang.toLowerCase() === "en-us") ??
          voices.find((voice) => voice.lang.toLowerCase().startsWith("en-")) ??
          voices[0] ??
          null;
        utterance.rate = 1;
        speechPendingRef.current += 1;
        utterance.onstart = () => setStatus("Speaking...");
        utterance.onend = () => {
          speechPendingRef.current = Math.max(0, speechPendingRef.current - 1);
          if (responseCompleteRef.current && speechPendingRef.current === 0) finishSpeech();
        };
        utterance.onerror = () => {
          speechPendingRef.current = Math.max(0, speechPendingRef.current - 1);
          if (responseCompleteRef.current && speechPendingRef.current === 0) finishSpeech();
        };
        synthesis.resume();
        synthesis.speak(utterance);
      };

      let cursor = speechCursorRef.current;
      const boundary = /[.!?](?:\s+|$)/g;
      boundary.lastIndex = cursor;
      let match: RegExpExecArray | null;
      while ((match = boundary.exec(text)) !== null) {
        const end = match.index + match[0].length;
        queue(text.slice(cursor, end).trim());
        cursor = end;
      }
      if (final && cursor < text.length) {
        queue(text.slice(cursor).trim());
        cursor = text.length;
      }
      speechCursorRef.current = cursor;
    },
    [finishSpeech],
  );

  const ask = useCallback(
    async (question: string) => {
      if (!question.trim() || busyRef.current) return;
      busyRef.current = true;
      setBusy(true);
      setInterim("");
      setStatus("Thinking...");
      speechCursorRef.current = 0;
      speechPendingRef.current = 0;
      responseCompleteRef.current = false;
      nativeSpeechAvailableRef.current =
        "speechSynthesis" in window && window.speechSynthesis.getVoices().length > 0;
      const answerIndex = turnsRef.current.length + 1;
      replaceTurns([
        ...turnsRef.current,
        { role: "interviewer", text: question },
        { role: "candidate", text: "" },
      ]);
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch("/api/voice/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question, history: historyRef.current }),
          signal: controller.signal,
        });
        if (!response.ok || !response.body) {
          const result = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(result?.error || "The voice assistant is temporarily unavailable.");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let remainder = "";
        let answer = "";
        let done = false;
        while (!done) {
          const chunk = await reader.read();
          done = chunk.done;
          remainder += decoder.decode(chunk.value, { stream: !done });
          const lines = remainder.split("\n");
          remainder = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const event = JSON.parse(line.slice(5).trim()) as {
              type: "token" | "done" | "error";
              text?: string;
              message?: string;
            };
            if (event.type === "token" && event.text) {
              answer += event.text;
              const next = [...turnsRef.current];
              next[answerIndex] = { role: "candidate", text: answer };
              replaceTurns(next);
              queueSpeech(answer);
            } else if (event.type === "error") {
              throw new Error(event.message || "The voice assistant could not answer.");
            }
          }
        }
        if (!answer.trim()) throw new Error("The voice assistant returned an empty answer.");
        historyRef.current = [
          ...historyRef.current.slice(-5),
          { question, answer: answer.trim() },
        ];
        queueSpeech(answer, true);
        responseCompleteRef.current = true;
        if (speechPendingRef.current === 0 && !nativeSpeechAvailableRef.current) {
          try {
            await playFallbackSpeech(answer, controller.signal);
          } catch (error) {
            if (controller.signal.aborted) return;
            busyRef.current = false;
            setBusy(false);
            enabledRef.current = false;
            recognitionRef.current?.abort();
            setListening(false);
            setStatus(`Could not play the voice response: ${errorMessage(error)}`);
            return;
          }
          if (!controller.signal.aborted) finishSpeech();
        } else if (speechPendingRef.current === 0) {
          finishSpeech();
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        window.speechSynthesis?.cancel();
        speechPendingRef.current = 0;
        responseCompleteRef.current = false;
        busyRef.current = false;
        setBusy(false);
        replaceTurns(turnsRef.current.filter((_, index) => index !== answerIndex));
        setStatus(
          nativeSpeechAvailableRef.current
            ? errorMessage(error)
            : `Could not play the voice response: ${errorMessage(error)}`,
        );
        if (enabledRef.current) window.setTimeout(startRecognition, 700);
      } finally {
        abortRef.current = null;
      }
    },
    [finishSpeech, playFallbackSpeech, queueSpeech, replaceTurns, startRecognition],
  );

  useEffect(() => {
    const browserWindow = window as VoiceWindow;
    const Constructor =
      browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition;
    if (!Constructor || !("speechSynthesis" in window)) {
      const timer = window.setTimeout(() => {
        setUnsupported(true);
        setStatus("Live voice chat requires a browser with speech recognition and speech synthesis.");
      }, 0);
      return () => window.clearTimeout(timer);
    }

    const recognition = new Constructor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";
      for (let index = event.resultIndex; index < event.results.length; index++) {
        const result = event.results[index];
        const text = result[0]?.transcript?.trim();
        if (!text) continue;
        if (result.isFinal) finalText += `${text} `;
        else interimText += `${text} `;
      }
      setInterim(interimText.trim());
      if (finalText.trim()) {
        enabledRef.current = true;
        recognition.stop();
        void ask(finalText.trim());
      }
    };
    recognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        enabledRef.current = false;
        setListening(false);
        setStatus("Microphone access was blocked. Allow microphone access in your browser settings.");
      } else if (event.error !== "no-speech" && event.error !== "aborted") {
        setStatus(`Microphone error: ${event.error}.`);
      }
    };
    recognition.onend = () => {
      setListening(false);
      if (enabledRef.current && !busyRef.current) {
        window.setTimeout(startRecognition, 350);
      }
    };
    recognitionRef.current = recognition;
    return () => {
      enabledRef.current = false;
      abortRef.current?.abort();
      recognition.abort();
      window.speechSynthesis?.cancel();
      clearFallbackAudio();
      speechPendingRef.current = 0;
      responseCompleteRef.current = false;
    };
  }, [ask, clearFallbackAudio, startRecognition]);

  const start = () => {
    enabledRef.current = true;
    startRecognition();
  };

  const stop = () => {
    enabledRef.current = false;
    abortRef.current?.abort();
    recognitionRef.current?.abort();
    window.speechSynthesis?.cancel();
    clearFallbackAudio();
    busyRef.current = false;
    setBusy(false);
    setListening(false);
    setInterim("");
    setStatus("Voice interview paused.");
  };

  const reset = () => {
    stop();
    historyRef.current = [];
    replaceTurns([]);
    setStatus("Conversation cleared. Start when you are ready.");
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="voice-interview-title"
      className="fixed inset-0 z-[70] overflow-y-auto bg-fg/35 p-3 backdrop-blur-sm sm:grid sm:place-items-center sm:p-6"
    >
      <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col bg-bg px-4 py-4 sm:h-[min(850px,92dvh)] sm:min-h-0 sm:rounded-3xl sm:border sm:border-line sm:px-6 sm:py-5 sm:shadow-2xl">
        <div className="flex items-center justify-between gap-3">
          <button type="button" onClick={onClose} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-surface hover:text-fg">
          <ArrowLeft className="size-4" /> Back to Ask AI
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={reset}
              disabled={!turns.length && !listening && !busy}
              className="inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm text-muted transition hover:bg-surface disabled:opacity-40"
            >
              <RotateCcw className="size-4" /> Clear
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close voice interview"
              className="grid size-10 place-items-center rounded-full text-muted transition hover:bg-surface hover:text-fg"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        <section className="mx-auto my-auto w-full max-w-2xl py-8">
        <div className="rounded-3xl border border-line bg-card p-6 shadow-sm sm:p-9">
          <p className="eyebrow">Live interview</p>
          <h1 id="voice-interview-title" className="display mt-3 text-3xl sm:text-4xl">
            Talk with {candidateName}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
            Ask a question aloud. The assistant answers from the published CV,
            speaks the answer, then listens for your next question.
          </p>

          <div className="mt-7 flex flex-col items-center gap-4">
            <button
              type="button"
              onClick={listening || busy ? stop : start}
              disabled={unsupported}
              aria-label={listening || busy ? "Pause voice interview" : "Start voice interview"}
              className={`grid size-20 place-items-center rounded-full text-white shadow-lg transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50 ${
                listening || busy ? "bg-rose-600 hover:bg-rose-700" : "bg-primary hover:bg-primary/90"
              }`}
            >
              {listening || busy ? <MicOff className="size-8" /> : <Mic className="size-8" />}
            </button>
            <p role="status" aria-live="polite" className="min-h-6 text-center text-sm font-medium text-muted">
              {listening && interim ? `Hearing: ${interim}` : status}
            </p>
          </div>

          <div className="mt-7 max-h-[42vh] space-y-4 overflow-y-auto" aria-live="polite" aria-label="Interview transcript">
            {turns.map((turn, index) => (
              <div
                key={`${index}-${turn.role}`}
                className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  turn.role === "interviewer"
                    ? "ml-auto rounded-br-sm bg-primary text-white"
                    : "rounded-bl-sm bg-surface text-fg"
                }`}
              >
                <span className="mb-1 flex items-center gap-1.5 text-xs opacity-70">
                  {turn.role === "candidate" && <Volume2 className="size-3.5" />}
                  {turn.role === "interviewer" ? "Interviewer" : candidateName}
                </span>
                {turn.text || (busy ? "Thinking..." : "")}
              </div>
            ))}
          </div>
          {unsupported && (
            <p className="mt-5 rounded-xl bg-surface p-3 text-sm text-muted">
              Try Chrome or Edge on a secure connection (HTTPS). Your browser must
              support speech recognition and speech synthesis.
            </p>
          )}
          <p className="mt-6 text-center text-xs leading-relaxed text-faint">
            Microphone access is used only while the interview is active. Speech
            recognition is provided by your browser; questions are sent to the
            configured AI provider and are not saved by this voice feature.
          </p>
        </div>
        </section>
      </div>
    </div>
  );
}
