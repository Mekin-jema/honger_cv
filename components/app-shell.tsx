"use client"

import type { ReactNode } from "react"
import { usePathname } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import {
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

export function AppShell({
  children,
  isAdmin,
}: {
  children: ReactNode
  isAdmin: boolean
}) {
  const pathname = usePathname()
  const routePath = pathname.replace(/\/+$/, "") || "/"
  const isChatPage = routePath === "/" || routePath.startsWith("/ask/")
  const isAdminInbox = routePath === "/admin"
  const isDashboardPage = routePath === "/dashboard"
  const isCvPage = routePath === "/cv"
  const isPersonaAdmin = routePath === "/admin/personas" || routePath.startsWith("/admin/personas/")
  const isAdminSettings = routePath === "/admin/settings"
  const isPortfolioPage =
    ["/about", "/contact", "/experience", "/projects", "/skills"].includes(routePath) ||
    routePath.startsWith("/projects/")

  if (isPortfolioPage) return <>{children}</>

  return (
    <SidebarProvider>
      <AppSidebar isAdmin={isAdmin} />
      <div className="relative flex min-w-0 flex-1 flex-col bg-background">
        {!isChatPage && !isAdminInbox && !isDashboardPage && !isCvPage && !isPersonaAdmin && !isAdminSettings && (
          <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center border-b bg-background/95 px-3 backdrop-blur">
            <SidebarTrigger />
          </header>
        )}
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </SidebarProvider>
  )
}
