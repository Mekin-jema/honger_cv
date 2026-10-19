import { describe, expect, it } from "vitest";
import { fallbackIntent, intents, primaryIntents } from "@/content/intents";
import { longestIntro, staticIntro } from "@/content/intro";
import { profile } from "@/content/profile";
import { PersonaDocSchema, formatIssues, type PersonaDocInput } from "@/lib/persona/schema";
import { clientView, compilePersona, docHash } from "./compile";
import { jobPersonaDoc, jobPersonaInput } from "./import-job";
import { forbiddenIn, forbiddenTerms } from "@/test/forbidden";

const tiny = (over: Partial<PersonaDocInput> = {}): PersonaDocInput => ({
  v: 1,
  name: "Test",
  identity: { name: "Test Person", shortName: "Test", initials: "TP" },
  hero: { staticIntro: "Hi.", pools: [{ id: "hello", lines: ["Hi."] }] },
  ...over,
});

describe("the job persona built from the code content", () => {
  const doc = jobPersonaDoc();
  const view = clientView(compilePersona("job", doc), "public", "en");

  it("is a valid persona document", () => {
    const parsed = PersonaDocSchema.safeParse(jobPersonaInput());
    expect(parsed.success ? [] : formatIssues(parsed.error)).toEqual([]);
  });

  it("has every question, in order, with the same wording", () => {
    expect(view.questions.map((q) => q.id)).toEqual(intents.map((i) => i.id));
    for (const i of intents) {
      const q = view.questions.find((x) => x.id === i.id)!;
      expect(q.label).toBe(i.label);
      expect(q.prompt).toBe(i.prompt);
      expect(q.answers).toEqual(i.answers);
      expect(q.blocks).toEqual(i.blocks);
      expect(q.followUps).toEqual(i.followUps);
      expect(q.keywords).toEqual(i.keywords);
      expect(!!q.primary).toBe(!!i.primary);
      // Every icon the code uses has a name, so none falls back to the default.
      expect(q.icon === "sparkles").toBe(i.id === "hire");
    }
    expect(view.fallback.answers).toEqual(fallbackIntent.answers);
  });

  it("keeps the landing chips, sidebar groups and hero", () => {
    expect(view.landing).toEqual(["about", "experience", "projects", "skills", "hire"]);
    expect(view.sidebar[0].ids).toEqual(primaryIntents.map((i) => i.id));
    expect(view.sidebar[1].ids.every((id) => id.startsWith("project-"))).toBe(true);
    expect(view.hero.staticIntro).toBe(staticIntro);
    expect(view.hero.longest).toBe(longestIntro);
  });

  it("keeps today's exact wording", () => {
    expect(view.labels.thinking).toBe("Reading my CV...");
    expect(view.labels.composerAria).toBe("Ask a question about Mekin");
    expect(view.labels.composerPlaceholderAi).toBe("Ask me anything about my work, projects, skills…");
    expect(view.labels.composerNoMatch).toBe("I only answer questions about Mekin. Press **Enter** anyway, or try “projects”, “skills” or “hire”.");
    expect(view.document).toMatchObject({ label: "CV", download: "Download CV", pdfUrl: profile.cvPdf, pageUrl: "/cv/", fileName: "Mekin-Jemal-CV.pdf" });
    expect(view.availability).toEqual({ show: true, action: "hire" });
  });

  it.skipIf(!forbiddenTerms().length)("uses no confidential client names in its rules or sections", () => {
    expect(forbiddenIn(JSON.stringify(doc))).toEqual([]);
  });

  it("hashes the same document the same way", () => {
    expect(docHash(doc)).toBe(docHash(PersonaDocSchema.parse(jobPersonaInput())));
  });
});

describe("persona schema checks", () => {
  const issues = (input: PersonaDocInput) => {
    const r = PersonaDocSchema.safeParse(input);
    return r.success ? [] : formatIssues(r.error);
  };

  it("keeps a public CV PDF link available when server-side PDF generation was skipped", () => {
    const doc = PersonaDocSchema.parse(tiny({
      document: {
        kind: "cv",
        slug: "cv",
        fileName: "Test-CV.pdf",
        title: "Test CV",
        language: "English",
        showPhoto: true,
        gated: false,
        sections: [],
      },
    }));
    const view = clientView(compilePersona("customer", doc), "public", "en");
    expect(view.document.pdfUrl).toBe("/d/Test-CV.pdf");
  });

  it("accepts a minimal persona and fills defaults", () => {
    const doc = PersonaDocSchema.parse(tiny());
    expect(doc.access.mode).toBe("open");
    expect(doc.site.languages).toEqual(["en"]);
    expect(doc.fallback.blocks).toEqual([{ kind: "suggest" }]);
  });

  it("rejects follow-ups to unknown questions and reserved ids", () => {
    const out = issues(tiny({ questions: [{ id: "a", label: "A", prompt: "A?", answers: ["a"], followUps: ["nope"] }, { id: "ai", label: "x", prompt: "x", answers: ["x"] }] }));
    expect(out.join("\n")).toMatch(/Unknown question "nope"/);
    expect(out.join("\n")).toMatch(/"ai" is reserved/);
  });

  it("keeps private sections out of the chat and job-only cards out of other personas", () => {
    const out = issues(
      tiny({
        sections: [{ key: "secret", title: "Secret", display: "facts", visibility: "private", inChat: true }],
        questions: [{ id: "a", label: "A", prompt: "A?", answers: ["a"], blocks: [{ kind: "stats" }] }],
      }),
    );
    expect(out.join("\n")).toMatch(/private section can't be used in the chat/);
    expect(out.join("\n")).toMatch(/"stats" card only exists for the job persona/);
  });

  it("doesn't let a public answer show an unlocked section", () => {
    const out = issues(
      tiny({
        sections: [{ key: "family", title: "Family", display: "facts", visibility: "unlocked" }],
        questions: [{ id: "a", label: "A", prompt: "A?", answers: ["a"], blocks: [{ kind: "section", key: "family" }] }],
      }),
    );
    expect(out.join("\n")).toMatch(/public answer can't show the unlocked section "family"/);
  });
});

describe("what each visitor tier receives", () => {
  const doc = PersonaDocSchema.parse(
    tiny({
      access: { mode: "code" },
      sections: [
        {
          key: "about",
          title: "About",
          display: "facts",
          visibility: "public",
          items: [
            { id: "height", label: "Height", value: "5'8\"" },
            { id: "phone", label: "Phone", value: "+880 1000 000000", visibility: "unlocked" },
            { id: "note", label: "Note", value: "PRIVATE-NOTE", visibility: "private" },
          ],
        },
        { key: "family", title: "Family", display: "facts", visibility: "unlocked", items: [{ id: "father", label: "Father", value: "FATHER-NAME" }] },
        { key: "notes", title: "Notes", display: "list", visibility: "private", inChat: false, items: [{ id: "n", text: "PRIVATE-SECTION" }] },
      ],
      questions: [
        { id: "about", label: "About", prompt: "About?", answers: ["About me"], blocks: [{ kind: "section", key: "about" }] },
        { id: "family", label: { en: "Family", bn: "পরিবার" }, prompt: "Family?", answers: ["My family"], visibility: "unlocked", blocks: [{ kind: "section", key: "family" }] },
      ],
      landing: ["about", "family"],
    }),
  );
  const c = compilePersona("test", doc);

  it("public visitors get public items only", () => {
    const v = clientView(c, "public", "en");
    const json = JSON.stringify(v);
    expect(v.questions.map((q) => q.id)).toEqual(["about"]);
    expect(v.landing).toEqual(["about"]);
    expect(json).not.toMatch(/\+880|FATHER-NAME|PRIVATE/);
    expect(v.access.gatedTitles).toEqual(["Family"]);
  });

  it("unlocked visitors get unlocked items too, never private ones", () => {
    const v = clientView(c, "unlocked", "bn");
    const json = JSON.stringify(v);
    expect(v.questions.map((q) => q.id)).toEqual(["about", "family"]);
    expect(v.questions[1].label).toBe("পরিবার");
    expect(json).toMatch(/\+880/);
    expect(json).toMatch(/FATHER-NAME/);
    expect(json).not.toMatch(/PRIVATE/);
    expect(v.access.gatedTitles).toEqual([]);
  });
});
