"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bot,
  Briefcase,
  Check,
  CheckCheck,
  CheckCircle2,
  Code2,
  Copy,
  Database,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileCode,
  FileText,
  Lightbulb,
  LoaderCircle,
  MessageSquare,
  Plus,
  RefreshCw,
  Rocket,
  Search,
  Send,
  Sparkles,
  Target,
  Trash2,
  UploadCloud,
  Users,
  Zap,
} from "lucide-react";
import type { PersonaDoc } from "@/lib/persona/schema";
import { cn, withBase } from "@/lib/utils";

type TonePreset = "professional" | "technical" | "conversational" | "direct";

interface ToneOption {
  id: TonePreset;
  label: string;
  badge: string;
  description: string;
  icon: typeof Briefcase;
  voicePrompt: string;
  extraPrompt: string;
}

const TONE_OPTIONS: ToneOption[] = [
  {
    id: "professional",
    label: "Professional & Confident",
    badge: "Recommended",
    description: "Polished, executive, and articulate. Highlight achievements with quantifiable impact.",
    icon: Briefcase,
    voicePrompt:
      "Professional, articulate, and confident. Answers in the first person with authoritative, polished clarity.",
    extraPrompt:
      "Answer only from the verified facts in this profile. Maintain a confident, professional executive presence. Be articulate, highlighting achievements with quantifiable impact when available.",
  },
  {
    id: "technical",
    label: "Technical & In-Depth",
    badge: "Engineering",
    description: "Deep dive into system architecture, tech stacks, engineering decisions, and metrics.",
    icon: Code2,
    voicePrompt:
      "Technical, thorough, and precise. Answers in the first person focusing on architecture, system design, and engineering methodologies.",
    extraPrompt:
      "Answer only from the verified facts in this profile. Emphasize technical depth, tools, algorithms, architectural decisions, and concrete engineering problem-solving.",
  },
  {
    id: "conversational",
    label: "Friendly & Collaborative",
    badge: "Team Player",
    description: "Warm, authentic, and collaborative. Emphasizes empathy, teamwork, and positive energy.",
    icon: Users,
    voicePrompt:
      "Warm, collaborative, and friendly. Speaks in the first person with natural enthusiasm and approachable authenticity.",
    extraPrompt:
      "Answer only from the verified facts in this profile. Keep responses engaging and conversational, highlighting teamwork, adaptability, and positive communication.",
  },
  {
    id: "direct",
    label: "Direct & Results-Focused",
    badge: "Concise",
    description: "Crisp, concise, and outcome-oriented. High-impact bullet points with zero fluff.",
    icon: Target,
    voicePrompt:
      "Direct, concise, and results-oriented. Answers in the first person with punchy, high-impact bullet points and minimal fluff.",
    extraPrompt:
      "Answer only from the verified facts in this profile. Keep answers crisp and to the point. Focus immediately on bottom-line results, metrics, and core capabilities.",
  },
];

interface CustomQaItem {
  id: string;
  prompt: string;
  answer: string;
}

interface DocumentSummary {
  id: string;
  name: string;
  chunkCount: number;
  wordCount: number;
  preview: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  time: string;
  suggestedTopics?: string[];
  isError?: boolean;
}

export interface InterviewQuestionDef {
  id: string;
  category: "logistics" | "career" | "technical" | "culture";
  categoryLabel: string;
  label: string;
  prompt: string;
  sampleAnswer: string;
  keywords: string[];
  placeholder: string;
}

export const COMMON_INTERVIEW_QUESTIONS: InterviewQuestionDef[] = [
  // 1. Logistics & Practicalities
  {
    id: "recruiter-availability",
    category: "logistics",
    categoryLabel: "Logistics",
    label: "Notice period & availability",
    prompt: "What is your notice period or availability?",
    sampleAnswer:
      "I am available on a 2-week notice period for full-time roles, and can start immediately for contract, freelance, or consulting advisory roles.",
    keywords: ["notice", "availability", "available", "when", "start"],
    placeholder: "e.g. Available immediately, or 2 weeks notice for full-time roles.",
  },
  {
    id: "recruiter-work-setup",
    category: "logistics",
    categoryLabel: "Logistics",
    label: "Work arrangement preferences",
    prompt: "What is your preferred work arrangement (Remote, Hybrid, Location)?",
    sampleAnswer:
      "I prefer a remote-first or flexible hybrid setup. I have extensive experience collaborating asynchronously across time zones and am open to occasional travel for team onsite sprints.",
    keywords: ["remote", "hybrid", "onsite", "location", "relocation", "arrangement"],
    placeholder: "e.g. Open to remote worldwide, or hybrid/onsite in London and Berlin.",
  },
  {
    id: "recruiter-salary",
    category: "logistics",
    categoryLabel: "Logistics",
    label: "Compensation & salary expectations",
    prompt: "What are your salary or compensation expectations?",
    sampleAnswer:
      "I am targeting a competitive total compensation package aligned with senior market benchmarks for this role, with flexibility depending on company stage, equity, and benefits.",
    keywords: ["salary", "compensation", "rate", "expected", "package", "range"],
    placeholder: "e.g. Targeting $140k - $160k base with equity and bonus flexibility.",
  },
  {
    id: "recruiter-sponsorship",
    category: "logistics",
    categoryLabel: "Logistics",
    label: "Work authorization & visa",
    prompt: "Do you require visa sponsorship or work authorization?",
    sampleAnswer:
      "I am fully authorized to work in my primary region without requiring sponsorship, and I am also set up for international B2B contracting via Employer of Record (EOR) services.",
    keywords: ["visa", "sponsorship", "authorization", "eligible", "citizen", "permit"],
    placeholder: "e.g. Fully authorized to work locally; open to international contracts.",
  },

  // 2. Career & Motivation
  {
    id: "recruiter-intro",
    category: "career",
    categoryLabel: "Career & Goals",
    label: "Professional journey & background",
    prompt: "Tell me about yourself and your professional journey.",
    sampleAnswer:
      "I am a software engineer with extensive experience developing scalable web applications and cloud architectures. My focus is delivering resilient user experiences with modern stacks like React, Next.js, and PostgreSQL.",
    keywords: ["about", "journey", "background", "story", "yourself", "career"],
    placeholder: "e.g. 5+ years of experience leading full-stack engineering and cloud architecture...",
  },
  {
    id: "recruiter-motivation",
    category: "career",
    categoryLabel: "Career & Goals",
    label: "Why are you looking for a new role?",
    prompt: "Why are you looking for a new opportunity?",
    sampleAnswer:
      "I am seeking a role where I can take on greater technical ownership, solve challenging distributed systems problems, and contribute to high-impact products with a collaborative team.",
    keywords: ["why", "looking", "next", "motivation", "opportunity", "leave"],
    placeholder: "e.g. Seeking high-impact engineering challenges and team leadership opportunities.",
  },
  {
    id: "recruiter-strengths",
    category: "career",
    categoryLabel: "Career & Goals",
    label: "Key career achievements",
    prompt: "What are your greatest career achievements?",
    sampleAnswer:
      "My proudest achievement was leading the re-architecture of our core data pipeline, which cut server latency by 45% and handled a 3x traffic surge with zero downtime during peak product launches.",
    keywords: ["achievement", "accomplishment", "proud", "impact", "milestone"],
    placeholder: "e.g. Scaled platform to 2M active users and reduced API latency by 45%.",
  },
  {
    id: "recruiter-strengths-weakness",
    category: "career",
    categoryLabel: "Career & Goals",
    label: "Key strengths and areas for growth",
    prompt: "What is your greatest strength and an area you are developing?",
    sampleAnswer:
      "My key strength is pragmatic execution—translating ambiguous product requirements into clean, testable code. An area I am actively developing is deepening my knowledge of Kubernetes orchestration and edge computing.",
    keywords: ["strength", "weakness", "growth", "improve", "superpower"],
    placeholder: "e.g. Strength: pragmatic execution and architecture. Growth: distributed tracing and edge systems.",
  },

  // 3. Technical & Engineering
  {
    id: "recruiter-tech-stack",
    category: "technical",
    categoryLabel: "Technical",
    label: "Primary tech stack & tools",
    prompt: "What is your core tech stack and toolkit?",
    sampleAnswer:
      "My core stack includes TypeScript, React, Next.js, Node.js, Python, PostgreSQL, and Docker. I deploy cloud infrastructure using AWS and GCP with automated CI/CD pipelines and pgvector search.",
    keywords: ["stack", "technology", "tools", "language", "framework", "database"],
    placeholder: "e.g. TypeScript, Next.js, React, Node.js, PostgreSQL, Docker, AWS.",
  },
  {
    id: "recruiter-challenging-project",
    category: "technical",
    categoryLabel: "Technical",
    label: "Most challenging technical project",
    prompt: "What was your most challenging technical project?",
    sampleAnswer:
      "I designed a distributed semantic caching layer utilizing PostgreSQL pgvector for similarity search, cutting LLM inference costs by 60% while maintaining sub-150ms query latency.",
    keywords: ["challenging", "difficult", "complex", "architecture", "scale", "project"],
    placeholder: "e.g. Built high-throughput caching layer with pgvector similarity search...",
  },
  {
    id: "recruiter-production-incident",
    category: "technical",
    categoryLabel: "Technical",
    label: "Handling production incidents & outages",
    prompt: "How do you handle production incidents or critical bugs?",
    sampleAnswer:
      "I follow a blameless, structured response: contain customer impact immediately, roll back or hotfix, establish monitoring alerts, and publish a post-mortem to prevent recurrence.",
    keywords: ["incident", "outage", "bug", "production", "downtime", "crisis", "postmortem"],
    placeholder: "e.g. Fast customer triage, immediate mitigation/rollback, followed by blameless post-mortem.",
  },

  // 4. Teamwork & Culture
  {
    id: "recruiter-conflict",
    category: "culture",
    categoryLabel: "Culture & Team",
    label: "Handling technical conflict & disagreement",
    prompt: "How do you handle disagreements or conflicting technical opinions?",
    sampleAnswer:
      "I bring discussions back to user data, measurable benchmarks, and system requirements. I listen actively to understand trade-offs, and once a consensus is reached, I commit fully.",
    keywords: ["conflict", "disagreement", "opinion", "debate", "teamwork", "consensus"],
    placeholder: "e.g. Anchor on objective data and user impact; listen actively and disagree and commit.",
  },
  {
    id: "recruiter-collaboration",
    category: "culture",
    categoryLabel: "Culture & Team",
    label: "Collaboration with Product & Design",
    prompt: "How do you collaborate with product managers and designers?",
    sampleAnswer:
      "I partner with product and design early during ideation to highlight technical possibilities and feasibility, helping ship impactful MVPs in small, testable iterations.",
    keywords: ["collaboration", "product", "design", "partner", "stakeholder"],
    placeholder: "e.g. Early ideation partnership, feasibility scoping, and fast MVP feedback cycles.",
  },
  {
    id: "recruiter-ideal-team",
    category: "culture",
    categoryLabel: "Culture & Team",
    label: "Ideal team environment & culture",
    prompt: "What type of team culture or environment do you thrive in?",
    sampleAnswer:
      "I thrive in cultures characterized by high trust, transparent communication, continuous learning, and a bias for shipping clean, well-tested solutions.",
    keywords: ["culture", "environment", "team", "values", "thrive", "workplace"],
    placeholder: "e.g. High trust, psychological safety, transparent communication, and rapid iteration.",
  },
];

const DEFAULT_RECRUITER_QUESTIONS = COMMON_INTERVIEW_QUESTIONS;

function textValue(value: string | { en: string; bn?: string } | undefined): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value.en ?? "";
}

function detectTone(rulesVoice: string): TonePreset {
  const lower = rulesVoice.toLowerCase();
  if (lower.includes("technical") || lower.includes("architecture")) return "technical";
  if (lower.includes("warm") || lower.includes("conversational") || lower.includes("friendly"))
    return "conversational";
  if (lower.includes("direct") || lower.includes("concise") || lower.includes("punchy")) return "direct";
  return "professional";
}

function extractInitialDocs(doc: PersonaDoc): DocumentSummary[] {
  const section = doc.sections.find((s) => s.key === "knowledge");
  if (!section || !section.items.length) return [];

  const grouped = new Map<string, { id: string; name: string; chunks: string[]; wordCount: number }>();

  for (const it of section.items) {
    const docName =
      (typeof it.label === "string" ? it.label : it.label?.en) ||
      (typeof it.meta === "string" ? it.meta : it.meta?.en) ||
      "Document";
    const textContent = typeof it.text === "string" ? it.text : it.text?.en || "";
    const docKey = docName.toLowerCase();

    const existing = grouped.get(docKey);
    const words = textContent.split(/\s+/).filter(Boolean).length;
    if (existing) {
      existing.chunks.push(textContent);
      existing.wordCount += words;
    } else {
      grouped.set(docKey, {
        id: it.id.split("-")[0] || it.id,
        name: docName,
        chunks: [textContent],
        wordCount: words,
      });
    }
  }

  return Array.from(grouped.values()).map((d) => ({
    id: d.id,
    name: d.name,
    chunkCount: d.chunks.length,
    wordCount: d.wordCount,
    preview: d.chunks[0]?.slice(0, 140) || "",
  }));
}

export function SimpleCvTrainer({
  slug,
  name: initialName,
  initialDoc,
  initialRev,
  isPublished,
  liveVersionId: _liveVersionId,
}: {
  slug: string;
  name: string;
  initialDoc: PersonaDoc;
  initialRev: number;
  isPublished: boolean;
  liveVersionId: string | null;
}) {
  const router = useRouter();
  const [doc, setDoc] = useState<PersonaDoc>(initialDoc);
  const [rev, setRev] = useState(initialRev);
  const [published, setPublished] = useState(isPublished);

  // Form states
  const [name, setName] = useState(initialDoc.identity.name || initialName);
  const [headline, setHeadline] = useState(textValue(initialDoc.identity.role ?? initialDoc.identity.headline));
  const [summary, setSummary] = useState(textValue(initialDoc.identity.summary));
  const [selectedTone, setSelectedTone] = useState<TonePreset>(() =>
    detectTone(textValue(initialDoc.rules.voice))
  );
  const [keySkills, setKeySkills] = useState(() => {
    const skillsSection = initialDoc.sections.find((s) => s.key === "skills");
    return (skillsSection?.items ?? [])
      .map((item) => item.tags?.join(", ") || textValue(item.text) || textValue(item.label))
      .filter(Boolean)
      .join(", ");
  });

  // Recruiter Q&A states
  const [recruiterAnswers, setRecruiterAnswers] = useState<Record<string, string>>(() => {
    const initialMap: Record<string, string> = {};
    for (const q of DEFAULT_RECRUITER_QUESTIONS) {
      const existing = initialDoc.questions.find((item) => item.id === q.id || item.prompt === q.prompt);
      initialMap[q.id] = existing?.answers[0] ? textValue(existing.answers[0]) : "";
    }
    return initialMap;
  });

  // Additional custom questions
  const [customQa, setCustomQa] = useState<CustomQaItem[]>(() => {
    const defaultIds = new Set(DEFAULT_RECRUITER_QUESTIONS.map((q) => q.id));
    const reservedIds = new Set([
      "about",
      "skills",
      "experience",
      "education",
      "projects",
      "contact",
      "hire",
    ]);
    const extra = initialDoc.questions.filter((q) => !defaultIds.has(q.id) && !reservedIds.has(q.id));
    return extra.map((q) => ({
      id: q.id,
      prompt: textValue(q.prompt),
      answer: q.answers[0] ? textValue(q.answers[0]) : "",
    }));
  });

  // Space-Saving Q&A Accordion, Filter & Search States
  const [qaCategory, setQaCategory] = useState<
    "all" | "logistics" | "career" | "technical" | "culture" | "custom"
  >("all");
  const [qaSearch, setQaSearch] = useState("");
  const [expandedQaIds, setExpandedQaIds] = useState<Set<string>>(() => new Set());

  const toggleQaExpand = (id: string) => {
    setExpandedQaIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAllQa = () => {
    setExpandedQaIds(
      new Set([
        ...COMMON_INTERVIEW_QUESTIONS.map((q) => q.id),
        ...customQa.map((q) => q.id),
      ])
    );
  };

  const collapseAllQa = () => {
    setExpandedQaIds(new Set());
  };

  const applySampleAnswer = (questionId: string, sampleText: string) => {
    setRecruiterAnswers((prev) => ({
      ...prev,
      [questionId]: sampleText,
    }));
  };

  // RAG Documents Knowledge Base State
  const [documents, setDocuments] = useState<DocumentSummary[]>(() => extractInitialDocs(initialDoc));
  const [docsLoading, setDocsLoading] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docFeedback, setDocFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [pasteNotesOpen, setPasteNotesOpen] = useState(false);
  const [pasteTitle, setPasteTitle] = useState("");
  const [pasteContent, setPasteContent] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Action & Background Job states
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [trainingState, setTrainingState] = useState<"idle" | "starting" | "training" | "succeeded" | "failed">(
    "idle"
  );
  const [trainingStep, setTrainingStep] = useState<string>("Preparing CV knowledge...");
  const [trainingProgress, setTrainingProgress] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Conversational Chat Demo States
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => [
    {
      id: "initial-assistant-msg",
      role: "assistant",
      text: `Hello! I'm ${name || "your"}'s CV AI assistant. I have learned your career history and all documents uploaded to your database. Ask me anything to test my answers!`,
      time: "Just now",
      suggestedTopics: [
        "Tell me about yourself.",
        "What are your top skills?",
        "What documents have you read?",
        "What is your notice period?",
      ],
    },
  ]);

  // Load latest documents on mount
  useEffect(() => {
    let cancelled = false;
    const fetchDocs = async () => {
      try {
        setDocsLoading(true);
        const res = await fetch(withBase(`/api/account/personas/${slug}/documents/`));
        if (!res.ok) return;
        const data = (await res.json()) as { ok?: boolean; documents?: DocumentSummary[] };
        if (!cancelled && data.ok && Array.isArray(data.documents)) {
          setDocuments(data.documents);
        }
      } catch {
        // Fallback to initial extracted documents
      } finally {
        if (!cancelled) setDocsLoading(false);
      }
    };
    void fetchDocs();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  // Scroll chat to bottom when new messages arrive
  useEffect(() => {
    chatMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatLoading]);

  // Advanced Developer states
  const [customRules, setCustomRules] = useState(textValue(initialDoc.rules.extra));
  const [rawJsonText, setRawJsonText] = useState(() => JSON.stringify(initialDoc, null, 2));

  // Build the compiled PersonaDoc from the simplified fields
  const assembleUpdatedDoc = useCallback((): PersonaDoc => {
    const next = structuredClone(doc);
    const trimmedName = name.trim();
    const trimmedHeadline = headline.trim();
    const trimmedSummary = summary.trim();

    next.identity.name = trimmedName;
    next.identity.shortName = trimmedName.split(/\s+/)[0] || trimmedName;
    next.identity.initials = trimmedName
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
    next.identity.role = trimmedHeadline;
    next.identity.headline = trimmedHeadline;
    next.identity.summary = trimmedSummary;
    next.hero.staticIntro = `Hi, I'm ${trimmedName}${trimmedHeadline ? `, ${trimmedHeadline}` : ""}. ${trimmedSummary}`;

    // Apply tone preset
    const toneConfig = TONE_OPTIONS.find((t) => t.id === selectedTone) || TONE_OPTIONS[0];
    next.rules.voice = toneConfig.voicePrompt;
    next.rules.extra = customRules.trim() || toneConfig.extraPrompt;

    // Apply key skills if modified
    if (keySkills.trim()) {
      const skillItems = keySkills
        .split(/[,;\n]/)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 50);

      const existingSkills = next.sections.find((s) => s.key === "skills");
      if (existingSkills) {
        existingSkills.items = skillItems.map((skill, index) => ({
          id: `skill-${index + 1}`,
          text: skill,
        }));
      }
    }

    // Process Recruiter & Custom Q&A
    const processedQuestions = [...next.questions];

    for (const qDef of DEFAULT_RECRUITER_QUESTIONS) {
      const ans = recruiterAnswers[qDef.id]?.trim();
      const existingIdx = processedQuestions.findIndex((item) => item.id === qDef.id);
      if (ans) {
        const questionObj = {
          id: qDef.id,
          label: qDef.label,
          prompt: qDef.prompt,
          icon: "sparkles" as const,
          keywords: qDef.keywords,
          primary: false,
          random: false,
          answers: [{ en: ans }],
          blocks: [],
          followUps: [],
          visibility: "public" as const,
        };
        if (existingIdx >= 0) {
          processedQuestions[existingIdx] = {
            ...processedQuestions[existingIdx],
            ...questionObj,
          };
        } else {
          processedQuestions.push(questionObj);
        }
      } else if (existingIdx >= 0) {
        processedQuestions.splice(existingIdx, 1);
      }
    }

    for (const customItem of customQa) {
      const p = customItem.prompt.trim();
      const a = customItem.answer.trim();
      if (!p || !a) continue;
      const existingIdx = processedQuestions.findIndex((item) => item.id === customItem.id);
      const questionObj = {
        id: customItem.id,
        label: p.slice(0, 32),
        prompt: p,
        icon: "sparkles" as const,
        keywords: p.toLowerCase().split(/\s+/).slice(0, 6),
        primary: false,
        random: false,
        answers: [{ en: a }],
        blocks: [],
        followUps: [],
        visibility: "public" as const,
      };
      if (existingIdx >= 0) {
        processedQuestions[existingIdx] = {
          ...processedQuestions[existingIdx],
          ...questionObj,
        };
      } else {
        processedQuestions.push(questionObj);
      }
    }

    next.questions = processedQuestions;
    return next;
  }, [
    doc,
    name,
    headline,
    summary,
    selectedTone,
    customRules,
    keySkills,
    recruiterAnswers,
    customQa,
  ]);

  // Save draft to server
  const saveDraft = useCallback(
    async (showStatus = true): Promise<boolean> => {
      if (showStatus) setSaveState("saving");
      setErrorMessage(null);

      const updated = assembleUpdatedDoc();
      setRawJsonText(JSON.stringify(updated, null, 2));

      try {
        const response = await fetch(withBase(`/api/account/personas/${slug}/`), {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ doc: updated, rev }),
        });

        const data = (await response.json()) as { ok?: boolean; rev?: number; error?: string };

        if (!response.ok || !data.ok || typeof data.rev !== "number") {
          if (showStatus) setSaveState("error");
          setErrorMessage(data.error || "Could not save your changes. Try refreshing the page.");
          return false;
        }

        setDoc(updated);
        setRev(data.rev);
        if (showStatus) {
          setSaveState("saved");
          setTimeout(() => setSaveState("idle"), 2500);
        }
        return true;
      } catch {
        if (showStatus) setSaveState("error");
        setErrorMessage("Network error: Could not save draft.");
        return false;
      }
    },
    [assembleUpdatedDoc, rev, slug]
  );

  // File Upload Handlers for RAG
  const uploadFile = async (file: File) => {
    setUploadingDoc(true);
    setDocFeedback(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(withBase(`/api/account/personas/${slug}/documents/`), {
        method: "POST",
        body: formData,
      });

      const data = (await res.json()) as {
        ok?: boolean;
        document?: DocumentSummary;
        rev?: number;
        error?: string;
      };

      if (!res.ok || !data.ok || !data.document) {
        setDocFeedback({
          type: "error",
          message: data.error || `Failed to process ${file.name}. Ensure it is a valid PDF, DOCX, TXT, or MD.`,
        });
        return;
      }

      if (typeof data.rev === "number") {
        setRev(data.rev);
      }

      // Add or update document in local state
      setDocuments((prev) => {
        const existingIdx = prev.findIndex((d) => d.name.toLowerCase() === data.document!.name.toLowerCase());
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = data.document!;
          return updated;
        }
        return [data.document!, ...prev];
      });

      setDocFeedback({
        type: "success",
        message: `Successfully processed "${data.document.name}" into ${data.document.chunkCount} knowledge chunks (${data.document.wordCount} words)!`,
      });

      // Add a friendly note to chat
      setChatMessages((prev) => [
        ...prev,
        {
          id: `doc-uploaded-${Date.now()}`,
          role: "assistant",
          text: `I've ingested "${data.document!.name}" into my knowledge base (${data.document!.chunkCount} chunks). Feel free to ask me questions about it!`,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          suggestedTopics: [`What does ${data.document!.name} talk about?`, "Summarize my background"],
        },
      ]);
    } catch {
      setDocFeedback({
        type: "error",
        message: "Network error while uploading document. Please try again.",
      });
    } finally {
      setUploadingDoc(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void uploadFile(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void uploadFile(file);
  };

  const handlePasteSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!pasteContent.trim() || pasteContent.trim().length < 20 || uploadingDoc) return;

    setUploadingDoc(true);
    setDocFeedback(null);

    try {
      const res = await fetch(withBase(`/api/account/personas/${slug}/documents/`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: pasteContent.trim(),
          title: pasteTitle.trim() || "Notes.txt",
        }),
      });

      const data = (await res.json()) as {
        ok?: boolean;
        document?: DocumentSummary;
        rev?: number;
        error?: string;
      };

      if (!res.ok || !data.ok || !data.document) {
        setDocFeedback({
          type: "error",
          message: data.error || "Could not save notes to knowledge base.",
        });
        return;
      }

      if (typeof data.rev === "number") {
        setRev(data.rev);
      }

      setDocuments((prev) => [data.document!, ...prev.filter((d) => d.name !== data.document!.name)]);
      setPasteTitle("");
      setPasteContent("");
      setPasteNotesOpen(false);

      setDocFeedback({
        type: "success",
        message: `Saved notes "${data.document.name}" (${data.document.chunkCount} chunks) to AI knowledge base!`,
      });

      setChatMessages((prev) => [
        ...prev,
        {
          id: `paste-added-${Date.now()}`,
          role: "assistant",
          text: `I've added your notes "${data.document!.name}" to my knowledge database. Ask me anything about it!`,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } catch {
      setDocFeedback({
        type: "error",
        message: "Failed to save notes. Try again.",
      });
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDeleteDoc = async (documentName: string) => {
    if (!confirm(`Remove "${documentName}" from your AI knowledge base?`)) return;

    try {
      const res = await fetch(withBase(`/api/account/personas/${slug}/documents/`), {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentName }),
      });

      const data = (await res.json()) as { ok?: boolean; rev?: number; error?: string };
      if (!res.ok || !data.ok) {
        alert(data.error || "Could not delete document.");
        return;
      }

      if (typeof data.rev === "number") setRev(data.rev);
      setDocuments((prev) => prev.filter((d) => d.name.toLowerCase() !== documentName.toLowerCase()));
      setDocFeedback({
        type: "success",
        message: `Removed "${documentName}" from training documents.`,
      });
    } catch {
      alert("Network error while deleting document.");
    }
  };

  // Trigger 1-Click AI Training & Vector Cache
  const startAiTraining = async () => {
    setErrorMessage(null);
    setTrainingState("starting");
    setTrainingStep("Saving latest draft & knowledge base...");
    setTrainingProgress(15);

    const saved = await saveDraft(false);
    if (!saved) {
      setTrainingState("failed");
      return;
    }

    setTrainingProgress(30);
    setTrainingStep("Starting background vector embeddings...");

    try {
      const response = await fetch(withBase(`/api/account/personas/${slug}/publish/`), {
        method: "POST",
      });

      const result = (await response.json()) as {
        ok?: boolean;
        jobId?: string;
        unchanged?: boolean;
        error?: string;
        issues?: string[];
      };

      if (!response.ok || result.ok === false) {
        setTrainingState("failed");
        setErrorMessage(result.error || "Training process could not start.");
        return;
      }

      if (result.unchanged) {
        setTrainingProgress(100);
        setTrainingStep("AI knowledge is already up to date!");
        setTrainingState("succeeded");
        setPublished(true);
        router.refresh();
        return;
      }

      if (!result.jobId) {
        setTrainingState("failed");
        setErrorMessage("No training job received from background server.");
        return;
      }

      // Poll background job
      const jobId = result.jobId;
      setTrainingProgress(50);
      setTrainingStep("Generating pgvector semantic search embeddings...");

      for (let attempt = 0; attempt < 80; attempt++) {
        await new Promise((r) => setTimeout(r, 1400));

        const jobRes = await fetch(withBase(`/api/account/jobs/${jobId}/`), { cache: "no-store" });
        const jobData = (await jobRes.json()) as {
          job?: {
            status: "queued" | "running" | "succeeded" | "failed";
            step?: string;
            error?: string;
          };
        };

        if (!jobRes.ok || !jobData.job) continue;

        const currentJob = jobData.job;
        if (currentJob.status === "running") {
          setTrainingProgress((prev) => Math.min(prev + 10, 85));
          if (currentJob.step) {
            setTrainingStep(`Running step: ${currentJob.step}...`);
          }
        } else if (currentJob.status === "succeeded") {
          setTrainingProgress(100);
          setTrainingStep("Training complete! AI assistant is live with full RAG search.");
          setTrainingState("succeeded");
          setPublished(true);
          router.refresh();
          return;
        } else if (currentJob.status === "failed") {
          setTrainingState("failed");
          setErrorMessage(currentJob.error || "Training checks failed. Please review your settings.");
          return;
        }
      }

      setTrainingStep("AI training is finishing in the background. You may test it shortly.");
      setTrainingState("succeeded");
      setPublished(true);
    } catch {
      setTrainingState("failed");
      setErrorMessage("Lost connection to training worker. Your changes are saved.");
    }
  };

  // Interactive Conversational Chat Demo
  const sendChatMessage = async (textToSend: string) => {
    const query = textToSend.trim();
    if (!query || chatLoading) return;

    const userMessageId = `user-${Date.now()}`;
    const currentTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // Append user message
    const updatedMessages = [
      ...chatMessages,
      {
        id: userMessageId,
        role: "user" as const,
        text: query,
        time: currentTime,
      },
    ];

    setChatMessages(updatedMessages);
    setChatInput("");
    setChatLoading(true);

    // Extract recent turns for multi-turn history
    const historyTurns: Array<{ q: string; a: string }> = [];
    for (let i = 0; i < updatedMessages.length - 1; i++) {
      const msg = updatedMessages[i];
      const nextMsg = updatedMessages[i + 1];
      if (msg.role === "user" && nextMsg?.role === "assistant" && !nextMsg.isError) {
        historyTurns.push({ q: msg.text, a: nextMsg.text });
      }
    }

    try {
      // Auto-save draft so test reflects latest documents and profile edits
      await saveDraft(false);

      const response = await fetch(withBase(`/api/account/personas/${slug}/test/`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: query,
          history: historyTurns.slice(-5),
        }),
      });

      const data = (await response.json()) as {
        ok?: boolean;
        route?: string;
        text?: string;
        suggestedTopics?: string[];
        error?: string;
      };

      const replyTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      if (!response.ok || !data.text) {
        setChatMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            text:
              data.error ||
              "I don't have enough verified information to answer that yet. Try asking about my experience, skills, or uploaded documents!",
            time: replyTime,
            isError: !data.ok,
            suggestedTopics: data.suggestedTopics?.length
              ? data.suggestedTopics
              : ["Tell me about your background", "What are your top skills?"],
          },
        ]);
      } else {
        setChatMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            text: data.text!,
            time: replyTime,
            suggestedTopics: data.suggestedTopics,
          },
        ]);
      }
    } catch {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `assistant-err-${Date.now()}`,
          role: "assistant",
          text: "Network error: Could not reach the AI assistant. Please check your connection.",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          isError: true,
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleChatSubmit = (e: FormEvent) => {
    e.preventDefault();
    void sendChatMessage(chatInput);
  };

  const resetChat = () => {
    setChatMessages([
      {
        id: "initial-assistant-msg",
        role: "assistant",
        text: `Hello! I'm ${name || "your"}'s CV AI assistant. I have learned your career history and all documents uploaded to your database. Ask me anything to test my answers!`,
        time: "Just now",
        suggestedTopics: [
          "Tell me about yourself.",
          "What are your top skills?",
          "What documents have you read?",
          "What is your notice period?",
        ],
      },
    ]);
  };

  const copyMessage = (id: string, text: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const addCustomQuestion = () => {
    const newId = `q-${Math.random().toString(36).slice(2, 9)}`;
    setCustomQa((prev) => [...prev, { id: newId, prompt: "", answer: "" }]);
    setExpandedQaIds((prev) => new Set(prev).add(newId));
    if (qaCategory !== "all" && qaCategory !== "custom") {
      setQaCategory("all");
    }
    setTimeout(() => {
      const el = document.getElementById(`prompt-${newId}`);
      if (el) {
        el.focus();
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 80);
  };

  const removeCustomQuestion = (id: string) => {
    setCustomQa((prev) => prev.filter((item) => item.id !== id));
  };

  // Filtered Questions and Statistics
  const filteredStandardQuestions = COMMON_INTERVIEW_QUESTIONS.filter((q) => {
    if (qaCategory !== "all" && qaCategory !== q.category) return false;
    if (!qaSearch.trim()) return true;
    const term = qaSearch.toLowerCase();
    return (
      q.prompt.toLowerCase().includes(term) ||
      q.label.toLowerCase().includes(term) ||
      q.sampleAnswer.toLowerCase().includes(term) ||
      q.keywords.some((k) => k.toLowerCase().includes(term))
    );
  });

  const filteredCustomQuestions = customQa.filter((q) => {
    if (qaCategory !== "all" && qaCategory !== "custom") return false;
    if (!qaSearch.trim()) return true;
    const term = qaSearch.toLowerCase();
    return (
      q.prompt.toLowerCase().includes(term) ||
      q.answer.toLowerCase().includes(term)
    );
  });

  const standardAnsweredCount = COMMON_INTERVIEW_QUESTIONS.filter((q) =>
    Boolean(recruiterAnswers[q.id]?.trim())
  ).length;
  const customAnsweredCount = customQa.filter((q) => Boolean(q.answer.trim())).length;
  const totalAnsweredCount = standardAnsweredCount + customAnsweredCount;
  const totalQuestionsCount = COMMON_INTERVIEW_QUESTIONS.length + customQa.length;
  const progressPercent = Math.round((totalAnsweredCount / (totalQuestionsCount || 1)) * 100);

  return (
    <main className="min-h-dvh bg-bg text-fg">
      {/* Top Banner Navigation & Quick Action Bar */}
      <div className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/account/"
              className="inline-flex size-9 items-center justify-center rounded-xl border border-line bg-card text-muted transition-colors hover:text-fg"
              title="Return to My CVs"
            >
              <ArrowLeft className="size-4" />
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-semibold">{name || "Your CV AI"}</span>
                {published ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" /> Live & Grounded
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                    <span className="size-1.5 rounded-full bg-amber-500" /> Draft Changes
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted">RAG Knowledge Base & AI Training</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {saveState === "saving" && (
              <span className="hidden items-center gap-1.5 text-xs text-muted sm:inline-flex">
                <LoaderCircle className="size-3.5 animate-spin" /> Saving...
              </span>
            )}
            {saveState === "saved" && (
              <span className="hidden items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 sm:inline-flex">
                <Check className="size-3.5" /> Saved
              </span>
            )}
            {saveState === "error" && (
              <span className="hidden items-center gap-1.5 text-xs text-red-600 dark:text-red-400 sm:inline-flex">
                Save failed
              </span>
            )}

            <button
              type="button"
              onClick={() => void saveDraft()}
              disabled={saveState === "saving" || trainingState === "training"}
              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-card px-3 py-1.5 text-xs font-semibold text-fg transition-colors hover:bg-bg disabled:opacity-50"
            >
              Save Draft
            </button>

            <button
              type="button"
              onClick={() => void startAiTraining()}
              disabled={trainingState === "training" || trainingState === "starting"}
              className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-1.5 text-xs font-semibold text-on-accent shadow-sm transition-opacity hover:opacity-95 disabled:opacity-60"
            >
              {trainingState === "training" || trainingState === "starting" ? (
                <>
                  <LoaderCircle className="size-3.5 animate-spin" /> Training AI...
                </>
              ) : (
                <>
                  <Rocket className="size-3.5" /> Train CV AI
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6">
        {/* Background Training Progress / Status Bar */}
        {(trainingState === "training" || trainingState === "starting") && (
          <div className="rounded-2xl border border-accent/30 bg-accent-soft/10 p-4 shadow-sm space-y-2.5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="flex items-center gap-2 text-accent">
                <LoaderCircle className="size-4 animate-spin" />
                {trainingStep}
              </span>
              <span className="text-muted">{trainingProgress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-line">
              <div
                className="h-full bg-accent transition-all duration-300"
                style={{ width: `${trainingProgress}%` }}
              />
            </div>
            <p className="text-[11px] text-muted">
              Vectorizing documents and building pgvector embeddings in PostgreSQL database...
            </p>
          </div>
        )}

        {trainingState === "succeeded" && (
          <div className="flex items-center justify-between rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs text-emerald-700 dark:text-emerald-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-500" />
              <span>
                <strong>AI Assistant Trained & Live!</strong> Your CV knowledge and RAG documents are now
                indexed in the database.
              </span>
            </div>
            <Link
              href={`/p/${slug}/`}
              target="_blank"
              className="flex items-center gap-1 font-semibold underline underline-offset-2"
            >
              View Public Page <ExternalLink className="size-3" />
            </Link>
          </div>
        )}

        {errorMessage && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-600 dark:text-red-400">
            {errorMessage}
          </div>
        )}

        {/* 2-Column Responsive Workspace */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
          {/* Left Column: RAG Document Upload & Persona Settings (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* SECTION 1: RAG DOCUMENT UPLOAD (Zero friction for user!) */}
            <section className="rounded-2xl border border-line bg-card p-6 shadow-sm space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 rounded-md bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent">
                    <Database className="size-3" /> RAG Knowledge Base
                  </div>
                  <h2 className="mt-1 text-base font-semibold text-fg">
                    Train with Documents & Notes
                  </h2>
                  <p className="mt-0.5 text-xs text-muted">
                    Bored of filling out forms? Simply upload your existing resume, project writeups, bio,
                    or notes. The AI extracts text, chunks it, and indexes it into the database for
                    instant semantic search!
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPasteNotesOpen(!pasteNotesOpen)}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-line bg-bg px-2.5 py-1 text-xs font-semibold text-fg hover:border-accent"
                >
                  <FileText className="size-3.5 text-accent" />
                  {pasteNotesOpen ? "Close Notes" : "Paste Text"}
                </button>
              </div>

              {/* Paste Text / Notes Form */}
              {pasteNotesOpen && (
                <form
                  onSubmit={handlePasteSubmit}
                  className="rounded-xl border border-accent/20 bg-accent-soft/5 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-fg">Paste Raw Notes / Content</span>
                    <span className="text-[11px] text-muted">Min 20 characters</span>
                  </div>
                  <input
                    type="text"
                    value={pasteTitle}
                    onChange={(e) => setPasteTitle(e.target.value)}
                    placeholder="Document Title (e.g., 'Project Alpha Architecture Notes')"
                    className="w-full rounded-lg border border-line-strong bg-bg px-3 py-1.5 text-xs text-fg outline-none focus:border-accent"
                  />
                  <textarea
                    rows={4}
                    value={pasteContent}
                    onChange={(e) => setPasteContent(e.target.value)}
                    placeholder="Paste details about your projects, accomplishments, technologies, or FAQs..."
                    className="w-full rounded-lg border border-line-strong bg-bg p-3 text-xs text-fg outline-none focus:border-accent"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setPasteNotesOpen(false)}
                      className="rounded-lg border border-line bg-card px-3 py-1 text-xs font-semibold text-muted hover:text-fg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={uploadingDoc || pasteContent.trim().length < 20}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1 text-xs font-semibold text-on-accent disabled:opacity-50"
                    >
                      {uploadingDoc ? (
                        <LoaderCircle className="size-3.5 animate-spin" />
                      ) : (
                        <Plus className="size-3.5" />
                      )}
                      Add to Knowledge Base
                    </button>
                  </div>
                </form>
              )}

              {/* File Upload Dropzone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-all cursor-pointer",
                  isDragOver
                    ? "border-accent bg-accent-soft/20 scale-[0.99]"
                    : "border-line-strong/80 hover:border-accent/60 bg-bg/40 hover:bg-bg/80"
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.txt,.md"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="grid size-11 place-items-center rounded-xl bg-accent-soft text-accent mb-2">
                  {uploadingDoc ? (
                    <LoaderCircle className="size-5 animate-spin" />
                  ) : (
                    <UploadCloud className="size-5" />
                  )}
                </div>

                <p className="text-xs font-semibold text-fg">
                  {uploadingDoc
                    ? "Reading & chunking document for vector database..."
                    : "Click to upload or drag & drop documents"}
                </p>
                <p className="text-[11px] text-muted mt-0.5">
                  Supports PDF, DOCX, TXT, or Markdown (up to 15 MB)
                </p>
              </div>

              {/* Upload Feedback Toast */}
              {docFeedback && (
                <div
                  className={cn(
                    "flex items-center justify-between rounded-xl p-3 text-xs",
                    docFeedback.type === "success"
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                      : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                  )}
                >
                  <span>{docFeedback.message}</span>
                  <button
                    type="button"
                    onClick={() => setDocFeedback(null)}
                    className="font-bold ml-2 text-muted hover:text-fg"
                  >
                    ×
                  </button>
                </div>
              )}

              {/* Uploaded Documents List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-muted">
                  <span>Active Knowledge Documents ({documents.length})</span>
                  {docsLoading && (
                    <span className="flex items-center gap-1 text-[11px] text-muted">
                      <LoaderCircle className="size-3 animate-spin" /> Syncing...
                    </span>
                  )}
                </div>

                {documents.length === 0 ? (
                  <div className="rounded-xl border border-line bg-bg/40 p-4 text-center text-xs text-muted">
                    No custom documents uploaded yet. Upload a PDF or paste notes to train your AI
                    instantly without manual forms!
                  </div>
                ) : (
                  <div className="divide-y divide-line/60 rounded-xl border border-line bg-bg/30">
                    {documents.map((docItem) => (
                      <div
                        key={docItem.id || docItem.name}
                        className="flex items-start justify-between gap-3 p-3 text-xs transition-colors hover:bg-bg/60"
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <span className="grid size-7 place-items-center rounded-lg bg-card border border-line text-accent shrink-0 mt-0.5">
                            <FileCode className="size-3.5" />
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-fg truncate">{docItem.name}</span>
                              <span className="rounded bg-accent-soft/30 px-1.5 py-0.2 text-[10px] font-medium text-accent">
                                {docItem.chunkCount} chunks
                              </span>
                              <span className="text-[10px] text-muted">
                                ~{docItem.wordCount} words
                              </span>
                            </div>
                            {docItem.preview && (
                              <p className="mt-0.5 text-[11px] text-muted truncate max-w-md">
                                {docItem.preview}…
                              </p>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => void handleDeleteDoc(docItem.name)}
                          className="shrink-0 p-1.5 text-muted hover:text-red-500 transition-colors"
                          title="Remove document from knowledge"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* SECTION 2: 1-CLICK TONE & PERSONA VOICE */}
            <section className="rounded-2xl border border-line bg-card p-6 shadow-sm space-y-4">
              <div>
                <span className="inline-flex items-center gap-1 rounded-md bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent">
                  <Sparkles className="size-3" /> Voice & Personality
                </span>
                <h2 className="mt-1 text-base font-semibold text-fg">Choose Your AI Tone</h2>
                <p className="mt-0.5 text-xs text-muted">
                  How should your assistant sound when recruiters interview it? Choose in one click.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {TONE_OPTIONS.map((tone) => {
                  const Icon = tone.icon;
                  const isSelected = selectedTone === tone.id;
                  return (
                    <button
                      key={tone.id}
                      type="button"
                      onClick={() => setSelectedTone(tone.id)}
                      className={cn(
                        "flex flex-col text-left rounded-xl p-4 border transition-all relative",
                        isSelected
                          ? "border-accent bg-accent-soft/10 ring-1 ring-accent"
                          : "border-line bg-bg/40 hover:border-line-strong hover:bg-bg/80"
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "grid size-6 place-items-center rounded-md",
                              isSelected ? "bg-accent text-on-accent" : "bg-card text-muted"
                            )}
                          >
                            <Icon className="size-3.5" />
                          </span>
                          <span className="text-xs font-semibold text-fg">{tone.label}</span>
                        </div>
                        {isSelected && <Check className="size-4 text-accent" />}
                      </div>
                      <p className="text-[11px] text-muted leading-relaxed">{tone.description}</p>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* SECTION 3: QUICK PROFILE BASICS */}
            <section className="rounded-2xl border border-line bg-card p-6 shadow-sm space-y-4">
              <div>
                <span className="inline-flex items-center gap-1 rounded-md bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent">
                  <Briefcase className="size-3" /> Core Overview
                </span>
                <h2 className="mt-1 text-base font-semibold text-fg">Identity & Headline</h2>
                <p className="mt-0.5 text-xs text-muted">
                  Quick summary facts the AI gives when introducing you to visitors.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="cv-name" className="block text-xs font-semibold text-fg">
                    Your Full Name
                  </label>
                  <input
                    id="cv-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-line-strong bg-bg px-3 py-2 text-xs text-fg outline-none focus:border-accent"
                    placeholder="e.g. Mekin Jema"
                  />
                </div>

                <div>
                  <label htmlFor="cv-headline" className="block text-xs font-semibold text-fg">
                    Target Role / Headline
                  </label>
                  <input
                    id="cv-headline"
                    type="text"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-line-strong bg-bg px-3 py-2 text-xs text-fg outline-none focus:border-accent"
                    placeholder="e.g. Senior Full-Stack Engineer"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="cv-summary" className="block text-xs font-semibold text-fg">
                  Elevator Pitch / Summary
                </label>
                <textarea
                  id="cv-summary"
                  rows={2}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-line-strong bg-bg p-3 text-xs text-fg outline-none focus:border-accent"
                  placeholder="2-3 sentences about your specialty, key achievements, and impact..."
                />
              </div>

              <div>
                <label htmlFor="cv-skills" className="block text-xs font-semibold text-fg">
                  Key Skills & Stacks (comma separated)
                </label>
                <input
                  id="cv-skills"
                  type="text"
                  value={keySkills}
                  onChange={(e) => setKeySkills(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-line-strong bg-bg px-3 py-2 text-xs text-fg outline-none focus:border-accent"
                  placeholder="React, Next.js, TypeScript, Python, PostgreSQL, AWS, Docker"
                />
              </div>
            </section>

            {/* SECTION 4: RECRUITER & INTERVIEW CHEAT SHEET Q&A (Space-Saving Accordion View) */}
            <section className="rounded-2xl border border-line bg-card p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-md bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent">
                      <MessageSquare className="size-3" /> Interview Cheat Sheet
                    </span>
                    <span className="text-[11px] font-semibold text-muted">
                      {totalAnsweredCount} of {totalQuestionsCount} Answered ({progressPercent}%)
                    </span>
                  </div>
                  <h2 className="mt-1 text-base font-semibold text-fg">
                    Common Interview Q&A & Templates
                  </h2>
                  <p className="mt-0.5 text-xs text-muted">
                    Pre-set answers with 1-click sample templates. Compact rows save space as questions grow.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={expandedQaIds.size > 0 ? collapseAllQa : expandAllQa}
                    className="inline-flex items-center gap-1 rounded-lg border border-line bg-bg px-2.5 py-1 text-xs font-semibold text-muted hover:text-fg transition-colors"
                  >
                    {expandedQaIds.size > 0 ? (
                      <>
                        <ChevronUp className="size-3" /> Collapse All
                      </>
                    ) : (
                      <>
                        <ChevronDown className="size-3" /> Expand All
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={addCustomQuestion}
                    className="inline-flex items-center gap-1 rounded-lg bg-accent px-3 py-1 text-xs font-semibold text-on-accent hover:opacity-95 transition-opacity"
                  >
                    <Plus className="size-3.5" /> Add Question
                  </button>
                </div>
              </div>

              {/* Progress Meter */}
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-line/60">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Filter Tabs & Search Bar */}
              <div className="space-y-2.5 pt-1">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 size-3.5 text-muted pointer-events-none" />
                  <input
                    type="text"
                    value={qaSearch}
                    onChange={(e) => setQaSearch(e.target.value)}
                    placeholder="Search interview questions by keyword (e.g. salary, tech stack, conflict)..."
                    className="w-full rounded-xl border border-line-strong bg-bg py-2 pl-9 pr-8 text-xs text-fg outline-none focus:border-accent"
                  />
                  {qaSearch && (
                    <button
                      type="button"
                      onClick={() => setQaSearch("")}
                      className="absolute right-2.5 top-2 text-xs font-bold text-muted hover:text-fg"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Category Pills */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {(
                    [
                      { id: "all", label: "All Questions", count: totalQuestionsCount },
                      {
                        id: "logistics",
                        label: "Logistics",
                        count: COMMON_INTERVIEW_QUESTIONS.filter((q) => q.category === "logistics").length,
                      },
                      {
                        id: "career",
                        label: "Career & Goals",
                        count: COMMON_INTERVIEW_QUESTIONS.filter((q) => q.category === "career").length,
                      },
                      {
                        id: "technical",
                        label: "Technical",
                        count: COMMON_INTERVIEW_QUESTIONS.filter((q) => q.category === "technical").length,
                      },
                      {
                        id: "culture",
                        label: "Culture & Team",
                        count: COMMON_INTERVIEW_QUESTIONS.filter((q) => q.category === "culture").length,
                      },
                      { id: "custom", label: "Custom Q&A", count: customQa.length },
                    ] as const
                  ).map((cat) => {
                    const isActive = qaCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setQaCategory(cat.id)}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors",
                          isActive
                            ? "bg-accent text-on-accent"
                            : "border border-line bg-bg text-muted hover:text-fg hover:border-line-strong"
                        )}
                      >
                        <span>{cat.label}</span>
                        <span
                          className={cn(
                            "rounded-full px-1.5 py-0.2 text-[10px]",
                            isActive ? "bg-on-accent/20 text-on-accent" : "bg-card text-muted"
                          )}
                        >
                          {cat.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Compact Accordion Questions List */}
              <div className="space-y-2 pt-1">
                {/* Standard Questions */}
                {filteredStandardQuestions.map((q, idx) => {
                  const isExpanded = expandedQaIds.has(q.id);
                  const currentAnswer = recruiterAnswers[q.id] || "";
                  const isAnswered = Boolean(currentAnswer.trim());

                  return (
                    <div
                      key={q.id}
                      className={cn(
                        "rounded-xl border transition-all overflow-hidden",
                        isExpanded
                          ? "border-accent/40 bg-card shadow-xs ring-1 ring-accent/20"
                          : isAnswered
                          ? "border-emerald-500/20 bg-bg/50 hover:border-emerald-500/40"
                          : "border-line bg-bg/30 hover:border-line-strong hover:bg-bg/60"
                      )}
                    >
                      {/* Header bar / row (clickable) */}
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => toggleQaExpand(q.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            toggleQaExpand(q.id);
                          }
                        }}
                        className="flex items-center justify-between gap-3 px-3.5 py-2.5 cursor-pointer select-none text-left"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={cn(
                              "grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-semibold transition-colors",
                              isAnswered
                                ? "bg-emerald-500 text-white"
                                : "border border-line text-muted bg-card"
                            )}
                          >
                            {isAnswered ? <Check className="size-3 stroke-[3]" /> : idx + 1}
                          </span>

                          <span className="rounded bg-accent-soft/30 px-1.5 py-0.5 text-[10px] font-medium text-accent shrink-0">
                            {q.categoryLabel}
                          </span>

                          <span className="truncate text-xs font-medium text-fg">
                            {q.prompt}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {isAnswered ? (
                            <span className="hidden sm:inline-block text-[11px] text-emerald-600 dark:text-emerald-400 font-medium truncate max-w-[160px]">
                              {currentAnswer}
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted rounded bg-bg px-1.5 py-0.5 border border-line">
                              Unanswered
                            </span>
                          )}

                          <ChevronDown
                            className={cn(
                              "size-4 text-muted transition-transform duration-200",
                              isExpanded && "rotate-180"
                            )}
                          />
                        </div>
                      </div>

                      {/* Expanded Content */}
                      {isExpanded && (
                        <div className="border-t border-line/60 bg-bg/40 p-4 space-y-3 animate-in fade-in duration-150">
                          <div>
                            <label htmlFor={q.id} className="block text-xs font-semibold text-fg mb-1">
                              Your AI&apos;s Answer:
                            </label>
                            <textarea
                              id={q.id}
                              rows={3}
                              value={currentAnswer}
                              onChange={(e) =>
                                setRecruiterAnswers((prev) => ({
                                  ...prev,
                                  [q.id]: e.target.value,
                                }))
                              }
                              className="w-full rounded-lg border border-line-strong bg-bg p-3 text-xs text-fg leading-relaxed outline-none focus:border-accent"
                              placeholder={q.placeholder}
                            />
                          </div>

                          {/* Sample Answer Template Box */}
                          <div className="rounded-xl border border-accent/20 bg-accent-soft/10 p-3 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-accent">
                                <Lightbulb className="size-3.5" /> Sample Answer Template:
                              </span>
                              <div className="flex items-center gap-2">
                                {isAnswered && (
                                  <button
                                    type="button"
                                    onClick={() => applySampleAnswer(q.id, "")}
                                    className="text-[11px] text-muted hover:text-red-500 transition-colors"
                                  >
                                    Clear Answer
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => applySampleAnswer(q.id, q.sampleAnswer)}
                                  className="inline-flex items-center gap-1 rounded-lg bg-accent px-2.5 py-1 text-[11px] font-semibold text-on-accent hover:opacity-90 transition-opacity"
                                  title="Insert this pre-written template into your answer"
                                >
                                  <Sparkles className="size-3" /> Use This Template
                                </button>
                              </div>
                            </div>
                            <p className="text-[11px] text-muted leading-relaxed italic border-l-2 border-accent/40 pl-2.5">
                              &quot;{q.sampleAnswer}&quot;
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Custom Questions */}
                {filteredCustomQuestions.map((qa, index) => {
                  const isExpanded = expandedQaIds.has(qa.id);
                  const isAnswered = Boolean(qa.answer.trim());

                  return (
                    <div
                      key={qa.id}
                      className={cn(
                        "rounded-xl border transition-all overflow-hidden",
                        isExpanded
                          ? "border-accent/40 bg-card shadow-xs ring-1 ring-accent/20"
                          : isAnswered
                          ? "border-accent/25 bg-accent-soft/5"
                          : "border-line bg-bg/30 hover:border-line-strong hover:bg-bg/60"
                      )}
                    >
                      {/* Header bar / row (clickable) */}
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => toggleQaExpand(qa.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            toggleQaExpand(qa.id);
                          }
                        }}
                        className="flex items-center justify-between gap-3 px-3.5 py-2.5 cursor-pointer select-none text-left"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={cn(
                              "grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-semibold transition-colors",
                              isAnswered
                                ? "bg-accent text-on-accent"
                                : "border border-line text-muted bg-card"
                            )}
                          >
                            {isAnswered ? <Check className="size-3 stroke-[3]" /> : `C${index + 1}`}
                          </span>

                          <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-medium text-accent shrink-0">
                            Custom
                          </span>

                          <span className="truncate text-xs font-medium text-fg">
                            {qa.prompt.trim() || `Custom Question #${index + 1}`}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {isAnswered ? (
                            <span className="hidden sm:inline-block text-[11px] text-accent font-medium truncate max-w-[160px]">
                              {qa.answer}
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted rounded bg-bg px-1.5 py-0.5 border border-line">
                              Unanswered
                            </span>
                          )}

                          <ChevronDown
                            className={cn(
                              "size-4 text-muted transition-transform duration-200",
                              isExpanded && "rotate-180"
                            )}
                          />
                        </div>
                      </div>

                      {/* Expanded Content */}
                      {isExpanded && (
                        <div className="border-t border-line/60 bg-bg/40 p-4 space-y-3 animate-in fade-in duration-150">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-accent">
                              Custom Q&A #{index + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeCustomQuestion(qa.id)}
                              className="inline-flex items-center gap-1 text-[11px] text-muted hover:text-red-500 transition-colors p-1"
                              title="Delete question"
                            >
                              <Trash2 className="size-3.5" />
                              <span>Remove</span>
                            </button>
                          </div>

                          <div>
                            <label htmlFor={`prompt-${qa.id}`} className="block text-xs font-semibold text-fg mb-1">
                              Recruiter Question:
                            </label>
                            <input
                              id={`prompt-${qa.id}`}
                              type="text"
                              value={qa.prompt}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCustomQa((prev) =>
                                  prev.map((item) => (item.id === qa.id ? { ...item, prompt: val } : item))
                                );
                              }}
                              className="w-full rounded-lg border border-line-strong bg-bg px-3 py-2 text-xs font-semibold text-fg outline-none focus:border-accent"
                              placeholder="e.g. What is your leadership philosophy?"
                            />
                          </div>

                          <div>
                            <label htmlFor={`answer-${qa.id}`} className="block text-xs font-semibold text-fg mb-1">
                              Your AI&apos;s Answer:
                            </label>
                            <textarea
                              id={`answer-${qa.id}`}
                              rows={3}
                              value={qa.answer}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCustomQa((prev) =>
                                  prev.map((item) => (item.id === qa.id ? { ...item, answer: val } : item))
                                );
                              }}
                              className="w-full rounded-lg border border-line-strong bg-bg p-3 text-xs text-fg leading-relaxed outline-none focus:border-accent"
                              placeholder="Your answer for the AI..."
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Empty Search/Filter State */}
                {filteredStandardQuestions.length === 0 && filteredCustomQuestions.length === 0 && (
                  <div className="rounded-xl border border-dashed border-line bg-bg/20 p-6 text-center space-y-2">
                    <p className="text-xs text-muted">
                      No interview questions found matching &quot;{qaSearch}&quot;.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setQaSearch("");
                        setQaCategory("all");
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-line bg-card px-2.5 py-1 text-xs font-semibold text-fg hover:border-accent transition-colors"
                    >
                      Clear Filters
                    </button>
                  </div>
                )}

                {/* Bottom Add Custom Question Action */}
                <div className="pt-2 flex justify-center">
                  <button
                    type="button"
                    onClick={addCustomQuestion}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-accent/40 bg-accent-soft/10 px-4 py-2 text-xs font-semibold text-accent hover:bg-accent-soft/20 transition-colors"
                  >
                    <Plus className="size-3.5" /> Add Another Custom Question
                  </button>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column: Workable Interactive Live AI Chat Sandbox (5 Cols) */}
          <aside className="lg:col-span-5 space-y-6 lg:sticky lg:top-20 lg:self-start">
            {/* WORKABLE CHAT WIDGET */}
            <div className="flex flex-col h-[640px] rounded-2xl border border-line bg-card shadow-sm overflow-hidden">
              {/* Chat Header */}
              <div className="flex items-center justify-between border-b border-line px-4 py-3 bg-bg/70 backdrop-blur-md">
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <span className="grid size-8 place-items-center rounded-xl bg-accent text-on-accent font-semibold text-xs shadow-sm">
                      <Bot className="size-4" />
                    </span>
                    <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-fg leading-none">
                      {name || "Your"} AI Assistant
                    </h3>
                    <p className="text-[10px] text-muted mt-0.5 flex items-center gap-1">
                      <span>RAG Hybrid Search</span>
                      <span>•</span>
                      <span>Gemini 2.5</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={resetChat}
                    className="inline-flex size-7 items-center justify-center rounded-lg border border-line bg-bg text-muted hover:text-fg transition-colors"
                    title="Reset Conversation"
                  >
                    <RefreshCw className="size-3" />
                  </button>
                </div>
              </div>

              {/* Chat Messages Viewport */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
                {chatMessages.map((msg) => {
                  const isUser = msg.role === "user";
                  return (
                    <div
                      key={msg.id}
                      className={cn("flex flex-col", isUser ? "items-end" : "items-start")}
                    >
                      <div className="flex items-center gap-1 text-[10px] text-muted mb-1 px-1">
                        <span>{isUser ? "You" : name || "CV AI"}</span>
                        <span>•</span>
                        <span>{msg.time}</span>
                      </div>

                      <div
                        className={cn(
                          "relative max-w-[88%] rounded-2xl p-3 leading-relaxed",
                          isUser
                            ? "bg-accent text-on-accent rounded-tr-sm"
                            : msg.isError
                            ? "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 rounded-tl-sm"
                            : "bg-bg border border-line text-fg rounded-tl-sm shadow-xs"
                        )}
                      >
                        <p className="whitespace-pre-wrap">{msg.text}</p>

                        {!isUser && !msg.isError && (
                          <div className="mt-2 flex items-center justify-end">
                            <button
                              type="button"
                              onClick={() => copyMessage(msg.id, msg.text)}
                              className="text-muted hover:text-fg transition-colors p-0.5"
                              title="Copy answer"
                            >
                              {copiedId === msg.id ? (
                                <CheckCheck className="size-3 text-emerald-500" />
                              ) : (
                                <Copy className="size-3" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Suggested Follow-ups */}
                      {!isUser && msg.suggestedTopics && msg.suggestedTopics.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5 max-w-[90%]">
                          {msg.suggestedTopics.map((topic) => (
                            <button
                              key={topic}
                              type="button"
                              onClick={() => void sendChatMessage(topic)}
                              className="rounded-full border border-accent/20 bg-accent-soft/10 px-2.5 py-1 text-[10px] font-medium text-accent hover:bg-accent-soft/30 transition-colors text-left"
                            >
                              {topic}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {chatLoading && (
                  <div className="flex flex-col items-start space-y-1">
                    <span className="text-[10px] text-muted px-1">Searching database & reasoning...</span>
                    <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm border border-line bg-bg p-3 text-muted">
                      <span className="size-1.5 animate-bounce rounded-full bg-accent" />
                      <span className="size-1.5 animate-bounce rounded-full bg-accent [animation-delay:0.2s]" />
                      <span className="size-1.5 animate-bounce rounded-full bg-accent [animation-delay:0.4s]" />
                    </div>
                  </div>
                )}
                <div ref={chatMessagesEndRef} />
              </div>

              {/* Quick Starter Chips */}
              <div className="border-t border-line/60 bg-bg/40 px-3 py-2 overflow-x-auto no-scrollbar flex items-center gap-1.5">
                {[
                  "Tell me about your background",
                  "What are your top skills?",
                  "What documents did you read?",
                  "Why hire you?",
                ].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => void sendChatMessage(chip)}
                    disabled={chatLoading}
                    className="shrink-0 rounded-lg border border-line bg-card px-2 py-0.5 text-[10px] text-muted hover:border-accent/40 hover:text-fg transition-colors"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Chat Input Form */}
              <form
                onSubmit={handleChatSubmit}
                className="border-t border-line bg-card p-3 relative flex items-center gap-2"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask any question about your CV or docs..."
                  disabled={chatLoading}
                  className="flex-1 rounded-xl border border-line-strong bg-bg py-2.5 pl-3 pr-3 text-xs text-fg outline-none focus:border-accent disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={chatLoading || !chatInput.trim()}
                  className="grid size-9 place-items-center rounded-xl bg-accent text-on-accent transition-opacity disabled:opacity-40 shrink-0"
                  title="Send message"
                >
                  {chatLoading ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                </button>
              </form>
            </div>

            {/* Knowledge Sync Callout Card */}
            <div className="rounded-2xl border border-line bg-card/60 p-5 space-y-3">
              <span className="text-xs font-semibold text-fg flex items-center gap-1.5">
                <FileText className="size-3.5 text-accent" /> CV Knowledge Auto-Sync
              </span>
              <p className="text-xs leading-relaxed text-muted">
                Your AI assistant automatically reads your work history, company roles, projects, and
                education from your active CV.
              </p>
              <div className="border-t border-line/60 pt-2 flex items-center justify-between text-xs">
                <span className="text-muted">Need to edit layout or PDF?</span>
                <Link
                  href={`/account/training/${slug}/design/`}
                  className="font-semibold text-accent hover:underline flex items-center gap-1"
                >
                  Edit CV Design <ExternalLink className="size-3" />
                </Link>
              </div>
            </div>

            {/* Quick Train Callout */}
            <div className="rounded-2xl border border-accent/20 bg-accent-soft/10 p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-fg">
                <Zap className="size-4 text-accent" />
                <span>Ready to publish updates?</span>
              </div>
              <p className="text-xs leading-relaxed text-muted">
                Clicking &quot;Train CV AI&quot; builds pgvector embeddings and activates the live semantic
                cache for your public persona.
              </p>
              <button
                type="button"
                onClick={() => void startAiTraining()}
                disabled={trainingState === "training" || trainingState === "starting"}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-accent py-2.5 text-xs font-semibold text-on-accent shadow-sm transition-opacity hover:opacity-95 disabled:opacity-60"
              >
                {trainingState === "training" ? (
                  <>
                    <LoaderCircle className="size-3.5 animate-spin" /> Training AI...
                  </>
                ) : (
                  <>
                    <Rocket className="size-3.5" /> Train CV AI Now
                  </>
                )}
              </button>
            </div>
          </aside>
        </div>

        {/* Advanced Developer Settings (Collapsed by default so it stays completely out of the way) */}
        <details className="group rounded-2xl border border-line bg-card/40 p-5 transition-all">
          <summary className="flex cursor-pointer items-center justify-between text-xs font-semibold text-muted hover:text-fg">
            <span>Advanced Developer Settings (Optional)</span>
            <span className="text-[11px] group-open:rotate-180 transition-transform">▼</span>
          </summary>

          <div className="mt-4 space-y-4 pt-4 border-t border-line">
            <div>
              <label htmlFor="custom-rules" className="block text-xs font-semibold text-fg">
                Custom System Prompt Instructions (doc.rules.extra)
              </label>
              <p className="mt-0.5 text-[11px] text-muted">
                Add any specific instructions for how your AI should handle edge cases or recruiter
                questions.
              </p>
              <textarea
                id="custom-rules"
                rows={3}
                value={customRules}
                onChange={(e) => setCustomRules(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-line-strong bg-bg p-3 text-xs text-fg font-mono outline-none focus:border-accent"
                placeholder="Answer only from the verified facts in this profile..."
              />
            </div>

            <div>
              <label htmlFor="raw-json-inspector" className="block text-xs font-semibold text-fg">
                Raw Profile JSON
              </label>
              <textarea
                id="raw-json-inspector"
                rows={10}
                readOnly
                value={rawJsonText}
                className="mt-1.5 w-full rounded-xl border border-line-strong bg-bg p-3 text-xs text-fg font-mono leading-relaxed outline-none"
              />
            </div>
          </div>
        </details>
      </div>
    </main>
  );
}
