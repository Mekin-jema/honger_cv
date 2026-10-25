"use client";

import { useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";

type RecognitionResult = { isFinal: boolean; 0: { transcript: string } };
type RecognitionEvent = {
  resultIndex: number;
  results: ArrayLike<RecognitionResult>;
};
type RecognitionError = { error: string };
type SpeechRecognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: RecognitionError) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};
type SpeechWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognition;
  webkitSpeechRecognition?: new () => SpeechRecognition;
};

export function VoiceInput({
  onTranscript,
  language,
}: {
  onTranscript: (text: string) => void;
  language: string;
}) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const toggle = () => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const browserWindow = window as SpeechWindow;
    const Constructor =
      browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition;
    if (!Constructor) {
      setError("Voice input is not supported by this browser. Try Chrome or Edge.");
      return;
    }

    const recognition = new Constructor();
    recognition.lang = language === "bn" ? "bn-BD" : "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .filter((result) => result.isFinal)
        .map((result) => result[0]?.transcript.trim())
        .filter(Boolean)
        .join(" ");
      if (transcript) onTranscript(transcript);
      recognition.stop();
      setListening(false);
    };
    recognition.onerror = (event) => {
      if (event.error !== "no-speech" && event.error !== "aborted") {
        setError(
          event.error === "not-allowed"
            ? "Allow microphone access in your browser settings."
            : `Microphone error: ${event.error}.`,
        );
      }
      setListening(false);
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setError("");
    try {
      recognition.start();
      setListening(true);
    } catch {
      setError("Could not start the microphone. Try again.");
      setListening(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-label={listening ? "Stop voice input" : "Ask by voice"}
        aria-pressed={listening}
        title={error || (listening ? "Stop voice input" : "Ask by voice")}
        className={`grid size-10 shrink-0 place-items-center rounded-full transition-colors ${
          listening
            ? "bg-accent-soft text-accent"
            : "text-muted hover:bg-surface hover:text-fg"
        }`}
      >
        {listening ? (
          <MicOff className="size-[18px]" aria-hidden="true" />
        ) : (
          <Mic className="size-[18px]" aria-hidden="true" />
        )}
      </button>
      {error && (
        <span role="status" aria-live="polite" className="sr-only">
          {error}
        </span>
      )}
    </>
  );
}
