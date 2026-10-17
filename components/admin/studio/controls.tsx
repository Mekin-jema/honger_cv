"use client";

import { useId, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2, X } from "lucide-react";
import type { LText } from "@/lib/persona/text";
import { cn } from "@/lib/utils";

/** Form building blocks for the Persona Studio: labelled, keyboard-friendly, compact. */

export const inputCls =
  "w-full min-w-0 rounded-lg border border-line-strong bg-card px-3 py-2 text-[15px] leading-snug outline-none transition-[border-color,box-shadow] placeholder:text-faint focus:border-accent focus:ring-1 focus:ring-accent disabled:opacity-60";
export const smallBtn =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-surface hover:text-fg disabled:opacity-50 pointer-coarse:min-h-11";
export const iconBtn = "inline-grid size-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-fg disabled:opacity-40 pointer-coarse:size-11";

type FieldProps = { label: string; hint?: ReactNode; className?: string; children: (p: { id: string; "aria-describedby"?: string }) => ReactNode };

/** A label, the control, and an optional hint under it (wired with aria-describedby). */
export function Field({ label, hint, className, children }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  return (
    <div className={cn("min-w-0", className)}>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold">
        {label}
      </label>
      {children({ id, ...(hint ? { "aria-describedby": hintId } : {}) })}
      {hint && (
        <p id={hintId} className="mt-1 text-[13px] leading-snug text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}

export function TextInput({ label, hint, value, onChange, placeholder, className, type = "text", mono }: { label: string; hint?: ReactNode; value: string | undefined; onChange: (v: string) => void; placeholder?: string; className?: string; type?: string; mono?: boolean }) {
  return (
    <Field label={label} hint={hint} className={className}>
      {(p) => <input {...p} type={type} value={value ?? ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={cn(inputCls, mono && "font-mono text-sm")} />}
    </Field>
  );
}

export function NumberInput({ label, hint, value, onChange, min, max, className }: { label: string; hint?: ReactNode; value: number | undefined; onChange: (v: number | undefined) => void; min?: number; max?: number; className?: string }) {
  return (
    <Field label={label} hint={hint} className={className}>
      {(p) => (
        <input
          {...p}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
          className={cn(inputCls, "w-32")}
        />
      )}
    </Field>
  );
}

const enOf = (v: LText | undefined) => (v === undefined ? "" : typeof v === "string" ? v : v.en);
const bnOf = (v: LText | undefined) => (v === undefined || typeof v === "string" ? "" : (v.bn ?? ""));

/** One text in English, plus Bangla when the persona speaks it. Stored as a string, or { en, bn }. */
export function LTextInput({
  label,
  hint,
  value,
  onChange,
  bangla,
  multiline,
  rows = 3,
  placeholder,
  className,
  optional,
}: {
  label: string;
  hint?: ReactNode;
  value: LText | undefined;
  onChange: (v: LText | undefined) => void;
  bangla: boolean;
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
  className?: string;
  /** Empty becomes "not set" (undefined) instead of "". */
  optional?: boolean;
}) {
  const en = enOf(value);
  const bn = bnOf(value);
  const set = (e: string, b: string) => onChange(b.trim() ? { en: e, bn: b } : optional && !e.trim() ? undefined : e);
  const Tag = multiline ? "textarea" : "input";
  return (
    <Field label={label} hint={hint} className={className}>
      {(p) => (
        <div className={cn("grid gap-1.5", bangla && multiline && "md:grid-cols-2")}>
          <Tag {...p} value={en} placeholder={placeholder} rows={multiline ? rows : undefined} onChange={(e) => set(e.target.value, bn)} className={cn(inputCls, multiline && "resize-y")} />
          {bangla && (
            <Tag
              lang="bn"
              aria-label={`${label} (Bangla)`}
              value={bn}
              placeholder="বাংলা"
              rows={multiline ? rows : undefined}
              onChange={(e) => set(en, e.target.value)}
              className={cn(inputCls, multiline && "resize-y", !bn && en && "border-dashed")}
            />
          )}
        </div>
      )}
    </Field>
  );
}

/** A text box for a list (comma- or line-separated). Commits when focus leaves, so typing a separator works. */
export function ListInput({ label, hint, value, onChange, lines, placeholder, className, mono }: { label: string; hint?: ReactNode; value: string[] | undefined; onChange: (v: string[]) => void; lines?: boolean; placeholder?: string; className?: string; mono?: boolean }) {
  const joined = (value ?? []).join(lines ? "\n" : ", ");
  const [text, setText] = useState(joined);
  const [seen, setSeen] = useState(joined);
  if (joined !== seen) {
    // Changed elsewhere (import, undo): show the new list.
    setSeen(joined);
    setText(joined);
  }
  const commit = () => {
    const next = text
      .split(lines ? /\n/ : /[,\n]/)
      .map((x) => x.trim())
      .filter(Boolean);
    if (next.join("\u0000") !== (value ?? []).join("\u0000")) onChange([...new Set(next)]);
    else setText(joined);
  };
  return (
    <Field label={label} hint={hint} className={className}>
      {(p) =>
        lines ? (
          <textarea {...p} value={text} rows={Math.min(8, Math.max(2, (value?.length ?? 0) + 1))} placeholder={placeholder} onChange={(e) => setText(e.target.value)} onBlur={commit} className={cn(inputCls, "resize-y", mono && "font-mono text-sm")} />
        ) : (
          <input {...p} value={text} placeholder={placeholder} onChange={(e) => setText(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === "Enter" && commit()} className={cn(inputCls, mono && "font-mono text-sm")} />
        )
      }
    </Field>
  );
}

export function SelectInput<T extends string>({ label, hint, value, options, onChange, className }: { label: string; hint?: ReactNode; value: T | undefined; options: { value: T; label: string }[]; onChange: (v: T) => void; className?: string }) {
  return (
    <Field label={label} hint={hint} className={className}>
      {(p) => (
        <select {...p} value={value ?? ""} onChange={(e) => onChange(e.target.value as T)} className={cn(inputCls, "pr-8")}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}

export function Toggle({ label, hint, checked, onChange, disabled }: { label: string; hint?: ReactNode; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  const id = useId();
  return (
    <div className={cn("flex items-start gap-2.5", disabled && "opacity-60")}>
      <input id={id} type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="mt-1 size-4 shrink-0 accent-[var(--accent)]" aria-describedby={hint ? `${id}-hint` : undefined} />
      <div className="min-w-0">
        <label htmlFor={id} className="text-[15px] font-medium">
          {label}
        </label>
        {hint && (
          <p id={`${id}-hint`} className="text-[13px] leading-snug text-muted">
            {hint}
          </p>
        )}
      </div>
    </div>
  );
}

export type Vis = "public" | "unlocked" | "private";
export const VIS_LABEL: Record<Vis, string> = { public: "Everyone", unlocked: "With access code", private: "Only me" };

export function VisBadge({ v, className }: { v: Vis; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        v === "public" && "bg-emerald-600/10 text-emerald-700 dark:text-emerald-400",
        v === "unlocked" && "bg-amber-500/15 text-amber-800 dark:text-amber-300",
        v === "private" && "bg-surface text-muted",
        className,
      )}
    >
      {VIS_LABEL[v]}
    </span>
  );
}

/** Who may see something. `inherit` adds "Same as the section". */
export function VisSelect({ label, value, onChange, inherit, allowed = ["public", "unlocked", "private"], className }: { label: string; value: Vis | undefined; onChange: (v: Vis | undefined) => void; inherit?: string; allowed?: Vis[]; className?: string }) {
  return (
    <select aria-label={label} value={value ?? ""} onChange={(e) => onChange((e.target.value || undefined) as Vis | undefined)} className={cn(inputCls, "w-auto py-1.5 pr-7 text-sm", className)}>
      {inherit !== undefined && <option value="">{inherit}</option>}
      {allowed.map((v) => (
        <option key={v} value={v}>
          {VIS_LABEL[v]}
        </option>
      ))}
    </select>
  );
}

/** Up / down / remove buttons for a row in a list. */
export function RowActions({ index, count, onMove, onRemove, what }: { index: number; count: number; onMove: (dir: -1 | 1) => void; onRemove: () => void; what: string }) {
  return (
    <div className="flex shrink-0 items-center">
      <button type="button" className={iconBtn} disabled={index === 0} onClick={() => onMove(-1)} aria-label={`Move ${what} up`} title="Move up">
        <ArrowUp className="size-4" />
      </button>
      <button type="button" className={iconBtn} disabled={index === count - 1} onClick={() => onMove(1)} aria-label={`Move ${what} down`} title="Move down">
        <ArrowDown className="size-4" />
      </button>
      <button type="button" className={cn(iconBtn, "hover:text-accent")} onClick={onRemove} aria-label={`Remove ${what}`} title="Remove">
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}

/**
 * An ordered pick of ids (questions, sections, hero pools): chosen ones as chips with move/remove, the
 * rest in an "Add" menu. Ids that don't exist (any more) are shown in the accent color.
 */
export function IdListPicker({ label, hint, value, options, onChange, max, className }: { label: string; hint?: ReactNode; value: string[] | undefined; options: { id: string; label: string }[]; onChange: (v: string[]) => void; max?: number; className?: string }) {
  const list = value ?? [];
  const byId = new Map(options.map((o) => [o.id, o.label]));
  const rest = options.filter((o) => !list.includes(o.id));
  const full = max !== undefined && list.length >= max;
  const set = (fn: (l: string[]) => void) => {
    const next = [...list];
    fn(next);
    onChange(next);
  };
  return (
    <Field label={label} hint={hint} className={className}>
      {(p) => (
        <div className="space-y-2">
          {list.length > 0 && (
            <ol className="flex flex-wrap gap-1.5" aria-label={`${label}: chosen`}>
              {list.map((id, i) => (
                <li key={`${id}-${i}`} className={cn("flex items-center gap-0.5 rounded-lg border py-0.5 pl-2.5 text-sm", byId.has(id) ? "border-line bg-card" : "border-accent/60 text-accent")}>
                  <span className="max-w-56 truncate" title={id}>
                    {byId.get(id) ?? `${id} (missing)`}
                  </span>
                  <button type="button" className={cn(iconBtn, "size-7")} disabled={i === 0} onClick={() => set((l) => ([l[i - 1], l[i]] = [l[i], l[i - 1]]))} aria-label={`Move ${byId.get(id) ?? id} earlier`}>
                    <ArrowUp className="size-3.5 -rotate-90" />
                  </button>
                  <button type="button" className={cn(iconBtn, "size-7")} onClick={() => set((l) => l.splice(i, 1))} aria-label={`Remove ${byId.get(id) ?? id}`}>
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
            </ol>
          )}
          <select
            {...p}
            value=""
            disabled={full || !rest.length}
            onChange={(e) => e.target.value && set((l) => l.push(e.target.value))}
            className={cn(inputCls, "w-auto max-w-full py-1.5 pr-8 text-sm")}
          >
            <option value="">{full ? `Up to ${max}` : rest.length ? "Add..." : "Nothing else to add"}</option>
            {rest.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </Field>
  );
}

/** A list of bilingual texts (answers, hero lines, rules): one box each, add / move / remove. */
export function LTextList({ label, hint, value, onChange, bangla, multiline, addLabel = "Add", min = 0, max, what = "line" }: { label: string; hint?: ReactNode; value: LText[] | undefined; onChange: (v: LText[]) => void; bangla: boolean; multiline?: boolean; addLabel?: string; min?: number; max?: number; what?: string }) {
  const list = value ?? [];
  const set = (fn: (l: LText[]) => void) => {
    const next = [...list];
    fn(next);
    onChange(next);
  };
  return (
    <fieldset className="min-w-0 space-y-2">
      <legend className="mb-1 text-sm font-semibold">{label}</legend>
      {hint && <p className="-mt-1 text-[13px] leading-snug text-muted">{hint}</p>}
      {list.map((t, i) => (
        <div key={i} className="flex items-start gap-1.5">
          <LTextInput label={`${what[0].toUpperCase()}${what.slice(1)} ${i + 1}`} value={t} onChange={(v) => set((l) => (l[i] = v ?? ""))} bangla={bangla} multiline={multiline} rows={2} className="flex-1 [&>label]:sr-only" />
          <RowActions index={i} count={list.length} what={`${what} ${i + 1}`} onMove={(dir) => set((l) => ([l[i], l[i + dir]] = [l[i + dir], l[i]]))} onRemove={() => list.length > min && set((l) => l.splice(i, 1))} />
        </div>
      ))}
      {(max === undefined || list.length < max) && (
        <button type="button" className={smallBtn} onClick={() => set((l) => l.push(""))}>
          <Plus className="size-4" /> {addLabel}
        </button>
      )}
    </fieldset>
  );
}

/** A titled group of fields inside a tab. */
export function Panel({ title, description, actions, children, className }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("card space-y-4 p-4 md:p-5", className)}>
      <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
        <div className="min-w-0 flex-1 basis-60">
          <h2 className="text-[17px] font-semibold tracking-tight">{title}</h2>
          {description && <p className="mt-0.5 text-sm leading-snug text-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  );
}
