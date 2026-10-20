"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { ComponentProps, ReactNode } from "react"
import {
  BriefcaseBusiness,
  Bot,
  BrainCircuit,
  Activity,
  Gauge,
  FileText,
  FolderKanban,
  Mail,
  Shield,
  UserRound,
  Wrench,
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
import { useState } from "react"

type AccountSidebarPersona = { slug: string; name: string; identityName: string; role: string; publishedVersionId: string | null }

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
  ...props
}: ComponentProps<typeof Sidebar> & {
  isAdmin: boolean;
  accountName?: string;
  accountEmail?: string;
  accountAvatar?: string | null;
  sidebarUser?: { name: string; email: string; avatar?: string | null };
  accountPersonas?: AccountSidebarPersona[];
}) {
  const persona = usePersona()
  const pathname = usePathname().replace(/\/+$/, "") || "/"
  const routeSlug = pathname.match(/^\/account\/(?:ai|training)\/([^/]+)/)?.[1]
  const routePersona = accountPersonas.find((item) => item.slug === routeSlug)
  const [selection, setSelection] = useState(() => ({
    pathname,
    slug: routePersona?.slug ?? accountPersonas[0]?.slug ?? "",
  }))
  const activeSlug = (selection.pathname !== pathname ? routePersona?.slug : selection.slug) ?? accountPersonas[0]?.slug ?? ""
  const activePersona = accountPersonas.find((item) => item.slug === activeSlug)
  const documentPath = persona.legacy ? "/cv/" : persona.document.pageUrl
  const accountAsk = activeSlug ? `/account/ai/${activeSlug}/` : "/account/new/"

  const linkItem = (title: string, href: string, icon: ReactNode) => {
    const target = href.split("#", 1)[0].replace(/\/+$/, "") || "/"
    const active = target === "/" ? pathname === "/" : pathname === target || pathname.startsWith(`${target}/`)
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
                  ? accountName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()
                  : persona.identity.initials}
              </span>
              <span className="grid min-w-0 text-left">
                <span className="truncate font-semibold">{accountName ?? persona.identity.name}</span>
                <span className="truncate text-xs text-sidebar-foreground/70">
                  {accountName
                    ? activePersona
                      ? `${activePersona.name}${activePersona.role ? ` · ${activePersona.role}` : ""}`
                      : "Create your first CV"
                    : persona.identity.role ?? "Portfolio"}
                </span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{accountName ? "Workspace" : "Portfolio"}</SidebarGroupLabel>
          <SidebarMenu>
            {portfolioLinks.map(({ title, path, questionId, icon: Icon }) =>
              linkItem(
                accountName && title === "Summary" ? "My CVs" : title,
                accountName
                  ? title === "Summary"
                    ? "/account/"
                    : questionId && activeSlug
                      ? `${accountAsk}?ask=${encodeURIComponent(
                        title === "About" ? "Tell me about yourself."
                          : title === "Experience" ? "Tell me about your work experience."
                            : title === "Projects" ? "Tell me about your projects."
                              : title === "Skills" ? "What are your skills?"
                                : "How can I contact you?",
                      )}`
                      : title === "Ask AI" ? accountAsk : "/account/new/"
                  : questionId ? persona.askPath(questionId) : persona.href(path ?? "/"),
                <Icon />,
              ),
            )}
            {accountName && linkItem("Create CV", "/account/new/", <FileText />)}
            {linkItem(
              accountName ? "Edit CV" : persona.document.label || "CV",
              accountName ? (activeSlug ? `/account/training/${activeSlug}/design/` : "/account/new/") : persona.href(documentPath),
              <FileText />,
            )}
          </SidebarMenu>
        </SidebarGroup>
        {accountName && (
          <SidebarGroup>
            {accountPersonas.length > 1 && (
              <select
                aria-label="Choose active CV"
                value={activeSlug}
                onChange={(event) => setSelection({ pathname, slug: event.target.value })}
                className="mx-2 mb-2 min-h-9 w-[calc(100%-1rem)] rounded-lg border border-sidebar-border bg-sidebar px-2 text-sm text-sidebar-foreground"
              >
                {accountPersonas.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
              </select>
            )}
            <SidebarMenu className="mt-2">
              {linkItem("Train this CV", activeSlug ? `/account/training/${activeSlug}/` : "/account/new/", <Bot />)}
            </SidebarMenu>
          </SidebarGroup>
        )}
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarMenu>
              {linkItem("AI Training", "/admin/personas/", <BrainCircuit />)}
              {linkItem("Analytics", "/admin/analytics/", <Activity />)}
              {linkItem("User", "/admin/", <Shield />)}
            </SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>
      {(accountName || sidebarUser) && (
        <SidebarFooter className="border-t border-sidebar-border">
          <NavUser
            user={sidebarUser ?? {
              name: accountName ?? "",
              email: accountEmail ?? "",
              avatar: accountAvatar,
            }}
          />
        </SidebarFooter>
      )}
      <SidebarRail />
    </Sidebar>
  )
}
