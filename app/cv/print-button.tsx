"use client";

import { Printer } from "lucide-react";

export function PrintButton({ label = "Print" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="cv-tool"
      title="In the print dialog, choose Save as PDF."
    >
      <Printer className="size-4" aria-hidden="true" /> {label}
    </button>
  );
}
