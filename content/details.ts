export const skills: { group: string; items: string[] }[] = [
  { group: "Languages", items: ["TypeScript", "JavaScript", "Python", "Java", "SQL", "HTML5", "CSS3"] },
  {
    group: "Front end",
    items: ["React", "Next.js", "React Native", "Angular", "Redux Toolkit", "Zustand", "Tailwind CSS", "Shadcn UI", "Framer Motion"],
  },
  {
    group: "Back end",
    items: ["Node.js", "Express", "FastAPI", "Django", "Hono", "REST APIs", "GraphQL", "Microservices"],
  },
  {
    group: "AI & LLM",
    items: ["LangChain", "LangGraph", "RAG", "AI Agents", "OpenAI APIs", "MCP", "OpenSearch", "Vector search", "Research automation"],
  },
  {
    group: "Data",
    items: ["SQL", "Oracle", "PostgreSQL", "MongoDB", "MySQL", "SQLite", "Prisma", "Firebase", "KPI reporting", "Customer analytics"],
  },
  {
    group: "Cloud & DevOps",
    items: ["Docker", "Kubernetes", "AWS", "Jenkins", "GitHub Actions", "CI/CD pipelines", "Cloud deployment", "Infrastructure automation"],
  },
  {
    group: "Testing",
    items: ["Playwright", "Jest", "Cypress", "Robot Framework", "API testing", "Regression testing", "End-to-end QA"],
  },
  {
    group: "IoT & GIS",
    items: ["ESP32", "Arduino", "Sensor integration", "PCB prototyping", "MapLibre", "OpenLayers", "Geospatial APIs", "Route planning"],
  },
];

export const cloud: { name: string; where: string }[] = [
  { name: "Docker", where: "Used for local development environments, deployments and reproducible stacks across projects." },
  { name: "Jenkins", where: "Automated CI/CD pipelines and reporting for software quality and release workflows." },
  { name: "GitHub Actions", where: "Continuous integration and deployment automation across software and QA projects." },
  { name: "AWS", where: "Cloud infrastructure and deployment support for production and project systems." },
  { name: "Kubernetes", where: "Basic orchestration and deployment experience in test and delivery pipelines." },
  { name: "MongoDB Atlas", where: "Cloud data storage for IoT and event-driven monitoring systems." },
  { name: "Firebase", where: "Used for application storage and backend service integrations." },
];

export const education = {
  degree: "BSc in Electrical and Computer Engineering (Computer)",
  school: "Addis Ababa University (AAU)",
  location: "Addis Ababa, Ethiopia",
  year: "2021 - 2025",
  capstone: "IoT-Based Smart Drainage Monitoring System: an embedded and cloud-connected solution for monitoring sewage conditions, alerts and operational reporting.",
  courses: ["Embedded Systems", "Web Development", "Database Systems", "Computer Engineering", "Data Structures and Algorithms"],
};

export const languages: { name: string; level: string; cefr: string; score: number }[] = [
  { name: "Amharic", level: "Native", cefr: "Native", score: 6 },
  { name: "English", level: "Professional working proficiency", cefr: "C1", score: 5 },
];

export type Recommendation = { name: string; title: string; relation: string; date: string; highlight: string; text: string };

export const quotes: Recommendation[] = [];

export const farewell: { name: string; text: string }[] = [];

export const farewellCard = {
  title: "Team notes",
  url: "https://www.linkedin.com/in/mekin-jemal-7933b42a3/",
};

export const siteStack = [
  "Next.js",
  "React",
  "TypeScript",
  "Tailwind CSS",
  "Structured portfolio data",
];

export const facts = [
  "I work across software engineering, data analytics, AI systems and IoT, which lets me connect product, infrastructure and business impact.",
  "My final university project was an IoT-based smart drainage monitoring system for real infrastructure monitoring and alerts.",
  "I have experience in telecom customer analytics, customer value management and KPI reporting at Safaricom Ethiopia.",
  "I care about building systems that are not only technically sound, but also useful, measurable and easy for teams to act on.",
];
