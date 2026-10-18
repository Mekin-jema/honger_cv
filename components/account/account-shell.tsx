"use client";

import type { ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { ThemeToggle } from "@/components/theme-provider";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { SignOutButton } from "@/components/account/sign-out-button";
import { AppSidebar } from "@/components/app-sidebar";
import { cn } from "@/lib/utils";

export type AccountSidebarPersona = { slug: string; name: string; identityName: string; role: string; publishedVersionId: string | null };

export function AccountShell({ children, name, personas }: { children: ReactNode; name: string; personas: AccountSidebarPersona[] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routePath = pathname.replace(/\/+$/, "") || "/";
  const section = routePath === "/account" ? "Dashboard" : routePath.includes("/ai/") ? "AI responses" : routePath.includes("/design") ? "CV design" : searchParams.get("tab") === "json" ? "Profile JSON" : "AI training";
  const isStudio = /^\/account\/training\/[^/]+$/.test(routePath);

  return (
    <SidebarProvider>
      <AppSidebar isAdmin={false} accountName={name} accountPersonas={personas} />
      <div className="flex min-w-0 flex-1 flex-col bg-bg text-fg">
        {!isStudio && (
          <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b border-line bg-bg/90 px-4 backdrop-blur-xl sm:px-6">
            <SidebarTrigger />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{section}</p>
              <p className="hidden truncate text-xs text-muted sm:block">Your private profile workspace</p>
            </div>
            <ThemeToggle className="border border-line-strong bg-card text-fg shadow-sm" />
            <SignOutButton />
          </header>
        )}
        <div className={cn("min-w-0 flex-1", routePath === "/account" && "bg-bg")}>{children}</div>
      </div>
    </SidebarProvider>
  );
}
