"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, CheckCircle2, FileText, FileUp, LoaderCircle, Plus, Save, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import { CvStudio, type CvDesign } from "@/app/cv/cv-studio";
import { CvEditor } from "@/components/admin/studio/cv-editor";
import { toast } from "@/components/ui/toast";
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
  // Start with the content step: uploading an existing CV is the fastest, clearest path for most people.
  const [view, setView] = useState<"content" | "design">("content");
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [importedCv, setImportedCv] = useState(false);
  const [importedFileName, setImportedFileName] = useState<string>();
  const [dropActive, setDropActive] = useState(false);

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
        toast.add({
          title: "Couldn't save your CV",
          description: result.error || "Couldn't save your CV design.",
          type: "error",
          priority: "high",
        });
        return false;
      }
      setRev(result.rev);
      setDoc(nextDoc);
      toast.add({ title: "CV saved", description: "Your CV form and design are saved to your private draft.", type: "success" });
      return true;
    } catch {
      toast.add({
        title: "Couldn't save your CV",
        description: "Couldn't reach the server. Check your connection and try again.",
        type: "error",
        priority: "high",
      });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const uploadImage = async (file: File, assetType: "profile" | "project") => {
    if (photoUploading || busy || importing) return;
    if (file.size > 3_000_000) {
      toast.add({ title: "Image is too large", description: "Choose an image smaller than 3 MB.", type: "error" });
      return null;
    }
    setPhotoUploading(true);
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
        toast.add({
          title: "Image upload failed",
          description: result.error || "We couldn't upload this image. Try another file.",
          type: "error",
          priority: "high",
        });
        return null;
      }
      toast.add({
        title: assetType === "profile" ? "Photo uploaded" : "Project image uploaded",
        description: "Your image is uploaded and optimized.",
        type: "success",
      });
      return { url: result.url, publicId: result.publicId };
    } catch {
      toast.add({
        title: "Image upload failed",
        description: "Couldn't reach the image service. Check your connection and try again.",
        type: "error",
        priority: "high",
      });
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
    if (file.size > 8_000_000) {
      toast.add({ title: "PDF is too large", description: "Choose a PDF smaller than 8 MB.", type: "error" });
      return;
    }
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.add({ title: "Choose a PDF CV", description: "This importer accepts PDF files only.", type: "error" });
      return;
    }
    setImporting(true);
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
        toast.add({
          title: "CV import failed",
          description: result.error || "We couldn't map this CV. Try another PDF or enter your details manually.",
          type: "error",
          priority: "high",
        });
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
      // The imported source replaces the editable CV fields, while the owner stays in control of every value.
      setDoc((current) => applyImportedCv(current, nextCv, true));
      setImportedCv(true);
      setImportedFileName(file.name);
      setView("content");
      toast.add({
        title: "Your CV is ready to review",
        description: "We mapped the PDF into the form. Check the fields, save your draft, then choose a design.",
        type: "success",
      });
    } catch {
      toast.add({
        title: "CV import failed",
        description: "Couldn't reach the AI import service. Check your connection and try again.",
        type: "error",
        priority: "high",
      });
    } finally {
      setImporting(false);
    }
  };

  const finish = async () => {
    if (busy || importing || photoUploading) return;
    if (!(await save())) return;
    setBusy(true);
    try {
      const response = await fetch(withBase(`/api/account/personas/${slug}/publish/`), { method: "POST" });
      const started = (await response.json()) as { jobId?: string; unchanged?: boolean; error?: string; issues?: string[] };
      if (!response.ok) {
        toast.add({
          title: "Couldn't publish your CV",
          description: [started.error, ...(started.issues ?? [])].filter(Boolean).join(" ") || "Review your CV and try again.",
          type: "error",
          priority: "high",
        });
        return;
      }
      if (started.unchanged) {
        toast.add({ title: "CV is up to date", description: "Your latest CV is already published.", type: "success" });
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
          toast.add({ title: "CV published", description: "Your CV is live and its AI assistant is trained.", type: "success" });
          router.push("/account/");
          router.refresh();
          return;
        }
      }
      toast.add({
        title: "Training is still running",
        description: "Return to My CVs and check again shortly.",
        type: "info",
      });
    } catch (cause) {
      toast.add({
        title: "Couldn't finish publishing your CV",
        description: cause instanceof Error ? cause.message : "Couldn't finish publishing this CV.",
        type: "error",
        priority: "high",
      });
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
          <div role="group" aria-label="CV editor steps" className="flex rounded-xl border border-line bg-card p-1">
            <button type="button" aria-pressed={view === "content"} onClick={() => setView("content")} className={`rounded-lg px-3 py-2 text-sm font-semibold ${view === "content" ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg"}`}>1. Import & details</button>
            <button type="button" aria-pressed={view === "design"} onClick={() => setView("design")} className={`rounded-lg px-3 py-2 text-sm font-semibold ${view === "design" ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg"}`}>2. Choose design</button>
            <span className="hidden items-center px-2 text-xs font-medium text-muted xl:inline">3. Publish & train</span>
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
          <section className="mb-5 overflow-hidden rounded-2xl border border-line bg-card" aria-labelledby="upload-cv-heading">
            <div className="border-b border-line bg-surface/50 px-4 py-4 sm:px-5">
              <p className="eyebrow text-accent">Step 1 of 3</p>
              <h2 id="upload-cv-heading" className="mt-1 text-lg font-semibold">Start with your existing CV</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">Upload a text-based PDF and we will map its supported details into the editable form below. Nothing is published automatically.</p>
            </div>
            <div
              className={`m-4 rounded-xl border-2 border-dashed p-5 text-center transition-colors sm:m-5 sm:p-7 ${dropActive ? "border-accent bg-accent-soft/30" : "border-line-strong bg-bg-soft/40"}`}
              onDragEnter={(event) => { event.preventDefault(); setDropActive(true); }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={(event) => { event.preventDefault(); setDropActive(false); }}
              onDrop={(event) => {
                event.preventDefault();
                setDropActive(false);
                const file = event.dataTransfer.files?.[0];
                if (file) void importCv(file);
              }}
            >
              <span className="mx-auto grid size-11 place-items-center rounded-xl bg-accent-soft text-accent">
                {importing ? <LoaderCircle className="size-5 animate-spin" /> : <FileText className="size-5" aria-hidden="true" />}
              </span>
              <h3 className="mt-3 font-semibold">{importing ? "Reading and mapping your CV…" : "Drop your CV PDF here"}</h3>
              <p className="mt-1 text-sm text-muted">or choose a file from your device · PDF · up to 8 MB</p>
              <label className="mt-4 inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-on-accent hover:brightness-95 has-[:disabled]:cursor-wait has-[:disabled]:opacity-60">
                {importing ? <LoaderCircle className="size-4 animate-spin" /> : <FileUp className="size-4" aria-hidden="true" />}
                {importing ? "Mapping fields…" : "Choose PDF"}
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
              <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted">
                <span className="inline-flex items-center gap-1"><ShieldCheck className="size-3.5 text-emerald-600" aria-hidden="true" /> Processed for mapping, not stored</span>
                <span>Review every field before saving</span>
              </div>
            </div>
          </section>
          {importedCv && (
            <section className="mb-5 flex gap-3 rounded-2xl border border-emerald-600/20 bg-emerald-500/5 p-4 text-sm leading-6" role="status">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" aria-hidden="true" />
              <div>
                <h2 className="font-semibold text-fg">{importedFileName ? `${importedFileName} was mapped into your form` : "Your CV was mapped into your form"}</h2>
                <p className="mt-1 text-muted">Review the highlighted form sections below, correct any missing or inaccurate details, then save. When you publish, the approved fields become the knowledge source for your portfolio AI.</p>
              </div>
            </section>
          )}
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
            projectImageUploadBusy={photoUploading || busy || importing}
          />
          <section className="mt-6 flex flex-col gap-4 rounded-2xl border border-accent/20 bg-accent-soft/20 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div>
              <p className="eyebrow text-accent">Step 3 of 3</p>
              <h2 className="mt-1 font-semibold">Choose a design, then publish when you are ready</h2>
              <p className="mt-1 text-sm leading-6 text-muted">We save your approved fields, check the profile, train its AI from that content, and publish the shareable portfolio.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setView("design")} disabled={busy || importing || photoUploading} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-line-strong bg-card px-4 font-semibold disabled:opacity-60">
                2. Choose design
              </button>
              <button type="button" onClick={() => void finish()} disabled={busy || importing || photoUploading} className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-accent px-5 font-semibold text-on-accent disabled:opacity-60">
                {busy ? <LoaderCircle className="size-4 animate-spin" /> : <ArrowRight className="size-4" aria-hidden="true" />}
                {busy ? "Publishing your CV…" : "3. Publish & train AI"}
              </button>
            </div>
          </section>
        </div>
      ) : (
        <CvStudio
          cv={cvData}
          initialTemplate={design.template}
          initialAccentColor={design.accentColor}
          onDesignChange={setDesign}
          onNextStep={() => setView("content")}
          nextStepLabel="Next: review your CV details"
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
