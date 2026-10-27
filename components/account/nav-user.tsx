"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronsUpDown,
  CircleUserRound,
  FilePlus2,
  LoaderCircle,
  LogOut,
  Moon,
  Sun,
} from "lucide-react";
import { useTheme } from "next-themes";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { toast } from "@/components/ui/toast";
import { getAuthClient } from "@/lib/auth-client";
import { withBase } from "@/lib/utils";

export function NavUser({
  user,
}: {
  user: {
    name: string;
    email: string;
    avatar?: string | null;
  };
}) {
  const { isMobile } = useSidebar();
  const { resolvedTheme, setTheme } = useTheme();

  const [avatarFailed, setAvatarFailed] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const initials =
    user.name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

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
        description:
          "Couldn't reach the server. Check your connection and try again.",
        type: "error",
        priority: "high",
      });
    } finally {
      setSigningOut(false);
    }
  };

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              disabled={signingOut}
              className="h-auto min-h-12 rounded-xl border border-sidebar-border bg-sidebar-accent/50 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="size-8 shrink-0 rounded-lg">
                {user.avatar && !avatarFailed ? (
                  <AvatarImage
                    src={user.avatar}
                    alt={user.name}
                    onError={() => setAvatarFailed(true)}
                  />
                ) : null}
                <AvatarFallback className="rounded-lg bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <span className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  {user.name || "User"}
                </span>
                <span className="truncate text-xs text-sidebar-foreground/70">
                  {user.email}
                </span>
              </span>

              <ChevronsUpDown
                className="ml-auto size-4 shrink-0"
                aria-hidden="true"
              />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-xl"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-2 py-2 text-left text-sm">
                <Avatar className="size-9 shrink-0 rounded-lg">
                  {user.avatar && !avatarFailed ? (
                    <AvatarImage
                      src={user.avatar}
                      alt={user.name}
                      onError={() => setAvatarFailed(true)}
                    />
                  ) : null}
                  <AvatarFallback className="rounded-lg bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>

                <div className="grid min-w-0 flex-1 leading-tight">
                  <span className="truncate font-medium">
                    {user.name || "User"}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {user.email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href={withBase("/account/")}>
                  <CircleUserRound aria-hidden="true" />
                  <span>My CVs</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link href={withBase("/account/new/")}>
                  <FilePlus2 aria-hidden="true" />
                  <span>Create a CV</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem onClick={toggleTheme}>
                {resolvedTheme === "dark" ? (
                  <Sun aria-hidden="true" />
                ) : (
                  <Moon aria-hidden="true" />
                )}
                <span>
                  Switch to {resolvedTheme === "dark" ? "light" : "dark"} theme
                </span>
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              variant="destructive"
              disabled={signingOut}
              onClick={() => void signOut()}
            >
              {signingOut ? (
                <LoaderCircle className="animate-spin" aria-hidden="true" />
              ) : (
                <LogOut aria-hidden="true" />
              )}
              <span>{signingOut ? "Signing out..." : "Sign out"}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
