import { describe, expect, it } from "vitest";
import { mergeCvData } from "./safe-merge";
import type { CvData } from "@/lib/persona/cv";
import type { StructuredCvData } from "../cv-extractor/schema";

const emptyCv: CvData = {
  showPhoto: false,
  title: "",
  availability: "",
  photo: "",
  profile: "",
  highlights: [],
  skills: [],
  experience: [],
  projects: [],
  education: { degree: "", school: "", year: "", note: "" },
  courses: [],
  languages: [],
  identity: { name: "", links: [] },
};

const sampleExtracted: StructuredCvData = {
  identity: {
    name: "Alex Mercer",
    email: "alex@mercer.dev",
    phone: "+1-555-0192",
    location: "San Francisco, CA",
    links: [{ label: "GitHub", href: "https://github.com/alexmercer" }],
  },
  title: "Principal Systems Engineer",
  profile: "Experienced architect of distributed streaming systems and high-throughput pipelines.",
  highlights: ["Scaled pipeline to 1M events/sec", "Reduced cloud infra spend by 35%"],
  skills: [
    { k: "Languages", v: "Rust, TypeScript, Go, Python" },
    { k: "Infrastructure", v: "Kubernetes, Docker, Terraform, AWS" },
  ],
  experience: [
    {
      company: "CloudScale Inc.",
      role: "Lead Infrastructure Architect",
      period: "2021 – Present",
      location: "San Francisco, CA",
      context: "Core streaming team",
      bullets: ["Designed event router in Rust", "Managed team of 8 engineers"],
      engagements: [],
    },
    {
      company: "DataStream Labs",
      role: "Senior Software Engineer",
      period: "2018 – 2021",
      location: "Seattle, WA",
      context: "Distributed storage",
      bullets: ["Built Raft-based consensus cluster", "Cut query latency by 50%"],
      engagements: [],
    },
  ],
  projects: [
    {
      name: "VectorFlow",
      meta: "Rust · SIMD",
      text: "Open-source high performance vector indexing engine.",
    },
  ],
  education: {
    degree: "BSc in Computer Science",
    school: "University of Washington",
    year: "2018",
    note: "Dean's Honor List, magna cum laude",
  },
  courses: ["Certified Kubernetes Administrator (CKA)", "AWS Certified Solutions Architect"],
  languages: [
    { name: "English", level: "Native" },
    { name: "Spanish", level: "Professional" },
  ],
};

describe("Safe Merge & Conflict Resolution", () => {
  it("populates an empty CV form completely without false conflicts", () => {
    const result = mergeCvData(emptyCv, sampleExtracted);

    expect(result.hasConflicts).toBe(false);
    expect(result.conflictCount).toBe(0);
    expect(result.populatedCount).toBeGreaterThan(0);

    expect(result.mergedCv.identity?.name).toBe("Alex Mercer");
    expect(result.mergedCv.identity?.email).toBe("alex@mercer.dev");
    expect(result.mergedCv.identity?.phone).toBe("+1-555-0192");
    expect(result.mergedCv.title).toBe("Principal Systems Engineer");
    expect(result.mergedCv.experience.length).toBe(2);
    expect(result.mergedCv.education.degree).toBe("BSc in Computer Science");
    expect(result.mergedCv.courses.length).toBe(2);
    expect(result.mergedCv.languages.length).toBe(2);
  });

  it("protects existing user-entered data and detects conflicts", () => {
    const existingWithUserData: CvData = {
      ...emptyCv,
      identity: {
        name: "Alex User",
        email: "user-current-email@example.com",
        links: [],
      },
      title: "Senior Developer",
    };

    // Merging with safe-preserve default strategy
    const result = mergeCvData(existingWithUserData, sampleExtracted, { strategy: "safe-preserve" });

    expect(result.hasConflicts).toBe(true);
    expect(result.conflictCount).toBeGreaterThan(0);

    // Existing user-entered values MUST be preserved by default
    expect(result.mergedCv.identity?.email).toBe("user-current-email@example.com");
    expect(result.mergedCv.identity?.name).toBe("Alex User");
    expect(result.mergedCv.title).toBe("Senior Developer");

    // But previously empty fields MUST be populated
    expect(result.mergedCv.identity?.phone).toBe("+1-555-0192");
    expect(result.mergedCv.identity?.location).toBe("San Francisco, CA");
    expect(result.mergedCv.experience.length).toBe(2);
  });

  it("applies user resolution when user selects 'use-imported' for conflicting field", () => {
    const existingWithUserData: CvData = {
      ...emptyCv,
      identity: {
        name: "Alex User",
        email: "user-current-email@example.com",
        links: [],
      },
    };

    const result = mergeCvData(existingWithUserData, sampleExtracted, {
      strategy: "selective",
      resolutions: {
        "identity.email": "use-imported",
        "identity.name": "keep-existing",
      },
    });

    expect(result.mergedCv.identity?.email).toBe("alex@mercer.dev");
    expect(result.mergedCv.identity?.name).toBe("Alex User");
  });

  it("overwrites all fields when strategy is overwrite-all or is starter draft", () => {
    const starterCv: CvData = {
      ...emptyCv,
      identity: { name: "Mekin Jemal", links: [] },
      title: "Demo Title",
    };

    const result = mergeCvData(starterCv, sampleExtracted, { isStarterDraft: true });

    expect(result.hasConflicts).toBe(false);
    expect(result.mergedCv.identity?.name).toBe("Alex Mercer");
    expect(result.mergedCv.title).toBe("Principal Systems Engineer");
  });

  it("handles missing contact information gracefully without breaking", () => {
    const extractedWithoutContact: StructuredCvData = {
      ...sampleExtracted,
      identity: {
        name: "Jane Doe",
        email: "",
        phone: "",
        location: "",
        links: [],
      },
    };

    const result = mergeCvData(emptyCv, extractedWithoutContact);
    expect(result.mergedCv.identity?.name).toBe("Jane Doe");
    expect(result.mergedCv.identity?.email || "").toBe("");
    expect(result.mergedCv.identity?.phone || "").toBe("");
  });
});
