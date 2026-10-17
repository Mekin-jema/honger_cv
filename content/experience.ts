export type Engagement = {
  title: string;
  role: string;
  period: string;
  bullets: string[];
  stack?: string[];
};

export type Job = {
  company: string;
  role: string;
  period: string;
  location: string;
  context?: string;
  bullets: string[];
  engagements?: Engagement[];
};

export const experience: Job[] = [
  {
    company: "Safaricom Ethiopia Telecommunications PLC",
    role: "Data Analyst",
    period: "Jun 2026 - Present",
    location: "Addis Ababa, Ethiopia",
    context: "Pricing, Reporting & Customer Value Management (CVM)",
    bullets: [
      "Analyze large-scale customer, revenue, traffic, product and operational datasets to generate actionable business insights.",
      "Develop KPI reports and support customer and product performance analysis across voice, data, bundles and usage patterns.",
      "Use SQL and Oracle to transform raw telecom data into metrics, reports and business-ready outputs for pricing and customer value analysis.",
      "Work on geographic and cluster analysis to support segmentation, customer behavior understanding and decision-making.",
    ],
    engagements: [
      {
        title: "Pricing, Reporting & CVM",
        role: "Data Analyst",
        period: "Current",
        bullets: [
          "Customer and revenue analytics across telecom datasets.",
          "Bundle performance, conversion analysis and usage/revenue reporting.",
          "Geographic and cluster analysis to improve customer segmentation and decision support.",
        ],
        stack: ["SQL", "Oracle", "KPI reporting", "Customer analytics", "Telecom data"],
      },
    ],
  },
  {
    company: "Safaricom Ethiopia Telecommunications ",
    role: "Business Analyst",
    period: "Apr 2026 - Jun 2026",
    location: "Addis Ababa, Ethiopia",
    context: "Requirements analysis and solution design",
    bullets: [
      "Gathered and analyzed business requirements from stakeholders and translated them into technical and functional requirements.",
      "Prepared BRDs, user stories, acceptance criteria and solution documentation for business and technology initiatives.",
      "Collaborated with cross-functional teams to validate requirements, support design decisions and align solutions with business objectives.",
    ],
  },
  {
    company: "Safaricom Ethiopia Telecommunications_PLC",
    role: "QA Engineer",
    period: "Dec 2025 - Mar 2026",
    location: "Addis Ababa, Ethiopia",
    context: "Automation and software quality assurance",
    bullets: [
      "Designed and executed manual and automated test cases to ensure software quality and reliability.",
      "Developed automated tests using Robot Framework and Playwright for functional, regression, integration and end-to-end coverage.",
      "Tracked defects through the software development life cycle and collaborated with teams to resolve issues quickly.",
      "Integrated automated testing into CI/CD pipelines with Jenkins and validated APIs and business workflows.",
    ],
  },
  {
    company: "Power Ethiopia",
    role: "Software Engineer",
    period: "Oct 2025 - Apr 2026",
    location: "Remote",
    context: "Website development and digital platform work",
    bullets: [
      "Led WordPress website and landing page development, including Elementor configuration and plugin customization.",
      "Designed and maintained a training registration system and integrated FenanPay for local payments and automated enrollment workflows.",
      "Reviewed frontend and backend integration work to improve API behavior, platform interoperability and product reliability.",
    ],
  },
  {
    company: "Ambalay Maps",
    role: "Frontend Developer",
    period: "Aug 2025 - Sep 2025",
    location: "Remote",
    context: "GIS and mapping platform",
    bullets: [
      "Built responsive geospatial web features for route planning, geocoding, reverse geocoding and traffic analysis.",
      "Worked with MapLibre, OpenMapTiles and Valhalla to deliver map rendering, routing and custom location-based features.",
      "Collaborated with backend engineers to integrate production-ready APIs and improve performance and usability.",
    ],
  },
];
