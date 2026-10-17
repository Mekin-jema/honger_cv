"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, Loader2, Send, Star } from "lucide-react";
import { postApi } from "@/lib/visitor";
import { cn } from "@/lib/utils";

type Status = { state: "idle" | "sending" | "sent" | "error"; message?: string };

export const field =
  "w-full rounded-xl border border-line-strong bg-card px-3.5 py-2.5 text-[16px] outline-none transition-[border-color,box-shadow] placeholder:text-faint focus:border-accent focus:ring-1 focus:ring-accent";
export const label = "mb-1.5 block text-sm font-semibold";
const invalidField = "border-accent";

/** Same rules as the API routes (src/app/api/contact, src/app/api/feedback), so problems show before sending. */
const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s) && s.length <= 200;

type Errors<K extends string> = Partial<Record<K, string>>;

/** Inline error under a field; its id is what the field's aria-describedby points to. */
export const FieldError = ({ id, message }: { id: string; message?: string }) =>
  message ? (
    <p id={id} className="mt-1.5 text-sm font-medium text-accent">
      {message}
    </p>
  ) : null;

/** aria props for a field that may have an error. */
export const errProps = (id: string, message?: string) =>
  message ? { "aria-invalid": true as const, "aria-describedby": id } : {};

/** Focuses the first invalid field, in the order the fields appear. (useId ids are not valid CSS selectors, so no querySelector.) */
function focusFirst(form: HTMLFormElement | null, ids: string[]) {
  ids.map((id) => form?.ownerDocument.getElementById(id)).find((el) => el && form?.contains(el))?.focus();
}

/** Moves focus to a message once it appears (error alert, sent card), so keyboard and screen-reader users land on it. */
export function useFocusOnShow<T extends HTMLElement>(show: boolean) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (show) ref.current?.focus();
  }, [show]);
  return ref;
}

/** Error line for a failed send: focusable (not in the Tab order) so focus can land on it. */
export function SendError({ message }: { message?: string }) {
  const ref = useFocusOnShow<HTMLParagraphElement>(true);
  return (
    <p ref={ref} role="alert" tabIndex={-1} className="text-sm font-medium text-accent outline-none">
      {message}
    </p>
  );
}

/** Hidden field real people never fill; bots usually do. */
const Honeypot = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
    <label>
      Website
      <input tabIndex={-1} autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)} name="website" />
    </label>
  </div>
);

function Sent({ title, body }: { title: string; body: string }) {
  // The form (and the focused button) is replaced by this card, so focus moves here instead of dropping to <body>.
  const ref = useFocusOnShow<HTMLDivElement>(true);
  return (
    <div ref={ref} tabIndex={-1} className="card flex items-start gap-3 p-5 outline-none md:p-6" role="status">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
        <Check className="size-5" />
      </span>
      <div>
        <div className="text-lg font-semibold">{title}</div>
        <p className="mt-1 text-[15px] text-muted">{body}</p>
      </div>
    </div>
  );
}

type ContactField = "name" | "email" | "message";

export function ContactForm() {
  const [form, setForm] = useState({ name: "", email: "", company: "", message: "", website: "" });
  const [status, setStatus] = useState<Status>({ state: "idle" });
  const [errors, setErrors] = useState<Errors<ContactField>>({});
  const formRef = useRef<HTMLFormElement>(null);
  // Unique per form, so asking for the form twice never shares label/error ids.
  const uid = useId();
  const id = (k: string) => `${uid}-c-${k}`;
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    // A field's error clears as soon as it is edited.
    if (k in errors) setErrors((er) => ({ ...er, [k]: undefined }));
  };

  const validate = () => {
    const er: Errors<ContactField> = {};
    const email = form.email.trim();
    if (!form.name.trim()) er.name = "Please add your name.";
    if (!email || !isEmail(email)) er.email = "Please add a valid email address.";
    if (form.message.trim().length < 5) er.message = "Please write a short message (at least 5 characters).";
    return er;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status.state === "sending") return;
    const er = validate();
    setErrors(er);
    const invalid = (["name", "email", "message"] as const).filter((k) => er[k]);
    if (invalid.length) {
      setStatus({ state: "idle" });
      focusFirst(formRef.current, invalid.map((k) => id(k)));
      return;
    }
    setStatus({ state: "sending" });
    const res = await postApi("/api/contact/", form);
    setStatus(res.ok ? { state: "sent" } : { state: "error", message: res.error ?? "Something went wrong." });
  };

  if (status.state === "sent")
    return <Sent title="Message sent - thank you!" body={`I'll reply to ${form.email} as soon as I can, usually within a day.`} />;

  return (
    <form ref={formRef} onSubmit={submit} aria-busy={status.state === "sending"} className="card relative space-y-4 p-5 md:p-6" noValidate>
      <div className="eyebrow">Send me a message</div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={id("name")} className={label}>
            Name
          </label>
          <input
            id={id("name")}
            required
            maxLength={120}
            autoComplete="name"
            value={form.name}
            onChange={set("name")}
            {...errProps(id("name-err"), errors.name)}
            className={cn(field, errors.name && invalidField)}
          />
          <FieldError id={id("name-err")} message={errors.name} />
        </div>
        <div>
          <label htmlFor={id("email")} className={label}>
            Email
          </label>
          <input
            id={id("email")}
            type="email"
            required
            maxLength={200}
            autoComplete="email"
            value={form.email}
            onChange={set("email")}
            {...errProps(id("email-err"), errors.email)}
            className={cn(field, errors.email && invalidField)}
          />
          <FieldError id={id("email-err")} message={errors.email} />
        </div>
      </div>
      <div>
        <label htmlFor={id("company")} className={label}>
          Company <span className="font-normal text-faint">(optional)</span>
        </label>
        <input id={id("company")} maxLength={160} autoComplete="organization" value={form.company} onChange={set("company")} className={field} />
      </div>
      <div>
        <label htmlFor={id("message")} className={label}>
          Message
        </label>
        <textarea
          id={id("message")}
          required
          rows={4}
          maxLength={4000}
          value={form.message}
          onChange={set("message")}
          placeholder="A role, a project, or just hello…"
          {...errProps(id("message-err"), errors.message)}
          className={cn(field, "resize-y", errors.message && invalidField)}
        />
        <FieldError id={id("message-err")} message={errors.message} />
      </div>
      <Honeypot value={form.website} onChange={(v) => setForm((f) => ({ ...f, website: v }))} />
      {status.state === "error" && <SendError message={status.message} />}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" aria-disabled={status.state === "sending"} className="btn btn-primary aria-disabled:cursor-progress aria-disabled:opacity-60">
          {status.state === "sending" ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Sending...
            </>
          ) : (
            <>
              <Send className="size-4" aria-hidden="true" /> Send message
            </>
          )}
        </button>
        <span className="text-xs text-faint">Stored privately so I can reply. Never shared.</span>
      </div>
    </form>
  );
}

const ratingLabels = ["Not useful", "Could be better", "OK", "Good", "Loved it"];

type FeedbackField = "message" | "email";

export function FeedbackForm() {
  const [rating, setRating] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [form, setForm] = useState({ message: "", name: "", email: "", website: "" });
  const [status, setStatus] = useState<Status>({ state: "idle" });
  const [errors, setErrors] = useState<Errors<FeedbackField>>({});
  const formRef = useRef<HTMLFormElement>(null);
  const stars = useRef<(HTMLButtonElement | null)[]>([]);
  const uid = useId();
  const id = (k: string) => `${uid}-f-${k}`;
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (k in errors) setErrors((er) => ({ ...er, [k]: undefined }));
  };

  const pick = (n: number | null) => {
    setRating(n);
    // A rating alone is enough, so it clears the "rating or a few words" error.
    if (n) setErrors((er) => ({ ...er, message: undefined }));
  };

  // Roving tabindex: one Tab stop for the group; arrow keys, Home and End move focus and select.
  const onStarKey = (e: React.KeyboardEvent, n: number) => {
    let to: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") to = (n % 5) + 1;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") to = ((n + 3) % 5) + 1;
    else if (e.key === "Home") to = 1;
    else if (e.key === "End") to = 5;
    if (!to) return;
    e.preventDefault();
    pick(to);
    stars.current[to - 1]?.focus();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status.state === "sending") return;
    const er: Errors<FeedbackField> = {};
    const email = form.email.trim();
    if (!rating && form.message.trim().length < 3) er.message = "Pick a rating or write a few words.";
    if (email && !isEmail(email)) er.email = "That email address doesn't look right.";
    setErrors(er);
    const invalid = (["message", "email"] as const).filter((k) => er[k]);
    if (invalid.length) {
      setStatus({ state: "idle" });
      focusFirst(formRef.current, invalid.map((k) => id(k)));
      return;
    }
    setStatus({ state: "sending" });
    const res = await postApi("/api/feedback/", { ...form, rating });
    setStatus(res.ok ? { state: "sent" } : { state: "error", message: res.error ?? "Something went wrong." });
  };

  if (status.state === "sent") return <Sent title="Thanks for the feedback!" body="Every note helps me make this site better." />;

  const shown = hover ?? rating;
  return (
    <form ref={formRef} onSubmit={submit} aria-busy={status.state === "sending"} className="card relative space-y-4 p-5 md:p-6" noValidate>
      <div className="eyebrow">How was this site?</div>
      <div>
        <div
          className="flex items-center gap-1"
          role="radiogroup"
          aria-label="Rating"
          aria-describedby={errors.message ? id("message-err") : undefined}
          onMouseLeave={() => setHover(null)}
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              ref={(el) => {
                stars.current[n - 1] = el;
              }}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} of 5 - ${ratingLabels[n - 1]}`}
              tabIndex={(rating ?? 1) === n ? 0 : -1}
              onKeyDown={(e) => onStarKey(e, n)}
              onMouseEnter={() => setHover(n)}
              // Keyboard (Space/Enter, detail 0) always selects the focused star; a pointer click on the checked star clears it.
              onClick={(e) => pick(e.detail !== 0 && rating === n ? null : n)}
              className="grid size-11 place-items-center rounded-xl transition-transform hover:scale-110"
            >
              <Star className={cn("size-7 transition-colors", shown && n <= shown ? "fill-accent text-accent" : "text-faint")} />
            </button>
          ))}
          <span className="ml-2 text-sm font-medium text-muted">{shown ? ratingLabels[shown - 1] : "Tap a star"}</span>
        </div>
      </div>
      <div>
        <label htmlFor={id("message")} className={label}>
          What should I keep, change or add?
        </label>
        <textarea
          id={id("message")}
          rows={3}
          maxLength={4000}
          value={form.message}
          onChange={set("message")}
          {...errProps(id("message-err"), errors.message)}
          className={cn(field, "resize-y", errors.message && invalidField)}
        />
        <FieldError id={id("message-err")} message={errors.message} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={id("name")} className={label}>
            Name <span className="font-normal text-faint">(optional)</span>
          </label>
          <input id={id("name")} maxLength={120} autoComplete="name" value={form.name} onChange={set("name")} className={field} />
        </div>
        <div>
          <label htmlFor={id("email")} className={label}>
            Email <span className="font-normal text-faint">(optional)</span>
          </label>
          <input
            id={id("email")}
            type="email"
            maxLength={200}
            autoComplete="email"
            value={form.email}
            onChange={set("email")}
            {...errProps(id("email-err"), errors.email)}
            className={cn(field, errors.email && invalidField)}
          />
          <FieldError id={id("email-err")} message={errors.email} />
        </div>
      </div>
      <Honeypot value={form.website} onChange={(v) => setForm((f) => ({ ...f, website: v }))} />
      {status.state === "error" && <SendError message={status.message} />}
      <button type="submit" aria-disabled={status.state === "sending"} className="btn btn-primary aria-disabled:cursor-progress aria-disabled:opacity-60">
        {status.state === "sending" ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Sending...
          </>
        ) : (
          <>
            <Send className="size-4" aria-hidden="true" /> Send feedback
          </>
        )}
      </button>
    </form>
  );
}
