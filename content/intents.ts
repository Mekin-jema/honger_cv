import {
  Award,
  BookOpen,
  Briefcase,
  Cloud,
  Code2,
  Download,
  Hammer,
  Languages,
  type LucideIcon,
  Lightbulb,
  ShieldCheck,
  Quote,
  Rocket,
  Shuffle,
  Sparkles,
  User,
} from "lucide-react";
import type { Block } from "@/lib/persona/types";
import { facts } from "./details";
import { projects } from "./projects";

export type { Block };

export type Intent = {
  id: string;
  label: string;
  prompt: string;
  icon: LucideIcon;
  keywords: string[];
  primary?: boolean;
  answers: string[];
  blocks: Block[];
  followUps: string[];
};

const base: Intent[] = [
  {
    id: "about",
    label: "About me",
    prompt: "Who are you?",
    icon: User,
    primary: true,
    keywords: ["about", "who", "you", "bio", "intro", "yourself", "summary", "mekin", "profile"],
    answers: [
      "I'm **Mekin Jemal**, a software engineer working across **full-stack development, AI, data analytics and DevOps**. I graduated from Addis Ababa University with a CGPA of 3.70 and have built software, analytics systems, IoT projects and GIS platforms across telecom, business and engineering environments.",
      "Short version: I'm a **software engineer with a strong mix of product, AI, data and systems work**. I build full-stack applications and also work on analytics, automation and IoT projects that connect engineering with real business impact.",
    ],
    blocks: [{ kind: "stats" }, { kind: "focus" }],
    followUps: ["experience", "projects", "beliefs"],
  },
  {
    id: "experience",
    label: "Experience",
    prompt: "Walk me through your experience.",
    icon: Briefcase,
    primary: true,
    keywords: ["experience", "work", "job", "career", "history", "company", "employer", "safaricom", "power", "ambalay", "qa", "analytics"],
    answers: [
      "My recent experience spans **telecom analytics, business analysis, quality assurance, frontend development and product engineering**. I worked at Safaricom Ethiopia in data and business analysis, then moved into QA and product-focused software work before building more full-stack and AI-focused solutions.",
      "I have worked in **telecom data and customer value management, QA automation, web development, GIS and IoT**. The common thread is using software to solve real operational and business problems.",
    ],
    blocks: [{ kind: "experience" }],
    followUps: ["projects", "skills", "education"],
  },
  {
    id: "projects",
    label: "Projects",
    prompt: "Show me your projects.",
    icon: Rocket,
    primary: true,
    keywords: ["projects", "portfolio", "work", "built", "build", "apps", "side", "github", "showcase"],
    answers: [
      "These are the projects I’m most proud of: **Honey Badger AI**, **Safaricom analytics**, **SmartDrainX**, **Ambalay Maps**, and QA automation work. They show the mix of software, AI, analytics and systems thinking I bring to engineering.",
      "My strongest work spans **AI agent systems, telecom analytics, GIS platforms and IoT monitoring**. Tap any card to explore the details.",
    ],
    blocks: [{ kind: "projects" }],
    followUps: ["project-honey-badger-ai", "project-smartdrainx", "project-ambalay-maps"],
  },
  {
    id: "skills",
    label: "Skills",
    prompt: "What's your tech stack?",
    icon: Code2,
    primary: true,
    keywords: ["skills", "stack", "tech", "technologies", "tools", "languages", "frameworks", "react", "nextjs", "node", "typescript", "python", "sql"],
    answers: [
      "My core stack is **TypeScript, React, Next.js, Node.js and Python**, with strong work in **AI, SQL/Oracle analytics, cloud tooling and QA automation**. I also work with infrastructure, GIS and embedded systems when a project needs them.",
      "I’m strongest in **full-stack engineering with data and AI layers**: React / Next.js on the front end, Node.js / FastAPI on the back end, SQL and Oracle for analytics, and Docker and CI/CD for delivery.",
    ],
    blocks: [{ kind: "skills" }],
    followUps: ["cloud", "projects", "download"],
  },
  {
    id: "ai-experience",
    label: "AI & Agentic Systems",
    prompt: "What AI work have you done?",
    icon: Rocket,
    primary: true,
    keywords: ["ai", "llm", "rag", "agent", "agentic", "langchain", "langgraph", "opensearch", "openrouter", "mcp", "research"],
    answers: [
      "I’ve been building **AI and agentic systems** around research, retrieval and verification. My work includes **LangChain / LangGraph pipelines**, **RAG systems**, external tool use and agent-style workflows for real tasks rather than only chatbot demos.",
      "The AI side of my work focuses on **grounded research, retrieval, automation and practical workflow design**. I care about building useful systems that can retrieve information, verify it and help teams move faster.",
    ],
    blocks: [{ kind: "projects" }],
    followUps: ["projects", "experience", "download"],
  },
  {
    id: "cloud",
    label: "Cloud & DevOps",
    prompt: "What's your cloud and DevOps experience?",
    icon: Cloud,
    primary: true,
    keywords: ["cloud", "devops", "aws", "docker", "jenkins", "kubernetes", "ci", "cd", "deploy", "infrastructure", "github actions"],
    answers: [
      "I work with **Docker, Jenkins, GitHub Actions, AWS and Kubernetes basics** for deployment and delivery workflows. I’ve used automation and CI/CD to improve release confidence and testing coverage across projects.",
    ],
    blocks: [{ kind: "cloud" }],
    followUps: ["skills", "experience", "hire"],
  },
  {
    id: "education",
    label: "Education",
    prompt: "Where did you study?",
    icon: BookOpen,
    primary: true,
    keywords: ["education", "study", "studies", "university", "degree", "school", "aau", "computer engineering", "bsc"],
    answers: [
      "I studied **Electrical and Computer Engineering at Addis Ababa University (AAU)**, graduating with a **CGPA of 3.70**. My university work included embedded systems, software engineering and practical applied projects.",
    ],
    blocks: [{ kind: "education" }],
    followUps: ["languages", "experience", "download"],
  },
  {
    id: "languages",
    label: "Languages",
    prompt: "Which languages do you speak?",
    icon: Languages,
    primary: true,
    keywords: ["language", "languages", "speak", "english", "amharic"],
    answers: [
      "I speak **Amharic** as my native language and work confidently in **English** for professional communication, technical writing and collaboration.",
    ],
    blocks: [{ kind: "languages" }],
    followUps: ["about", "experience", "contact"],
  },
  {
    id: "recommendations",
    label: "Recommendations",
    prompt: "What do people say about working with you?",
    icon: Quote,
    primary: true,
    keywords: ["recommendations", "references", "testimonials", "reviews", "say", "feedback", "team"],
    answers: [
      "Recommendations aren't included in this portfolio yet. You can visit my LinkedIn profile to learn more about my background.",
    ],
    blocks: [{ kind: "quotes" }],
    followUps: ["hire", "contact", "experience"],
  },
  {
    id: "download",
    label: "Download CV",
    prompt: "Can I download your CV?",
    icon: Download,
    primary: true,
    keywords: ["download", "cv", "resume", "pdf", "file", "print"],
    answers: ["Of course. You can view the web CV here or download the PDF version from the profile."],
    blocks: [{ kind: "download" }],
    followUps: ["hire", "contact", "experience"],
  },
  {
    id: "surprise",
    label: "Surprise me",
    prompt: "Tell me something surprising.",
    icon: Shuffle,
    primary: true,
    keywords: ["surprise", "fun", "fact", "random", "interesting", "something"],
    answers: facts,
    blocks: [],
    followUps: ["surprise", "projects", "about"],
  },
  {
    id: "beliefs",
    label: "What I believe",
    prompt: "What do you believe in as an engineer?",
    icon: Lightbulb,
    keywords: ["believe", "beliefs", "values", "principles", "philosophy", "motto", "approach"],
    answers: ["A few things I believe, and try to work by every day:"],
    blocks: [{ kind: "beliefs" }],
    followUps: ["about", "recommendations", "hire"],
  },
  {
    id: "privacy",
    label: "Privacy",
    prompt: "How do you use my data?",
    icon: ShieldCheck,
    keywords: ["privacy", "data", "cookies", "tracking", "analytics", "consent"],
    answers: ["Simply and honestly. This site keeps minimal data for anonymous usage and feedback, and you can control that in the privacy settings."],
    blocks: [{ kind: "privacy" }],
    followUps: ["stack", "contact", "about"],
  },
  {
    id: "stack",
    label: "How this site works",
    prompt: "How did you build this site?",
    icon: Hammer,
    keywords: ["site", "website", "built", "how", "ai", "llm", "model", "bot", "real"],
    answers: [
      "This portfolio is built with a modern Next.js app and a structured knowledge layer based on my own profile, experience and project data. The conversational experience is designed to answer from my actual background, not from a generic AI persona.",
    ],
    blocks: [{ kind: "stack" }],
    followUps: ["projects", "privacy", "surprise"],
  },


  {
    id: "hire",
    label: "Work with me",
    prompt: "Are you available for opportunities?",
    icon: Sparkles,
    keywords: [
      "hire",
      "hiring",
      "work",
      "opportunity",
      "job",
      "freelance",
      "collaboration",
    ],
    answers: [
      "I'm open to opportunities where I can contribute across software engineering, AI, data, automation and product-focused technical work."
    ],
    blocks: [],
    followUps: ["contact", "experience", "projects"],
  },
  {
    id: "contact",
    label: "Contact me",
    prompt: "How can I contact you?",
    icon: User,
    keywords: [
      "contact",
      "email",
      "phone",
      "linkedin",
      "reach",
      "connect",
    ],
    answers: [
      "You can reach me through the contact details provided in my portfolio."
    ],
    blocks: [],
    followUps: ["hire", "about", "experience"],
  },
];

const projectIntents: Intent[] = projects.map((p) => ({
  id: `project-${p.id}`,
  label: p.name,
  prompt: `Tell me about the ${p.name} project.`,
  icon: Award,
  keywords: [p.name.toLowerCase(), ...p.name.toLowerCase().split(/\s+/), p.id, ...p.stack.map((s) => s.toLowerCase())],
  answers: [`**${p.name}**: ${p.tagline}`],
  blocks: [{ kind: "project", id: p.id }],
  followUps: [...projects.filter((o) => o.id !== p.id).slice(0, 2).map((o) => `project-${o.id}`), "download"],
}));

export const fallbackIntent: Intent = {
  id: "fallback",
  label: "Not sure",
  prompt: "",
  icon: Sparkles,
  keywords: [],
  answers: [
    "That one’s outside what this chat covers. Try one of these:",
    "Good question, but I keep this chat focused on my background and projects. How about one of these?",
  ],
  blocks: [{ kind: "suggest" }],
  followUps: [],
};

export const intents: Intent[] = [...base, ...projectIntents];
export const primaryIntents = intents.filter((i) => i.primary);

const byId = new Map(intents.map((i) => [i.id, i]));
export const getIntent = (id: string): Intent | undefined => byId.get(id);
