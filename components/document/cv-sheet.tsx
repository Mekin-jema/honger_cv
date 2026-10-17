import { Mail, MapPin, Phone } from "lucide-react";
import { Github, Linkedin } from "@/components/brand-icons";
import { quotes } from "@/content/details";
import { profile } from "@/content/profile";
import type { CvData } from "@/lib/persona/cv";
import { withBase } from "@/lib/utils";
import "./cv.css";

/**
 * The CV as a sheet of paper: used by /cv/ (and so the PDF) and by the live preview in the Studio, so
 * what the owner edits is exactly what gets printed. Contact details come from the profile.
 */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="cv-section">
      <h2 className="cv-h2">{title}</h2>
      {children}
    </section>
  );
}

export function CvSheet({ cv, layout = "default" }: { cv: CvData; layout?: "default" | "navy-rail" }) {
  const contacts = [
    { icon: MapPin, label: profile.location },
    { icon: Mail, label: profile.email, href: `mailto:${profile.email}` },
    { icon: Phone, label: profile.phone, href: profile.phoneHref },
    { icon: Linkedin, label: profile.links.linkedinHandle, href: profile.links.linkedin },
    { icon: Github, label: "github.com/maruf1020", href: profile.links.github },
  ];

  const header = (
    <header className="cv-header">
      {cv.showPhoto && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={withBase(cv.photo)} alt={`Photo of ${profile.name}`} width={240} height={240} className="cv-photo" />
      )}
      <div className="min-w-0 flex-1">
        <h1 className="cv-name">{profile.name}</h1>
        <p className="cv-title">{cv.title}</p>
        <ul className="cv-contacts">
          {contacts.map((c) => (
            <li key={c.label}>
              <c.icon className="cv-icon" aria-hidden="true" />
              {c.href ? <a href={c.href}>{c.label}</a> : <span>{c.label}</span>}
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
  const availability = <p className="cv-availability">{cv.availability}</p>;
  const profileSection = (
    <Section title="Profile">
      <p className="cv-text">{cv.profile}</p>
    </Section>
  );
  const highlightsSection = (
    <Section title="Key achievements">
      <ul className="cv-bullets">
        {cv.highlights.map((h, i) => (
          <li key={`${i}-${h}`}>{h}</li>
        ))}
      </ul>
    </Section>
  );
  const skillsSection = (
    <Section title="Core skills">
      <dl className="cv-skills">
        {cv.skills.map((s, i) => (
          <div key={`${i}-${s.k}`} className="cv-skill">
            <dt>{s.k}</dt>
            <dd>{s.v}</dd>
          </div>
        ))}
      </dl>
    </Section>
  );
  const experienceSection = (
    <Section title="Professional experience">
      <div className="cv-jobs">
        {cv.experience.map((job, j) => (
          <div key={`${j}-${job.company}`} className="cv-job">
            <div className="cv-row">
              <h3 className="cv-h3">
                {job.role} <span className="cv-at">· {job.company}</span>
              </h3>
              <span className="cv-date">{job.period}</span>
            </div>
            <p className="cv-meta">
              {[job.location, job.context].filter(Boolean).join(" · ")}
            </p>
            <ul className="cv-bullets">
              {job.bullets.map((b, i) => (
                <li key={`${i}-${b}`}>{b}</li>
              ))}
            </ul>
            {job.engagements.map((e, k) => (
              <div key={`${k}-${e.title}`} className="cv-engagement">
                <div className="cv-row">
                  <h4 className="cv-h4">{e.title}</h4>
                  <span className="cv-date">{e.period}</span>
                </div>
                <ul className="cv-bullets">
                  {e.bullets.map((b, i) => (
                    <li key={`${i}-${b}`}>{b}</li>
                  ))}
                </ul>
                <p className="cv-stack">
                  <span>Stack:</span> {e.stack}
                </p>
              </div>
            ))}
          </div>
        ))}
      </div>
    </Section>
  );
  const projectsSection = (
    <Section title="Selected projects">
      <ul className="cv-bullets cv-projects">
        {cv.projects.map((p, i) => (
          <li key={`${i}-${p.name}`}>
            <strong>{p.name}</strong> <span className="cv-faint">({p.meta})</span> - {p.text}
          </li>
        ))}
      </ul>
    </Section>
  );
  const educationSection = (
    <Section title="Education">
      <div className="cv-avoid">
        <div className="cv-row">
          <h3 className="cv-h4">{cv.education.degree}</h3>
          <span className="cv-date">{cv.education.year}</span>
        </div>
        <p className="cv-meta">{cv.education.school}</p>
        <p className="cv-text">{cv.education.note}</p>
        <p className="cv-stack">
          <span>Courses:</span> {cv.courses.join(", ")}
        </p>
      </div>
    </Section>
  );
  const languagesSection = (
    <Section title="Languages">
      <ul className="cv-langs">
        {cv.languages.map((l, i) => (
          <li key={`${i}-${l.name}`}>
            <span className="font-semibold">{l.name}</span>
            <span>{l.level}</span>
          </li>
        ))}
      </ul>
    </Section>
  );
  const referencesSection = (
    <Section title="References">
      <p className="cv-text">
        {quotes.length} recommendations from managers, clients and colleagues on{" "}
        <a href={profile.links.linkedinRecommendations}>LinkedIn (linkedin.com/in/marufbillah1020)</a>. References available on
        request.
      </p>
    </Section>
  );

  if (layout === "navy-rail") {
    return (
      <article className="cv-sheet cv-sheet-navy-rail">
        <aside className="cv-profile-rail">
          {header}
          {availability}
          {profileSection}
          {highlightsSection}
          {languagesSection}
        </aside>
        <div className="cv-main-column">
          {experienceSection}
          {educationSection}
          {skillsSection}
          {projectsSection}
          {referencesSection}
        </div>
      </article>
    );
  }

  return (
    <article className="cv-sheet">
      {header}
      {availability}
      {profileSection}
      {highlightsSection}
      {skillsSection}
      {experienceSection}
      {projectsSection}
      <div className="cv-two">
        {educationSection}
        {languagesSection}
      </div>
      {referencesSection}
    </article>
  );
}
