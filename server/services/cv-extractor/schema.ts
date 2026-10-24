import { z } from "zod";

/**
 * Zod schema for structured CV information extraction.
 * Exactly corresponds to the application's CvData in lib/persona/cv.ts and CvImportSchema in server/brain/assist.ts.
 */
export const ExtractedIdentitySchema = z.object({
  name: z.string().max(120).default(""),
  email: z.string().max(200).default(""),
  phone: z.string().max(40).default(""),
  location: z.string().max(120).default(""),
  links: z
    .array(
      z.object({
        label: z.string().max(80).default(""),
        href: z.string().max(400).default(""),
      }),
    )
    .max(12)
    .default([]),
});

export const ExtractedSkillGroupSchema = z.object({
  k: z.string().max(100).default(""),
  v: z.string().max(1000).default(""),
});

export const ExtractedEngagementSchema = z.object({
  title: z.string().max(160).default(""),
  period: z.string().max(100).default(""),
  bullets: z.array(z.string().max(600)).max(20).default([]),
  stack: z.string().max(300).default(""),
});

export const ExtractedExperienceSchema = z.object({
  company: z.string().max(160).default(""),
  role: z.string().max(160).default(""),
  period: z.string().max(100).default(""),
  location: z.string().max(120).default(""),
  context: z.string().max(500).default(""),
  bullets: z.array(z.string().max(600)).max(20).default([]),
  engagements: z.array(ExtractedEngagementSchema).max(12).default([]),
});

export const ExtractedProjectSchema = z.object({
  name: z.string().max(160).default(""),
  meta: z.string().max(300).default(""),
  text: z.string().max(1500).default(""),
});

export const ExtractedEducationSchema = z.object({
  degree: z.string().max(200).default(""),
  school: z.string().max(200).default(""),
  year: z.string().max(100).default(""),
  note: z.string().max(2000).default(""),
});

export const ExtractedLanguageSchema = z.object({
  name: z.string().max(80).default(""),
  level: z.string().max(100).default(""),
});

export const StructuredCvSchema = z.object({
  identity: ExtractedIdentitySchema.default({ name: "", email: "", phone: "", location: "", links: [] }),
  title: z.string().max(160).default(""),
  profile: z.string().max(3000).default(""),
  highlights: z.array(z.string().max(500)).max(20).default([]),
  skills: z.array(ExtractedSkillGroupSchema).max(30).default([]),
  experience: z.array(ExtractedExperienceSchema).max(25).default([]),
  projects: z.array(ExtractedProjectSchema).max(30).default([]),
  education: ExtractedEducationSchema.default({ degree: "", school: "", year: "", note: "" }),
  courses: z.array(z.string().max(300)).max(30).default([]),
  languages: z.array(ExtractedLanguageSchema).max(20).default([]),
});

function requiredOutputSchema(schema: z.ZodType): z.ZodType {
  const required = schema instanceof z.ZodDefault ? schema.removeDefault() : schema;
  if (required instanceof z.ZodObject) {
    const shape = Object.fromEntries(
      Object.entries(required.shape).map(([key, field]) => [key, requiredOutputSchema(field)]),
    );
    return z.object(shape).strict();
  }
  if (required instanceof z.ZodArray) {
    return z.array(requiredOutputSchema(required.element as unknown as z.ZodType));
  }
  return required as z.ZodType;
}

/** Provider schema: all JSON object properties are required for OpenAI-compatible structured outputs. */
export const StructuredCvOutputSchema = requiredOutputSchema(StructuredCvSchema);

export type StructuredCvData = z.infer<typeof StructuredCvSchema>;

export type FieldStatus = "imported" | "existing" | "missing" | "needs_review" | "conflict";

export interface FieldMetadata {
  field: string;
  label: string;
  status: FieldStatus;
  currentValue?: unknown;
  extractedValue?: unknown;
  confidence?: number;
}
