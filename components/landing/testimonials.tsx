import { Star, Sparkles, Quote } from "lucide-react";
import { TESTIMONIALS } from "./landing-data";

export function Testimonials() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
      <div className="mx-auto max-w-2xl text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-3.5 py-1 text-xs font-semibold text-muted shadow-xs">
          <Sparkles className="size-3.5 text-accent" />
          Candidate Success Stories
        </div>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
          Loved by engineers, leaders, and career switchers.
        </h2>
        <p className="mt-4 text-base text-muted sm:text-lg">
          See how standing out with a handcrafted CV transformed their job search.
        </p>
      </div>

      <div className="mt-14 grid gap-6 md:grid-cols-3">
        {TESTIMONIALS.map((t) => (
          <div
            key={t.author}
            className="flex flex-col justify-between rounded-3xl border border-line bg-card p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-line-strong hover:shadow-xl"
          >
            <div>
              {/* Star rating */}
              <div className="flex gap-1 text-amber-500">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="size-4 fill-amber-500 text-amber-500" />
                ))}
              </div>

              <blockquote className="mt-5 text-sm leading-relaxed text-fg">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
            </div>

            <div className="mt-8 border-t border-line/60 pt-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-accent-soft font-bold text-accent text-xs">
                  {t.avatar}
                </div>
                <div>
                  <p className="font-bold text-xs text-fg">{t.author}</p>
                  <p className="text-[11px] text-muted">{t.role}</p>
                </div>
              </div>

              <span className="rounded-full bg-surface px-2.5 py-0.5 text-[10px] font-semibold text-muted">
                {t.layoutUsed}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
