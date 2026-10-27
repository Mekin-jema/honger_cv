import type { CvData } from "./cv";

/**
 * 100% fictional, neutral sample CV data for public showcases, landing pages, and template demos.
 * This guarantees that NO customer's personal CV text is ever exposed on templates or public pages.
 */
export const showcaseSampleCv: CvData = {
  showPhoto: false,
  title: "Senior Full-Stack & Cloud Engineer",
  availability: "Available for full-time engineering & technical lead roles",
  photo: "",
  profile:
    "Senior Full-Stack Engineer with 6+ years of experience architecting high-scale web platforms, distributed cloud APIs, and modern user interfaces. Proven track record leading agile engineering squads, reducing system latency, and delivering resilient enterprise software.",
  highlights: [
    "Architected event-driven microservices handling 25M+ daily requests with 99.99% uptime.",
    "Reduced cloud infrastructure costs by 28% through Redis caching and database query optimization.",
    "Mentored 8+ junior and mid-level engineers in modern TypeScript, React, and distributed systems.",
    "Engineered comprehensive end-to-end automated testing suites achieving 94% code coverage.",
  ],
  skills: [
    { k: "Languages", v: "TypeScript, JavaScript, Python, Go, SQL" },
    { k: "Frontend", v: "React, Next.js, Tailwind CSS, Redux Toolkit, WebSockets, Accessible UI" },
    { k: "Backend", v: "Node.js, Express, FastAPI, RESTful APIs, GraphQL, Microservices" },
    { k: "Databases", v: "PostgreSQL, Redis, MongoDB, MySQL, Prisma ORM, Query Optimization" },
    { k: "Cloud & DevOps", v: "Docker, Kubernetes, AWS (ECS, S3, RDS), GitHub Actions, CI/CD" },
    { k: "Architecture", v: "Distributed Systems, Event-Driven Architecture, Observability, Caching" },
  ],
  experience: [
    {
      company: "Apex Cloud Technologies",
      role: "Senior Software Engineer",
      period: "2023 — Present",
      location: "San Francisco, CA (Remote)",
      context: "Core Platform & Infrastructure Team",
      bullets: [
        "Architect and maintain core ingestion pipelines processing 25M+ daily webhook events.",
        "Refactored legacy REST endpoints into high-performance GraphQL services, reducing average latency by 38%.",
        "Collaborated with product and security teams to implement automated SOC2 compliance workflows.",
      ],
      engagements: [
        {
          title: "Real-Time Telemetry Pipeline",
          period: "2024",
          bullets: [
            "Engineered event streaming pipeline with Kafka and Redis Streams.",
            "Built interactive operational health dashboard using React and Tailwind CSS.",
          ],
          stack: "TypeScript, Next.js, Redis, PostgreSQL, AWS",
        },
      ],
    },
    {
      company: "Meridian Labs",
      role: "Full-Stack Software Engineer",
      period: "2021 — 2023",
      location: "Austin, TX",
      context: "Growth & Analytics Squad",
      bullets: [
        "Delivered customer-facing analytics dashboards used daily by 50,000+ active business accounts.",
        "Created reusable design system component library adopted across 4 distinct web applications.",
        "Integrated secure payment and subscription management workflows with Stripe APIs.",
      ],
      engagements: [],
    },
  ],
  projects: [
    {
      name: "PulseMetrics",
      meta: "Distributed Monitoring Engine",
      text: "High-performance time-series metric aggregator built with Go, React, and WebSockets.",
    },
    {
      name: "NovaFlow",
      meta: "Visual Workflow Orchestrator",
      text: "Open-source declarative task runner with interactive DAG canvas and automated execution.",
    },
  ],
  education: {
    degree: "B.S. in Computer Science",
    school: "State University",
    year: "2021",
    note: "Magna Cum Laude · Dean's Honor List",
  },
  courses: ["Distributed Systems", "Algorithms & Complexity", "Database Systems", "Cloud Computing"],
  languages: [
    { name: "English", level: "Native / Bilingual" },
    { name: "Spanish", level: "Professional Working Proficiency" },
  ],
  identity: {
    name: "Alex Morgan",
    email: "alex.morgan@example.com",
    phone: "+1 (555) 019-2834",
    location: "San Francisco, CA",
    links: [
      { label: "github.com/alexmorgan", href: "https://github.com" },
      { label: "linkedin.com/in/alexmorgan", href: "https://linkedin.com" },
    ],
  },
};
