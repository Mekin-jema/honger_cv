import type { SVGProps } from "react";
import { cn } from "@/lib/utils";

/**
 * Authentic Carte Bancaire (CB) Logo Badge
 */
export function CbBadge({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "inline-flex h-7 w-12 shrink-0 items-center justify-center rounded bg-white px-1 shadow-xs border border-slate-200/90",
        className
      )}
      title="Carte Bancaire (CB)"
    >
      <svg viewBox="0 0 40 26" className="h-4.5 w-auto" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="cbGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#005B94" />
            <stop offset="50%" stopColor="#007A87" />
            <stop offset="100%" stopColor="#00A86B" />
          </linearGradient>
        </defs>
        <rect width="40" height="26" rx="4" fill="url(#cbGrad)" />
        {/* Stylized rounded CB glyph */}
        <text
          x="20"
          y="18.5"
          fill="#FFFFFF"
          fontSize="17"
          fontWeight="900"
          fontFamily="system-ui, -apple-system, sans-serif"
          textAnchor="middle"
          letterSpacing="-1.5"
        >
          CB
        </text>
      </svg>
    </div>
  );
}

/**
 * Authentic Mastercard Logo Badge
 */
export function MastercardBadge({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "inline-flex h-7 w-12 shrink-0 items-center justify-center rounded bg-white px-1.5 shadow-xs border border-slate-200/90",
        className
      )}
      title="Mastercard"
    >
      <svg viewBox="0 0 38 24" className="h-5 w-auto" fill="none" aria-hidden="true">
        <circle cx="14" cy="11" r="9" fill="#EB001B" />
        <circle cx="24" cy="11" r="9" fill="#F79E1B" fillOpacity="0.92" />
        <path
          d="M19 4.3a8.96 8.96 0 0 1 3.5 6.7 8.96 8.96 0 0 1-3.5 6.7 8.96 8.96 0 0 1-3.5-6.7c0-2.6 1.3-4.9 3.5-6.7z"
          fill="#FF5F00"
        />
        <text
          x="19"
          y="22.5"
          fill="#111827"
          fontSize="4"
          fontWeight="700"
          fontFamily="system-ui, -apple-system, sans-serif"
          textAnchor="middle"
          letterSpacing="-0.2"
        >
          mastercard
        </text>
      </svg>
    </div>
  );
}

/**
 * Authentic Visa Logo Badge
 */
export function VisaBadge({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "inline-flex h-7 w-12 shrink-0 items-center justify-center rounded bg-white px-1.5 shadow-xs border border-slate-200/90",
        className
      )}
      title="Visa"
    >
      <svg viewBox="0 0 60 20" className="h-3.5 w-auto" fill="none" aria-hidden="true">
        <path
          d="M23.13 0.28L15.15 19.34H9.92L6.05 4.18C5.81 3.25 5.25 2.44 4.46 2.01C2.92 1.18 1.05 0.59 0 0.28L0.09 0.28H8.38C9.51 0.28 10.51 1.04 10.74 2.37L12.8 13.25L17.74 0.28H23.13ZM43.43 13.11C43.46 8.1 36.5 7.82 36.54 5.58C36.56 4.89 37.22 4.15 38.68 3.96C39.4 3.86 41.37 3.79 43.49 4.77L44.35 0.81C43.18 0.38 41.67 0 39.77 0C34.92 0 31.5 2.58 31.47 6.27C31.42 8.99 33.86 10.52 35.71 11.43C37.62 12.36 38.26 12.95 38.25 13.8C38.22 15.09 36.68 15.66 35.28 15.68C32.8 15.72 31.36 15.01 30.2 14.47L29.31 18.63C30.46 19.16 32.58 19.61 34.78 19.63C39.89 19.63 43.39 17.1 43.43 13.11ZM56.33 19.34H60.99L56.93 0.28H52.63C51.64 0.28 50.8 0.85 50.44 1.73L43.08 19.34H48.33L49.38 16.44H55.78L56.33 19.34ZM50.83 12.44L53.46 5.21L54.98 12.44H50.83ZM30.12 0.28L26.04 19.34H21.04L25.12 0.28H30.12Z"
          fill="#1434CB"
        />
      </svg>
    </div>
  );
}

/**
 * Authentic American Express (Amex) Logo Badge
 */
export function AmexBadge({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "inline-flex h-7 w-12 shrink-0 items-center justify-center rounded bg-white px-1 shadow-xs border border-slate-200/90",
        className
      )}
      title="American Express"
    >
      <svg viewBox="0 0 42 26" className="h-4.5 w-auto" fill="none" aria-hidden="true">
        <rect width="42" height="26" rx="2" fill="#006FCF" />
        <text
          x="21"
          y="10.5"
          fill="#FFFFFF"
          fontSize="4.8"
          fontWeight="900"
          fontFamily="system-ui, -apple-system, sans-serif"
          textAnchor="middle"
          letterSpacing="-0.1"
        >
          AMERICAN
        </text>
        <text
          x="21"
          y="17.5"
          fill="#FFFFFF"
          fontSize="4.8"
          fontWeight="900"
          fontFamily="system-ui, -apple-system, sans-serif"
          textAnchor="middle"
          letterSpacing="-0.1"
        >
          EXPRESS
        </text>
      </svg>
    </div>
  );
}

/**
 * Authentic PayPal Logo (Dual-Blue Monogram)
 */
export function PaypalLogo({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("size-4 shrink-0", className)}
      fill="none"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.945 2.45a.8.8 0 0 1 .79-.672h6.848c3.21 0 5.443 1.34 5.034 4.582-.29 2.302-1.996 3.633-4.148 4.153l-.337.074c-.38.084-.57.34-.64.718l-.946 5.032H7.076z"
        fill="#003087"
      />
      <path
        d="M9.13 15.6h-2.56l1.58-10.02a.8.8 0 0 1 .79-.67h6.85c3.21 0 5.44 1.34 5.03 4.58-.45 3.56-3.07 5.11-6.4 5.11h-2.14l-1.15 6.07a.64.64 0 0 1-.63.53H6.75l.39-2.06c.07-.38.26-.63.64-.72l1.35-.3z"
        fill="#0079C1"
      />
    </svg>
  );
}

/**
 * Authentic Chapa Brand Logo
 */
export function ChapaLogo({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 28 28"
      className={cn("size-4 shrink-0", className)}
      fill="none"
      aria-hidden="true"
      {...props}
    >
      <circle cx="14" cy="14" r="13" fill="#00C48C" />
      {/* Chapa stylized letter C mark */}
      <path
        d="M18.5 9.5C17.3 8.3 15.7 7.5 13.9 7.5C10.1 7.5 7 10.4 7 14C7 17.6 10.1 20.5 13.9 20.5C15.8 20.5 17.4 19.8 18.6 18.5L16.2 16.3C15.6 17 14.8 17.4 13.9 17.4C12 17.4 10.4 15.9 10.4 14C10.4 12.1 12 10.6 13.9 10.6C14.8 10.6 15.6 11 16.2 11.6L18.5 9.5Z"
        fill="#FFFFFF"
      />
      <circle cx="18" cy="14" r="2.2" fill="#FFC837" />
    </svg>
  );
}

/**
 * Authentic Stripe Icon (Stylized S Glyph)
 */
export function StripeLogo({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("size-4 shrink-0", className)}
      fill="none"
      aria-hidden="true"
      {...props}
    >
      <rect width="24" height="24" rx="5" fill="#635BFF" />
      <path
        d="M13.8 8.8c0-.9-.7-1.3-1.8-1.3-1.6 0-3.3.6-4.5 1.2V5.1c1.4-.6 3.1-1 4.7-1 3.1 0 5 1.5 5 4.2 0 3.7-5.1 3.2-5.1 4.8 0 1 .9 1.4 2 1.4 1.7 0 3.7-.8 4.9-1.5v3.6c-1.4.7-3.3 1.1-5.1 1.1-3.2 0-5.3-1.6-5.3-4.3 0-3.8 5.2-3.2 5.2-4.6z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

/**
 * Payment acceptance badges row matching user reference image:
 * "Payments: [CB] [Mastercard] [Visa] [American Express]"
 */
export function PaymentBadgesRow({
  label = "Payments:",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span className="text-xs font-semibold text-muted tracking-tight">{label}</span>
      <div className="flex items-center gap-1.5">
        <CbBadge />
        <MastercardBadge />
        <VisaBadge />
        <AmexBadge />
      </div>
    </div>
  );
}
