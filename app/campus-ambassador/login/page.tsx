"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useUserAuth } from "@/lib/user-auth-context"

export default function CampusAmbassadorLoginRedirect() {
  const { isLoggedIn } = useUserAuth()
  const router = useRouter()

  useEffect(() => {
    router.replace(
      isLoggedIn
        ? "/campus-ambassador/dashboard"
        : "/login?returnTo=/campus-ambassador/dashboard"
    )
  }, [isLoggedIn, router])

  return (
    <main className="mx-auto max-w-md px-4 py-16 text-center">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        HackKro uses unified authentication across all workspaces. Redirecting to sign in...
      </p>
      <Link
        href="/login?returnTo=/campus-ambassador/dashboard"
        className="mt-4 inline-block text-sm font-semibold text-indigo-600 underline"
      >
        Continue to Sign In
      </Link>
    </main>
  )
}
