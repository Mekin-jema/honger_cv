export function HeroPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[580px]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-6 -z-10 rounded-[3rem] bg-accent opacity-20 blur-3xl"
      />

      <div className="overflow-hidden rounded-[2.2rem] border border-line bg-card shadow-2xl shadow-fg/10">
        <div className="flex items-center gap-2 border-b border-line bg-surface/50 px-5 py-3">
          <div className="flex gap-1.5" aria-hidden="true">
            <span className="size-2.5 rounded-full bg-[#f87171]" />
            <span className="size-2.5 rounded-full bg-[#fbbf24]" />
            <span className="size-2.5 rounded-full bg-[#34d399]" />
          </div>
          <span className="ml-2 text-xs font-semibold text-muted">Alex Morgan · CV preview</span>
        </div>

        <div className="p-3 sm:p-5">
          <div className="grid overflow-hidden rounded-xl border border-[#d6d0c4] bg-[#fffefa] text-[#24221f] sm:grid-cols-[0.85fr_1.15fr]">
            <aside className="bg-[#1e2f3d] p-5 text-white sm:p-6">
              <div className="flex items-center gap-3">
                <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#b5400f] text-sm font-bold text-white shadow-inner">
                  AM
                </div>
                <div>
                  <p className="text-xs font-bold tracking-tight">Alex Morgan</p>
                  <p className="text-[10px] text-white/75">Senior Software Engineer</p>
                </div>
              </div>

              <section className="mt-5 border-t border-white/15 pt-4">
                <h2 className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#f7b18a]">About Me</h2>
                <p className="mt-2 text-[10px] leading-relaxed text-white/85">
                  Senior Full-Stack &amp; Cloud Engineer with 6+ years building scalable cloud platforms, modern web apps, and distributed systems.
                </p>
              </section>

              <section className="mt-5 border-t border-white/15 pt-4">
                <h2 className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#f7b18a]">Core Competencies</h2>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {["TypeScript", "React", "Next.js", "Python", "Go", "PostgreSQL", "Docker", "AWS"].map((skill) => (
                    <span key={skill} className="rounded-md border border-white/20 bg-white/10 px-2 py-0.5 text-[9px] font-medium text-white">
                      {skill}
                    </span>
                  ))}
                </div>
              </section>

              <section className="mt-5 border-t border-white/15 pt-4">
                <h2 className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#f7b18a]">Contact</h2>
                <div className="mt-2 space-y-1 text-[9px] text-white/80">
                  <p>San Francisco, CA</p>
                  <p>alex.morgan@example.com</p>
                  <p>github.com/alexmorgan</p>
                </div>
              </section>
            </aside>

            <div className="p-5 sm:p-6">
              <header className="border-b border-[#263b4b]/15 pb-4">
                <span className="inline-flex rounded-full bg-[#b5400f] px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                  Senior Full-Stack &amp; Cloud
                </span>
                <h2 className="mt-2 text-xl font-bold tracking-tight text-[#1e2f3d]">
                  Professional Experience
                </h2>
              </header>

              <section className="mt-4 space-y-4">
                <article className="border-l-2 border-[#b5400f] pl-3.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-2 text-xs">
                    <h3 className="font-bold text-[#1e2f3d]">Senior Software Engineer</h3>
                    <p className="text-[10px] font-medium text-[#57524a]">2023 - Present</p>
                  </div>
                  <p className="text-[11px] font-medium text-[#b5400f]">Apex Cloud Technologies</p>
                  <ul className="mt-2 space-y-1 text-[10px] leading-relaxed text-[#4b4843]">
                    <li>Architected event-driven ingestion pipelines handling 25M+ daily requests.</li>
                    <li>Reduced cloud infrastructure costs by 28% through caching and query tuning.</li>
                  </ul>
                </article>

                <article className="border-l-2 border-[#d6d0c4] pl-3.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-2 text-xs">
                    <h3 className="font-bold text-[#1e2f3d]">Full-Stack Engineer</h3>
                    <p className="text-[10px] font-medium text-[#57524a]">2021 - 2023</p>
                  </div>
                  <p className="text-[11px] font-medium text-[#4b4843]">Meridian Labs</p>
                  <p className="mt-1 text-[10px] leading-relaxed text-[#4b4843]">
                    Built real-time dashboard analytics supporting 50,000+ active business customers.
                  </p>
                </article>
              </section>

              <section className="mt-5 border-t border-[#263b4b]/15 pt-3">
                <h2 className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#1e2f3d]">Featured Projects</h2>
                <div className="mt-2 grid grid-cols-1 gap-2 text-[10px] min-[440px]:grid-cols-2">
                  <article className="rounded-lg border border-[#d6d0c4] bg-[#f8f6f0] p-2">
                    <h3 className="font-semibold text-[#1e2f3d]">PulseMetrics</h3>
                    <p className="text-[9px] text-[#57524a]">Distributed Monitoring Engine</p>
                  </article>
                  <article className="rounded-lg border border-[#d6d0c4] bg-[#f8f6f0] p-2">
                    <h3 className="font-semibold text-[#1e2f3d]">NovaFlow</h3>
                    <p className="text-[9px] text-[#57524a]">Visual Workflow Orchestrator</p>
                  </article>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
