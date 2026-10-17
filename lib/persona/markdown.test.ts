import { describe, expect, it } from "vitest";
import { marriagePersona } from "@/server/persona/templates";
import { parsePersonaMarkdown, renderPersonaMarkdown } from "./markdown";
import { PersonaDocSchema } from "./schema";

const SAMPLE = `# Persona: marriage
## Personal information || ব্যক্তিগত তথ্য (facts) [public] {personal}
- Height || উচ্চতা: 5'8"
- Present address: [unlocked] House 99, Road 7
## Education (timeline) [public]
- 2017-2021 | BSc in CSE | North South University | CGPA 3.5
## About me (paragraphs) [public]
I am calm and curious.
I like building things.

Family matters most to me.
## Photos (gallery) [unlocked]
- /images/photo.webp | At a wedding
## Questions
### Family || পরিবার {family}
Prompt: Tell me about your family. || আপনার পরিবার সম্পর্কে বলুন।
Keywords: family, parents, পরিবার
Answer: My family: || আমার পরিবার:
Shows: personal
Follow-ups: family
Primary: yes
`;

describe("the Markdown template", () => {
  it("parses sections, items, languages and visibility", () => {
    const r = parsePersonaMarkdown(SAMPLE);
    expect(r.errors).toEqual([]);
    const [personal, edu, about, photos] = r.sections;
    expect(personal).toMatchObject({ key: "personal", display: "facts", visibility: "public", title: { en: "Personal information", bn: "ব্যক্তিগত তথ্য" } });
    expect(personal.items[0]).toMatchObject({ id: "height", label: { en: "Height", bn: "উচ্চতা" }, value: `5'8"` });
    expect(personal.items[1]).toMatchObject({ id: "present-address", visibility: "unlocked", value: "House 99, Road 7" });
    expect(edu.items[0]).toMatchObject({ period: "2017-2021", label: "BSc in CSE", meta: "North South University", details: ["CGPA 3.5"] });
    expect(about.items.map((i) => i.text)).toEqual(["I am calm and curious.\nI like building things.", "Family matters most to me."]);
    expect(photos).toMatchObject({ display: "gallery", visibility: "unlocked", items: [{ src: "/images/photo.webp", label: "At a wedding" }] });
    expect(r.questions[0]).toMatchObject({ id: "family", primary: true, keywords: ["family", "parents", "পরিবার"], blocks: [{ kind: "section", key: "personal" }], answers: [{ en: "My family:", bn: "আমার পরিবার:" }] });
  });

  it("reports what it can't read, with line numbers", () => {
    const r = parsePersonaMarkdown("stray text\n## Facts (facts)\n- no colon here\n### Q\n");
    expect(r.errors.map((e) => e.line)).toEqual([1, 3, 4]);
  });

  it("keeps line breaks and | inside one-line fields", () => {
    const doc = {
      sections: [{ key: "recs", title: "Recommendations", display: "quotes", visibility: "public", items: [{ id: "a", text: "Great to work with.\n\nAlways helpful | kind.", label: "A Person", meta: "Lead" }] }],
      questions: [],
    };
    const md = renderPersonaMarkdown(doc);
    expect(md).toContain(String.raw`Great to work with.\n\nAlways helpful \| kind. | A Person | Lead`);
    expect(parsePersonaMarkdown(md).sections[0].items[0]).toMatchObject({ text: "Great to work with.\n\nAlways helpful | kind.", label: "A Person", meta: "Lead" });
  });

  it("round-trips the marriage template", () => {
    const doc = PersonaDocSchema.parse(marriagePersona());
    doc.sections[0].items[0].value = "Md Maruf Billah";
    const md = renderPersonaMarkdown(doc, "marriage");
    const back = parsePersonaMarkdown(md);
    expect(back.errors.filter((e) => e.line > 0)).toEqual([]);
    expect(back.sections.map((s) => s.key)).toEqual(doc.sections.map((s) => s.key));
    expect(back.sections[0].items[0]).toMatchObject({ id: "full-name", value: "Md Maruf Billah" });
    expect(back.sections.find((s) => s.key === "contact")?.visibility).toBe("unlocked");
    expect(back.questions.map((q) => q.id)).toEqual(doc.questions.map((q) => q.id));
    expect(renderPersonaMarkdown(back, "marriage")).toBe(md);
  });
});
