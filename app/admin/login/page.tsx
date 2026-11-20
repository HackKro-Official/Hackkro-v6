"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useUserAuth } from "@/lib/user-auth-context"

export default function AdminLoginRedirectPage() {
  const { user } = useUserAuth()
  const router = useRouter()

  useEffect(() => {
    const isStaff =
      user && ["platform_admin", "security_admin", "moderator", "support_agent"].includes(user.activeRole)
    router.replace(isStaff ? "/admin/dashboard" : "/login?returnTo=/admin/dashboard")
  }, [user, router])

  return (
    <main className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="text-xl font-bold text-slate-900 dark:text-white">Platform Admin Sign-In</h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
        HackKro enforces RBAC server-side session verification without hardcoded admin passwords.
      </p>
      <Link
        href="/login?returnTo=/admin/dashboard"
        className="mt-4 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
      >
        Sign In with Unified Staff Account
      </Link>
    </main>
  )
}
