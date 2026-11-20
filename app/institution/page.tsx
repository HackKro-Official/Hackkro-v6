"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { apiFetch } from "@/lib/api-client"
import { useUserAuth } from "@/lib/user-auth-context"
import { EmptyState } from "@/components/domain/EmptyState"
import { StatusBadge } from "@/components/domain/StatusBadge"
import { WorkspaceSwitcher } from "@/components/domain/WorkspaceSwitcher"
import { Building2, GraduationCap, ShieldCheck, Users } from "lucide-react"

export default function InstitutionPage() {
  const { user, isLoading: authLoading } = useUserAuth()
  const [institution, setInstitution] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const [cohortName, setCohortName] = useState("")
  const [cohortDept, setCohortDept] = useState("CSE")
  const [cohortYear, setCohortYear] = useState("2026")
  const [cohortEmails, setCohortEmails] = useState("")

  const [driveCompany, setDriveCompany] = useState("")
  const [driveTitle, setDriveTitle] = useState("")
  const [driveDate, setDriveDate] = useState("")

  const loadInstitution = async () => {
    setLoading(true)
    setErr(null)
    const res = await apiFetch<{ institution: any }>("/api/v1/institutions")
    if (res.success) setInstitution(res.institution)
    else setErr((res.message || "Request failed."))
    setLoading(false)
  }

  useEffect(() => {
    if (!authLoading && user) void loadInstitution()
    else if (!authLoading) setLoading(false)
  }, [authLoading, user?.activeOrganizationId])

  const createCohort = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!institution) return
    const res = await apiFetch("/api/v1/institutions", {
      method: "POST",
      body: JSON.stringify({
        action: "create_cohort",
        institutionId: institution.id,
        name: cohortName,
        department: cohortDept,
        graduationYear: cohortYear,
        verifiedEmails: cohortEmails
          .split(/[,\n]/)
          .map((x) => x.trim())
          .filter(Boolean),
      }),
    })
    if (!res.success) {
      setErr((res.message || "Request failed."))
      return
    }
    setMsg("Student cohort registered cleanly.")
    setCohortName("")
    setCohortEmails("")
    await loadInstitution()
  }

  const createDrive = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!institution) return
    const res = await apiFetch("/api/v1/institutions", {
      method: "POST",
      body: JSON.stringify({
        action: "create_drive",
        institutionId: institution.id,
        companyName: driveCompany,
        title: driveTitle,
        driveDate: driveDate || undefined,
      }),
    })
    if (!res.success) {
      setErr((res.message || "Request failed."))
      return
    }
    setMsg("Campus placement drive created.")
    setDriveCompany("")
    setDriveTitle("")
    await loadInstitution()
  }

  if (authLoading || loading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="h-56 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
      </main>
    )
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          title="Institution / College Sign-In Required"
          description="Sign in with a verified College Admin account (e.g., college@hackkro.local) to manage cohorts and placement drives."
          actionLabel="Sign In"
          actionHref="/login?returnTo=/institution"
        />
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center dark:border-slate-800">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
            <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" /> Institution & Placement Cell Workspace
          </span>
          <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {institution ? institution.organization.displayName : "Campus Placement & Cohort Hub"}
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Verify student cohorts by institutional email domain and coordinate campus placement drives.
          </p>
        </div>
        <WorkspaceSwitcher />
      </header>

      {err && (
        <div role="alert" className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200">
          {err}
        </div>
      )}
      {msg && (
        <div role="status" className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200">
          {msg}
        </div>
      )}

      {!institution ? (
        <EmptyState
          title="No verified institution linked to your active workspace"
          description="Switch to a verified college organization workspace or register a new institution in onboarding."
          actionLabel="Go to Onboarding"
          actionHref="/onboarding"
        />
      ) : (
        <div className="space-y-8">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-bold">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" aria-hidden="true" />{" "}
                  {institution.organization.legalName}
                </h2>
                <p className="text-xs text-slate-500">
                  Student Domain: @{institution.studentDomain} · Placement Officer: {institution.placementEmail}
                </p>
              </div>
              <StatusBadge status={institution.organization.verificationStatus} label={institution.organization.verificationStatus} />
            </div>
          </section>

          <div className="grid gap-8 lg:grid-cols-2">
            <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="flex items-center gap-2 text-lg font-bold">
                <Users className="h-5 w-5 text-indigo-600" aria-hidden="true" /> Verified Student Cohorts (
                {institution.cohorts.length})
              </h2>
              {institution.cohorts.map((c: any) => (
                <div key={c.id} className="rounded-xl border border-slate-200 p-4 text-sm dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{c.name}</span>
                    <span className="text-xs text-slate-500">
                      {c.department} · Class of {c.graduationYear}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {c.studentCount} students · {c.verifiedEmails.length} verified emails
                  </p>
                </div>
              ))}

              <form onSubmit={createCohort} className="space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                <h3 className="text-xs font-bold uppercase text-slate-500">Add New Student Cohort</h3>
                <input
                  required
                  value={cohortName}
                  onChange={(e) => setCohortName(e.target.value)}
                  placeholder="Cohort Name (e.g., B.Tech CSE 2027)"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={cohortDept}
                    onChange={(e) => setCohortDept(e.target.value)}
                    placeholder="Department"
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                  />
                  <input
                    value={cohortYear}
                    onChange={(e) => setCohortYear(e.target.value)}
                    placeholder="Graduation Year"
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                  />
                </div>
                <textarea
                  rows={2}
                  value={cohortEmails}
                  onChange={(e) => setCohortEmails(e.target.value)}
                  placeholder="Comma-separated student college emails..."
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
                >
                  Save Cohort
                </button>
              </form>
            </section>

            <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="flex items-center gap-2 text-lg font-bold">
                <Building2 className="h-5 w-5 text-emerald-600" aria-hidden="true" /> Campus Placement Drives (
                {institution.placementDrives.length})
              </h2>
              {institution.placementDrives.map((d: any) => (
                <div key={d.id} className="rounded-xl border border-slate-200 p-4 text-sm dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{d.title}</span>
                    <StatusBadge status={d.status} label={d.status} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Employer: {d.companyName} {d.driveDate ? `· Scheduled: ${new Date(d.driveDate).toLocaleDateString()}` : ""}
                  </p>
                  {d.opportunity && (
                    <Link href={`/opportunities/${d.opportunity.slug}`} className="mt-1 inline-block text-xs text-indigo-600 underline">
                      Linked Opportunity: {d.opportunity.title}
                    </Link>
                  )}
                </div>
              ))}

              <form onSubmit={createDrive} className="space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                <h3 className="text-xs font-bold uppercase text-slate-500">Schedule Placement Drive</h3>
                <input
                  required
                  value={driveCompany}
                  onChange={(e) => setDriveCompany(e.target.value)}
                  placeholder="Visiting Company (e.g., NovaTech Cloud)"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                />
                <input
                  required
                  value={driveTitle}
                  onChange={(e) => setDriveTitle(e.target.value)}
                  placeholder="Drive Title (e.g., Summer SDE Internship Pool)"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                />
                <input
                  type="date"
                  value={driveDate}
                  onChange={(e) => setDriveDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
                >
                  Launch Placement Drive
                </button>
              </form>
            </section>
          </div>
        </div>
      )}
    </main>
  )
}
