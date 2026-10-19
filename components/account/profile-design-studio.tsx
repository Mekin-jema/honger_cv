"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, FileUp, LoaderCircle, Plus, Save, Sparkles, Trash2 } from "lucide-react";
import { CvStudio, type CvDesign } from "@/app/cv/cv-studio";
import { CvEditor } from "@/components/admin/studio/cv-editor";
import type { CvData, CvIdentity } from "@/lib/persona/cv";
import type { PersonaDoc } from "@/lib/persona/schema";
import { withBase } from "@/lib/utils";

function applyImportedCv(initial: PersonaDoc, cv: CvData, clearDemoContent = false): PersonaDoc {
  const doc = structuredClone(initial);
  const previousSections = doc.sections;
  const previousQuestions = doc.questions;
  const cvSectionKeys = new Set(["about", "highlights", "skills", "experience", "education", "projects", "project-images", "languages"]);
  const identity = cv.identity ?? { name: "Your Name", links: [] };
  const links = identity.links.filter((link) => {
    try {
      const url = new URL(link.href);
      return url.protocol === "https:" || url.protocol === "http:";
    } catch {
      return false;
    }
  });
  doc.identity.name = identity.name.trim() || "Your Name";
  doc.identity.shortName = doc.identity.name.split(/\s+/)[0] || "You";
  doc.identity.initials = doc.identity.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "YO";
  doc.identity.givenName = undefined;
  doc.identity.familyName = undefined;
  doc.identity.alternateNames = [];
  doc.identity.role = cv.title.trim() || undefined;
  doc.identity.headline = cv.title.trim() || undefined;
  doc.identity.summary = cv.profile.trim() || undefined;
  doc.identity.email = identity.email?.trim() || undefined;
  doc.identity.phone = identity.phone?.trim() || undefined;
  doc.identity.location = identity.location?.trim() || undefined;
  doc.identity.links = links.map((link) => ({
    kind: link.label.toLowerCase().includes("linkedin")
      ? "linkedin"
      : link.label.toLowerCase().includes("github")
        ? "github"
        : "other",
    label: link.label,
    href: link.href,
  }));
  if (cv.photo.trim()) {
    doc.identity.avatar = { src: cv.photo.trim(), alt: doc.identity.avatar?.alt ?? doc.identity.name };
    doc.identity.photos = [];
  } else {
    delete doc.identity.avatar;
    doc.identity.photos = [];
  }
  doc.site.title = `${doc.identity.name} - ${cv.title || "CV"}`;
  doc.site.description = cv.profile || undefined;
  doc.site.keywords = [];
  doc.site.indexable = false;
  doc.hero.staticIntro = `Hi, I'm ${doc.identity.name}${cv.title ? `, ${cv.title}` : ""}.`;
  doc.hero.pools = [{ id: "hello", lines: [doc.hero.staticIntro] }];
  doc.hero.schedule = [];

  const sections: PersonaDoc["sections"] = [];
  const add = (
    key: string,
    title: string,
    display: PersonaDoc["sections"][number]["display"],
    items: PersonaDoc["sections"][number]["items"],
  ) => {
    if (!items.length) return;
    sections.push({ key, title, display, visibility: "public", inChat: true, inDocument: true, inSite: true, items });
  };
  add("about", "About me", "paragraphs", cv.profile.trim() ? [{ id: "summary", text: cv.profile.trim() }] : []);
  add("highlights", "Highlights", "list", cv.highlights.map((text, index) => ({ id: `highlight-${index + 1}`, text })));
  add("skills", "Skills", "facts", cv.skills.map((skill, index) => ({ id: `skill-${index + 1}`, label: skill.k, value: skill.v })));
  add("experience", "Experience", "timeline", cv.experience.map((job, index) => ({
    id: `job-${index + 1}`,
    label: job.role || job.company || `Experience ${index + 1}`,
    meta: job.company || undefined,
    period: job.period || undefined,
    details: [...job.bullets, ...job.engagements.flatMap((engagement) => engagement.bullets)],
    ...(job.engagements.length ? {
      sub: job.engagements.map((engagement) => ({
        title: engagement.title,
        period: engagement.period || undefined,
        meta: engagement.stack || undefined,
        details: engagement.bullets,
      })),
    } : {}),
  })));
  const education = [
    ...(cv.education.degree || cv.education.school || cv.education.year || cv.education.note
      ? [{
          id: "education-1",
          label: cv.education.degree || cv.education.school,
          meta: cv.education.school || undefined,
          period: cv.education.year || undefined,
          text: cv.education.note || undefined,
        }]
      : []),
    ...cv.courses.map((course, index) => ({ id: `course-${index + 1}`, text: course })),
  ];
  add("education", "Education & courses", "timeline", education);
  add("projects", "Projects", "list", cv.projects.map((project, index) => ({
    id: `project-${index + 1}`,
    label: project.name,
    meta: project.meta || undefined,
    text: project.text || undefined,
    src: project.image || undefined,
  })));
  const projectImages = cv.projects.flatMap((project, index) =>
    project.image
      ? [{ id: `project-image-${index + 1}`, src: project.image, label: project.name || `Project ${index + 1}` }]
      : [],
  );
  if (projectImages.length) {
    sections.push({
      key: "project-images",
      title: "Project images",
      display: "gallery",
      visibility: "public",
      inChat: false,
      inDocument: false,
      inSite: true,
      items: projectImages,
    });
  }
  add("languages", "Languages", "facts", cv.languages.map((language, index) => ({
    id: `language-${index + 1}`,
    label: language.name,
    value: language.level,
  })));
  doc.sections = clearDemoContent
    ? sections
    : [...previousSections.filter((section) => !cvSectionKeys.has(section.key)), ...sections];
  const prompts: Record<string, { label: string; prompt: string; keywords: string[]; answer: string }> = {
    about: { label: "About me", prompt: "Tell me about yourself.", keywords: ["about", "profile"], answer: "Here is my professional profile." },
    highlights: { label: "Highlights", prompt: "What are your key achievements?", keywords: ["highlights", "achievements"], answer: "Here are the highlights in my CV." },
    skills: { label: "Skills", prompt: "What skills do you have?", keywords: ["skills", "tools"], answer: "Here are the skills in my CV." },
    experience: { label: "Experience", prompt: "What is your work experience?", keywords: ["experience", "work", "career"], answer: "Here is the experience in my CV." },
    education: { label: "Education", prompt: "What is your education?", keywords: ["education", "courses"], answer: "Here is the education in my CV." },
    projects: { label: "Projects", prompt: "What projects have you worked on?", keywords: ["projects", "portfolio"], answer: "Here are the projects in my CV." },
    languages: { label: "Languages", prompt: "What languages do you speak?", keywords: ["languages"], answer: "Here are the languages listed in my CV." },
  };
  const cvQuestions: PersonaDoc["questions"] = sections.filter((section) => section.key !== "project-images").map((section, index) => {
    const prompt = prompts[section.key];
    return {
      id: section.key,
      label: prompt.label,
      prompt: prompt.prompt,
      icon: "sparkles",
      keywords: prompt.keywords,
      primary: index === 0,
      random: false,
      visibility: "public",
      answers: [prompt.answer],
      blocks: [{ kind: "section", key: section.key }],
      followUps: [],
      page: section.key,
    };
  });
  doc.questions = clearDemoContent
    ? cvQuestions
    : [
        ...previousQuestions.filter((question) =>
          !cvSectionKeys.has(question.id) &&
          !question.blocks.some((block) => block.kind === "section" && cvSectionKeys.has(block.key)),
        ),
        ...cvQuestions,
      ];
  doc.landing = doc.questions.slice(0, 4).map((question) => question.id);
  doc.sidebar = [{ title: "Explore my CV", questionIds: doc.questions.map((question) => question.id), icons: true }];
  doc.defaultFollowUps = [];
  doc.fallback.answers = ["I don't have that detail in my CV yet. Try asking about my experience, skills, education or projects."];
  doc.fallback.blocks = [{ kind: "suggest" }];
  doc.document.sections = sections.map((section) => section.key);
  doc.document.showPhoto = cv.showPhoto && !!cv.photo.trim();
  doc.document.title = `${cv.title || "CV"} - ${doc.identity.name}`;
  doc.availability.show = false;
  delete doc.availability.action;
  doc.document.data = {
    ...(doc.document.data ?? {}),
    ...cv,
    customerStarter: false,
    photo: cv.photo,
    showPhoto: doc.document.showPhoto,
    availability: "",
    identity: {
      name: doc.identity.name,
      email: doc.identity.email ?? "",
      phone: doc.identity.phone ?? "",
      location: doc.identity.location ?? "",
      links,
    },
  };
  return doc;
}

export function ProfileDesignStudio({
  slug,
  doc: initialDoc,
  initialRev,
  cv,
  initialDesign,
}: {
  slug: string;
  doc: PersonaDoc;
  initialRev: number;
  cv: CvData;
  initialDesign: CvDesign;
}) {
  const router = useRouter();
  const [doc, setDoc] = useState(initialDoc);
  const [rev, setRev] = useState(initialRev);
  const [design, setDesign] = useState(initialDesign);
  const [cvData, setCvData] = useState(cv);
  const [view, setView] = useState<"content" | "design">("design");
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [importedCv, setImportedCv] = useState(false);
  const [status, setStatus] = useState<string>();
  const [error, setError] = useState<string>();

  const updateIdentity = (update: (identity: CvIdentity) => void) => {
    setCvData((current) => {
      const next = structuredClone(current);
      const identity = next.identity ?? { name: "", links: [] };
      update(identity);
      next.identity = identity;
      return next;
    });
  };

  const save = async () => {
    if (busy || importing || photoUploading) return false;
    setBusy(true);
    setStatus(undefined);
    setError(undefined);
    try {
      const clearDemoContent = importedCv ||
        doc.document.data?.customerStarter === true ||
        doc.identity.name === "Mekin Jemal";
      const nextDoc = applyImportedCv(doc, cvData, clearDemoContent);
      const identity = cvData.identity;
      if (identity) {
        nextDoc.identity.name = identity.name.trim() || nextDoc.identity.name;
        nextDoc.identity.role = cvData.title;
        nextDoc.identity.headline = cvData.title;
        nextDoc.identity.email = identity.email?.trim() || undefined;
        nextDoc.identity.phone = identity.phone?.trim() || undefined;
        nextDoc.identity.location = identity.location?.trim() || undefined;
        nextDoc.identity.links = identity.links.map((link) => {
          const label = link.label.toLowerCase();
          const existing = nextDoc.identity.links.find((item) => item.href === link.href);
          const kind = existing?.kind ?? (label.includes("github") ? "github" : label.includes("linkedin") ? "linkedin" : "other");
          return { kind, label: link.label, href: link.href };
        });
        if (cvData.photo.trim()) {
          nextDoc.identity.avatar = { src: cvData.photo.trim(), alt: nextDoc.identity.avatar?.alt ?? "" };
        } else {
          delete nextDoc.identity.avatar;
          nextDoc.identity.photos = [];
        }
      }
      nextDoc.document.data = {
        ...(nextDoc.document.data ?? {}),
        ...cvData,
        cvTemplate: design.template,
        cvAccent: design.accentColor,
      };
      const response = await fetch(withBase(`/api/account/personas/${slug}/`), {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ doc: nextDoc, rev }),
      });
      const result = (await response.json()) as { rev?: number; error?: string };
      if (!response.ok || typeof result.rev !== "number") {
        setError(result.error || "Couldn't save your CV design.");
        return false;
      }
      setRev(result.rev);
      setDoc(nextDoc);
      setStatus("Your CV form and design are saved to your private draft.");
      return true;
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const uploadImage = async (file: File, assetType: "profile" | "project") => {
    if (photoUploading || busy || importing) return;
    if (file.size > 3_000_000) {
      setError("Choose an image smaller than 3 MB.");
      setStatus(undefined);
      return null;
    }
    setPhotoUploading(true);
    setError(undefined);
    setStatus(assetType === "profile" ? "Uploading and optimizing your photo…" : "Uploading and optimizing your project image…");
    try {
      const body = new FormData();
      body.set("file", file);
      body.set("assetType", assetType);
      const response = await fetch(withBase(`/api/account/personas/${slug}/studio/photo-upload/`), {
        method: "POST",
        body,
        credentials: "same-origin",
      });
      const result = (await response.json()) as {
        url?: string;
        publicId?: string;
        error?: string;
      };
      if (!response.ok || !result.url || !result.publicId) {
        setError(result.error || "We couldn't upload this image. Try another file.");
        setStatus(undefined);
        return null;
      }
      setStatus("Your image is uploaded and optimized.");
      return { url: result.url, publicId: result.publicId };
    } catch {
      setError("Couldn't reach the image service. Check your connection and try again.");
      setStatus(undefined);
      return null;
    } finally {
      setPhotoUploading(false);
    }
  };

  const uploadPhoto = async (file: File) => {
    const uploaded = await uploadImage(file, "profile");
    if (uploaded) {
      setCvData((current) => ({
        ...current,
        photo: uploaded.url,
        photoPublicId: uploaded.publicId,
        showPhoto: true,
        identity: { ...(current.identity ?? { name: "", links: [] }), photo: uploaded.url },
      }));
    }
  };

  const uploadProjectImage = async (file: File, projectIndex: number) => {
    const uploaded = await uploadImage(file, "project");
    if (uploaded) {
      setCvData((current) => {
        const next = structuredClone(current);
        next.projects[projectIndex].image = uploaded.url;
        next.projects[projectIndex].imagePublicId = uploaded.publicId;
        return next;
      });
    }
  };

  const importCv = async (file: File) => {
    if (importing || busy) return;
    setImporting(true);
    setError(undefined);
    setStatus("Reading your PDF securely with AI…");
    try {
      const body = new FormData();
      body.set("file", file);
      const response = await fetch(withBase(`/api/account/personas/${slug}/studio/cv-import/`), {
        method: "POST",
        body,
        credentials: "same-origin",
      });
      const result = (await response.json()) as {
        cv?: {
          identity?: { name?: string; email?: string; phone?: string; location?: string; links?: CvIdentity["links"] };
          title?: string;
          profile?: string;
          highlights?: string[];
          skills?: CvData["skills"];
          experience?: CvData["experience"];
          projects?: CvData["projects"];
          education?: CvData["education"];
          courses?: string[];
          languages?: CvData["languages"];
        };
        error?: string;
      };
      if (!response.ok || !result.cv) {
        setError(result.error || "We couldn't map this CV. Try another PDF or enter your details manually.");
        setStatus(undefined);
        return;
      }
      const mapped = result.cv;
      const fullName = mapped.identity?.name?.trim() || "Your Name";
      const links = (mapped.identity?.links ?? []).filter((link) => {
        try {
          const url = new URL(link.href);
          return url.protocol === "https:" || url.protocol === "http:";
        } catch {
          return false;
        }
      });
      const nextCv: CvData = {
        ...cvData,
        showPhoto: false,
        photo: "",
        availability: "",
        title: mapped.title?.trim() || cvData.title,
        profile: mapped.profile ?? "",
        highlights: mapped.highlights ?? [],
        skills: mapped.skills ?? [],
        experience: mapped.experience ?? [],
        projects: mapped.projects ?? [],
        education: mapped.education ?? { degree: "", school: "", year: "", note: "" },
        courses: mapped.courses ?? [],
        languages: mapped.languages ?? [],
        identity: {
          name: fullName,
          email: mapped.identity?.email || undefined,
          phone: mapped.identity?.phone || undefined,
          location: mapped.identity?.location || undefined,
          photo: "",
          links,
        },
      };
      setCvData(nextCv);
      setDoc((current) => applyImportedCv(current, nextCv, true));
      setImportedCv(true);
      setView("content");
      setStatus("CV mapped into the form. Review every field, correct anything needed, then finish and train your AI.");
    } catch {
      setStatus(undefined);
      setError("Couldn't reach the AI import service. Check your connection and try again.");
    } finally {
      setImporting(false);
    }
  };

  const finish = async () => {
    if (busy || importing || photoUploading) return;
    if (!(await save())) return;
    setBusy(true);
    setError(undefined);
    setStatus("Saving your CV and starting AI training…");
    try {
      const response = await fetch(withBase(`/api/account/personas/${slug}/publish/`), { method: "POST" });
      const started = (await response.json()) as { jobId?: string; unchanged?: boolean; error?: string; issues?: string[] };
      if (!response.ok) {
        setError([started.error, ...(started.issues ?? [])].filter(Boolean).join(" "));
        setStatus(undefined);
        return;
      }
      if (started.unchanged) {
        router.push("/account/");
        router.refresh();
        return;
      }
      if (!started.jobId) throw new Error("The publish service returned no job identifier.");

      for (let attempt = 0; attempt < 200; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        const jobResponse = await fetch(withBase(`/api/account/jobs/${started.jobId}/`), { cache: "no-store" });
        const jobResult = (await jobResponse.json()) as {
          job?: { status: "queued" | "running" | "succeeded" | "failed"; error?: string | null };
          error?: string;
        };
        if (!jobResponse.ok || !jobResult.job) throw new Error(jobResult.error || "Couldn't check the training status.");
        if (jobResult.job.status === "failed") throw new Error(jobResult.job.error || "Your CV needs changes before it can be published.");
        if (jobResult.job.status === "succeeded") {
          router.push("/account/");
          router.refresh();
          return;
        }
        setStatus("Checking your CV, training its AI, and preparing your share links…");
      }
      setStatus("Training is still in progress. You can return to My CVs and check again shortly.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't finish publishing this CV.");
      setStatus(undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-5 pt-4 sm:px-8">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent-soft/40 px-3 py-1 text-xs font-medium text-muted">
          <Sparkles className="size-3.5 text-accent" aria-hidden="true" />
          Mekin&apos;s demo CV is included as editable starter content
        </span>
      </div>
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 pt-5 sm:px-8">
        <Link href="/account/" className="text-sm font-semibold text-muted hover:text-fg">
          ← My CVs
        </Link>
        <div className="flex items-center gap-3">
          {status && <span role="status" className="text-sm text-emerald-700 dark:text-emerald-300">{status}</span>}
          {error && <span role="alert" className="max-w-64 text-sm text-accent">{error}</span>}
          <div role="group" aria-label="CV editor steps" className="flex rounded-xl border border-line bg-card p-1">
            <button type="button" aria-pressed={view === "design"} onClick={() => setView("design")} className={`rounded-lg px-3 py-2 text-sm font-semibold ${view === "design" ? "bg-surface" : "text-muted"}`}>1. Choose template</button>
            <button type="button" aria-pressed={view === "content"} onClick={() => setView("content")} className={`rounded-lg px-3 py-2 text-sm font-semibold ${view === "content" ? "bg-surface" : "text-muted"}`}>2. Add your information</button>
          </div>
          <button
            type="button"
            onClick={() => void save()}
            disabled={busy || importing || photoUploading}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-on-accent disabled:opacity-60"
          >
            {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save CV
          </button>
        </div>
      </div>
      {view === "content" ? (
        <div className="mx-auto max-w-7xl px-5 pb-8 sm:px-8">
          <section className="mb-5 rounded-2xl border border-accent/20 bg-accent-soft/25 p-4 sm:p-5" aria-labelledby="upload-cv-heading">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <h2 id="upload-cv-heading" className="font-semibold">Already have a CV?</h2>
                <p className="mt-1 text-sm leading-6 text-muted">Upload a PDF and AI will map its details into these fields. The file is processed for import and isn’t stored; review the result before saving.</p>
              </div>
              <label className="inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl border border-line-strong bg-card px-4 text-sm font-semibold hover:border-accent/50 has-[:disabled]:cursor-wait has-[:disabled]:opacity-60">
                {importing ? <LoaderCircle className="size-4 animate-spin" /> : <FileUp className="size-4" aria-hidden="true" />}
                {importing ? "Mapping your CV…" : "Upload PDF"}
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  className="sr-only"
                  disabled={importing || busy || photoUploading}
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    event.currentTarget.value = "";
                    if (file) void importCv(file);
                  }}
                />
              </label>
            </div>
            {status && <p role="status" className="mt-3 text-sm text-muted">{status}</p>}
            {error && <p role="alert" className="mt-3 text-sm font-medium text-accent">{error}</p>}
          </section>
          <section className="mb-5 space-y-4 rounded-2xl border border-line bg-card p-4 sm:p-6" aria-labelledby="cv-personal-details">
            <div>
              <h2 id="cv-personal-details" className="text-lg font-semibold">Personal details</h2>
              <p className="mt-1 text-sm text-muted">These details appear in the CV header and contact row.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {([
                ["name", "Full name"],
                ["email", "Email"],
                ["phone", "Phone"],
                ["location", "Location"],
              ] as const).map(([field, label]) => (
                <label key={field} className="space-y-1.5 text-sm font-medium">
                  {label}
                  <input
                    type={field === "email" ? "email" : "text"}
                    required={field === "name"}
                    value={cvData.identity?.[field] ?? ""}
                    onChange={(event) => updateIdentity((identity) => {
                      if (field === "name") identity.name = event.target.value;
                      else identity[field] = event.target.value;
                    })}
                    className="w-full rounded-xl border border-line-strong bg-bg px-3 py-2.5 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                  />
                </label>
              ))}
            </div>
            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold">Contact links</legend>
              {(cvData.identity?.links ?? []).map((link, index) => (
                <div key={index} className="grid gap-2 sm:grid-cols-[minmax(8rem,0.4fr)_minmax(0,1fr)_auto] sm:items-end">
                  <label className="space-y-1.5 text-sm font-medium">
                    Link label
                    <input
                      value={link.label}
                      onChange={(event) => updateIdentity((identity) => {
                        identity.links[index] = { ...identity.links[index], label: event.target.value };
                      })}
                      className="w-full rounded-xl border border-line-strong bg-bg px-3 py-2.5 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                    />
                  </label>
                  <label className="space-y-1.5 text-sm font-medium">
                    Link URL
                    <input
                      type="url"
                      value={link.href}
                      onChange={(event) => updateIdentity((identity) => {
                        identity.links[index] = { ...identity.links[index], href: event.target.value };
                      })}
                      className="w-full rounded-xl border border-line-strong bg-bg px-3 py-2.5 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => updateIdentity((identity) => { identity.links.splice(index, 1); })}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-line px-3 text-sm text-muted hover:bg-surface hover:text-fg"
                    aria-label={`Remove ${link.label || `link ${index + 1}`}`}
                  >
                    <Trash2 className="size-4" aria-hidden="true" /> Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => updateIdentity((identity) => { identity.links.push({ label: "", href: "https://" }); })}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-line px-3 text-sm font-medium text-muted hover:bg-surface hover:text-fg"
              >
                <Plus className="size-4" aria-hidden="true" /> Add a link
              </button>
            </fieldset>
          </section>
          <CvEditor
            value={cvData}
            onChange={setCvData}
            fallbackCv={cv}
            onPhotoUpload={uploadPhoto}
            onProjectImageUpload={uploadProjectImage}
            photoUploadBusy={photoUploading || busy || importing}
            photoUploadError={error}
            projectImageUploadBusy={photoUploading || busy || importing}
          />
          <section className="mt-6 flex flex-col gap-4 rounded-2xl border border-accent/20 bg-accent-soft/20 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div>
              <h2 className="font-semibold">Ready to finish?</h2>
              <p className="mt-1 text-sm leading-6 text-muted">We’ll save your CV, check it, train its AI from the information here, and publish the shareable portfolio.</p>
            </div>
            <button type="button" onClick={() => void finish()} disabled={busy || importing || photoUploading} className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-accent px-5 font-semibold text-on-accent disabled:opacity-60">
              {busy ? <LoaderCircle className="size-4 animate-spin" /> : <ArrowRight className="size-4" aria-hidden="true" />}
              {busy ? "Finishing your CV…" : "Finish & train AI"}
            </button>
            {error && <p role="alert" className="text-sm font-medium text-accent sm:basis-full">{error}</p>}
            {busy && status && <p role="status" className="text-sm text-muted sm:basis-full">{status}</p>}
          </section>
        </div>
      ) : (
        <CvStudio
          cv={cvData}
          initialTemplate={design.template}
          initialAccentColor={design.accentColor}
          onDesignChange={setDesign}
          onNextStep={() => setView("content")}
          nextStepLabel="Next: edit your CV details"
          onPrint={() => {
            void fetch(withBase(`/api/account/personas/${slug}/pdf/`), { method: "POST" })
              .catch((err: unknown) => console.error("[platform-analytics] Could not record PDF print request:", err));
          }}
          showSidebarToggle={false}
        />
      )}
    </div>
  );
}
