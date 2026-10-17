import { describe, expect, it } from "vitest";
import { marriagePersona } from "@/server/persona/templates";
import { idFrom, removeQuestion, removeSection, renameQuestion, renameSection, setBangla, tabForPath } from "./edit";
import { PersonaDocSchema } from "./schema";

const fresh = () => PersonaDocSchema.parse(marriagePersona());

describe("Studio edits keep the draft valid", () => {
  it("renaming a section updates the cards and the document that show it", () => {
    const doc = fresh();
    renameSection(doc, "family", "my-family");
    expect(doc.sections.some((s) => s.key === "my-family")).toBe(true);
    expect(doc.questions.find((q) => q.id === "family")?.blocks).toContainEqual({ kind: "section", key: "my-family" });
    expect(PersonaDocSchema.safeParse(doc).success).toBe(true);
  });

  it("removing a section removes its cards and document entry", () => {
    const doc = fresh();
    removeSection(doc, "family");
    expect(JSON.stringify(doc)).not.toContain('"key":"family"');
    expect(doc.document.sections).not.toContain("family");
    expect(PersonaDocSchema.safeParse(doc).success).toBe(true);
  });

  it("renaming and removing a question fixes follow-ups, landing chips and the sidebar", () => {
    const doc = fresh();
    renameQuestion(doc, "family", "parents");
    expect(doc.landing).toContain("parents");
    expect(PersonaDocSchema.safeParse(doc).success).toBe(true);
    removeQuestion(doc, "parents");
    expect(JSON.stringify(doc)).not.toContain('"parents"');
    expect(PersonaDocSchema.safeParse(doc).success).toBe(true);
  });

  it("makes readable unique ids and maps problems to tabs", () => {
    expect(idFrom("Father's job", ["fathers-job"])).toBe("fathers-job-2");
    expect(idFrom("", [])).toBe("item");
    expect(tabForPath("questions.3.followUps.0")).toBe("questions");
    expect(tabForPath("sections.1.items.0.id")).toBe("knowledge");
    expect(tabForPath("document.sections.0")).toBe("document");
  });
});

describe("filling in missing Bangla", () => {
  it("adds Bangla only where the English is unchanged and has none yet", async () => {
    const { missingBangla } = await import("@/server/brain/assist");
    const doc = fresh();
    doc.sections.find((s) => s.key === "about-me")!.items[0].text = "I love building things.";
    const missing = missingBangla(doc);
    const about = missing.find((m) => m.en === "I love building things.");
    expect(about?.path).toEqual(["sections", doc.sections.findIndex((s) => s.key === "about-me"), "items", 0, "text"]);
    // Private notes are never sent for translation.
    expect(missing.some((m) => m.path[0] === "sections" && doc.sections[m.path[1] as number].visibility === "private")).toBe(false);
    expect(setBangla(doc, about!.path, about!.en, "আমি জিনিস তৈরি করতে ভালোবাসি।")).toBe(true);
    expect(doc.sections.find((s) => s.key === "about-me")!.items[0].text).toEqual({ en: "I love building things.", bn: "আমি জিনিস তৈরি করতে ভালোবাসি।" });
    // Edited meanwhile, or already translated: left alone.
    expect(setBangla(doc, about!.path, "Something else", "x")).toBe(false);
    expect(setBangla(doc, about!.path, about!.en, "y")).toBe(false);
    expect(PersonaDocSchema.safeParse(doc).success).toBe(true);
  });
});
