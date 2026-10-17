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
  const isChatPage = pathname === "/" || pathname.startsWith("/ask/")
  const isCvPage = /(?:^|\/)cv\/?$/.test(pathname)

  if (isCvPage) return <>{children}</>

  return (
    <SidebarProvider>
      <AppSidebar isAdmin={isAdmin} />
      <div className="relative flex min-w-0 flex-1 flex-col bg-background">
        {!isChatPage && (
          <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center border-b bg-background/95 px-3 backdrop-blur">
            <SidebarTrigger />
          </header>
        )}
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </SidebarProvider>
  )
}
