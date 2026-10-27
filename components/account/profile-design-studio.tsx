"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Circle,
  Clock,
  ExternalLink,
  Eye,
  FileText,
  LoaderCircle,
  MinusCircle,
  Palette,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { CvStudio, type CvDesign } from "@/app/cv/cv-studio";
import { CvEditor } from "@/components/admin/studio/cv-editor";
import { toast } from "@/components/ui/toast";
import type { CvData, CvIdentity } from "@/lib/persona/cv";
import { CV_TEMPLATES, type CvTemplateId } from "@/lib/persona/cv-templates";
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
  cvPassActive = false,
}: {
  slug: string;
  doc: PersonaDoc;
  initialRev: number;
  cv: CvData;
  initialDesign: CvDesign;
  availableTemplates: readonly CvTemplateId[];
  cvPassActive?: boolean;
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

  const currentStepNumber = view === "content" ? 1 : view === "design" ? 2 : 3;
  const selectedTemplate = CV_TEMPLATES.find((item) => item.id === design.template) ?? CV_TEMPLATES[0];

  const completedTrainingCount = trainingSteps.filter((s) => s.state === "done").length;
  const trainingStepPercent = Math.round((completedTrainingCount / trainingSteps.length) * 100);

  const overallProgressPercent = useMemo(() => {
    if (view === "content") {
      let score = 15;
      if (cvData.identity?.name?.trim()) score += 6;
      if (cvData.profile?.trim()) score += 4;
      if (cvData.experience?.length > 0) score += 4;
      if (cvData.skills?.length > 0) score += 4;
      return Math.min(score, 33);
    }
    if (view === "design") {
      return 66;
    }
    if (completedTrainingCount === trainingSteps.length) return 100;
    return Math.min(66 + Math.round((completedTrainingCount / trainingSteps.length) * 34), 98);
  }, [view, cvData, completedTrainingCount, trainingSteps.length]);

  return (
    <div className="min-h-screen space-y-6 pb-20">
      {/* Sticky Top Header with Breadcrumbs, Live Preview Link, Autosave Badge, and Step Navigation */}
      <header className="sticky top-0 z-40 border-b border-line/70 bg-bg/85 backdrop-blur-md transition-all shadow-xs">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Left: Back & Title */}
            <div className="flex items-center gap-3">
              <Link
                href="/account/"
                className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-card px-3 py-1.5 text-xs font-semibold text-muted transition hover:bg-surface hover:text-fg"
              >
                <ArrowLeft className="size-3.5" aria-hidden="true" />
                <span>My CVs</span>
              </Link>
              <div className="hidden h-4 w-px bg-line sm:block" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="truncate text-sm font-bold text-fg sm:text-base">
                    {cvData.identity?.name?.trim() || doc.site.title || "Your CV"}
                  </h1>
                  <span className="hidden rounded-full bg-surface px-2 py-0.5 text-[10px] font-semibold text-muted md:inline-block">
                    /{slug}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Autosave status & Live preview */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div
                role="status"
                aria-live="polite"
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-2.5 py-1 text-xs font-medium text-muted shadow-2xs"
              >
                {saveState === "saving" ? (
                  <>
                    <LoaderCircle className="size-3.5 animate-spin text-accent" />
                    <span>Saving…</span>
                  </>
                ) : saveState === "dirty" ? (
                  <>
                    <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
                    <span>Unsaved edits</span>
                  </>
                ) : saveState === "error" ? (
                  <>
                    <X className="size-3.5 text-red-500" />
                    <span className="font-semibold text-red-600">Autosave failed</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-3.5 text-emerald-600" />
                    <span className="text-muted">Saved</span>
                  </>
                )}
              </div>

              <Link
                href={`/u/${slug}/`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface/70 px-3 py-1.5 text-xs font-semibold text-fg transition hover:bg-surface hover:text-accent"
                title="View live published CV in new tab"
              >
                <ExternalLink className="size-3" aria-hidden="true" />
                <span className="hidden sm:inline">Live Preview</span>
              </Link>
            </div>
          </div>

          {/* Stepper Navigation Grid */}
          <div className="mt-3.5">
            <div
              role="group"
              aria-label="CV creation progress"
              className="grid grid-cols-3 gap-2 rounded-2xl border border-line bg-card/90 p-1.5 shadow-xs sm:gap-3"
            >
              {/* Step 1 Tab */}
              <button
                type="button"
                aria-pressed={view === "content"}
                onClick={() => void openDetailsStep()}
                disabled={busy || photoUploading}
                className={`group flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-all sm:px-3 sm:py-2.5 ${
                  view === "content"
                    ? "bg-surface text-fg shadow-xs ring-1 ring-accent/30"
                    : "text-muted hover:bg-surface/60 hover:text-fg"
                }`}
              >
                <span
                  className={`grid size-7 shrink-0 place-items-center rounded-lg text-xs font-bold transition-all sm:size-8 ${
                    view === "content"
                      ? "bg-accent text-on-accent shadow-xs"
                      : currentStepNumber > 1
                      ? "bg-emerald-600/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                      : "bg-surface-strong text-muted"
                  }`}
                >
                  {currentStepNumber > 1 ? (
                    <Check className="size-4" aria-hidden="true" />
                  ) : (
                    <FileText className="size-4" aria-hidden="true" />
                  )}
                </span>
                <div className="min-w-0">
                  <span className="block truncate text-xs font-bold sm:text-sm">
                    1. Import & Content
                  </span>
                  <span className="hidden truncate text-[11px] text-muted lg:block">
                    Personal bio & experience
                  </span>
                </div>
              </button>

              {/* Step 2 Tab */}
              <button
                type="button"
                aria-pressed={view === "design"}
                onClick={() => void openDesignStep()}
                disabled={busy || photoUploading}
                className={`group flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-all sm:px-3 sm:py-2.5 ${
                  view === "design"
                    ? "bg-surface text-fg shadow-xs ring-1 ring-accent/30"
                    : "text-muted hover:bg-surface/60 hover:text-fg"
                }`}
              >
                <span
                  className={`grid size-7 shrink-0 place-items-center rounded-lg text-xs font-bold transition-all sm:size-8 ${
                    view === "design"
                      ? "bg-accent text-on-accent shadow-xs"
                      : currentStepNumber > 2
                      ? "bg-emerald-600/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                      : "bg-surface-strong text-muted"
                  }`}
                >
                  {currentStepNumber > 2 ? (
                    <Check className="size-4" aria-hidden="true" />
                  ) : (
                    <Palette className="size-4" aria-hidden="true" />
                  )}
                </span>
                <div className="min-w-0">
                  <span className="block truncate text-xs font-bold sm:text-sm">
                    2. Choose Design
                  </span>
                  <span className="hidden truncate text-[11px] text-muted lg:block">
                    {selectedTemplate.name} · Style
                  </span>
                </div>
              </button>

              {/* Step 3 Tab */}
              <button
                type="button"
                aria-pressed={view === "training"}
                onClick={() => void finish()}
                disabled={busy || photoUploading || saveState === "saving"}
                className={`group flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-all sm:px-3 sm:py-2.5 ${
                  view === "training"
                    ? "bg-accent text-on-accent shadow-xs"
                    : "bg-surface-strong/40 text-muted hover:bg-surface hover:text-fg"
                }`}
              >
                <span
                  className={`grid size-7 shrink-0 place-items-center rounded-lg text-xs font-bold transition-all sm:size-8 ${
                    view === "training"
                      ? "bg-on-accent text-accent shadow-xs"
                      : "bg-surface-strong text-muted"
                  }`}
                >
                  {busy ? (
                    <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Sparkles className="size-4" aria-hidden="true" />
                  )}
                </span>
                <div className="min-w-0">
                  <span className="block truncate text-xs font-bold sm:text-sm">
                    3. Train & Publish
                  </span>
                  <span className="hidden truncate text-[11px] opacity-80 lg:block">
                    AI persona & live URL
                  </span>
                </div>
              </button>
            </div>

            {/* Glowing Linear Progress Bar Track */}
            <div className="mt-2.5 px-0.5">
              <div className="flex items-center justify-between pb-1 text-[11px] font-semibold text-muted">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block size-2 rounded-full bg-accent" />
                  <span>
                    Step {currentStepNumber} of 3:{" "}
                    <strong className="text-fg">
                      {view === "content"
                        ? "Import & Edit CV Details"
                        : view === "design"
                        ? "Choose Template & Accent"
                        : "Train Persona & Publish Live"}
                    </strong>
                  </span>
                </span>
                <span className="font-mono text-xs font-bold text-accent">
                  {overallProgressPercent}% Complete
                </span>
              </div>
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-surface-strong/60 shadow-inner">
                <div
                  role="progressbar"
                  aria-valuenow={overallProgressPercent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  className="h-full rounded-full bg-gradient-to-r from-accent via-amber-500 to-emerald-500 transition-all duration-500 ease-out shadow-[0_0_12px_rgba(181,64,15,0.4)]"
                  style={{ width: `${overallProgressPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      {view === "content" ? (
        <div key={view} className="studio-step-panel mx-auto max-w-7xl px-4 sm:px-8">
          {/* Step 1 Quick Action Banner */}
          <div className="mb-6 flex flex-col items-start justify-between gap-4 rounded-2xl border border-line bg-card/70 p-4 backdrop-blur-xs sm:flex-row sm:items-center sm:p-5">
            <div className="flex items-center gap-3">
              <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
                <FileText className="size-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-base font-bold text-fg sm:text-lg">Step 1: Your CV Details</h2>
                <p className="mt-0.5 text-xs text-muted sm:text-sm">
                  Upload an existing PDF/DOCX or fill in your details below. Everything autosaves to your private draft.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void openDesignStep()}
              disabled={busy || photoUploading}
              className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2 text-xs font-bold text-on-accent shadow-sm transition hover:brightness-95 active:scale-98 sm:w-auto sm:text-sm"
            >
              <span>Next: Choose Design</span>
              <ArrowRight className="size-4" aria-hidden="true" />
            </button>
          </div>

          <CvImportPipeline
            slug={slug}
            currentCv={cvData}
            onApplyCv={handleApplyPipelineCv}
            disabled={busy || photoUploading}
            cvPassActive={cvPassActive}
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

          {/* Step 1 Bottom Continuation Toolbar */}
          <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-2xl border border-line bg-card p-5 shadow-sm sm:flex-row">
            <div className="flex items-center gap-2.5 text-xs text-muted sm:text-sm">
              {saveState === "saving" ? (
                <>
                  <LoaderCircle className="size-4 animate-spin text-accent" />
                  <span>Saving changes to your draft…</span>
                </>
              ) : saveState === "dirty" ? (
                <>
                  <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
                  <span>Unsaved edits will automatically save</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  <span>All CV details are safely saved to your draft</span>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => void openDesignStep()}
              disabled={busy || photoUploading}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent px-6 text-sm font-bold text-on-accent shadow-md transition hover:brightness-95 active:scale-98 sm:w-auto"
            >
              <span>Continue to Step 2: Choose Design</span>
              <ArrowRight className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : view === "design" ? (
        <div key={view} className="studio-step-panel">
          {/* Step 2 Guidance Banner */}
          <div className="mx-auto max-w-7xl px-4 pt-2 sm:px-8">
            <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-line bg-card/70 p-4 backdrop-blur-xs sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
                  <Palette className="size-5" aria-hidden="true" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-bold text-fg sm:text-lg">Step 2: Choose Design & Accent</h2>
                    <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-semibold text-fg">
                      {selectedTemplate.name}
                    </span>
                    <span
                      className="size-3.5 rounded-full border border-line shadow-xs"
                      style={{ backgroundColor: design.accentColor }}
                      title={`Accent: ${design.accentColor}`}
                    />
                  </div>
                  <p className="mt-0.5 text-xs text-muted">
                    Click any layout card to switch styles. The live document sheet updates in real time.
                  </p>
                </div>
              </div>
              <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
                <button
                  type="button"
                  onClick={() => void openDetailsStep()}
                  disabled={busy || photoUploading}
                  className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-line bg-card px-3 text-xs font-semibold text-muted transition hover:bg-surface hover:text-fg sm:text-sm"
                >
                  <ArrowLeft className="size-3.5" aria-hidden="true" />
                  <span>Back to details</span>
                </button>
                <button
                  type="button"
                  onClick={() => void finish()}
                  disabled={busy || photoUploading || saveState === "saving"}
                  className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-accent px-4 text-xs font-bold text-on-accent shadow-sm transition hover:brightness-95 active:scale-98 sm:text-sm"
                >
                  {busy ? <LoaderCircle className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                  <span>Train & Publish</span>
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>

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

          {/* Sticky Bottom Action Bar for Step 2 */}
          <div className="sticky bottom-4 z-30 mx-auto max-w-4xl px-4 no-print">
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-line/90 bg-card/95 px-4 py-3 shadow-2xl backdrop-blur-md">
              <button
                type="button"
                onClick={() => void openDetailsStep()}
                disabled={busy || photoUploading}
                className="inline-flex items-center gap-1.5 rounded-xl border border-line px-3 py-2 text-xs font-semibold text-muted transition hover:bg-surface hover:text-fg sm:text-sm"
              >
                <ArrowLeft className="size-3.5" aria-hidden="true" />
                <span>Edit details</span>
              </button>
              <div className="hidden items-center gap-2 text-xs text-muted sm:flex">
                <span>Selected: <strong className="text-fg">{selectedTemplate.name}</strong></span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  Accent: <span className="size-3 rounded-full border border-line" style={{ backgroundColor: design.accentColor }} />
                </span>
              </div>
              <button
                type="button"
                onClick={() => void finish()}
                disabled={busy || photoUploading || saveState === "saving"}
                className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2 text-xs font-bold text-on-accent shadow-md transition hover:brightness-95 active:scale-98 sm:text-sm"
              >
                {busy ? <LoaderCircle className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                <span>Continue to Step 3: Train AI</span>
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <section key={view} className="studio-step-panel mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-8" aria-live="polite">
          <div className="mx-auto max-w-2xl space-y-6 rounded-3xl border border-line bg-card p-6 shadow-xl sm:p-8">
            <div className="flex items-start gap-4">
              <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent/10 text-accent">
                {busy ? (
                  <LoaderCircle className="size-6 animate-spin" />
                ) : (
                  <Sparkles className="size-6" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-bold tracking-tight text-fg">
                  {busy
                    ? "Publishing & Training AI Assistant"
                    : trainingPhase === "saving"
                    ? "Saving your CV Design"
                    : "Ready to Publish"}
                </h2>
                <p className="mt-1 text-sm text-muted">
                  {trainingError ||
                    (busy
                      ? `Compiling ${cvData.identity?.name || "your CV"} into an interactive AI persona and building semantic search embeddings.`
                      : "Your details and design will be compiled before training begins.")}
                </p>
              </div>
            </div>

            {/* Step-by-Step Training Progress Bar */}
            <div className="rounded-2xl border border-line bg-surface/40 p-4">
              <div className="flex items-center justify-between text-xs font-semibold text-muted mb-2">
                <span>
                  {completedTrainingCount === trainingSteps.length
                    ? "All 7 training jobs completed!"
                    : `Training Step ${Math.min(completedTrainingCount + 1, trainingSteps.length)} of ${trainingSteps.length}`}
                </span>
                <span className="font-mono text-xs font-bold text-accent">
                  {trainingStepPercent}%
                </span>
              </div>
              <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-surface-strong/70">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-accent to-emerald-500 transition-all duration-300 ease-out shadow-[0_0_8px_rgba(35,134,54,0.4)]"
                  style={{ width: `${trainingStepPercent}%` }}
                />
              </div>
            </div>

            {/* Checklist of Steps */}
            <ol className="space-y-2.5" aria-label="AI training steps checklist">
              {trainingSteps.map((step, idx) => (
                <li
                  key={step.id}
                  className={`flex items-start gap-3 rounded-xl border px-3.5 py-3 text-sm transition-all ${
                    step.state === "running"
                      ? "border-accent/50 bg-accent/5 shadow-2xs"
                      : step.state === "done"
                      ? "border-line bg-card/60"
                      : "border-line/60 bg-surface/30 opacity-75"
                  }`}
                >
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center" aria-label={step.state}>
                    {step.state === "done" ? (
                      <Check className="size-4 text-emerald-600 dark:text-emerald-400" />
                    ) : step.state === "running" ? (
                      <LoaderCircle className="size-4 animate-spin text-accent" />
                    ) : step.state === "failed" ? (
                      <X className="size-4 text-red-600" />
                    ) : step.state === "skipped" ? (
                      <MinusCircle className="size-4 text-muted" />
                    ) : (
                      <span className="text-xs font-bold text-muted">{idx + 1}</span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`font-semibold ${step.state === "pending" ? "text-muted" : "text-fg"}`}>
                      {step.label}
                    </span>
                    {step.detail && (
                      <span
                        className={`mt-0.5 block text-xs ${
                          step.state === "failed" ? "text-red-600" : "text-muted"
                        }`}
                      >
                        {step.detail}
                      </span>
                    )}
                  </span>
                  {step.ms !== undefined && (
                    <span className="shrink-0 text-xs tabular-nums text-muted font-mono">
                      {step.ms < 1000 ? `${step.ms} ms` : `${(step.ms / 1000).toFixed(1)} s`}
                    </span>
                  )}
                </li>
              ))}
            </ol>

            {trainingError && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-400">
                <p className="font-semibold">Publishing stopped</p>
                <p className="mt-1 text-xs opacity-90">{trainingError}</p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setView("content")}
                    className="rounded-lg border border-red-500/30 bg-card px-3 py-1.5 text-xs font-semibold text-fg hover:bg-surface"
                  >
                    Return to details
                  </button>
                  <button
                    type="button"
                    onClick={() => setView("design")}
                    className="rounded-lg border border-red-500/30 bg-card px-3 py-1.5 text-xs font-semibold text-fg hover:bg-surface"
                  >
                    Return to design
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
