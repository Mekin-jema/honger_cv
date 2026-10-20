"use client";

import { useState } from "react";
import Link from "next/link";
import { CircleUserRound, FilePlus2, LoaderCircle, LogOut, Moon, MoreVertical, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { toast } from "@/components/ui/toast";
import { getAuthClient } from "@/lib/auth-client";
import { withBase } from "@/lib/utils";

export function NavUser({
  user,
}: {
  user: { name: string; email: string; avatar?: string | null };
}) {
  const { resolvedTheme, setTheme } = useTheme();
  const [avatarFailed, setAvatarFailed] = useState(false);
  const initials = user.name.trim().split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "U";
  const [signingOut, setSigningOut] = useState(false);

  const signOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      const result = await getAuthClient().signOut();
      if (result.error) {
        toast.add({
          title: "Couldn't sign out",
          description: "Please try again.",
          type: "error",
          priority: "high",
        });
        return;
      }
      window.location.assign(withBase("/"));
    } catch {
      toast.add({
        title: "Couldn't sign out",
        description: "Couldn't reach the server. Check your connection and try again.",
        type: "error",
        priority: "high",
      });
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<SidebarMenuButton size="lg" className="h-auto min-h-12 data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground" />}
          >
            <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-lg bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground">
              {user.avatar && !avatarFailed
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={user.avatar} alt="" className="size-full object-cover" onError={() => setAvatarFailed(true)} />
                : initials}
            </span>
            <span className="grid min-w-0 flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{user.name}</span>
              <span className="truncate text-xs text-sidebar-foreground/70">{user.email}</span>
            </span>
            <MoreVertical className="ml-auto size-4 shrink-0" aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56 rounded-lg"
            side="right"
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-lg bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground">
                  {user.avatar && !avatarFailed
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={user.avatar} alt="" className="size-full object-cover" onError={() => setAvatarFailed(true)} />
                    : initials}
                </span>
                <span className="grid min-w-0 flex-1 leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem render={<Link href="/account/" />}>
                <CircleUserRound aria-hidden="true" />
                My CVs
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link href="/account/new/" />}>
                <FilePlus2 aria-hidden="true" />
                Create a CV
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              >
                {resolvedTheme === "dark"
                  ? <Sun aria-hidden="true" />
                  : <Moon aria-hidden="true" />}
                Switch to {resolvedTheme === "dark" ? "light" : "dark"} theme
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              disabled={signingOut}
              onClick={() => void signOut()}
            >
              {signingOut
                ? <LoaderCircle className="animate-spin" aria-hidden="true" />
                : <LogOut aria-hidden="true" />}
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
