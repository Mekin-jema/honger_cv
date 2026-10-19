"use client";

import { useState } from "react";
import { Download, RotateCcw } from "lucide-react";
import { PersonaDocSchema, formatIssues } from "@/lib/persona/schema";
import { cn } from "@/lib/utils";
import { downloadText } from "./api";
import { Panel, inputCls, smallBtn } from "./controls";
import type { TabProps } from "./studio";

/** The whole draft as JSON: for nested details the forms don't cover, and for backups. */
export function JsonTab({ slug, draft, doc, notify }: TabProps) {
  const pretty = JSON.stringify(doc, null, 2);
  const [text, setText] = useState(pretty);
  const [error, setError] = useState<string>();
  const [applied, setApplied] = useState(false);
  const edited = text !== pretty;

  const apply = () => {
    let value: unknown;
    try {
      value = JSON.parse(text);
    } catch (err) {
      const message = `Not valid JSON: ${err instanceof Error ? err.message : String(err)}`;
      setError(message);
      notify({ title: "JSON could not be applied", description: message });
      return;
    }

    const validation = PersonaDocSchema.safeParse(value);
    if (!validation.success) {
      const details = formatIssues(validation.error, 10);
      const message = `The profile has ${validation.error.issues.length} validation ${validation.error.issues.length === 1 ? "error" : "errors"}.`;
      setError(`${message} ${details.join("; ")}`);
      notify({ title: "JSON validation failed", description: message, details });
      return;
    }

    setError(undefined);
    draft.replace(validation.data);
    setText(JSON.stringify(validation.data, null, 2));
    setApplied(true);
  };

  return (
    <Panel
      title="The draft as JSON"
      description="Everything the forms edit, plus nested details they don't show (for example the entries inside a job). Apply checks the full profile with Zod and shows field paths when it finds problems."
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
