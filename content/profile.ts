export const profile = {
  name: "Mekin Jemal",
  shortName: "Mekin",
  initials: "MJ",
  role: "Software Engineer · Full-Stack Developer · AI Engineer",
  headline: "Full-stack, AI, data analytics, DevOps, GIS, and IoT solutions",
  location: "Addis Ababa, Ethiopia",
  openTo: "Open to software engineering, AI, data analytics, and DevOps roles",
  /** The "Hire me" card. */
  hire: {
    lookingFor: [
      {
        k: "Roles",
        v: "Software Engineer · Full-Stack Engineer · AI Engineer · Data Analyst · DevOps / QA Engineer",
        note: "Build reliable products, analytics workflows, AI systems and automation pipelines.",
      },
      {
        k: "Where",
        v: "Addis Ababa, remote or hybrid opportunities",
        note: "Interested in teams solving real business and technical problems with a strong engineering mindset.",
      },
    ],
    strengths: [
      { k: "Full stack", v: "React, Next.js, TypeScript, Node.js, Express, FastAPI, PostgreSQL, MongoDB" },
      { k: "AI & data", v: "LangChain, LangGraph, RAG, agentic AI, SQL/Oracle analytics, KPI reporting, CVM insights" },
      { k: "Cloud & DevOps", v: "Docker, Jenkins, GitHub Actions, AWS, Kubernetes basics, CI/CD automation" },
      { k: "IoT & GIS", v: "ESP32, sensor integration, geospatial dashboards, MapLibre, route planning and monitoring systems" },
      { k: "Quality", v: "Playwright, Robot Framework, Jest, Cypress, API validation and release testing" },
    ],
  },
  email: "mekinjemal999@gmail.com",
  phone: "+251 920 064 543",
  phoneHref: "tel:+251920064543",
  links: {
    github: "https://github.com/Mekin-jema",
    linkedin: "https://www.linkedin.com/in/mekin-jemal-7933b42a3/",
    linkedinHandle: "linkedin.com/in/mekin-jemal-7933b42a3",
    linkedinRecommendations: "https://www.linkedin.com/in/mekin-jemal-7933b42a3/details/recommendations/",
    portfolioRepo: "https://github.com/Mekin-jema",
  },
  cvPdf: "/Mekin-Jemal-CV.pdf",
  cvUpdated: "October 2026",
  summary:
    "Computer Engineer and software engineer focused on full-stack development, AI systems, data analytics and DevOps. I graduated from Addis Ababa University with a CGPA of 3.70 and have hands-on experience building production software, automation workflows, GIS platforms, analytics systems and IoT solutions across telecom, business and engineering environments.",
  stats: [
    { value: "3+", label: "years across software, AI and analytics work" },
    { value: "5+", label: "major project areas across full stack, AI, GIS and IoT" },
    { value: "3.70", label: "CGPA in Computer Engineering" },
    { value: "10+", label: "core tools and stacks used in delivery" },
  ],
  /** What I do, shown under "About me". */
  focus: [
    { area: "Full stack", text: "Build modern web apps, backend APIs and data-driven product experiences in TypeScript, React and Node.js." },
    { area: "AI", text: "Design RAG pipelines, agentic workflows and intelligent systems using LangChain, LangGraph and OpenAI-compatible tooling." },
    { area: "Data", text: "Analyze telecom, customer, revenue and operational datasets with SQL, Oracle and KPI reporting for business decisions." },
    { area: "Cloud & QA", text: "Ship reliable systems with Docker, Jenkins, GitHub Actions, automated tests and CI/CD pipelines." },
    { area: "IoT & GIS", text: "Build connected hardware and spatial dashboards using ESP32, sensors, MapLibre and geospatial APIs." },
  ],
} as const;

export type Profile = typeof profile;
