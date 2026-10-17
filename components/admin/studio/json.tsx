"use client";

import { useState } from "react";
import { Download, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { downloadText } from "./api";
import { Panel, inputCls, smallBtn } from "./controls";
import type { TabProps } from "./studio";
import type { Doc } from "./use-draft";

/** The whole draft as JSON: for nested details the forms don't cover, and for backups. */
export function JsonTab({ slug, draft, doc }: TabProps) {
  const pretty = JSON.stringify(doc, null, 2);
  const [text, setText] = useState(pretty);
  const [error, setError] = useState<string>();
  const [applied, setApplied] = useState(false);
  const edited = text !== pretty;

  const apply = () => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      return setError(`Not valid JSON: ${err instanceof Error ? err.message : String(err)}`);
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return setError("The draft must be one JSON object { ... }.");
    if ((parsed as { v?: unknown }).v !== 1) return setError('The draft needs "v": 1.');
    setError(undefined);
    draft.replace(parsed as Doc);
    setText(JSON.stringify(parsed, null, 2));
    setApplied(true);
  };

  return (
    <Panel
      title="The draft as JSON"
      description="Everything the forms edit, plus nested details they don't show (for example the entries inside a job). Applying replaces the draft; problems show in the Overview."
      actions={
        <>
          <button type="button" className={smallBtn} onClick={() => downloadText(`${slug}-draft.json`, pretty, "application/json")}>
            <Download className="size-4" /> Download
          </button>
          <button type="button" className={smallBtn} disabled={!edited} onClick={() => (setText(pretty), setError(undefined))}>
            <RotateCcw className="size-4" /> Undo my edits
          </button>
          <button type="button" className="btn btn-primary px-4 py-2 text-sm disabled:opacity-50" disabled={!edited} onClick={apply}>
            Apply
          </button>
        </>
      }
    >
      {error && (
        <p role="alert" className="text-sm font-medium text-accent">
          {error}
        </p>
      )}
      {applied && !edited && !error && (
        <p role="status" className="text-sm text-muted">
          Applied.
        </p>
      )}
      <label htmlFor="json-draft" className="sr-only">
        Draft JSON
      </label>
      <textarea
        id="json-draft"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setApplied(false);
        }}
        spellCheck={false}
        rows={30}
        className={cn(inputCls, "resize-y font-mono text-xs leading-relaxed")}
      />
    </Panel>
  );
}
