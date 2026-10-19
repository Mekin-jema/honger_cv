"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronUp, CircleUserRound, LogOut, LoaderCircle } from "lucide-react";
import { useSidebar, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getAuthClient } from "@/lib/auth-client";
import { withBase } from "@/lib/utils";

export function NavUser({
  user,
}: {
  user: { name: string; email: string; avatar: string };
}) {
  const { isMobile, state } = useSidebar();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [avatarFailed, setAvatarFailed] = useState(false);
  const initials = user.name.trim().split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "U";

  const signOut = async () => {
    if (busy) return;
    setBusy(true);
    setError(undefined);
    try {
      const result = await getAuthClient().signOut();
      if (result.error) {
        setError("Couldn't sign out. Please try again.");
        return;
      }
      window.location.assign(withBase("/"));
    } catch {
      setError("Couldn't reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger render={<SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground" />}>
            <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-lg bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground">
              {user.avatar && !avatarFailed
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={user.avatar} alt="" onError={() => setAvatarFailed(true)} className="size-full object-cover" />
                : initials}
            </span>
            <span className="grid min-w-0 flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{user.name}</span>
              <span className="truncate text-xs text-sidebar-foreground/70">{user.email}</span>
            </span>
            <ChevronUp className="ml-auto size-4 shrink-0" aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "top"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="flex items-center gap-2 font-normal">
              <CircleUserRound className="size-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block truncate font-medium text-foreground">{user.name}</span>
                <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href={withBase("/account/")} />}>
              <CircleUserRound aria-hidden="true" />
              Account
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => void signOut()} disabled={busy}>
              {busy ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <LogOut aria-hidden="true" />}
              Log out
            </DropdownMenuItem>
            {error && <p role="alert" className="px-2 py-1.5 text-xs text-destructive">{error}</p>}
          </DropdownMenuContent>
        </DropdownMenu>
        {state === "collapsed" && <span className="sr-only">Signed-in account menu</span>}
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
