import Link from "next/link"

export default function CampusAmbassadorStatusPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="text-xl font-bold">Campus Ambassador Application Status</h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
        Sign in to check your live referral code, verification status, and points inside the Ambassador Dashboard.
      </p>
      <Link
        href="/campus-ambassador/dashboard"
        className="mt-4 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
      >
        Open Ambassador Dashboard
      </Link>
    </main>
  )
}
