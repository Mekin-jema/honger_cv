"use client";

import { useState } from "react";
import Link from "next/link";
import { CircleUserRound } from "lucide-react";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { SignOutButton } from "@/components/account/sign-out-button";

export function NavUser({
  user,
}: {
  user: { name: string; email: string; avatar: string };
}) {
  const [avatarFailed, setAvatarFailed] = useState(false);
  const initials = user.name.trim().split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "U";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size="lg"
          render={<Link href="/account/" aria-label={`Account for ${user.name}`} />}
          className="h-auto min-h-12"
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
          <CircleUserRound className="ml-auto size-4 shrink-0" aria-hidden="true" />
        </SidebarMenuButton>
        <div className="mt-1 px-1">
          <SignOutButton variant="sidebar" />
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
