"use client";

export default function AccountError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="grid min-h-[60dvh] place-items-center bg-bg px-5 py-12 text-fg">
      <section className="w-full max-w-lg rounded-2xl border border-line bg-card p-7 text-center shadow-sm">
        <h1 className="text-2xl font-semibold">Your account couldn’t load</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          We couldn’t load your saved CVs right now. Your data has not been changed. Try again in a moment.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-accent px-5 font-semibold text-on-accent"
        >
          Retry
        </button>
      </section>
    </main>
  );
}
