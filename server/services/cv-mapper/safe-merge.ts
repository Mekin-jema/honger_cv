import type { CvData, CvIdentity } from "@/lib/persona/cv";
import type { StructuredCvData } from "../cv-extractor/schema";

export type ConflictResolution = "keep-existing" | "use-imported";

export interface FieldDiff {
  field: string;
  label: string;
  status: "unchanged" | "populated" | "conflict" | "empty";
  existingValue: unknown;
  importedValue: unknown;
  resolution?: ConflictResolution;
}

export interface MergeResult {
  mergedCv: CvData;
  diffs: FieldDiff[];
  conflictCount: number;
  populatedCount: number;
  hasConflicts: boolean;
}

export interface MergeOptions {
  strategy?: "safe-preserve" | "overwrite-all" | "selective";
  resolutions?: Record<string, ConflictResolution>;
  isStarterDraft?: boolean;
}

const isNonEmpty = (val: unknown): boolean => {
  if (val === undefined || val === null) return false;
  if (typeof val === "string") return val.trim().length > 0;
  if (Array.isArray(val)) return val.length > 0;
  if (typeof val === "object") return Object.values(val as Record<string, unknown>).some(isNonEmpty);
  return true;
};

function normalizeImportedHref(href: string): string {
  const value = href.trim();
  if (/^https?:\/\//i.test(value)) return value;
  if (/^(?:www\.)?[a-z\d](?:[a-z\d.-]*[a-z\d])?\.[a-z]{2,}(?::\d+)?(?:[/?#].*)?$/i.test(value)) {
    return `https://${value}`;
  }
  return value;
}

/**
 * Checks if the existing CV is just demo or starter data that should be replaced without conflict warnings.
 */
export function isStarterCv(cv: CvData, ownerName?: string): boolean {
  if (!cv) return true;
  if (cv.identity?.name === "Mekin Jemal" || cv.identity?.name === "Jordan Lee") return true;
  if (ownerName && cv.identity?.name && cv.identity.name === ownerName && cv.experience.length === 0) return true;
  // If only title or photo is set, but no experience or education
  if (cv.experience.length === 0 && cv.skills.length === 0 && !cv.profile.trim()) return true;
  return false;
}

/**
 * Safely merges extracted CV data into existing form data.
 * Protects user-entered data from being overwritten without confirmation.
 */
export function mergeCvData(
  existingCv: CvData,
  extracted: StructuredCvData,
  options: MergeOptions = {},
): MergeResult {
  const { strategy = "safe-preserve", resolutions = {}, isStarterDraft = false } = options;
  const forceOverwrite = strategy === "overwrite-all" || isStarterDraft;

  const diffs: FieldDiff[] = [];
  const merged: CvData = structuredClone(existingCv);

  // Helper to compare and resolve a simple scalar/string field
  const resolveField = (
    fieldKey: string,
    label: string,
    existingVal: string,
    importedVal: string,
    apply: (chosen: string) => void,
  ) => {
    const e = (existingVal ?? "").trim();
    const i = (importedVal ?? "").trim();

    if (!e && !i) {
      diffs.push({ field: fieldKey, label, status: "empty", existingValue: "", importedValue: "" });
      return;
    }
    if (!e && i) {
      apply(i);
      diffs.push({ field: fieldKey, label, status: "populated", existingValue: "", importedValue: i });
      return;
    }
    if (e && !i) {
      if (forceOverwrite) {
        apply("");
        diffs.push({ field: fieldKey, label, status: "empty", existingValue: e, importedValue: "" });
        return;
      }
      diffs.push({ field: fieldKey, label, status: "unchanged", existingValue: e, importedValue: "" });
      return;
    }
    if (e.toLowerCase() === i.toLowerCase()) {
      apply(e); // Keep casing of existing
      diffs.push({ field: fieldKey, label, status: "unchanged", existingValue: e, importedValue: i });
      return;
    }

    // Both are present and different
    const userChoice = resolutions[fieldKey];
    const takeImported = forceOverwrite || userChoice === "use-imported";

    diffs.push({
      field: fieldKey,
      label,
      status: forceOverwrite ? "populated" : "conflict",
      existingValue: e,
      importedValue: i,
      resolution: takeImported ? "use-imported" : "keep-existing",
    });

    apply(takeImported ? i : e);
  };

  // 1. Identity Fields
  const existingIdentity: CvIdentity = existingCv.identity ?? { name: "", links: [] };
  const mergedIdentity: CvIdentity = { ...existingIdentity, links: [...existingIdentity.links] };
  if (forceOverwrite) {
    mergedIdentity.photo = undefined;
    merged.photo = "";
    merged.photoPublicId = "";
    merged.showPhoto = false;
    merged.availability = "";
  }

  resolveField("identity.name", "Full Name", existingIdentity.name ?? "", extracted.identity.name ?? "", (v) => {
    mergedIdentity.name = v;
  });
  resolveField("identity.email", "Email Address", existingIdentity.email ?? "", extracted.identity.email ?? "", (v) => {
    mergedIdentity.email = v;
  });
  resolveField("identity.phone", "Phone Number", existingIdentity.phone ?? "", extracted.identity.phone ?? "", (v) => {
    mergedIdentity.phone = v;
  });
  resolveField("identity.location", "Location", existingIdentity.location ?? "", extracted.identity.location ?? "", (v) => {
    mergedIdentity.location = v;
  });

  // Identity Links: merge unique links
  const existingLinks = existingIdentity.links ?? [];
  const importedLinks = (extracted.identity.links ?? []).map((link) => ({
    ...link,
    href: normalizeImportedHref(link.href),
  }));
  if (forceOverwrite && JSON.stringify(existingLinks) !== JSON.stringify(importedLinks)) {
    mergedIdentity.links = importedLinks;
    diffs.push({
      field: "identity.links",
      label: "Contact Links",
      status: importedLinks.length ? "populated" : "empty",
      existingValue: existingLinks,
      importedValue: importedLinks,
      resolution: "use-imported",
    });
  } else if (existingLinks.length === 0 && importedLinks.length > 0) {
    mergedIdentity.links = importedLinks;
    diffs.push({
      field: "identity.links",
      label: "Contact Links",
      status: "populated",
      existingValue: [],
      importedValue: importedLinks,
    });
  } else if (existingLinks.length > 0 && importedLinks.length > 0) {
    const existingHrefs = new Set(existingLinks.map((l) => l.href.toLowerCase()));
    const newLinks = importedLinks.filter((l) => !existingHrefs.has(l.href.toLowerCase()));
    if (newLinks.length > 0) {
      if (forceOverwrite || resolutions["identity.links"] === "use-imported") {
        mergedIdentity.links = importedLinks;
        diffs.push({ field: "identity.links", label: "Contact Links", status: "conflict", existingValue: existingLinks, importedValue: importedLinks, resolution: "use-imported" });
      } else {
        // Safe merge: append new links without removing existing
        mergedIdentity.links = [...existingLinks, ...newLinks];
        diffs.push({ field: "identity.links", label: "Contact Links", status: "populated", existingValue: existingLinks, importedValue: mergedIdentity.links });
      }
    }
  }
  merged.identity = mergedIdentity;

  // 2. Title & Profile
  resolveField("title", "Professional Title", existingCv.title, extracted.title, (v) => {
    merged.title = v;
  });
  resolveField("profile", "Professional Summary", existingCv.profile, extracted.profile, (v) => {
    merged.profile = v;
  });

  // 3. Highlights
  const eHighlights = existingCv.highlights ?? [];
  const iHighlights = extracted.highlights ?? [];
  if (forceOverwrite && JSON.stringify(eHighlights) !== JSON.stringify(iHighlights)) {
    merged.highlights = iHighlights;
    diffs.push({ field: "highlights", label: "Key Achievements", status: iHighlights.length ? "populated" : "empty", existingValue: eHighlights, importedValue: iHighlights, resolution: "use-imported" });
  } else if (eHighlights.length === 0 && iHighlights.length > 0) {
    merged.highlights = iHighlights;
    diffs.push({ field: "highlights", label: "Key Achievements", status: "populated", existingValue: [], importedValue: iHighlights });
  } else if (eHighlights.length > 0 && iHighlights.length > 0) {
    const hasDiff = JSON.stringify(eHighlights) !== JSON.stringify(iHighlights);
    if (hasDiff) {
      const takeImported = forceOverwrite || resolutions["highlights"] === "use-imported";
      diffs.push({
        field: "highlights",
        label: "Key Achievements",
        status: forceOverwrite ? "populated" : "conflict",
        existingValue: eHighlights,
        importedValue: iHighlights,
        resolution: takeImported ? "use-imported" : "keep-existing",
      });
      merged.highlights = takeImported ? iHighlights : eHighlights;
    }
  }

  // 4. Skills
  const eSkills = existingCv.skills ?? [];
  const iSkills = extracted.skills ?? [];
  if (forceOverwrite && JSON.stringify(eSkills) !== JSON.stringify(iSkills)) {
    merged.skills = iSkills;
    diffs.push({ field: "skills", label: "Core Skills", status: iSkills.length ? "populated" : "empty", existingValue: eSkills, importedValue: iSkills, resolution: "use-imported" });
  } else if (eSkills.length === 0 && iSkills.length > 0) {
    merged.skills = iSkills;
    diffs.push({ field: "skills", label: "Core Skills", status: "populated", existingValue: [], importedValue: iSkills });
  } else if (eSkills.length > 0 && iSkills.length > 0) {
    const hasDiff = JSON.stringify(eSkills) !== JSON.stringify(iSkills);
    if (hasDiff) {
      const takeImported = forceOverwrite || resolutions["skills"] === "use-imported";
      diffs.push({
        field: "skills",
        label: "Core Skills",
        status: forceOverwrite ? "populated" : "conflict",
        existingValue: eSkills,
        importedValue: iSkills,
        resolution: takeImported ? "use-imported" : "keep-existing",
      });
      merged.skills = takeImported ? iSkills : eSkills;
    }
  }

  // 5. Experience
  const eExp = existingCv.experience ?? [];
  const iExp = extracted.experience ?? [];
  if (forceOverwrite && JSON.stringify(eExp) !== JSON.stringify(iExp)) {
    merged.experience = iExp;
    diffs.push({ field: "experience", label: "Work Experience", status: iExp.length ? "populated" : "empty", existingValue: eExp, importedValue: iExp, resolution: "use-imported" });
  } else if (eExp.length === 0 && iExp.length > 0) {
    merged.experience = iExp;
    diffs.push({ field: "experience", label: "Work Experience", status: "populated", existingValue: [], importedValue: iExp });
  } else if (eExp.length > 0 && iExp.length > 0) {
    const hasDiff = JSON.stringify(eExp) !== JSON.stringify(iExp);
    if (hasDiff) {
      const takeImported = forceOverwrite || resolutions["experience"] === "use-imported";
      diffs.push({
        field: "experience",
        label: "Work Experience",
        status: forceOverwrite ? "populated" : "conflict",
        existingValue: eExp,
        importedValue: iExp,
        resolution: takeImported ? "use-imported" : "keep-existing",
      });
      merged.experience = takeImported ? iExp : eExp;
    }
  }

  // 6. Projects
  const eProjects = existingCv.projects ?? [];
  const iProjects = extracted.projects ?? [];
  if (forceOverwrite && JSON.stringify(eProjects) !== JSON.stringify(iProjects)) {
    merged.projects = iProjects;
    diffs.push({ field: "projects", label: "Projects", status: iProjects.length ? "populated" : "empty", existingValue: eProjects, importedValue: iProjects, resolution: "use-imported" });
  } else if (eProjects.length === 0 && iProjects.length > 0) {
    merged.projects = iProjects;
    diffs.push({ field: "projects", label: "Projects", status: "populated", existingValue: [], importedValue: iProjects });
  } else if (eProjects.length > 0 && iProjects.length > 0) {
    const hasDiff = JSON.stringify(eProjects) !== JSON.stringify(iProjects);
    if (hasDiff) {
      const takeImported = forceOverwrite || resolutions["projects"] === "use-imported";
      diffs.push({
        field: "projects",
        label: "Projects",
        status: forceOverwrite ? "populated" : "conflict",
        existingValue: eProjects,
        importedValue: iProjects,
        resolution: takeImported ? "use-imported" : "keep-existing",
      });
      merged.projects = takeImported ? iProjects : eProjects;
    }
  }

  // 7. Education
  const eEdu = existingCv.education ?? { degree: "", school: "", year: "", note: "" };
  const iEdu = extracted.education ?? { degree: "", school: "", year: "", note: "" };
  const eHasEdu = isNonEmpty(eEdu);
  const iHasEdu = isNonEmpty(iEdu);

  if (forceOverwrite && JSON.stringify(eEdu) !== JSON.stringify(iEdu)) {
    merged.education = iEdu;
    diffs.push({ field: "education", label: "Education", status: iHasEdu ? "populated" : "empty", existingValue: eEdu, importedValue: iEdu, resolution: "use-imported" });
  } else if (!eHasEdu && iHasEdu) {
    merged.education = iEdu;
    diffs.push({ field: "education", label: "Education", status: "populated", existingValue: eEdu, importedValue: iEdu });
  } else if (eHasEdu && iHasEdu) {
    const hasDiff = JSON.stringify(eEdu) !== JSON.stringify(iEdu);
    if (hasDiff) {
      const takeImported = forceOverwrite || resolutions["education"] === "use-imported";
      diffs.push({
        field: "education",
        label: "Education",
        status: forceOverwrite ? "populated" : "conflict",
        existingValue: eEdu,
        importedValue: iEdu,
        resolution: takeImported ? "use-imported" : "keep-existing",
      });
      merged.education = takeImported ? iEdu : eEdu;
    }
  }

  // 8. Courses & Languages
  const eCourses = existingCv.courses ?? [];
  const iCourses = extracted.courses ?? [];
  if (forceOverwrite && JSON.stringify(eCourses) !== JSON.stringify(iCourses)) {
    merged.courses = iCourses;
    diffs.push({ field: "courses", label: "Courses & Certifications", status: iCourses.length ? "populated" : "empty", existingValue: eCourses, importedValue: iCourses, resolution: "use-imported" });
  } else if (eCourses.length === 0 && iCourses.length > 0) {
    merged.courses = iCourses;
    diffs.push({ field: "courses", label: "Courses & Certifications", status: "populated", existingValue: [], importedValue: iCourses });
  } else if (eCourses.length > 0 && iCourses.length > 0) {
    const hasDiff = JSON.stringify(eCourses) !== JSON.stringify(iCourses);
    if (hasDiff) {
      const takeImported = forceOverwrite || resolutions["courses"] === "use-imported";
      diffs.push({ field: "courses", label: "Courses & Certifications", status: forceOverwrite ? "populated" : "conflict", existingValue: eCourses, importedValue: iCourses, resolution: takeImported ? "use-imported" : "keep-existing" });
      merged.courses = takeImported ? iCourses : eCourses;
    }
  }

  const eLang = existingCv.languages ?? [];
  const iLang = extracted.languages ?? [];
  if (forceOverwrite && JSON.stringify(eLang) !== JSON.stringify(iLang)) {
    merged.languages = iLang;
    diffs.push({ field: "languages", label: "Languages", status: iLang.length ? "populated" : "empty", existingValue: eLang, importedValue: iLang, resolution: "use-imported" });
  } else if (eLang.length === 0 && iLang.length > 0) {
    merged.languages = iLang;
    diffs.push({ field: "languages", label: "Languages", status: "populated", existingValue: [], importedValue: iLang });
  } else if (eLang.length > 0 && iLang.length > 0) {
    const hasDiff = JSON.stringify(eLang) !== JSON.stringify(iLang);
    if (hasDiff) {
      const takeImported = forceOverwrite || resolutions["languages"] === "use-imported";
      diffs.push({ field: "languages", label: "Languages", status: forceOverwrite ? "populated" : "conflict", existingValue: eLang, importedValue: iLang, resolution: takeImported ? "use-imported" : "keep-existing" });
      merged.languages = takeImported ? iLang : eLang;
    }
  }

  const conflictCount = diffs.filter((d) => d.status === "conflict").length;
  const populatedCount = diffs.filter((d) => d.status === "populated").length;

  return {
    mergedCv: merged,
    diffs,
    conflictCount,
    populatedCount,
    hasConflicts: conflictCount > 0,
  };
}
