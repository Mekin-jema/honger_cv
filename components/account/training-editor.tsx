"use client";

import { useState } from "react";
import { ArrowLeft, Download, LoaderCircle, RotateCcw, Save, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PersonaDocShape, type PersonaDoc } from "@/lib/persona/schema";
import { withBase } from "@/lib/utils";

const lines = (value: string) => value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).slice(0, 100);
const text = (value: string | { en: string; bn?: string } | undefined) =>
  typeof value === "string" ? value : value?.en ?? "";

function sectionLines(doc: PersonaDoc, key: string) {
  const section = doc.sections.find((item) => item.key === key);
  return (section?.items ?? [])
    .map((item) => item.tags?.join(", ") || text(item.text) || text(item.label))
    .filter(Boolean)
    .join("\n");
}

function applyTrainingFields(
  initial: PersonaDoc,
  fields: { name: string; headline: string; summary: string; skills: string; experience: string; education: string; projects: string },
): PersonaDoc {
  const doc = structuredClone(initial);
  const name = fields.name.trim();
  const headline = fields.headline.trim();
  const summary = fields.summary.trim();
  doc.identity.name = name;
  doc.identity.shortName = name.split(/\s+/)[0] || name;
  doc.identity.initials = name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  doc.identity.role = headline;
  doc.identity.headline = headline;
  doc.identity.summary = summary;
  doc.hero.staticIntro = `Hi, I'm ${name}, ${headline}. ${summary}`;
  doc.site.indexable = false;
  doc.rules.extra = "Answer only from the facts and content in this profile. Do not invent qualifications, dates, employers, achievements, or other personal details. If information is missing, say it is not included yet.";

  const definitions = [
    { key: "about", title: "About me", value: summary, display: "paragraphs" as const },
    { key: "skills", title: "Skills", value: fields.skills, display: "list" as const },
    { key: "experience", title: "Experience", value: fields.experience, display: "list" as const },
    { key: "education", title: "Education", value: fields.education, display: "list" as const },
    { key: "projects", title: "Projects", value: fields.projects, display: "list" as const },
  ];

  for (const sectionDefinition of definitions) {
    const existing = doc.sections.find((section) => section.key === sectionDefinition.key);
    const entries = lines(sectionDefinition.value).map((value, index) => ({
      id: `${sectionDefinition.key}-${index + 1}`,
      text: value,
    }));
    if (sectionDefinition.key === "about" && !entries.length) {
      entries.push({ id: "intro", text: "" });
    }
    const nextSection = {
      key: sectionDefinition.key,
      title: sectionDefinition.title,
      display: sectionDefinition.display,
      visibility: "public" as const,
      inChat: true,
      inDocument: true,
      inSite: false,
      items: entries,
    };
    if (existing) Object.assign(existing, nextSection);
    else doc.sections.push(nextSection);
  }

  const questions = [
    { id: "about", label: "About me", prompt: "Tell me about yourself.", keywords: ["about", "profile", "background"], key: "about", answer: summary },
    { id: "skills", label: "Skills", prompt: "What skills do you have?", keywords: ["skills", "technology", "tools"], key: "skills", answer: "Here are the skills listed in my profile." },
    { id: "experience", label: "Experience", prompt: "What is your work experience?", keywords: ["experience", "work", "career"], key: "experience", answer: "Here is the experience listed in my profile." },
    { id: "education", label: "Education", prompt: "What is your education?", keywords: ["education", "degree", "study"], key: "education", answer: "Here is the education listed in my profile." },
    { id: "projects", label: "Projects", prompt: "What projects have you worked on?", keywords: ["projects", "portfolio", "built"], key: "projects", answer: "Here are the projects listed in my profile." },
  ];
  const questionIds = new Set(questions.map((question) => question.id));
  doc.questions = doc.questions.filter((question) => !questionIds.has(question.id));
  doc.questions.push(
    ...questions.map((question, index) => ({
      id: question.id,
      label: question.label,
      prompt: question.prompt,
      icon: "sparkles" as const,
      keywords: question.keywords,
      primary: index === 0,
      random: false,
      visibility: "public" as const,
      answers: [question.answer || "I haven't added this information yet."],
      blocks: [{ kind: "section" as const, key: question.key }],
      followUps: [],
    })),
  );
  doc.landing = ["about", "experience", "projects"];
  doc.sidebar = [{ title: "Explore my profile", questionIds: questions.map((question) => question.id), icons: true }];
  doc.document.sections = ["about", "experience", "education", "projects", "skills"];
  return doc;
}

type Props = { slug: string; initialDoc: PersonaDoc; initialRev: number; initiallyPublished: boolean; initialTab?: "editor" | "json" };

export function TrainingEditor({ slug, initialDoc, initialRev, initiallyPublished, initialTab = "editor" }: Props) {
  const router = useRouter();
  const [baseDoc, setBaseDoc] = useState(initialDoc);
  const [jsonOverride, setJsonOverride] = useState<PersonaDoc>();
  const [tab, setTab] = useState<"editor" | "json">(initialTab);
  const [jsonText, setJsonText] = useState(JSON.stringify(initialDoc, null, 2));
  const [jsonError, setJsonError] = useState<string>();
  const [rev, setRev] = useState(initialRev);
  const [name, setName] = useState(initialDoc.identity.name);
  const [headline, setHeadline] = useState(text(initialDoc.identity.role ?? initialDoc.identity.headline));
  const [summary, setSummary] = useState(text(initialDoc.identity.summary));
  const [skills, setSkills] = useState(sectionLines(initialDoc, "skills"));
  const [experience, setExperience] = useState(sectionLines(initialDoc, "experience"));
  const [education, setEducation] = useState(sectionLines(initialDoc, "education"));
  const [projects, setProjects] = useState(sectionLines(initialDoc, "projects"));
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(initiallyPublished);
  const [status, setStatus] = useState<string>();
  const [error, setError] = useState<string>();

  const buildDocument = () => jsonOverride ?? applyTrainingFields(baseDoc, { name, headline, summary, skills, experience, education, projects });
  const openTab = (next: "editor" | "json") => {
    setTab(next);
    if (next === "json") {
      setJsonText(JSON.stringify(buildDocument(), null, 2));
      setJsonError(undefined);
    }
    const url = new URL(window.location.href);
    if (next === "json") url.searchParams.set("tab", next);
    else url.searchParams.delete("tab");
    window.history.replaceState(null, "", url);
  };
  const applyJson = () => {
    let value: unknown;
    try {
      value = JSON.parse(jsonText);
    } catch (cause) {
      setJsonError(`Not valid JSON: ${cause instanceof Error ? cause.message : String(cause)}`);
      return;
    }
    const parsed = PersonaDocShape.safeParse(value);
    if (!parsed.success) {
      setJsonError(parsed.error.issues.slice(0, 5).map((issue) => `${issue.path.join(".") || "profile"}: ${issue.message}`).join("; "));
      return;
    }
    const next = parsed.data;
    setBaseDoc(next);
    setJsonOverride(next);
    setName(next.identity.name);
    setHeadline(text(next.identity.role ?? next.identity.headline));
    setSummary(text(next.identity.summary));
    setSkills(sectionLines(next, "skills"));
    setExperience(sectionLines(next, "experience"));
    setEducation(sectionLines(next, "education"));
    setProjects(sectionLines(next, "projects"));
    setJsonText(JSON.stringify(next, null, 2));
    setJsonError(undefined);
    setStatus("JSON applied. Save your draft to keep the changes.");
  };
  const editField = <T,>(setter: (value: T) => void, value: T) => {
    setJsonOverride(undefined);
    setter(value);
  };
  const save = async () => {
    setBusy(true);
    setError(undefined);
    setStatus(undefined);
    try {
      const response = await fetch(withBase(`/api/account/personas/${slug}/`), {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ doc: buildDocument(), rev }),
      });
      const result = (await response.json()) as { rev?: number; error?: string };
      if (!response.ok || typeof result.rev !== "number") {
        setError(result.error || "Couldn't save your profile.");
        return false;
      }
      setRev(result.rev);
      setStatus("Saved privately. Your profile is not published.");
      return true;
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const test = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (testing || !question.trim()) return;
    setTesting(true);
    setError(undefined);
    setAnswer("");
    try {
      const saved = await save();
      if (!saved) return;
      const response = await fetch(withBase(`/api/account/personas/${slug}/test/`), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const result = (await response.json()) as { text?: string; result?: { route: string }; error?: string };
      if (!response.ok || typeof result.text !== "string") {
        setError(result.error || "The profile assistant couldn't answer this test question.");
        return;
      }
      setAnswer(result.text);
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setTesting(false);
    }
  };

  const publish = async () => {
    if (publishing || busy || testing) return;
    const saved = await save();
    if (!saved) return;
    setPublishing(true);
    setError(undefined);
    setStatus("Checking your profile before publishing…");
    try {
      const response = await fetch(withBase(`/api/account/personas/${slug}/publish/`), { method: "POST" });
      const result = (await response.json()) as { jobId?: string; unchanged?: boolean; error?: string };
      if (!response.ok) {
        setError(result.error || "Your profile could not be published.");
        return;
      }
      if (result.unchanged) {
        setPublished(true);
        setStatus("Your latest changes are already published.");
        router.refresh();
        return;
      }
      if (!result.jobId) {
        setError("The publish service returned no job identifier.");
        return;
      }
      for (let attempt = 0; attempt < 200; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        const jobResponse = await fetch(withBase(`/api/account/jobs/${result.jobId}/`), { cache: "no-store" });
        const jobResult = (await jobResponse.json()) as {
          job?: { status: "queued" | "running" | "succeeded" | "failed"; error?: string | null };
          error?: string;
        };
        if (!jobResponse.ok || !jobResult.job) {
          setError(jobResult.error || "Couldn't check the publishing status.");
          return;
        }
        if (jobResult.job.status === "succeeded") {
          setPublished(true);
          setStatus("Your profile is live.");
          router.refresh();
          return;
        }
        if (jobResult.job.status === "failed") {
          setError(jobResult.job.error || "The profile did not pass its publishing checks.");
          return;
        }
        setStatus("Running publishing checks and preparing your public profile…");
      }
      setStatus("Publishing is still in progress. You can safely return to your workspace and check again later.");
    } catch {
      setError("Couldn't reach the publishing service. Check your connection and try again.");
    } finally {
      setPublishing(false);
    }
  };

  const inputClass = "w-full rounded-xl border border-line-strong bg-bg px-4 py-3 text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent/20";
  const textAreaClass = `${inputClass} min-h-28 resize-y leading-6`;

  return (
    <div className="mx-auto min-h-dvh max-w-5xl bg-bg px-5 py-8 text-fg sm:py-12">
      <Link href="/account/" className="inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden="true" /> Workspace
      </Link>
      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-accent"><Sparkles className="size-4" aria-hidden="true" /> Persona Studio</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Build and train your profile</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Add facts the assistant can use, edit the full profile as JSON, and test answers before publishing.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/account/training/${slug}/design/`} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line-strong bg-card px-4 font-semibold hover:border-accent/50">
            <Sparkles className="size-4" aria-hidden="true" /> Choose CV design
          </Link>
          <button type="button" onClick={() => void save()} disabled={busy || testing || publishing} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line-strong bg-card px-4 font-semibold disabled:opacity-60">
            {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />} Save private draft
          </button>
          <button type="button" onClick={() => void publish()} disabled={busy || testing || publishing} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-4 font-semibold text-on-accent disabled:opacity-60">
            {publishing ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Publish profile
          </button>
        </div>
      </div>

      <div className="mt-7 flex gap-1 overflow-x-auto rounded-xl border border-line bg-card p-1" role="tablist" aria-label="Profile editor">
        {([
          ["editor", "Profile & AI"],
          ["json", "JSON"],
        ] as const).map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => openTab(id)}
            className={`min-h-10 rounded-lg px-4 text-sm font-semibold whitespace-nowrap ${tab === id ? "bg-surface text-fg" : "text-muted hover:text-fg"}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "json" ? (
        <section className="mt-5 space-y-4 rounded-2xl border border-line bg-card p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold">Your profile as JSON</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">Edit the complete profile, including nested details. Applying validates the document; save the draft to persist it. JSON changes stay private until you publish.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => {
                const blob = new Blob([JSON.stringify(buildDocument(), null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                  const link = window.document.createElement("a");
                link.href = url;
                link.download = `${slug}-profile.json`;
                link.click();
                URL.revokeObjectURL(url);
              }} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-line-strong px-3 text-sm font-semibold">
                <Download className="size-4" /> Download
              </button>
              <button type="button" onClick={() => {
                setJsonText(JSON.stringify(buildDocument(), null, 2));
                setJsonError(undefined);
              }} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-line-strong px-3 text-sm font-semibold">
                <RotateCcw className="size-4" /> Reset
              </button>
              <button type="button" onClick={applyJson} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-on-accent">
                Apply JSON
              </button>
            </div>
          </div>
          {jsonError && <p role="alert" className="rounded-xl bg-accent-soft p-3 text-sm font-medium text-accent">{jsonError}</p>}
          <label htmlFor="profile-json" className="sr-only">Profile JSON</label>
          <textarea id="profile-json" value={jsonText} onChange={(event) => {
            setJsonText(event.target.value);
            setJsonOverride(undefined);
            setJsonError(undefined);
          }} spellCheck={false} rows={30} className={`${textAreaClass} min-h-[32rem] resize-y font-mono text-xs leading-relaxed`} />
        </section>
      ) : (
      <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_0.75fr]">
        <div className="space-y-5">
          <section className="rounded-2xl border border-line bg-card p-5 sm:p-6">
            <h2 className="font-semibold">Profile basics</h2>
            <div className="mt-4 space-y-4">
              <label className="block space-y-2 text-sm font-medium">Full name<input className={inputClass} maxLength={120} value={name} onChange={(event) => editField(setName, event.target.value)} /></label>
              <label className="block space-y-2 text-sm font-medium">Professional headline<input className={inputClass} maxLength={160} value={headline} onChange={(event) => editField(setHeadline, event.target.value)} /></label>
              <label className="block space-y-2 text-sm font-medium">Short professional summary<textarea className={textAreaClass} maxLength={6000} value={summary} onChange={(event) => editField(setSummary, event.target.value)} /></label>
            </div>
          </section>
          {([
            ["Skills", skills, setSkills, "One skill or technology per line."],
            ["Experience", experience, setExperience, "Role, organization, dates, and achievements; one entry per line."],
            ["Education", education, setEducation, "Degree, institution, dates, or certifications; one entry per line."],
            ["Projects", projects, setProjects, "Project name and what you built; one project per line."],
          ] as const).map(([title, value, setter, hint]) => (
            <section key={title} className="rounded-2xl border border-line bg-card p-5 sm:p-6">
              <label className="block space-y-2 text-sm font-semibold">
                {title}
                <textarea className={textAreaClass} value={value} onChange={(event) => editField(setter, event.target.value)} aria-describedby={`hint-${title}`} />
              </label>
              <p id={`hint-${title}`} className="mt-2 text-xs leading-5 text-muted">{hint}</p>
            </section>
          ))}
        </div>

        <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
          <section className="rounded-2xl border border-line bg-card p-5 sm:p-6">
            <h2 className="font-semibold">Test your assistant</h2>
            <p className="mt-2 text-sm leading-6 text-muted">Test questions use only this profile&apos;s saved draft. Missing information should be reported as missing, not invented.</p>
            <form onSubmit={test} className="mt-4 space-y-3">
              <label className="block space-y-2 text-sm font-medium">
                Test question
                <textarea required minLength={2} maxLength={300} className={`${inputClass} min-h-24`} value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="What projects have you worked on?" />
              </label>
              <button type="submit" disabled={testing || busy || question.trim().length < 2} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-line-strong px-4 text-sm font-semibold disabled:opacity-60">
                {testing ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Save and test
              </button>
            </form>
            {answer && <p className="mt-4 rounded-xl bg-bg-soft p-4 text-sm leading-6" role="status">{answer}</p>}
          </section>
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm leading-6 text-muted">
            <strong className="text-fg">{published ? "Public profile." : "Private draft."}</strong>{" "}
            {published ? "Anyone with your profile link can view its public information." : "Only you can edit this profile; it stays private until you publish it."}
          </div>
          {published && (
            <Link href={`/u/${slug}/`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-accent hover:underline">
              Open public profile
            </Link>
          )}
          {status && <p role="status" className="text-sm font-medium text-emerald-700 dark:text-emerald-300">{status}</p>}
          {error && <p role="alert" className="rounded-xl bg-accent-soft p-4 text-sm font-medium text-accent">{error}</p>}
        </aside>
      </div>
      )}
    </div>
  );
}
