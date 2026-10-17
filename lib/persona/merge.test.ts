import { describe, expect, it } from "vitest";
import { jobPersonaDoc } from "@/server/persona/import-job";
import { marriagePersona } from "@/server/persona/templates";
import { parsePersonaMarkdown, renderPersonaMarkdown } from "./markdown";
import { describeMerge, mergeMarkdown } from "./merge";
import { PersonaDocSchema } from "./schema";

describe("importing the Markdown template into a draft", () => {
  it("re-importing an export changes nothing, and keeps what Markdown can't express", () => {
    const job = jobPersonaDoc();
    const md = renderPersonaMarkdown(job, "job");
    const { doc, summary } = mergeMarkdown(job, parsePersonaMarkdown(md));
    expect(describeMerge(summary)).toEqual(["Nothing changes: the text matches the draft."]);
    expect(PersonaDocSchema.parse(doc)).toEqual(job);
    // Nested client entries inside a job survive the round trip.
    const exp = doc.sections!.find((s) => s.key === "experience")!;
    expect(exp.items!.some((it) => (it.sub?.length ?? 0) > 0)).toBe(true);
  });

  it("updates, adds and removes items in place", () => {
    const draft = PersonaDocSchema.parse(marriagePersona());
    // Filled items the text leaves out are removed; unfilled template items stay.
    draft.sections[0].items.find((i) => i.id === "blood-group")!.value = "B+";
    const md = renderPersonaMarkdown(draft, "marriage")
      .replace(/^- Height \|\| উচ্চতা:.*$/m, "- Height || উচ্চতা: 5'8\"")
      .replace(/^- Blood group \|\|.*\n/m, "")
      .replace("## Questions", "## Hobbies (tags) [public]\n- Outdoors: hiking, cycling\n\n## Questions\n\n### Do you cook? {cooking}\nPrompt: Can you cook?\nAnswer: Yes, **simple meals**.\nShows: hobbies\n");
    const { doc, summary } = mergeMarkdown(draft, parsePersonaMarkdown(md));
    const personal = doc.sections!.find((s) => s.key === "personal")!;
    expect(personal.items!.find((i) => i.id === "height")?.value).toBe("5'8\"");
    expect(personal.items!.some((i) => i.id === "blood-group")).toBe(false);
    expect(summary).toMatchObject({ itemsChanged: 1, itemsRemoved: 1, sectionsAdded: ["hobbies"], questionsAdded: ["cooking"] });
    expect(doc.questions!.find((q) => q.id === "cooking")).toMatchObject({ visibility: "public", icon: "sparkles", blocks: [{ kind: "section", key: "hobbies" }] });
    // Everything else stays valid.
    expect(PersonaDocSchema.safeParse(doc).success).toBe(true);
  });

  it("a new question that shows unlocked details is for unlocked visitors", () => {
    const draft = PersonaDocSchema.parse(marriagePersona());
    const { doc } = mergeMarkdown(draft, parsePersonaMarkdown("## Questions\n### Guardian's phone {guardian-phone}\nPrompt: Can I call your guardian?\nAnswer: TODO\nShows: contact\n"));
    expect(doc.questions!.find((q) => q.id === "guardian-phone")?.visibility).toBe("unlocked");
    expect(doc.sections).toEqual(draft.sections);
  });

  it("can remove the sections the text leaves out", () => {
    const draft = PersonaDocSchema.parse(marriagePersona());
    const { doc, summary } = mergeMarkdown(draft, parsePersonaMarkdown("## About me (paragraphs) [public] {about-me}\nHello.\n"), { removeMissingSections: true });
    expect(doc.sections!.map((s) => s.key)).toEqual(["about-me"]);
    expect(summary.sectionsRemoved.length).toBe(draft.sections.length - 1);
  });
});
