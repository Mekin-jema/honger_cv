export type Project = {
  id: string;
  name: string;
  year: string;
  kind: "Personal" | "Open source" | "Work" | "Freelance";
  tagline: string;
  problem: string;
  built: string[];
  numbers: string[];
  stack: string[];
  link?: { label: string; href: string };
};

export const projects: Project[] = [
  {
    id: "honey-badger-ai",
    name: "Honey Badger AI",
    year: "2025 - Present",
    kind: "Personal",
    tagline: "Agentic AI research assistant with retrieval, verification and external tool use.",
    problem:
      "Research-heavy workflows need grounded answers, strong verification and a clear way to use external tools without losing context.",
    built: [
      "Built an agentic research assistant using LangChain and LangGraph for retrieval, planning and tool use.",
      "Integrated RAG, OpenSearch and model routing for research, verification and source-grounded answers.",
      "Combined Python/FastAPI backend services with a Next.js frontend experience for interactive workflows.",
      "Designed a workflow centered on retrieval, validation and iterative exploration, rather than simple prompt answering.",
    ],
    numbers: ["Agentic research flows", "RAG + verification pipeline", "Python + FastAPI + Next.js"],
    stack: ["Python", "FastAPI", "LangChain", "LangGraph", "OpenSearch", "OpenRouter", "Next.js"],
  },
  {
    id: "travel-super-app",
    name: "Travel Super-App",
    year: "2026 - Present",
    kind: "Work",
    tagline: "Travel and commerce experience built around convenience, booking flow, and analytics-driven user journeys.",
    problem:
      "The business needed a unified mobile and web experience to simplify travel booking, itinerary management and customer engagement.",
    built: [
      "Built a travel platform experience centered on product discovery, booking flows and journey personalization.",
      "Designed analytics-informed product improvements around customer behavior and conversion funnel signals.",
      "Shaped the experience across customer-facing flows and operational tooling needed to support the product.",
      "Turned product and service data into a clearer, more reliable experience for users and internal teams.",
    ],
    numbers: ["Booking experience", "Customer journey insights", "Travel product flow"],
    stack: ["React", "Next.js", "TypeScript", "Analytics", "Travel product", "UX design"],
  },
  {
    id: "smartdrainx",
    name: "SmartDrainX",
    year: "2024 - 2025",
    kind: "Personal",
    tagline: "IoT smart drainage monitoring system with sensor integration, cloud storage and live monitoring dashboard.",
    problem:
      "Urban drainage systems needed a smart way to monitor overflow, toxic gas build-up and operational risks in near real time.",
    built: [
      "Connected ESP32 with pH, gas and ultrasonic sensors for real-time environmental monitoring.",
      "Built alert logic for dangerous gas levels and overflow conditions.",
      "Stored time-stamped sensor data on MongoDB Atlas with a live admin dashboard for visualization and issue reporting.",
      "Delivered a practical end-to-end IoT prototype covering hardware, data flow, cloud storage and dashboarding.",
    ],
    numbers: ["ESP32-based monitoring", "Live alerts", "Cloud-connected dashboard"],
    stack: ["ESP32", "Arduino", "MongoDB Atlas", "React", "Express", "Socket.IO", "MapLibre"],
  },
  {
    id: "ambalay-maps",
    name: "Ambalay Maps",
    year: "2025",
    kind: "Work",
    tagline: "Geospatial mapping platform with route planning, geocoding and traffic analysis features.",
    problem:
      "A mapping and logistics platform needed a scalable way to visualize localized data, optimize routes and surface actionable spatial insights.",
    built: [
      "Built map dashboards and location-aware features with React, Next.js and TypeScript.",
      "Integrated MapLibre, OpenMapTiles and Valhalla for map rendering, geocoding and route optimization.",
      "Developed custom layers, markers and analysis views for traffic and route planning workflows.",
      "Worked closely with backend teams to integrate production-ready geospatial APIs.",
    ],
    numbers: ["GIS dashboard", "Route planning", "Custom map features"],
    stack: ["React", "Next.js", "TypeScript", "MapLibre", "OpenMapTiles", "Valhalla", "Docker"],
  },
  {
    id: "qa-automation-framework",
    name: "QA Automation Framework",
    year: "2025 - 2026",
    kind: "Work",
    tagline: "Automated testing framework for functional, regression and end-to-end validation.",
    problem:
      "The software release process needed more reliable automated validation to reduce manual effort and catch defects earlier.",
    built: [
      "Developed automated test scripts with Robot Framework and Playwright for web and API validation.",
      "Implemented end-to-end, regression and integration testing to increase confidence in release quality.",
      "Integrated automated testing into Jenkins-based CI/CD pipelines and generated actionable reports.",
      "Supported documentation and defect tracking across the software quality lifecycle.",
    ],
    numbers: ["CI/CD testing", "Regression + E2E", "Jenkins integration"],
    stack: ["Playwright", "Robot Framework", "Jenkins", "TypeScript", "CI/CD", "QA automation"],
  },
  {
    id: "portfolio-interview-agent",
    name: "Portfolio / Interview Agent",
    year: "2025 - Present",
    kind: "Personal",
    tagline: "AI-powered portfolio assistant that explains skills, experience and technical capabilities through conversation.",
    problem:
      "Traditional CVs and portfolios can hide the deeper story behind work; a conversational interface helps people explore skills, experience and project context more naturally.",
    built: [
      "Created an AI-powered portfolio assistant for exploring professional background, projects and technical strengths.",
      "Structured a knowledge layer from profile, project and experience data to answer interview-style questions.",
      "Focused on clear explanations and practical context rather than generic AI-generated summaries.",
    ],
    numbers: ["Portfolio chat interface", "Professional knowledge system", "Interview-style Q&A"],
    stack: ["Next.js", "AI", "Portfolio data", "Knowledge retrieval", "Conversational UX"],
  },

  {
    id: "tour-app",
    name: "Company Tour App",
    year: "2025 - 2026",
    kind: "Work",
    tagline: "The company's annual-tour app. I'm its only developer.",
    problem: "Running a company-wide annual tour meant juggling rooms, schedules, tournaments and announcements across chats and spreadsheets.",
    built: [
      "Multi-tenant Microsoft login and an admin console for events, programmes and seasons, with season migration.",
      "Tournament brackets and matches, an event map and a programme explorer on Google Maps.",
      "Roommate matching and room generation with Excel export; polls with an analytics page.",
      "Community feed with moderation and mentions, notifications, and a PWA with a service worker.",
      "Companion mobile app in React Native (Expo) on the same Firebase back end.",
    ],
    numbers: ["Sole developer", "56 of 56 commits"],
    stack: ["Next.js", "Firebase", "Genkit", "Gemini", "Google Maps", "GSAP", "TanStack Table"],
  },
  {
    id: "trustportal",
    name: "TrustPortal",
    year: "2026",
    kind: "Personal",
    tagline: "A satirical 23-page SaaS site whose hidden trust score changes how the whole site behaves.",
    problem: "An experiment in interaction design: what if a website slowly grew suspicious of you?",
    built: [
      "Trust-score engine with six levels that changes the site's tone and behaviour.",
      "Hand-drawn component kit built on Rough.js.",
      "Seeded RNG so server and client HTML match; full keyboard and reduced-motion support.",
    ],
    numbers: ["23 pages", "~7.9k lines"],
    stack: ["Next.js", "JavaScript", "TypeScript", "Radix UI", "Framer Motion", "Rough.js"],
    link: { label: "github.com/maruf1020/TrustPortal", href: "https://github.com/maruf1020/TrustPortal" },
  },
  {
    id: "shadowfeed",
    name: "ShadowFeed",
    year: "2026",
    kind: "Personal",
    tagline: "Anonymous company feed with moderation and a full audit log.",
    problem: "Teams wanted a safe, anonymous place to share feedback without losing moderation.",
    built: [
      "Quiz gate before signup, posts, comments, 8 reaction types and polls, all validated with Zod in server actions.",
      "Admin moderation and suspensions, audit logging of 20 action types, recovery-question password reset.",
    ],
    numbers: ["~4.9k lines", "20 audited action types"],
    stack: ["Next.js", "NextAuth", "Prisma", "PostgreSQL", "TanStack Query", "Zod"],
    link: { label: "github.com/maruf1020/ShadowFeed", href: "https://github.com/maruf1020/ShadowFeed" },
  },
  {
    id: "tournatrack",
    name: "TournaTrack",
    year: "2025",
    kind: "Personal",
    tagline: "Tournament platform that grew into the company's annual-tour app.",
    problem: "The company's annual tour ran its tournaments on paper and spreadsheets.",
    built: [
      "Knockout, group-stage and battle-royale brackets, live scores and an interactive bracket tree.",
      "Excel employee import, Microsoft sign-in, multi-admin roles and full backup and restore.",
      "Gemini matchup suggestions through a Genkit flow with Zod-typed input and output.",
    ],
    numbers: ["~11.6k lines", "Built in 8 days"],
    stack: ["Next.js", "Firebase", "Genkit", "Gemini", "shadcn/ui"],
    link: { label: "github.com/maruf1020/TournaTrack", href: "https://github.com/maruf1020/TournaTrack" },
  },
  {
    id: "resume-builder",
    name: "Resume Builder",
    year: "2026 · in progress",
    kind: "Personal",
    tagline: "One set of layout primitives renders the résumé in the editor and as a PDF.",
    problem: "Most résumé builders show one thing on screen and export something slightly different.",
    built: [
      "Shared render primitives for the browser editor and the PDF, covered by a dual-backend test.",
      "Versioned, Zod-validated document schema with migrations; 7 section archetypes; themes and font pairs.",
      "Zustand editor store with autosave and undo/redo; credentials and Google login with argon2.",
    ],
    numbers: ["~7.5k lines", "7 section archetypes"],
    stack: ["Next.js", "Auth.js", "Prisma", "PostgreSQL", "Zustand", "Zod", "React PDF"],
  },
];



export const projectById = (id: string) => projects.find((p) => p.id === id);
