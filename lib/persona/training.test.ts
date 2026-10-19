import { describe, expect, it } from "vitest";
import { blankPersona, customerStarterPersona, isBlankCustomerPersona } from "@/server/persona/templates";
import { personaToCvData } from "./cv";
import { PersonaDocSchema } from "./schema";
import { hasTrainingContent, roleCvName } from "./training";

describe("roleCvName", () => {
  it("uses the role and numbers CVs with the same role", () => {
    expect(roleCvName("Software Engineer")).toBe("Software Engineer CV");
    expect(roleCvName("Software Engineer", 2)).toBe("Software Engineer CV 2");
    expect(roleCvName("Software Engineer CV")).toBe("Software Engineer CV");
  });
});

describe("hasTrainingContent", () => {
  it("starts customer CVs from the validated public demo with editable CV content", () => {
    const doc = customerStarterPersona("Product Engineer");
    const cv = personaToCvData(doc, "en");

    expect(doc.legacy).toBe(false);
    expect(doc.site.indexable).toBe(false);
    expect(doc.identity.name).toBe("Mekin Jemal");
    expect(cv.title).toBe("Product Engineer");
    expect(cv.profile.length).toBeGreaterThan(0);
    expect(cv.experience.length).toBeGreaterThan(0);
    expect(cv.projects.length).toBeGreaterThan(0);
    expect(hasTrainingContent(doc)).toBe(true);
    expect(PersonaDocSchema.safeParse(doc).success).toBe(true);
  });

  it("only upgrades an untouched blank customer profile", () => {
    const doc = PersonaDocSchema.parse(blankPersona("Product Engineer CV", "Alex Example"));
    doc.identity.role = "Product Engineer";
    doc.identity.headline = "Product Engineer";
    doc.hero.staticIntro = "Hi, I'm Alex Example, Product Engineer.";

    expect(isBlankCustomerPersona(doc)).toBe(true);
    doc.hero.staticIntro = "I build thoughtful products.";
    expect(isBlankCustomerPersona(doc)).toBe(false);
  });

  it("does not treat the generated Job CV starter as trained", () => {
    const doc = PersonaDocSchema.parse(blankPersona("John's Job profile", "John"));
    doc.identity.role = "Software Engineer";
    doc.identity.headline = "Software Engineer";
    expect(hasTrainingContent(doc)).toBe(false);
  });

  it("accepts personal knowledge entered into a section", () => {
    const doc = PersonaDocSchema.parse(blankPersona("John's Job profile", "John"));
    const firstItem = doc.sections?.[0]?.items?.[0];
    if (!firstItem) throw new Error("Blank Job CV should include an About section.");
    firstItem.text = "I build accessible web applications.";
    expect(hasTrainingContent(doc)).toBe(true);
  });

  it("accepts a personalized answer", () => {
    const doc = PersonaDocSchema.parse(blankPersona("John's Job profile", "John"));
    const about = doc.questions?.[0];
    if (!about) throw new Error("Blank Job CV should include an About question.");
    about.answers = ["I am a software engineer with experience building web applications."];
    expect(hasTrainingContent(doc)).toBe(true);
  });

  it("uses the user's CV form data instead of the demo CV", () => {
    const doc = PersonaDocSchema.parse(blankPersona("John's Job profile", "John"));
    doc.identity.role = "Product Engineer";
    doc.document.data = {
      profile: "I build accessible software for healthcare teams.",
      experience: [{ company: "Northstar", role: "Product Engineer", period: "2022–2025", bullets: ["Shipped a patient portal."] }],
    };
    const cv = personaToCvData(doc, "en");
    expect(cv.identity?.name).toBe("John");
    expect(cv.title).toBe("Product Engineer");
    expect(cv.profile).toContain("healthcare");
    expect(cv.experience[0]?.company).toBe("Northstar");
    expect(cv.experience[0]?.company).not.toContain("Mekin");
    expect(hasTrainingContent(doc)).toBe(true);
  });
});
