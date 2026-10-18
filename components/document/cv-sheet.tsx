import {
  Award,
  BriefcaseBusiness,
  GraduationCap,
  Languages,
  Lightbulb,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  UserRound,
  Wrench,
} from "lucide-react";
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

function Section({ title, children, icon }: { title: string; children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <section className="cv-section">
      <h2 className="cv-h2">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

type CvSheetLayout =
  | "default"
  | "navy-rail"
  | "slate-sidebar"
  | "wide-professional"
  | "lavender-split"
  | "orange-split"
  | "navy-contrast"
  | "orange-frame"
  | "reverse-rail"
  | "gold-timeline"
  | "career-timeline"
  | "studio-rail"
  | "mint-header"
  | "minimalist"
  | "centered-blue";

export function CvSheet({ cv, layout = "default" }: { cv: CvData; layout?: CvSheetLayout }) {
  const name = cv.identity?.name ?? profile.name;
  const hasSectionIcons =
    layout === "lavender-split" ||
    layout === "orange-split" ||
    layout === "navy-contrast" ||
    layout === "orange-frame" ||
    layout === "reverse-rail" ||
    layout === "gold-timeline" ||
    layout === "career-timeline" ||
    layout === "studio-rail" ||
    layout === "mint-header";
  const sectionIcon = (Icon: typeof UserRound) =>
    hasSectionIcons ? <Icon className="cv-section-icon" aria-hidden="true" /> : undefined;
  const contacts = cv.identity
    ? [
        ...(cv.identity.location ? [{ icon: MapPin, label: cv.identity.location }] : []),
        ...(cv.identity.email ? [{ icon: Mail, label: cv.identity.email, href: `mailto:${cv.identity.email}` }] : []),
        ...(cv.identity.phone ? [{ icon: Phone, label: cv.identity.phone, href: `tel:${encodeURIComponent(cv.identity.phone)}` }] : []),
        ...cv.identity.links.flatMap(({ label, href }) => {
          try {
            const url = new URL(href);
            return ["http:", "https:"].includes(url.protocol) ? [{ icon: UserRound, label, href: url.href }] : [];
          } catch {
            return [];
          }
        }),
      ]
    : [
        { icon: MapPin, label: profile.location },
        { icon: Mail, label: profile.email, href: `mailto:${profile.email}` },
        { icon: Phone, label: profile.phone, href: profile.phoneHref },
        { icon: Linkedin, label: profile.links.linkedinHandle, href: profile.links.linkedin },
        { icon: Github, label: "github.com/maruf1020", href: profile.links.github },
      ];

  const header = (
    <header className="cv-header">
      {cv.showPhoto && cv.photo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={withBase(cv.photo)} alt={`Photo of ${name}`} width={240} height={240} className="cv-photo" />
      )}
      <div className="min-w-0 flex-1">
        <h1 className="cv-name">{name}</h1>
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
  const contactSection = (
    <Section title="Contact" icon={sectionIcon(MapPin)}>
      <ul className="cv-contact-list">
        {contacts.map((contact) => (
          <li key={contact.label}>
            <contact.icon className="cv-icon" aria-hidden="true" />
            {contact.href ? <a href={contact.href}>{contact.label}</a> : <span>{contact.label}</span>}
          </li>
        ))}
      </ul>
    </Section>
  );
  const availability = <p className="cv-availability">{cv.availability}</p>;
  const profileSection = (
    <Section title="Profile" icon={sectionIcon(UserRound)}>
      <p className="cv-text">{cv.profile}</p>
    </Section>
  );
  const highlightsSection = (
    <Section title="Key achievements" icon={sectionIcon(Award)}>
      <ul className="cv-bullets">
        {cv.highlights.map((h, i) => (
          <li key={`${i}-${h}`}>{h}</li>
        ))}
      </ul>
    </Section>
  );
  const skillsSection = (
    <Section title="Core skills" icon={sectionIcon(Wrench)}>
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
    <Section title="Professional experience" icon={sectionIcon(BriefcaseBusiness)}>
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
    <Section title="Selected projects" icon={sectionIcon(Lightbulb)}>
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
    <Section title="Education" icon={sectionIcon(GraduationCap)}>
      <div className="cv-avoid">
        <div className="cv-row">
          <h3 className="cv-h4">{cv.education.degree}</h3>
          <span className="cv-date">{cv.education.year}</span>
        </div>
        <p className="cv-meta">{cv.education.school}</p>
        <p className="cv-text">{cv.education.note}</p>
        <p className="cv-stack cv-courses">
          <span>Courses:</span> {cv.courses.join(", ")}
        </p>
      </div>
    </Section>
  );
  const languagesSection = (
    <Section title="Languages" icon={sectionIcon(Languages)}>
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
    <Section title="References" icon={sectionIcon(MessageCircle)}>
      <p className="cv-text">
        {quotes.length} recommendations from managers, clients and colleagues on{" "}
        <a href={profile.links.linkedinRecommendations}>LinkedIn (linkedin.com/in/marufbillah1020)</a>. References available on
        request.
      </p>
    </Section>
  );
  const achievementsSection = (
    <Section title={layout === "centered-blue" ? "Achievements" : "Key achievements"}>
      <ul className="cv-bullets">
        {cv.highlights.map((h, i) => (
          <li key={`${i}-${h}`}>{h}</li>
        ))}
      </ul>
    </Section>
  );

  const profileRail = (
    <>
      {header}
      {availability}
      {profileSection}
      {highlightsSection}
      {languagesSection}
    </>
  );
  const mainColumn = (
    <>
      {experienceSection}
      {educationSection}
      {skillsSection}
      {projectsSection}
      {!cv.identity && referencesSection}
    </>
  );

  if (layout === "reverse-rail") {
    return (
      <article className="cv-sheet cv-sheet-reverse-rail">
        <div className="cv-reverse-main">
          {experienceSection}
          {educationSection}
          {skillsSection}
          {projectsSection}
        </div>
        <aside className="cv-reverse-profile">
          {header}
          {availability}
          {profileSection}
          {languagesSection}
          {highlightsSection}
        </aside>
      </article>
    );
  }

  if (layout === "gold-timeline") {
    return (
      <article className="cv-sheet cv-sheet-gold-timeline">
        <aside className="cv-gold-profile">
          {header}
          {availability}
          {skillsSection}
          {languagesSection}
          {highlightsSection}
        </aside>
        <div className="cv-gold-main">
          {profileSection}
          {experienceSection}
          {educationSection}
          {projectsSection}
        </div>
      </article>
    );
  }

  if (layout === "career-timeline") {
    return (
      <article className="cv-sheet cv-sheet-career-timeline">
        {header}
        <aside className="cv-career-profile">
          {contactSection}
          {skillsSection}
          {languagesSection}
          {highlightsSection}
        </aside>
        <div className="cv-career-main">
          {profileSection}
          {experienceSection}
          {educationSection}
          {projectsSection}
        </div>
      </article>
    );
  }

  if (layout === "studio-rail") {
    return (
      <article className="cv-sheet cv-sheet-studio-rail">
        <aside className="cv-studio-profile">
          {header}
          {skillsSection}
          {educationSection}
          {languagesSection}
        </aside>
        <div className="cv-studio-main">
          {availability}
          {profileSection}
          {experienceSection}
          {highlightsSection}
          {projectsSection}
        </div>
      </article>
    );
  }

  if (layout === "mint-header") {
    return (
      <article className="cv-sheet cv-sheet-mint-header">
        {header}
        <aside className="cv-mint-profile">
          {contactSection}
          {profileSection}
          {skillsSection}
          {languagesSection}
        </aside>
        <div className="cv-mint-main">
          {experienceSection}
          {educationSection}
          {highlightsSection}
          {projectsSection}
        </div>
      </article>
    );
  }

  if (layout === "navy-contrast") {
    return (
      <article className="cv-sheet cv-sheet-navy-contrast">
        <aside className="cv-navy-profile">
          {header}
          {availability}
          {profileSection}
          {educationSection}
          {languagesSection}
        </aside>
        <div className="cv-navy-main">
          {experienceSection}
          {skillsSection}
          {highlightsSection}
          {projectsSection}
          {referencesSection}
        </div>
      </article>
    );
  }

  if (layout === "orange-frame") {
    return (
      <article className="cv-sheet cv-sheet-orange-frame">
        {header}
        {profileSection}
        {experienceSection}
        {educationSection}
        {languagesSection}
        {highlightsSection}
        {projectsSection}
        {skillsSection}
      </article>
    );
  }

  if (layout === "orange-split") {
    return (
      <article className="cv-sheet cv-sheet-orange-split">
        {header}
        <div className="cv-orange-columns">
          <aside className="cv-orange-profile">
            {availability}
            {profileSection}
            {skillsSection}
            {languagesSection}
            {highlightsSection}
          </aside>
          <div className="cv-orange-main">
            {experienceSection}
            {educationSection}
            {projectsSection}
            {referencesSection}
          </div>
        </div>
      </article>
    );
  }

  if (layout === "lavender-split") {
    return (
      <article className="cv-sheet cv-sheet-lavender-split">
        <aside className="cv-split-profile">
          {header}
          {skillsSection}
          {languagesSection}
          {highlightsSection}
        </aside>
        <div className="cv-split-main">
          {availability}
          {profileSection}
          {experienceSection}
          {educationSection}
          {projectsSection}
          {referencesSection}
        </div>
      </article>
    );
  }

  if (layout === "minimalist") {
    return (
      <article className="cv-sheet cv-sheet-minimalist">
        {header}
        {profileSection}
        {experienceSection}
        {educationSection}
        {skillsSection}
        {languagesSection}
        {projectsSection}
        {achievementsSection}
        {referencesSection}
      </article>
    );
  }

  if (layout === "centered-blue") {
    return (
      <article className="cv-sheet cv-sheet-centered-blue">
        {header}
        {profileSection}
        {experienceSection}
        {educationSection}
        {skillsSection}
        {languagesSection}
        {achievementsSection}
        {projectsSection}
      </article>
    );
  }

  if (layout === "navy-rail" || layout === "slate-sidebar") {
    return (
      <article className={`cv-sheet cv-sheet-${layout}`}>
        <aside className="cv-profile-rail">
          {profileRail}
        </aside>
        <div className="cv-main-column">
          {mainColumn}
        </div>
      </article>
    );
  }

  if (layout === "wide-professional") {
    return (
      <article className="cv-sheet cv-sheet-wide-professional">
        {header}
        {availability}
        {profileSection}
        {highlightsSection}
        {experienceSection}
        {educationSection}
        <div className="cv-wide-pair">
          {skillsSection}
          {languagesSection}
        </div>
        {projectsSection}
        {referencesSection}
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
