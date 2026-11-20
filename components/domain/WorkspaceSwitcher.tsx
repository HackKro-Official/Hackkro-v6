"use client"

import { Building2, ChevronDown, Check } from "lucide-react"
import { useUserAuth } from "@/lib/user-auth-context"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

export function WorkspaceSwitcher() {
  const { user, availableWorkspaces, switchWorkspace } = useUserAuth()
  if (!user || availableWorkspaces.length === 0) return null

  const current =
    availableWorkspaces.find(
      (w) =>
        w.roleKey === user.activeRole &&
        (w.organizationId || null) === (user.activeOrganizationId || null)
    ) || availableWorkspaces[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs font-medium max-w-[200px]"
          aria-label="Switch active workspace"
        >
          <Building2 className="h-3.5 w-3.5 text-blue-600 shrink-0" aria-hidden="true" />
          <span className="truncate">{current?.label || user.activeRole}</span>
          <ChevronDown className="h-3 w-3 opacity-60 shrink-0" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Active Role &amp; Tenant Workspace
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {availableWorkspaces.map((ws) => {
          const isCurrent =
            ws.roleKey === user.activeRole &&
            (ws.organizationId || null) === (user.activeOrganizationId || null)
          return (
            <DropdownMenuItem
              key={`${ws.roleKey}-${ws.organizationId || "personal"}`}
              onClick={() => switchWorkspace(ws.roleKey, ws.organizationId)}
              className="flex items-center justify-between gap-2 cursor-pointer text-xs py-2"
            >
              <span className="truncate font-medium">{ws.label}</span>
              {isCurrent && <Check className="h-3.5 w-3.5 text-blue-600 shrink-0" aria-hidden="true" />}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
