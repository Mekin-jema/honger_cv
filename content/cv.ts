// Wording for the printable CV (/cv and the PDF). Same facts as the chat, written tighter:
// achievement-first bullets, numbers where they're verified, 2 A4 pages.

export const cv = {
  /** European CVs (DE/FR/NL...) usually include a photo; set false for UK/US/IE applications. */
  showPhoto: true,
  title: "Software Engineer · Full-Stack (TypeScript / React / AI)",
  availability: "Open to software engineering, AI, data analytics, and DevOps roles",
  photo: "/images/mekin.png",

  profile:
    "Computer Engineer and software engineer with a strong foundation in full-stack development, AI systems, data analytics and DevOps. I graduated from Addis Ababa University with a CGPA of 3.70 and have hands-on experience building production software, automation workflows, GIS platforms and IoT solutions across telecom, business and engineering environments.",

  highlights: [
    "Graduated from Addis Ababa University with a CGPA of 3.70 in Computer Engineering.",
    "Worked in telecom customer analytics, pricing and customer value management at Safaricom Ethiopia.",
    "Built AI, analytics and automation tools across research, software and business workflows.",
    "Delivered IoT, GIS and full-stack application projects with real-world operational impact.",
  ],

  skills: [
    { k: "Languages", v: "TypeScript, JavaScript, Python, Java, SQL" },
    { k: "Front end", v: "React, Next.js, React Native, Angular, Tailwind CSS, Shadcn UI, Redux, Zustand" },
    { k: "Back end", v: "Node.js, Express, FastAPI, Django, Hono, REST APIs, GraphQL, microservices" },
    { k: "AI & LLM", v: "LangChain, LangGraph, RAG, AI Agents, OpenAI APIs, MCP, OpenSearch" },
    { k: "Data", v: "SQL, Oracle, PostgreSQL, MongoDB, MySQL, Prisma, Firebase, analytics and KPI reporting" },
    { k: "Cloud & DevOps", v: "Docker, Kubernetes (basic), AWS, Jenkins, GitHub Actions, CI/CD, cloud deployment" },
    { k: "Testing", v: "Playwright, Jest, Cypress, Robot Framework, automated QA for web and APIs" },
    { k: "IoT & Embedded", v: "ESP32, Arduino, sensor integration, circuit design, prototyping and cloud-connected systems" },
  ],

  experience: [
    {
      company: "Safaricom Ethiopia Telecommunications PLC",
      role: "Data Analyst",
      period: "Jun 2026 - Present",
      location: "Addis Ababa, Ethiopia",
      context: "Pricing, Reporting & Customer Value Management (CVM).",
      bullets: [
        "Analyze large-scale customer, revenue, traffic, product and operational datasets to generate actionable business insights.",
        "Develop KPI reports and support customer and product performance analysis across bundles, usage and business outcomes.",
        "Use SQL and Oracle to transform data into metrics, reports and decision-support outputs for pricing and customer behavior analysis.",
      ],
      engagements: [
        {
          title: "Pricing, Reporting & CVM",
          period: "Current",
          bullets: [
            "Customer and revenue analytics across telecom data sets.",
            "Bundle performance, conversion analysis and usage/revenue reporting.",
            "Geographic and cluster analysis to support customer segmentation and decision-making.",
          ],
          stack: "SQL, Oracle, KPI reporting, customer analytics, telecom data",
        },
      ],
    },
    {
      company: "Safaricom Ethiopia Telecommunications",
      role: "Business Analyst",
      period: "Apr 2026 - Jun 2026",
      location: "Addis Ababa, Ethiopia",
      context: "Requirements analysis and solution design.",
      bullets: [
        "Gathered and analyzed business requirements from stakeholders and translated them into clear functional and technical requirements.",
        "Prepared Business Requirement Documents (BRD), user stories, acceptance criteria and solution design documentation.",
        "Collaborated with business and technical teams to validate requirements and ensure alignment with strategic objectives.",
      ],
      engagements: [],
    },
    {
      company: "QA and software quality work",
      role: "QA Engineer",
      period: "Dec 2025 - Mar 2026",
      location: "Addis Ababa, Ethiopia",
      context: "Automation and software quality assurance.",
      bullets: [
        "Designed and executed manual and automated test cases to ensure software quality and reliability.",
        "Developed automated tests with Robot Framework and Playwright for functional, regression, integration and end-to-end testing.",
        "Identified, documented and tracked defects through the software development lifecycle.",
        "Integrated automated testing into CI/CD pipelines using Jenkins and validated APIs and application functionality.",
      ],
      engagements: [],
    },
    {
      company: "Power Ethiopia",
      role: "Software Engineer",
      period: "Oct 2025 - Apr 2026",
      location: "Remote",
      context: "Web platform development and payment workflows.",
      bullets: [
        "Led the company WordPress website and landing page development, including Elementor customization and plugin configuration.",
        "Designed and maintained the training registration system and integrated FenanPay for local payment processing.",
        "Supported backend and frontend teams by improving API integration and business-facing dashboards.",
      ],
      engagements: [],
    },
    {
      company: "Ambalay Maps",
      role: "Frontend Developer",
      period: "Aug 2025 - Sep 2025",
      location: "Remote",
      context: "GIS and mapping platform.",
      bullets: [
        "Worked on a geospatial web platform with route planning, geocoding and traffic analysis features.",
        "Built custom map layers, markers and UX components using React, Next.js and TypeScript.",
        "Collaborated with backend engineers to integrate geospatial APIs and improve map performance.",
      ],
      engagements: [],
    },
  ],

  projects: [
    {
      name: "Honey Badger AI",
      meta: "AI / Agentic AI",
      text: "Agentic AI research assistant with retrieval, verification and external tool use for research-heavy workflows.",
    },
    {
      name: "Safaricom Customer, Revenue & Traffic Analytics",
      meta: "SQL / Oracle / CVM",
      text: "Enterprise-scale analytics on customer behavior, revenue, bundle performance and telecom KPI reporting.",
    },
    {
      name: "SmartDrainX",
      meta: "IoT / Full-Stack",
      text: "IoT-based smart drainage monitoring system with ESP32 sensors, cloud storage, alerts and a live dashboard.",
    },
    {
      name: "Ambalay Maps",
      meta: "GIS / Mapping",
      text: "Geospatial mapping product with route planning, custom layers, geocoding and traffic visualization features.",
    },
    {
      name: "QA Automation Framework",
      meta: "Robot Framework / Playwright / CI/CD",
      text: "Automated testing framework for functional, regression and end-to-end validation across software releases.",
    },
    {
      name: "Portfolio / Interview Agent",
      meta: "AI / Portfolio System",
      text: "AI-guided portfolio assistant for exploring skills, experience, projects and technical capabilities.",
    },
  ],

  education: {
    degree: "BSc in Computer Engineering",
    school: "Addis Ababa University (AAU)",
    year: "2021 - 2025",
    note: "CGPA: 3.70. Final project: IoT-Based Smart Drainage Monitoring System.",
  },

  courses: ["Data Structures and Algorithms", "Embedded Systems", "Web Development", "Database Systems"],

  languages: [
    { name: "Amharic", level: "Native" },
    { name: "English", level: "Professional working proficiency" },
  ],
};
