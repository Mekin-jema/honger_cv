import { describe, expect, it } from "vitest";
import { exactIntent, matchIntents, normalize } from "./match-intent";
import type { Question } from "./persona/types";

const q = (id: string, label: string, keywords: string[], primary = false): Question => ({ id, label, prompt: `${label}?`, icon: "sparkles", keywords, answers: ["x"], blocks: [], followUps: [], primary });
const questions = [q("about", "About me", ["about", "who"], true), q("family", "পরিবার", ["পরিবার", "বাবা", "family"], true), q("project-x", "Atlas", ["atlas"])];

describe("matching typed text", () => {
  it("keeps Bangla letters and vowel signs", () => {
    expect(normalize("আমার পরিবার?")).toBe("আমার পরিবার");
    expect(normalize("Résumé!")).toBe("resume");
  });

  it("finds Bangla and English keywords", () => {
    expect(matchIntents("পরিবার", questions)[0]?.id).toBe("family");
    expect(matchIntents("tell me about your family", questions)[0]?.id).toBe("family");
    expect(matchIntents("atlas", questions)[0]?.id).toBe("project-x");
  });

  it("lists the main topics for '/'", () => {
    expect(matchIntents("/", questions).map((x) => x.id)).toEqual(["about", "family"]);
  });

  it("plays an exact label or single keyword without asking the AI", () => {
    expect(exactIntent("about me", questions)?.id).toBe("about");
    expect(exactIntent("বাবা", questions, questions[1])?.id).toBe("family");
    expect(exactIntent("what about him", questions, questions[0])).toBeUndefined();
  });
});
