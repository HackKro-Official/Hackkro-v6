import Link from "next/link"

export default function CampusAmbassadorForgotPasswordRedirect() {
  return (
    <main className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="text-xl font-bold">Unified Account Password Recovery</h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
        Campus Ambassador accounts share your unified HackKro credentials. Reset your password safely below.
      </p>
      <Link
        href="/forgot-password"
        className="mt-4 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
      >
        Go to Password Recovery
      </Link>
    </main>
  )
}
