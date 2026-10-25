import { describe, expect, it } from "vitest";
import { isStarterCv, mergeCvData } from "@/server/services/cv-mapper/safe-merge";
import { mapResumeParserResult, ResumeParserError } from "./resume-parser";

describe("Resume Parser mapping", () => {
  const payload = {
    personal_info: {
      name: "Jane Example",
      label: "Software Engineer",
      email: "jane@example.com",
      phone: "+880 1712 345678",
      location: { city: "Dhaka", country: "Bangladesh" },
      urls: [{ type: "github", url: "https://github.com/jane", label: "GitHub" }],
    },
    experience: [
      {
        company: "Example Corp",
        title: "Backend Engineer",
        start_date: "2020-01",
        end_date: "2024-06",
        current: false,
        description: "Built APIs.",
        highlights: ["Cut latency by 40%", "Mentored 3 juniors"],
        location: { city: "Dhaka" },
      },
      {
        company: "Current Co",
        title: "Senior Engineer",
        start_date: "2024-07",
        end_date: null,
        current: true,
        highlights: ["Leads platform work"],
      },
    ],
    education: [
      {
        institution: "North South University",
        degree: "BSc",
        field_of_study: "Computer Science",
        graduation_date: "2019",
        gpa: { value: 3.8, max: 4 },
        honors: "cum laude",
        courses: ["Algorithms", "Databases"],
      },
      { institution: "Second School", degree: "MSc", graduation_date: "2021" },
    ],
    skills: [
      { skill: "TypeScript", category: "Languages" },
      { skill: "Node.js", category: "Languages" },
      { skill: "TypeScript", category: "Languages" },
      { skill: "PostgreSQL", category: "Databases" },
      { skill: "Lonely" },
    ],
    certifications: [{ name: "AWS Developer", issuer: "Amazon" }],
    languages: [
      { language: "Bangla", proficiency: "native" },
      { language: "English", proficiency: "professional-working" },
    ],
    projects: [
      {
        name: "Open Source CMS",
        description: "A headless CMS.",
        role: "Maintainer",
        url: "https://example.com",
        technologies: ["TypeScript", "Postgres"],
        highlights: ["1k stars"],
      },
    ],
    awards: [{ title: "Best Hack", awarder: "GDG", date: "2022" }],
  };

  it("maps identity, links and location", () => {
    const cv = mapResumeParserResult(payload);
    expect(cv.identity.name).toBe("Jane Example");
    expect(cv.identity.email).toBe("jane@example.com");
    expect(cv.identity.phone).toBe("+880 1712 345678");
    expect(cv.identity.location).toBe("Dhaka, Bangladesh");
    expect(cv.title).toBe("Software Engineer");
    expect(cv.identity.links).toEqual([{ label: "GitHub", href: "https://github.com/jane" }]);
  });

  it("keeps each accomplishment as its own bullet and marks current roles", () => {
    const cv = mapResumeParserResult(payload);
    expect(cv.experience).toHaveLength(2);
    expect(cv.experience[0]).toMatchObject({
      company: "Example Corp",
      role: "Backend Engineer",
      period: "2020-01 – 2024-06",
      location: "Dhaka",
      context: "Built APIs.",
    });
    expect(cv.experience[0].bullets).toEqual(["Cut latency by 40%", "Mentored 3 juniors"]);
    expect(cv.experience[1].period).toBe("2024-07 – Present");
    expect(cv.experience.every((job) => job.engagements.length === 0)).toBe(true);
  });

  it("groups skills under their categories without duplicates", () => {
    const cv = mapResumeParserResult(payload);
    const byCategory = Object.fromEntries(cv.skills.map((skill) => [skill.k, skill.v]));
    expect(byCategory.Languages).toBe("TypeScript, Node.js");
    expect(byCategory.Databases).toBe("PostgreSQL");
    expect(byCategory.Skills).toBe("Lonely");
  });

  it("maps education, courses, languages, projects and awards", () => {
    const cv = mapResumeParserResult(payload);
    expect(cv.education.degree).toBe("BSc · Computer Science");
    expect(cv.education.school).toBe("North South University");
    expect(cv.education.year).toBe("2019");
    expect(cv.education.note).toContain("MSc · Second School · 2021");
    expect(cv.education.note).toContain("GPA 3.8/4");
    expect(cv.education.note).toContain("cum laude");
    expect(cv.courses).toEqual(["Algorithms", "Databases", "AWS Developer"]);
    expect(cv.languages).toEqual([{ name: "Bangla", level: "native" }, { name: "English", level: "professional-working" }]);
    expect(cv.projects[0]).toMatchObject({
      name: "Open Source CMS",
      meta: "Maintainer · TypeScript · Postgres · https://example.com",
      text: "A headless CMS.\n1k stars",
    });
    expect(cv.highlights).toEqual(["Best Hack · GDG · 2022"]);
  });

  it("replaces the Mekin starter CV with mapped parser output", () => {
    const starterCv = {
      showPhoto: true,
      title: "Data Analyst",
      availability: "",
      photo: "/images/mekin.jpg",
      profile: "Starter profile",
      highlights: ["Starter achievement"],
      skills: [{ k: "Starter", v: "Sample skill" }],
      experience: [{
        company: "Safaricom Ethiopia Telecommunications PLC",
        role: "Data Analyst",
        period: "",
        location: "",
        context: "",
        bullets: [],
        engagements: [],
      }],
      projects: [],
      education: { degree: "", school: "", year: "", note: "" },
      courses: [],
      languages: [],
      identity: { name: "Mekin Jemal", links: [] },
    };
    const result = mergeCvData(starterCv, mapResumeParserResult(payload), {
      isStarterDraft: isStarterCv(starterCv),
    });

    expect(result.mergedCv.identity?.name).toBe("Jane Example");
    expect(result.mergedCv.title).toBe("Software Engineer");
    expect(result.mergedCv.experience[0].company).toBe("Example Corp");
    expect(result.mergedCv.skills).toEqual([
      { k: "Languages", v: "TypeScript, Node.js" },
      { k: "Databases", v: "PostgreSQL" },
      { k: "Skills", v: "Lonely" },
    ]);
  });

  it("leaves fields empty when the parser has no data", () => {
    const cv = mapResumeParserResult({ personal_info: { name: "  " } });
    expect(cv.identity.name).toBe("");
    expect(cv.title).toBe("");
    expect(cv.experience).toEqual([]);
    expect(cv.skills).toEqual([]);
    expect(cv.education).toEqual({ degree: "", school: "", year: "", note: "" });
  });

  it("exposes a named error type", () => {
    expect(new ResumeParserError("x").name).toBe("ResumeParserError");
  });
});
