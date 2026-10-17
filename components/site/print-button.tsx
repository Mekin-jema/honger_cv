"use client";

import { Printer } from "lucide-react";

export function PrintButton({ label }: { label: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="btn btn-ghost py-2 text-sm">
      <Printer className="size-4" aria-hidden="true" /> {label}
    </button>
  );
}
