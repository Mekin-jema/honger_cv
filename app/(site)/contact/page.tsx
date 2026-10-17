import { Download, Mail, MapPin, Phone } from "lucide-react";
import { ContactForm } from "@/components/blocks/forms";
import { Github, Linkedin } from "@/components/brand-icons";
import { Breadcrumbs, JsonLd, PageHead } from "@/components/site/site-shell";
import { profile } from "@/content/profile";
import { absoluteUrl } from "@/lib/site";
import { breadcrumbLd, describe, graph, pageMetadata, PERSON_ID, WEBSITE_ID } from "@/lib/seo";
import { withBase } from "@/lib/utils";
import { otherPersonaMetadata, otherPersonaPage } from "@/components/site/other-persona";

const PATH = "/contact/";
const TITLE = "Contact and hiring";
const INTRO = `I'm open to new roles as a tech lead, engineering lead or senior full-stack engineer. I prefer working on-site in Bangladesh, or relocating abroad for the right team.`;
const DESCRIPTION = describe(`Contact ${profile.name}: ${INTRO} Email, phone, LinkedIn and GitHub.`);

export async function generateMetadata() {
  return (await otherPersonaMetadata("contact")) ?? pageMetadata({ path: PATH, title: TITLE, description: DESCRIPTION });
}

const trail = [
  { name: "Home", path: "/" },
  { name: "Contact", path: PATH },
];

const contactPage = {
  "@type": "ContactPage",
  "@id": `${absoluteUrl(PATH)}#page`,
  url: absoluteUrl(PATH),
  name: `Contact ${profile.name}`,
  description: DESCRIPTION,
  isPartOf: { "@id": WEBSITE_ID },
  mainEntity: { "@id": PERSON_ID },
};

export default async function ContactPage() {
  const other = await otherPersonaPage("contact");
  if (other) return other;
  const rows = [
    { icon: Mail, label: "Email", value: profile.email, href: `mailto:${profile.email}` },
    { icon: Phone, label: "Phone / WhatsApp", value: profile.phone, href: profile.phoneHref },
    { icon: Linkedin, label: "LinkedIn", value: profile.links.linkedinHandle, href: profile.links.linkedin },
    { icon: Github, label: "GitHub", value: "github.com/maruf1020", href: profile.links.github },
    { icon: MapPin, label: "Location", value: profile.location },
  ];
  return (
    <>
      <JsonLd data={graph(contactPage, breadcrumbLd(trail))} />
      <Breadcrumbs trail={trail} />
      <PageHead eyebrow="Hire me" title="Contact and hiring" intro={INTRO} />

      <section aria-labelledby="looking" className="mb-12">
        <h2 id="looking" className="display text-2xl">
          What I&apos;m looking for
        </h2>
        <dl className="mt-4 divide-y divide-line">
          {profile.hire.lookingFor.map((x) => (
            <div key={x.k} className="flex flex-col gap-1 py-3 sm:flex-row sm:gap-6">
              <dt className="shrink-0 font-semibold sm:w-32">{x.k}</dt>
              <dd>
                {x.v}
                <span className="mt-1 block text-sm text-muted">{x.note}</span>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="reach" className="mb-12">
        <h2 id="reach" className="display text-2xl">
          How to reach me
        </h2>
        <ul className="mt-4 divide-y divide-line">
          {rows.map((r) => (
            <li key={r.label} className="flex items-center gap-3 py-3">
              <r.icon className="size-5 shrink-0 text-faint" aria-hidden="true" />
              <span className="w-36 shrink-0 text-sm text-muted">{r.label}</span>
              {r.href ? (
                <a href={r.href} target={r.href.startsWith("http") ? "_blank" : undefined} rel={r.href.startsWith("http") ? "me noreferrer" : undefined} className="min-w-0 truncate font-semibold hover:underline">
                  {r.value}
                </a>
              ) : (
                <span className="font-semibold">{r.value}</span>
              )}
            </li>
          ))}
        </ul>
        <a href={withBase(profile.cvPdf)} download className="btn btn-ghost mt-4">
          <Download className="size-4" /> Download my CV (PDF)
        </a>
      </section>

      <section id="message" aria-labelledby="message-h" className="scroll-mt-24">
        <h2 id="message-h" className="display mb-4 text-2xl">
          Send a message
        </h2>
        <ContactForm />
      </section>
    </>
  );
}
