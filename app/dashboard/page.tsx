import Link from "next/link"
import { ArrowUpRight, BriefcaseBusiness, FolderKanban, MapPin } from "lucide-react"
import { experience } from "@/content/experience"
import { profile } from "@/content/profile"
import { projects } from "@/content/projects"
import { SidebarTrigger } from "@/components/ui/sidebar"

export default function DashboardPage() {
  const featuredProjects = projects.slice(0, 3)
  return (
    <main className="mx-auto w-full max-w-6xl space-y-8 px-5 py-8 md:px-8">
      <div className="flex justify-start">
        <SidebarTrigger className="-ml-2" />
      </div>
      <section className="rounded-2xl border bg-card p-6 shadow-sm md:p-8">
        <p className="eyebrow">Career overview</p>
        <div className="mt-3 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <h1 className="display text-4xl md:text-5xl">{profile.name}</h1>
            <p className="mt-3 max-w-2xl text-lg text-muted">{profile.role}</p>
            <p className="mt-2 flex items-center gap-2 text-sm text-muted">
              <MapPin className="size-4" /> {profile.location}
            </p>
          </div>
          <Link href="/cv/" className="btn btn-primary shrink-0">
            View CV <ArrowUpRight className="size-4" />
          </Link>
        </div>
        <p className="mt-6 max-w-3xl leading-relaxed text-muted">{profile.summary}</p>
      </section>

      <section aria-label="Career highlights" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {profile.stats.map((stat) => (
          <article key={stat.label} className="rounded-xl border bg-card p-5">
            <p className="text-3xl font-semibold tracking-tight">{stat.value}</p>
            <p className="mt-2 text-sm text-muted">{stat.label}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border bg-card p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold">Selected projects</h2>
            <Link href="/projects/" className="text-sm font-medium text-accent hover:underline">
              All projects
            </Link>
          </div>
          <div className="mt-5 divide-y">
            {featuredProjects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}/`}
                className="group flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0"
              >
                <div>
                  <p className="font-semibold group-hover:text-accent">{project.name}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{project.tagline}</p>
                </div>
                <ArrowUpRight className="mt-1 size-4 shrink-0 text-muted" />
              </Link>
            ))}
          </div>
        </div>

        <div className="space-y-5 rounded-2xl border bg-card p-6">
          <div className="flex items-center gap-3">
            <BriefcaseBusiness className="size-5 text-accent" />
            <h2 className="text-xl font-semibold">Latest experience</h2>
          </div>
          {experience.slice(0, 3).map((job) => (
            <article key={`${job.company}-${job.role}`} className="border-l-2 border-line pl-4">
              <p className="font-semibold">{job.role}</p>
              <p className="mt-1 text-sm text-muted">{job.company}</p>
              <p className="mt-1 text-xs text-muted">{job.period}</p>
            </article>
          ))}
          <Link href="/experience/" className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:underline">
            <FolderKanban className="size-4" /> Full experience
          </Link>
        </div>
      </section>
    </main>
  )
}
