import { describe, expect, it } from "vitest";
import { PersonaDocSchema, type PersonaDocInput } from "@/lib/persona/schema";
import { compilePersona } from "../persona/compile";
import { jobPersonaDoc } from "../persona/import-job";
import { marriagePersona } from "../persona/templates";
import { compileBrain } from "./compile";
import { findLeak } from "./leak";
import { forbiddenIn } from "@/test/forbidden";

const withValues = (doc: PersonaDocInput, values: Record<string, string>) => {
  for (const s of doc.sections ?? []) for (const it of s.items ?? []) if (values[`${s.key}/${it.id}`] !== undefined) it.value = values[`${s.key}/${it.id}`];
  return doc;
};

describe("the brain of the job persona", () => {
  const brain = compileBrain(compilePersona("job", jobPersonaDoc()));

  it("fits in the prompt (no retrieval needed)", () => {
    expect(brain.retrieval).toBe(false);
    expect(brain.public.tokens).toBeGreaterThan(3000);
    expect(brain.public.tokens).toBeLessThan(30_000);
  });

  it("lists every topic and the job's cards", () => {
    expect(brain.public.topicIds.has("about")).toBe(true);
    expect(brain.public.topicIds.has("project-travel-super-app")).toBe(true);
    expect(brain.public.cards.has("skills")).toBe(true);
    expect(brain.public.cards.has("project:travel-super-app")).toBe(true);
    expect(brain.public.cards.has("section:experience")).toBe(true);
  });

  it("has no confidential client names and nothing hidden", () => {
    expect(forbiddenIn(brain.public.prompt)).toEqual([]);
    expect(brain.public.leakTerms).toEqual([]);
    expect(brain.public.gatedTitles).toEqual([]);
  });
});

describe("the brain of the marriage persona", () => {
  const doc = PersonaDocSchema.parse(
    withValues(marriagePersona(), {
      "personal/height": "5'8\"",
      "personal/present-address": "House 99, Road 7, Banani",
      "family/father-profession": "Retired school teacher",
      "family/father-name": "Abdul Karim",
      "contact/guardian-phone": "+880 1999 000000",
    }),
  );
  const brain = compileBrain(compilePersona("marriage", doc));

  it("public visitors' prompt has public facts only and names the gated sections", () => {
    const p = brain.public.prompt;
    expect(p).toContain("5'8");
    expect(p).toContain("Retired school teacher");
    expect(p).not.toContain("Abdul Karim");
    expect(p).not.toContain("1999");
    expect(p).not.toContain("House 99");
    expect(brain.public.gatedTitles).toContain("Contact (guardian)");
    expect(brain.public.topicIds.has("photos")).toBe(false);
  });

  it("an access code adds the unlocked facts, never private ones", () => {
    const p = brain.unlocked.prompt;
    expect(p).toContain("Abdul Karim");
    expect(p).toContain("+880 1999 000000");
    expect(p).not.toContain("Private notes");
    expect(brain.unlocked.topicIds.has("photos")).toBe(true);
    expect(brain.unlocked.gatedTitles).toEqual([]);
  });

  it("knows which values public visitors must never get", () => {
    expect(brain.public.leakTerms).toContain("#8801999000000");
    expect(brain.public.leakTerms).toContain("abdul karim");
    expect(brain.unlocked.leakTerms).not.toContain("abdul karim");
    // Empty template items are skipped everywhere.
    expect(brain.public.prompt).not.toMatch(/"Blood group[^"]*","value":""/);
  });

  it("indexes items per language, without private ones", () => {
    expect(brain.chunks.some((c) => c.itemKey === "family/father-name" && c.visibility === "unlocked")).toBe(true);
    expect(brain.chunks.some((c) => c.lang === "bn")).toBe(true);
    expect(brain.chunks.some((c) => c.itemKey.startsWith("notes/"))).toBe(false);
  });
});

describe("the leak filter", () => {
  const terms = ["#8801999000000", "abdul karim", "বাড়ি ৯৯"];
  it("finds a phone number however it is written", () => {
    expect(findLeak("Call +880-1999-000000 any time", terms)).toBe("#8801999000000");
    expect(findLeak("call 8801999 000 000", terms)).toBe("#8801999000000");
  });
  it("finds names and Bangla text regardless of case and spacing", () => {
    expect(findLeak("My father is ABDUL   Karim.", terms)).toBe("abdul karim");
    expect(findLeak("ঠিকানা: বাড়ি ৯৯, বনানী", terms)).toBe("বাড়ি ৯৯");
  });
  it("lets clean answers through", () => {
    expect(findLeak("My father is a retired teacher.", terms)).toBeNull();
    expect(findLeak("", terms)).toBeNull();
  });
});
