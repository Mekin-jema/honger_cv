"use client";

import { Printer } from "lucide-react";

export function PrintButton({ label = "Print", className = "" }: { label?: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={`cv-tool ${className}`.trim()}
      title="In the print dialog, choose Save as PDF to download the selected layout and color."
    >
      <Printer className="size-4" aria-hidden="true" /> {label}
    </button>
  );
}
