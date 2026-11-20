"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function OrganizerRegisterRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace("/signup?intent=organizer&returnTo=/organizer/dashboard")
  }, [router])

  return (
    <main className="mx-auto max-w-md px-4 py-16 text-center">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Redirecting to Organizer Registration & Organization Verification Onboarding...
      </p>
      <Link href="/signup?intent=organizer" className="mt-4 inline-block text-sm font-semibold text-indigo-600 underline">
        Continue to Organizer Signup
      </Link>
    </main>
  )
}
