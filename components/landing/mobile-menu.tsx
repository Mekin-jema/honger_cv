"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

const links = [
  { href: "#portfolio", label: "Portfolio AI" },
  { href: "#templates", label: "25+ CV templates" },
  { href: "#how-it-works", label: "How it works" },
];

export function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);

  const close = () => setIsOpen(false);

  return (
    <div className="relative md:hidden">
      <button
        type="button"
        aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={isOpen}
        aria-controls="landing-mobile-menu"
        title={isOpen ? "Close menu" : "Open menu"}
        onClick={() => setIsOpen((open) => !open)}
        onKeyDown={(event) => {
          if (event.key === "Escape") close();
        }}
        className="grid size-10 place-items-center rounded-lg border border-line bg-card text-fg transition-colors hover:bg-surface"
      >
        {isOpen ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
      </button>
      {isOpen && (
        <nav
          id="landing-mobile-menu"
          aria-label="Mobile navigation"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[min(19rem,calc(100vw-2.5rem))] rounded-lg border border-line bg-card p-2 text-fg shadow-lg"
        >
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={close}
              className="flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-muted transition-colors hover:bg-surface hover:text-fg"
            >
              {link.label}
            </a>
          ))}
          <div className="mt-1 border-t border-line pt-1">
            <Link
              href="/ask/"
              onClick={close}
              className="flex min-h-11 items-center rounded-md px-3 text-sm font-semibold text-muted transition-colors hover:bg-surface hover:text-fg"
            >
              Explore Mekin&apos;s demo
            </Link>
            <Link
              href="/register/"
              onClick={close}
              className="flex min-h-11 items-center rounded-md bg-accent px-3 text-sm font-bold text-on-accent transition hover:brightness-95"
            >
              Build your portfolio
            </Link>
          </div>
        </nav>
      )}
    </div>
  );
}