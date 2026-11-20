"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useUserAuth } from "@/lib/user-auth-context"

export default function OrganizerLoginRedirect() {
  const { isLoggedIn } = useUserAuth()
  const router = useRouter()

  useEffect(() => {
    router.replace(isLoggedIn ? "/organizer/dashboard" : "/login?returnTo=/organizer/dashboard")
  }, [isLoggedIn, router])

  return (
    <main className="mx-auto max-w-md px-4 py-16 text-center">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        HackKro uses unified authentication across participant, organizer, recruiter, and judge roles.
      </p>
      <Link href="/login?returnTo=/organizer/dashboard" className="mt-4 inline-block text-sm font-semibold text-indigo-600 underline">
        Continue to Unified Sign In
      </Link>
    </main>
  )
}
