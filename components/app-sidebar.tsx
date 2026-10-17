"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { ComponentProps, ReactNode } from "react"
import {
  BriefcaseBusiness,
  BrainCircuit,
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
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { usePersona } from "@/lib/persona/context"

const portfolioLinks = [
  { title: "Summary", path: "/dashboard/", icon: Gauge },
  { title: "Ask AI", path: "/", icon: BrainCircuit },
  { title: "About", questionId: "about", icon: UserRound },
  { title: "Experience", questionId: "experience", icon: BriefcaseBusiness },
  { title: "Projects", questionId: "projects", icon: FolderKanban },
  { title: "Skills", questionId: "skills", icon: Wrench },
  { title: "Contact", questionId: "contact", icon: Mail },
]

export function AppSidebar({
  isAdmin,
  ...props
}: ComponentProps<typeof Sidebar> & { isAdmin: boolean }) {
  const persona = usePersona()
  const pathname = usePathname().replace(/\/+$/, "") || "/"
  const documentPath = persona.document.pageUrl

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
              tooltip={persona.identity.name}
              render={<Link href={persona.href("/")} />}
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-sidebar-primary text-sm font-semibold text-sidebar-primary-foreground">
                {persona.identity.initials}
              </span>
              <span className="grid min-w-0 text-left">
                <span className="truncate font-semibold">{persona.identity.name}</span>
                <span className="truncate text-xs text-sidebar-foreground/70">
                  {persona.identity.role || "Portfolio"}
                </span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Portfolio</SidebarGroupLabel>
          <SidebarMenu>
            {portfolioLinks.map(({ title, path, questionId, icon: Icon }) =>
              linkItem(
                title,
                questionId ? persona.askPath(questionId) : persona.href(path ?? "/"),
                <Icon />,
              ),
            )}
            {linkItem(
              persona.document.label || "CV",
              persona.href(documentPath),
              <FileText />,
            )}
          </SidebarMenu>
        </SidebarGroup>
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarMenu>{linkItem("Admin", "/admin/", <Shield />)}</SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
