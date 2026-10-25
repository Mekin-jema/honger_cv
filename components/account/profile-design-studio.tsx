"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Check, Circle, LoaderCircle, MinusCircle, Plus, Trash2, X } from "lucide-react";
import { CvStudio, type CvDesign } from "@/app/cv/cv-studio";
import { CvEditor } from "@/components/admin/studio/cv-editor";
import { toast } from "@/components/ui/toast";
import type { CvData, CvIdentity } from "@/lib/persona/cv";
import type { CvTemplateId } from "@/lib/persona/cv-templates";
import type { PersonaDoc } from "@/lib/persona/schema";
import { withBase } from "@/lib/utils";
import { CvImportPipeline } from "./cv-import-pipeline";
import { isStarterCv } from "@/server/services/cv-mapper/safe-merge";

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

type SaveState = "saved" | "dirty" | "saving" | "error";

type SaveOptions = {
  silent?: boolean;
  cvData?: CvData;
  doc?: PersonaDoc;
  importedCv?: boolean;
};

type TrainingStep = {
  id: string;
  label: string;
  state: "pending" | "running" | "done" | "failed" | "skipped";
  detail?: string;
  ms?: number;
};

const INITIAL_TRAINING_STEPS: TrainingStep[] = [
  { id: "validate", label: "Check the draft", state: "pending" },
  { id: "compile", label: "Build the AI's knowledge", state: "pending" },
  { id: "snapshot", label: "Save a new version", state: "pending" },
  { id: "embed", label: "Index for search", state: "pending" },
  { id: "checks", label: "Test questions and privacy", state: "pending" },
  { id: "activate", label: "Make it live", state: "pending" },
  { id: "pdf", label: "Make the PDF", state: "pending" },
];

export function ProfileDesignStudio({
  slug,
  doc: initialDoc,
  initialRev,
  cv,
  initialDesign,
  availableTemplates,
}: {
  slug: string;
  doc: PersonaDoc;
  initialRev: number;
  cv: CvData;
  initialDesign: CvDesign;
  availableTemplates: readonly CvTemplateId[];
}) {
  const router = useRouter();
  const [doc, setDoc] = useState(initialDoc);
  const [rev, setRev] = useState(initialRev);
  const [design, setDesign] = useState(initialDesign);
  const [cvData, setCvData] = useState(cv);
  const [view, setView] = useState<"content" | "design" | "training">("content");
  const [busy, setBusy] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [importedCv, setImportedCv] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [designSelected, setDesignSelected] = useState(false);
  const [trainingError, setTrainingError] = useState("");
  const [trainingPhase, setTrainingPhase] = useState<"saving" | "training">("saving");
  const [trainingSteps, setTrainingSteps] = useState<TrainingStep[]>(INITIAL_TRAINING_STEPS);
  const editVersion = useRef(0);
  const importing = false;

  const markDirty = () => {
    editVersion.current++;
    setSaveState("dirty");
  };

  const changeCvData = (next: CvData) => {
    setCvData(next);
    markDirty();
  };

  const updateIdentity = (update: (identity: CvIdentity) => void) => {
    markDirty();
    setCvData((current) => {
      const next = structuredClone(current);
      const identity = next.identity ?? { name: "", links: [] };
      update(identity);
      next.identity = identity;
      return next;
    });
  };

  const save = useCallback(async (options: SaveOptions = {}) => {
    if (busy || importing || photoUploading || saveState === "saving") return false;
    const versionAtStart = editVersion.current;
    const currentCv = options.cvData ?? cvData;
    const currentDoc = options.doc ?? doc;
    const isImportedCv = options.importedCv ?? importedCv;
    setSaveState("saving");
    setBusy(true);
    try {
      const clearDemoContent = isImportedCv ||
        currentDoc.document.data?.customerStarter === true ||
        currentDoc.identity.name === "Mekin Jemal";
      const nextDoc = applyImportedCv(currentDoc, currentCv, clearDemoContent);
      const identity = currentCv.identity;
      if (identity) {
        nextDoc.identity.name = identity.name.trim() || nextDoc.identity.name;
        nextDoc.identity.role = currentCv.title;
        nextDoc.identity.headline = currentCv.title;
        nextDoc.identity.email = identity.email?.trim() || undefined;
        nextDoc.identity.phone = identity.phone?.trim() || undefined;
        nextDoc.identity.location = identity.location?.trim() || undefined;
        nextDoc.identity.links = identity.links.map((link) => {
          const label = link.label.toLowerCase();
          const existing = nextDoc.identity.links.find((item) => item.href === link.href);
          const kind = existing?.kind ?? (label.includes("github") ? "github" : label.includes("linkedin") ? "linkedin" : "other");
          return { kind, label: link.label, href: link.href };
        });
        if (currentCv.photo.trim()) {
          nextDoc.identity.avatar = { src: currentCv.photo.trim(), alt: nextDoc.identity.avatar?.alt ?? "" };
        } else {
          delete nextDoc.identity.avatar;
          nextDoc.identity.photos = [];
        }
      }
      nextDoc.document.data = {
        ...(nextDoc.document.data ?? {}),
        ...currentCv,
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
        setSaveState("error");
        if (!options.silent) toast.add({
          title: "Couldn't save your CV",
          description: result.error || "Couldn't save your CV design.",
          type: "error",
          priority: "high",
        });
        return false;
      }
      setRev(result.rev);
      setDoc(nextDoc);
      setSaveState(editVersion.current === versionAtStart ? "saved" : "dirty");
      if (!options.silent) toast.add({ title: "CV saved", description: "Your CV form and design are saved to your private draft.", type: "success" });
      return true;
    } catch {
      setSaveState("error");
      if (!options.silent) toast.add({
        title: "Couldn't save your CV",
        description: "Couldn't reach the server. Check your connection and try again.",
        type: "error",
        priority: "high",
      });
      return false;
    } finally {
      setBusy(false);
    }
  }, [busy, importing, photoUploading, saveState, cvData, doc, importedCv, design, rev, slug]);

  useEffect(() => {
    if (saveState !== "dirty" || busy || photoUploading || importing) return;
    const timer = window.setTimeout(() => void save({ silent: true }), 650);
    return () => window.clearTimeout(timer);
  }, [saveState, cvData, doc, design, busy, photoUploading, importing, importedCv, rev, save]);

  const openDetailsStep = async () => {
    if (saveState !== "saved" && !(await save({ silent: true }))) return;
    setView("content");
  };

  const openDesignStep = async () => {
    if (isStarterCv(cvData)) {
      toast.add({ title: "Complete your CV details first", description: "Import your CV or replace the starter details before choosing a design.", type: "info" });
      setView("content");
      return;
    }
    if (saveState !== "saved" && !(await save({ silent: true }))) return;
    setView("design");
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
      markDirty();
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
      markDirty();
      setCvData((current) => {
        const next = structuredClone(current);
        next.projects[projectIndex].image = uploaded.url;
        next.projects[projectIndex].imagePublicId = uploaded.publicId;
        return next;
      });
    }
  };

  const handleApplyPipelineCv = async (nextCv: CvData, meta: { filename: string; markdown?: string }) => {
    const nextDoc = applyImportedCv(doc, nextCv, true);
    markDirty();
    setCvData(nextCv);
    setDoc(nextDoc);
    setImportedCv(true);
    setView("content");
    const saved = await save({ silent: true, cvData: nextCv, doc: nextDoc, importedCv: true });
    if (!saved) throw new Error("The imported CV could not be autosaved. Check the details and try again.");
    toast.add({
      title: "Your CV form was populated",
      description: `Mapped details from ${meta.filename}. Your changes are saved automatically.`,
      type: "success",
    });
  };

  const finish = async () => {
    if (busy || importing || photoUploading) return;
    if (!designSelected) {
      setView("design");
      toast.add({ title: "Choose a design first", description: "Select a CV template before training and publishing.", type: "info" });
      return;
    }
    if (!cvData.identity?.name.trim()) {
      setView("content");
      toast.add({ title: "Add your name first", description: "Complete your CV details before training the assistant.", type: "error" });
      return;
    }
    setView("training");
    setTrainingPhase("saving");
    setTrainingError("");
    setTrainingSteps(INITIAL_TRAINING_STEPS);
    if (saveState !== "saved" && !(await save({ silent: true }))) {
      setTrainingError("Your changes could not be saved. Return to Details and try again.");
      return;
    }
    setBusy(true);
    setTrainingPhase("training");
    try {
      const response = await fetch(withBase(`/api/account/personas/${slug}/publish/`), { method: "POST" });
      const started = (await response.json()) as { jobId?: string; unchanged?: boolean; error?: string; issues?: string[] };
      if (!response.ok) {
        const message = [started.error, ...(started.issues ?? [])].filter(Boolean).join(" ") || "Review your CV and try again.";
        setTrainingError(message);
        toast.add({
          title: "Couldn't publish your CV",
          description: message,
          type: "error",
          priority: "high",
        });
        return;
      }
      if (started.unchanged) {
        toast.add({ title: "CV is up to date", description: "Your latest CV is already published.", type: "success" });
        router.push(withBase(`/u/${slug}/`));
        router.refresh();
        return;
      }
      if (!started.jobId) throw new Error("The publish service returned no job identifier.");

      for (let attempt = 0; attempt < 200; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        const jobResponse = await fetch(withBase(`/api/account/jobs/${started.jobId}/`), { cache: "no-store" });
        const jobResult = (await jobResponse.json()) as {
          job?: {
            status: "queued" | "running" | "succeeded" | "failed";
            error?: string | null;
            progress?: { steps?: TrainingStep[] };
          };
          error?: string;
        };
        if (!jobResponse.ok || !jobResult.job) throw new Error(jobResult.error || "Couldn't check the training status.");
        if (jobResult.job.progress?.steps) setTrainingSteps(jobResult.job.progress.steps);
        if (jobResult.job.status === "failed") throw new Error(jobResult.job.error || "Your CV needs changes before it can be published.");
        if (jobResult.job.status === "succeeded") {
          toast.add({ title: "CV published", description: "Your CV is live and its AI assistant is trained.", type: "success" });
          router.push(withBase(`/u/${slug}/`));
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
      setTrainingError(cause instanceof Error ? cause.message : "Couldn't finish publishing this CV.");
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
      <div className="mx-auto grid max-w-7xl grid-cols-[auto_minmax(0,1fr)] items-center gap-3 px-5 pt-5 sm:px-8">
        <Link href="/account/" className="text-sm font-semibold text-muted hover:text-fg">
          ← My CVs
        </Link>
        <div role="group" aria-label="CV creation steps" className="grid grid-cols-3 gap-1 rounded-xl border border-line bg-card p-1">
          <button type="button" aria-pressed={view === "content"} onClick={() => void openDetailsStep()} disabled={busy || photoUploading} className={`min-h-11 rounded-lg px-2 text-center text-xs font-semibold transition-all duration-200 sm:text-sm ${view === "content" ? "bg-surface text-fg shadow-sm" : "text-muted hover:bg-surface/70 hover:text-fg"}`}>1. Import & details</button>
          <button type="button" aria-pressed={view === "design"} onClick={() => void openDesignStep()} disabled={busy || photoUploading} className={`min-h-11 rounded-lg px-2 text-center text-xs font-semibold transition-all duration-200 sm:text-sm ${view === "design" ? "bg-surface text-fg shadow-sm" : "text-muted hover:bg-surface/70 hover:text-fg"}`}>2. Choose design</button>
          <button type="button" aria-pressed={view === "training"} onClick={() => void finish()} disabled={busy || photoUploading || saveState === "saving"} className={`inline-flex min-h-11 items-center justify-center gap-1 rounded-lg px-2 text-center text-xs font-semibold transition-all duration-200 sm:text-sm ${view === "training" ? "bg-accent text-on-accent shadow-sm" : "bg-accent text-on-accent hover:brightness-95"}`}>
            {busy ? <LoaderCircle className="size-3.5 animate-spin" /> : <ArrowRight className="size-3.5" aria-hidden="true" />}
            3. Train & publish
          </button>
        </div>
        <p role="status" className="col-span-full text-right text-xs text-muted" aria-live="polite">
          {saveState === "saving" ? "Saving changes…" : saveState === "dirty" ? "Changes will save automatically" : saveState === "error" ? "Autosave failed. Edit a field to retry." : "All changes saved"}
        </p>
      </div>
      {view === "content" ? (
        <div key={view} className="studio-step-panel mx-auto max-w-7xl px-5 pb-8 sm:px-8">
          <CvImportPipeline
            slug={slug}
            currentCv={cvData}
            onApplyCv={handleApplyPipelineCv}
            disabled={busy || photoUploading}
          />
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
            onChange={changeCvData}
            fallbackCv={cv}
            onPhotoUpload={uploadPhoto}
            onProjectImageUpload={uploadProjectImage}
            photoUploadBusy={photoUploading || busy || importing}
            projectImageUploadBusy={photoUploading || busy || importing}
          />
        </div>
      ) : view === "design" ? (
        <div key={view} className="studio-step-panel">
          <CvStudio
            cv={cvData}
            initialTemplate={design.template}
            initialAccentColor={design.accentColor}
            availableTemplates={availableTemplates}
            onTemplateLocked={() => router.push(withBase("/account/billing/?feature=additional-cv"))}
            onTemplateChange={() => setDesignSelected(true)}
            onDesignChange={(next) => {
              setDesign(next);
              markDirty();
            }}
            showStudioHeading={false}
            onPrint={() => {
              void fetch(withBase(`/api/account/personas/${slug}/pdf/`), { method: "POST" })
                .catch((err: unknown) => console.error("[platform-analytics] Could not record PDF print request:", err));
            }}
            showSidebarToggle={false}
          />
        </div>
      ) : (
        <section key={view} className="studio-step-panel mx-auto max-w-7xl px-5 pb-12 pt-8 sm:px-8" aria-live="polite">
          <div className="mx-auto max-w-2xl space-y-5 rounded-2xl border border-line bg-card p-6 shadow-sm sm:p-8">
            <div className="flex items-center gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-full bg-accent/10 text-accent">
                <LoaderCircle className={`size-5 ${busy ? "animate-spin" : ""}`} />
              </div>
              <div>
                <h2 className="text-lg font-semibold">{busy ? "Training your assistant" : trainingPhase === "saving" ? "Saving your CV" : "Ready to train"}</h2>
                <p className="mt-1 text-sm text-muted">
                  {trainingError || (busy ? "Your saved CV is being checked, indexed, and published." : "Your details and design will be saved before training starts.")}
                </p>
              </div>
            </div>
            <ol className="space-y-2" aria-label="AI training progress">
              {trainingSteps.map((step) => (
                <li key={step.id} className="flex items-start gap-3 rounded-lg border border-line px-3 py-2.5 text-sm">
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center" aria-label={step.state}>
                    {step.state === "done" ? <Check className="size-4 text-emerald-600" />
                      : step.state === "running" ? <LoaderCircle className="size-4 animate-spin text-accent" />
                        : step.state === "failed" ? <X className="size-4 text-red-600" />
                          : step.state === "skipped" ? <MinusCircle className="size-4 text-muted" />
                            : <Circle className="size-3.5 text-faint" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`font-medium ${step.state === "pending" ? "text-muted" : "text-fg"}`}>{step.label}</span>
                    {step.detail && <span className={`mt-0.5 block text-xs ${step.state === "failed" ? "text-red-600" : "text-muted"}`}>{step.detail}</span>}
                  </span>
                  {step.ms !== undefined && <span className="shrink-0 text-xs tabular-nums text-muted">{step.ms < 1000 ? `${step.ms} ms` : `${(step.ms / 1000).toFixed(1)} s`}</span>}
                </li>
              ))}
            </ol>
            {trainingError && <button type="button" onClick={() => setView("content")} className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-muted hover:bg-surface">Back to details</button>}
          </div>
        </section>
      )}
    </div>
  );
}
