"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="cv-tool">
      <Printer className="size-4" /> Print
    </button>
  );
}
