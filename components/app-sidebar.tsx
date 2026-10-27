"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { ComponentProps, ReactNode } from "react"
import { useState } from "react"
import {
  BriefcaseBusiness,
  Bot,
  BrainCircuit,
  Activity,
  CreditCard,
  Gauge,
  FolderKanban,
  Mail,
  Shield,
  UserRound,
  Wrench,
  Layers,
  Plus,
  ExternalLink,
  Crown,
  Zap,
  Mic,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { usePersona } from "@/lib/persona/context"
import { NavUser } from "@/components/account/nav-user"
import { cn } from "@/lib/utils"

type AccountSidebarPersona = {
  slug: string
  name: string
  identityName: string
  role: string
  publishedVersionId: string | null
}

const portfolioLinks = [
  { title: "Summary", path: "/dashboard/", icon: Gauge },
  { title: "Ask AI", path: "/ask/", icon: BrainCircuit },
  { title: "About", questionId: "about", icon: UserRound },
  { title: "Experience", questionId: "experience", icon: BriefcaseBusiness },
  { title: "Projects", questionId: "projects", icon: FolderKanban },
  { title: "Skills", questionId: "skills", icon: Wrench },
  { title: "Contact", questionId: "contact", icon: Mail },
]

export function AppSidebar({
  isAdmin,
  accountName,
  accountEmail,
  accountAvatar,
  sidebarUser,
  accountPersonas = [],
  cvPassActive = false,
  portfolioProActive = false,
  ...props
}: ComponentProps<typeof Sidebar> & {
  isAdmin: boolean
  accountName?: string
  accountEmail?: string
  accountAvatar?: string | null
  sidebarUser?: { name: string; email: string; avatar?: string | null }
  accountPersonas?: AccountSidebarPersona[]
  cvPassActive?: boolean
  portfolioProActive?: boolean
}) {
  const persona = usePersona()
  const pathname = usePathname().replace(/\/+$/, "") || "/"
  const routeSlug = pathname.match(/^\/account\/(?:ai|training)\/([^/]+)/)?.[1]
  const routePersona = accountPersonas.find((item) => item.slug === routeSlug)
  const [selection, setSelection] = useState(() => ({
    pathname,
    slug: routePersona?.slug ?? accountPersonas[0]?.slug ?? "",
  }))
  const activeSlug =
    (selection.pathname !== pathname ? routePersona?.slug : selection.slug) ??
    accountPersonas[0]?.slug ??
    ""
  const activePersona = accountPersonas.find((item) => item.slug === activeSlug)
  const documentPath = persona.legacy ? "/cv/" : persona.document.pageUrl
  const isPaid = Boolean(cvPassActive || portfolioProActive)

  const linkItem = (title: string, href: string, icon: ReactNode) => {
    const target = href.split("#", 1)[0].replace(/\/+$/, "") || "/"
    const active =
      target === "/account"
        ? pathname === "/account"
        : target === "/"
          ? pathname === "/"
          : pathname === target || pathname.startsWith(`${target}/`)
    return (
      <SidebarMenuItem key={`${title}-${href}`}>
        <SidebarMenuButton
          isActive={active}
          tooltip={title}
          render={<Link href={href} />}
        >
          {icon}
          <span>{title}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  return (
    <Sidebar collapsible="icon" className="border-r-0" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip={accountName ?? persona.identity.name}
              render={<Link href={accountName ? "/account/" : persona.href("/")} />}
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-sidebar-primary text-sm font-semibold text-sidebar-primary-foreground">
                {accountName
                  ? accountName
                      .split(/\s+/)
                      .map((part) => part[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()
                  : persona.identity.initials}
              </span>
              <span className="grid min-w-0 text-left">
                <span className="truncate font-semibold">{accountName ?? persona.identity.name}</span>
                <span className="truncate text-xs text-sidebar-foreground/70">
                  {accountName
                    ? activePersona
                      ? `${activePersona.name}${activePersona.role ? ` · ${activePersona.role}` : ""}`
                      : "Workspace"
                    : persona.identity.role ?? "Portfolio"}
                </span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {accountName ? (
          <>
            {/* Additional Component 1: Active CV Switcher & Status Card */}
            <SidebarGroup className="pb-1">
              <div className="flex items-center justify-between px-2 pb-1.5">
                <span className="text-[11px] font-semibold tracking-wider text-sidebar-foreground/60 uppercase">
                  Active CV
                </span>
                <Link
                  href="/account/new/"
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-sidebar-primary hover:underline"
                  title="Create new CV"
                >
                  <Plus className="size-3" />
                  <span>New</span>
                </Link>
              </div>

              {activePersona ? (
                <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/40 p-2.5 transition-all">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="grid size-7 shrink-0 place-items-center rounded-md bg-sidebar-primary/10 text-xs font-bold text-sidebar-primary">
                        {activePersona.name.slice(0, 2).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-sidebar-foreground">
                          {activePersona.name}
                        </p>
                        {activePersona.role && (
                          <p className="truncate text-[11px] text-sidebar-foreground/65">
                            {activePersona.role}
                          </p>
                        )}
                      </div>
                    </div>
                    {activePersona.publishedVersionId && (
                      <a
                        href={`/u/${activePersona.slug}/`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 text-sidebar-foreground/50 transition-colors hover:text-sidebar-foreground"
                        title="View published CV"
                      >
                        <ExternalLink className="size-3.5" />
                      </a>
                    )}
                  </div>

                  <div className="mt-2 flex items-center justify-between border-t border-sidebar-border/60 pt-2 text-[11px]">
                    {activePersona.publishedVersionId ? (
                      <span className="inline-flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                        <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
                        Published
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 font-medium text-amber-600 dark:text-amber-400">
                        <span className="size-1.5 rounded-full bg-amber-500" />
                        Draft
                      </span>
                    )}
                    <span className="text-[10px] text-sidebar-foreground/50">
                      /{activePersona.slug}
                    </span>
                  </div>

                  {accountPersonas.length > 1 && (
                    <div className="mt-2 border-t border-sidebar-border/60 pt-2">
                      <label htmlFor="active-cv-selector" className="sr-only">
                        Select active CV
                      </label>
                      <select
                        id="active-cv-selector"
                        aria-label="Select active CV"
                        value={activeSlug}
                        onChange={(event) => setSelection({ pathname, slug: event.target.value })}
                        className="w-full rounded-md border border-sidebar-border bg-sidebar px-2 py-1 text-xs text-sidebar-foreground focus:outline-none focus:ring-1 focus:ring-sidebar-ring"
                      >
                        {accountPersonas.map((item) => (
                          <option key={item.slug} value={item.slug}>
                            {item.name} {item.slug === activeSlug ? "✓" : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-sidebar-border bg-sidebar-accent/20 p-2.5 text-center">
                  <p className="text-xs text-sidebar-foreground/70">No CV created yet</p>
                  <Link
                    href="/account/new/"
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-sidebar-primary px-2.5 py-1 text-xs font-medium text-sidebar-primary-foreground"
                  >
                    <Plus className="size-3" /> Create your first CV
                  </Link>
                </div>
              )}
            </SidebarGroup>

            {/* Main Navigation: ONLY My CVs, Ask AI, Billing and plans, and Train */}
            <SidebarGroup>
              <SidebarGroupLabel>Menu</SidebarGroupLabel>
              <SidebarMenu>
                {linkItem("My CVs", "/account/", <Layers className="size-4" />)}
                {linkItem(
                  "Ask AI",
                  activeSlug ? `/account/ai/${activeSlug}/` : "/account/new/",
                  <BrainCircuit className="size-4" />
                )}
                {linkItem("Billing and plans", "/account/billing/", <CreditCard className="size-4" />)}
                {linkItem(
                  "Train",
                  activeSlug ? `/account/training/${activeSlug}/` : "/account/new/",
                  <Bot className="size-4" />
                )}
              </SidebarMenu>
            </SidebarGroup>

            {/* Additional Component 2: Plan & Feature Status Card */}
            <SidebarGroup className="mt-auto pt-2">
              <div className="rounded-xl border border-sidebar-border bg-gradient-to-b from-sidebar-accent/30 to-sidebar-accent/60 p-3">
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5">
                    <Crown
                      className={cn("size-4", isPaid ? "text-amber-500" : "text-sidebar-foreground/50")}
                    />
                    <span className="text-xs font-semibold text-sidebar-foreground">
                      {portfolioProActive
                        ? "Portfolio Pro"
                        : cvPassActive
                          ? "Lifetime CV Pass"
                          : "Free Plan"}
                    </span>
                  </div>
                  {isPaid ? (
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                      Active
                    </span>
                  ) : (
                    <span className="rounded-full bg-sidebar-border px-1.5 py-0.5 text-[10px] font-medium text-sidebar-foreground/70">
                      1 CV Limit
                    </span>
                  )}
                </div>

                <p className="mt-1.5 text-[11px] leading-relaxed text-sidebar-foreground/70">
                  {isPaid
                    ? "AI Voice interview & PDF upload fully enabled."
                    : "Free tier allows 1 manual CV. Upgrade to unlock AI Voice & PDF parsing."}
                </p>

                {/* Additional Component 3: AI Voice Feature Status Pill */}
                <div className="mt-2 flex items-center justify-between rounded-lg bg-sidebar-accent/60 px-2 py-1 text-[11px]">
                  <span className="flex items-center gap-1.5 text-sidebar-foreground/80">
                    <Mic className={cn("size-3.5", isPaid ? "text-emerald-500" : "text-amber-500")} />
                    <span>AI Voice</span>
                  </span>
                  <span
                    className={cn(
                      "font-medium",
                      isPaid
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-amber-600 dark:text-amber-400"
                    )}
                  >
                    {isPaid ? "Enabled" : "Locked (Upgrade)"}
                  </span>
                </div>

                <div className="mt-2.5 border-t border-sidebar-border/60 pt-2">
                  {isPaid ? (
                    <Link
                      href="/account/billing/"
                      className="flex w-full items-center justify-center rounded-lg border border-sidebar-border bg-sidebar px-2.5 py-1 text-xs font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
                    >
                      Manage billing
                    </Link>
                  ) : (
                    <Link
                      href="/account/billing/"
                      className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-opacity hover:opacity-95"
                    >
                      <Zap className="size-3.5 fill-current" />
                      Upgrade Plan
                    </Link>
                  )}
                </div>
              </div>
            </SidebarGroup>
          </>
        ) : (
          <SidebarGroup>
            <SidebarGroupLabel>Portfolio</SidebarGroupLabel>
            <SidebarMenu>
              {portfolioLinks.map(({ title, path, questionId, icon: Icon }) =>
                linkItem(
                  title,
                  questionId ? persona.askPath(questionId) : persona.href(path ?? "/"),
                  <Icon className="size-4" />
                )
              )}
              {linkItem(persona.document.label || "CV", persona.href(documentPath), <Layers className="size-4" />)}
            </SidebarMenu>
          </SidebarGroup>
        )}

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarMenu>
              {linkItem("AI Training", "/admin/personas/", <BrainCircuit className="size-4" />)}
              {linkItem("Analytics", "/admin/analytics/", <Activity className="size-4" />)}
              {linkItem("User", "/admin/", <Shield className="size-4" />)}
            </SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>

      {(accountName || sidebarUser) && (
        <SidebarFooter className="border-t border-sidebar-border">
          <NavUser
            user={
              sidebarUser ?? {
                name: accountName ?? "",
                email: accountEmail ?? "",
                avatar: accountAvatar,
              }
            }
          />
        </SidebarFooter>
      )}
      <SidebarRail />
    </Sidebar>
  )
}
