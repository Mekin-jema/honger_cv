"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle, Sparkles } from "lucide-react";
import { FAQS } from "./landing-data";

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section className="border-t border-line bg-bg-soft/40 py-20 sm:py-28">
      <div className="mx-auto max-w-4xl px-5 sm:px-8">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-3.5 py-1 text-xs font-semibold text-muted shadow-xs">
            <HelpCircle className="size-3.5 text-accent" />
            Frequently Asked Questions
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            Everything you need to know.
          </h2>
          <p className="mt-3 text-base text-muted">
            Have questions about ATS algorithms, print margins, or how AI training works? We have answers.
          </p>
        </div>

        <div className="mt-12 space-y-3">
          {FAQS.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={faq.question}
                className="overflow-hidden rounded-2xl border border-line bg-card transition-colors hover:border-line-strong"
              >
                <button
                  type="button"
                  onClick={() => toggle(idx)}
                  className="flex w-full items-center justify-between p-5 text-left text-base font-semibold text-fg sm:p-6"
                >
                  <span className="pr-4">{faq.question}</span>
                  <span
                    className={`grid size-8 shrink-0 place-items-center rounded-xl bg-surface transition-transform duration-300 ${
                      isOpen ? "rotate-180 bg-accent-soft text-accent" : "text-muted"
                    }`}
                  >
                    <ChevronDown className="size-4" />
                  </span>
                </button>

                {isOpen && (
                  <div className="border-t border-line/60 bg-surface/30 px-5 pb-6 pt-4 text-sm leading-relaxed text-muted sm:px-6">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
