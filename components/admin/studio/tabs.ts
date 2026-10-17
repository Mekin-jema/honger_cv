/** The Persona Studio's tabs (shared by the server page, which validates ?tab=, and the client shell). */
export const TABS = [
  { id: "overview", label: "Overview" },
  { id: "identity", label: "Identity & site" },
  { id: "knowledge", label: "Knowledge" },
  { id: "questions", label: "Questions" },
  { id: "hero", label: "Hero & AI rules" },
  { id: "document", label: "Document & access" },
  { id: "review", label: "Review" },
  { id: "checks", label: "Checks" },
  { id: "json", label: "JSON" },
] as const;
export type TabId = (typeof TABS)[number]["id"];
