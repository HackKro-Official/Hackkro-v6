"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Bell, CheckCheck } from "lucide-react"
import { useUserAuth } from "@/lib/user-auth-context"
import { apiFetch } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export function NotificationBell() {
  const { isLoggedIn } = useUserAuth()
  const [items, setItems] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const load = async () => {
    if (!isLoggedIn) return
    const res = await apiFetch("/api/v1/notifications")
    if (res.success) {
      setItems(res.notifications || [])
      setUnreadCount(res.unreadCount || 0)
    }
  }

  useEffect(() => {
    load()
  }, [isLoggedIn])

  if (!isLoggedIn) return null

  const markAllRead = async () => {
    await apiFetch("/api/v1/notifications", {
      method: "PATCH",
      body: JSON.stringify({ markAll: true }),
    })
    load()
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9"
          aria-label={`Notifications (${unreadCount} unread)`}
        >
          <Bell className="h-4 w-4" aria-hidden="true" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
          <span className="text-xs font-bold">Notifications</span>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:underline"
            >
              <CheckCheck className="h-3 w-3" /> Mark all read
            </button>
          )}
        </div>
        <div className="max-h-72 overflow-y-auto divide-y divide-border">
          {items.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              You are all caught up.
            </div>
          ) : (
            items.slice(0, 8).map((n) => (
              <div
                key={n.id}
                className={`p-3 text-xs space-y-1 ${!n.readAt ? "bg-blue-500/5" : ""}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-foreground">{n.title}</span>
                  <span className="text-[10px] uppercase text-muted-foreground">{n.category}</span>
                </div>
                <p className="text-muted-foreground leading-relaxed">{n.body}</p>
                {n.actionUrl && (
                  <Link href={n.actionUrl} className="inline-block text-[11px] font-semibold text-blue-600 hover:underline">
                    View details
                  </Link>
                )}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
