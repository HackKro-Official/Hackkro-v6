"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { apiFetch } from "@/lib/api-client"
import { useUserAuth } from "@/lib/user-auth-context"
import { EmptyState } from "@/components/domain/EmptyState"
import { StatusBadge } from "@/components/domain/StatusBadge"
import { ResponsiveTable } from "@/components/domain/ResponsiveTable"
import { WorkspaceSwitcher } from "@/components/domain/WorkspaceSwitcher"
import {
  Activity,
  Award,
  Building2,
  Flag,
  HelpCircle,
  ShieldAlert,
  ShieldCheck,
  ToggleRight,
  Users,
} from "lucide-react"

export default function AdminDashboardPage() {
  const { user, isLoading: authLoading } = useUserAuth()
  const [tab, setTab] = useState<
    "overview" | "organizations" | "listings" | "moderation" | "support" | "users" | "flags" | "refunds" | "audit"
  >("overview")

  const [data, setData] = useState<{
    users: any[]
    organizations: any[]
    opportunities: any[]
    reports: any[]
    tickets: any[]
    flags: any[]
    auditLogs: any[]
    refunds: any[]
    analyticsKpis: Array<{ eventName: string; count: number }>
  }>({
    users: [],
    organizations: [],
    opportunities: [],
    reports: [],
    tickets: [],
    flags: [],
    auditLogs: [],
    refunds: [],
    analyticsKpis: [],
  })

  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [replyText, setReplyText] = useState<Record<string, string>>({})
  const [certIdInput, setCertIdInput] = useState("")
  const [certReason, setCertReason] = useState("")

  const loadAdmin = async () => {
    setLoading(true)
    setErr(null)
    const res = await apiFetch<typeof data>("/api/v1/admin")
    if (res.success) setData({ users: res.users || [], organizations: res.organizations || [], opportunities: res.opportunities || [], reports: res.reports || [], tickets: res.tickets || [], flags: res.flags || [], auditLogs: res.auditLogs || [], refunds: res.refunds || [], analyticsKpis: res.analyticsKpis || [] })
    else setErr((res.message || "Request failed."))
    setLoading(false)
  }

  useEffect(() => {
    if (!authLoading && user) void loadAdmin()
    else if (!authLoading) setLoading(false)
  }, [authLoading, user?.activeRole])

  const adminAction = async (payload: Record<string, unknown>, okText: string) => {
    setErr(null)
    setMsg(null)
    const res = await apiFetch("/api/v1/admin", {
      method: "POST",
      body: JSON.stringify(payload),
    })
    if (!res.success) {
      setErr((res.message || "Request failed."))
      return
    }
    setMsg(okText)
    await loadAdmin()
  }

  const handleRefundDecision = async (rf: any, approve: boolean) => {
    setErr(null)
    setMsg(null)
    const res = await apiFetch("/api/v1/payments", {
      method: "POST",
      body: JSON.stringify({
        action: "refund",
        actionType: approve ? "approve" : "reject", refundId: rf.id, orderId: rf.orderId, amount: rf.amount,
        approve,
        reason: approve ? "Approved by platform finance control" : "Rejected in review",
      }),
    })
    if (!res.success) {
      setErr((res.message || "Request failed."))
      return
    }
    setMsg(approve ? "Refund decision recorded cleanly." : "Refund rejected.")
    await loadAdmin()
  }

  const handleCertPatch = async (status: "corrected" | "revoked") => {
    if (!certIdInput) return
    setErr(null)
    setMsg(null)
    const res = await apiFetch("/api/v1/certificates", {
      method: "PATCH",
      body: JSON.stringify({
        certificateId: certIdInput,
        status,
        revocationReason: certReason || `Admin action: ${status}`,
      }),
    })
    if (!res.success) {
      setErr((res.message || "Request failed."))
      return
    }
    setMsg(`Certificate updated to ${status}.`)
    setCertIdInput("")
    setCertReason("")
  }

  if (authLoading || loading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-10">
        <div className="h-64 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
      </main>
    )
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          title="Platform Admin Authentication Required"
          description="Sign in with a verified Platform Admin / Moderator / Support Agent account (e.g., admin@hackkro.local) to manage governance and audits."
          actionLabel="Go to Sign In"
          actionHref="/login?returnTo=/admin/dashboard"
        />
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center dark:border-slate-800">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
            <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" /> Platform Governance & Trust Operations
          </span>
          <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            HackKro Admin, Moderation, Support & Audit Console
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Signed in as <strong>{user.displayName}</strong> · Role: <strong>{user.activeRole}</strong>
          </p>
        </div>
        <WorkspaceSwitcher />
      </header>

      <nav className="mb-6 flex flex-wrap gap-2" aria-label="Admin Console Tabs">
        {(
          [
            { id: "overview", label: "KPIs & Certificates" },
            { id: "organizations", label: `Organizations (${data.organizations.length})` },
            { id: "listings", label: `Listings (${data.opportunities.length})` },
            { id: "moderation", label: `Reports (${data.reports.length})` },
            { id: "support", label: `Support Tickets (${data.tickets.length})` },
            { id: "users", label: `Users (${data.users.length})` },
            { id: "flags", label: `Feature Flags (${data.flags.length})` },
            { id: "refunds", label: `Refunds (${data.refunds.length})` },
            { id: "audit", label: `Audit Logs (${data.auditLogs.length})` },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              tab === t.id
                ? "bg-slate-900 text-white dark:bg-indigo-600"
                : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

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

      {tab === "overview" && (
        <div className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <p className="flex items-center gap-1.5 text-xs text-slate-500">
                <Users className="h-3.5 w-3.5" aria-hidden="true" /> Registered Accounts
              </p>
              <p className="mt-1 text-2xl font-bold">{data.users.length}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <p className="flex items-center gap-1.5 text-xs text-slate-500">
                <Building2 className="h-3.5 w-3.5" aria-hidden="true" /> Organizations
              </p>
              <p className="mt-1 text-2xl font-bold">{data.organizations.length}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <p className="flex items-center gap-1.5 text-xs text-slate-500">
                <Flag className="h-3.5 w-3.5 text-rose-500" aria-hidden="true" /> Moderation Reports
              </p>
              <p className="mt-1 text-2xl font-bold">{data.reports.length}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <p className="flex items-center gap-1.5 text-xs text-slate-500">
                <HelpCircle className="h-3.5 w-3.5 text-indigo-500" aria-hidden="true" /> Support Tickets
              </p>
              <p className="mt-1 text-2xl font-bold">{data.tickets.length}</p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="flex items-center gap-2 text-base font-bold">
                <Activity className="h-4 w-4 text-indigo-600" aria-hidden="true" /> Audited Analytics Event Counts
              </h2>
              {data.analyticsKpis.length === 0 ? (
                <p className="mt-3 text-xs text-slate-500">No analytics events recorded yet.</p>
              ) : (
                <ul className="mt-4 space-y-2 text-xs">
                  {data.analyticsKpis.map((k) => (
                    <li key={k.eventName} className="flex justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800">
                      <span className="font-mono">{k.eventName}</span>
                      <span className="font-bold">{k.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="flex items-center gap-2 text-base font-bold">
                <Award className="h-4 w-4 text-amber-500" aria-hidden="true" /> Certificate Correction & Revocation
              </h2>
              <input
                value={certIdInput}
                onChange={(e) => setCertIdInput(e.target.value)}
                placeholder="Certificate DB ID..."
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"
              />
              <input
                value={certReason}
                onChange={(e) => setCertReason(e.target.value)}
                placeholder="Reason (logged in Audit Log)..."
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleCertPatch("corrected")}
                  className="rounded-lg border border-indigo-600 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300"
                >
                  Mark Corrected
                </button>
                <button
                  type="button"
                  onClick={() => handleCertPatch("revoked")}
                  className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white"
                >
                  Revoke Credential
                </button>
              </div>
            </section>
          </div>
        </div>
      )}

      {tab === "organizations" && (
        <ResponsiveTable
          caption="Organizations Verification Queue"
          headers={["Organization", "Type", "Official Email", "Status", "Decisions"]}
        >
          {data.organizations.map((org) => (
            <tr key={org.id}>
              <td className="px-4 py-3 font-semibold">{org.displayName}</td>
              <td className="px-4 py-3 text-xs">{org.type}</td>
              <td className="px-4 py-3 text-xs">{org.officialEmail}</td>
              <td className="px-4 py-3">
                <StatusBadge status={org.verificationStatus} label={org.verificationStatus} />
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      adminAction(
                        { action: "verify_org", organizationId: org.id, decision: "verified", reason: "domain_and_identity_verified" },
                        `${org.displayName} verified.`
                      )
                    }
                    className="rounded bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white"
                  >
                    Verify
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      adminAction(
                        { action: "verify_org", organizationId: org.id, decision: "rejected", reason: "insufficient_evidence" },
                        `${org.displayName} rejected.`
                      )
                    }
                    className="rounded border border-rose-300 px-2.5 py-1 text-xs font-semibold text-rose-700 dark:border-rose-800 dark:text-rose-300"
                  >
                    Reject
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </ResponsiveTable>
      )}

      {tab === "listings" && (
        <ResponsiveTable
          caption="Opportunity Moderation Queue"
          headers={["Listing", "Organization", "Status", "Moderation Actions"]}
        >
          {data.opportunities.map((op) => (
            <tr key={op.id}>
              <td className="px-4 py-3 font-semibold">
                <Link href={`/opportunities/${op.slug}`} className="underline">
                  {op.title}
                </Link>
              </td>
              <td className="px-4 py-3 text-xs">{op.organization?.displayName}</td>
              <td className="px-4 py-3">
                <StatusBadge status={op.status} label={op.status} />
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      adminAction(
                        { action: "moderate_listing", opportunityId: op.id, status: "live", reason: "approved_by_moderator" },
                        "Listing set live."
                      )
                    }
                    className="rounded bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white"
                  >
                    Approve Live
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      adminAction(
                        { action: "moderate_listing", opportunityId: op.id, status: "rejected", reason: "policy_violation" },
                        "Listing rejected."
                      )
                    }
                    className="rounded bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white"
                  >
                    Takedown
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </ResponsiveTable>
      )}

      {tab === "moderation" && (
        <ResponsiveTable
          caption="Moderation Reports Queue"
          headers={["Target", "Category", "Details", "Status", "Action"]}
        >
          {data.reports.map((r) => (
            <tr key={r.id}>
              <td className="px-4 py-3 font-mono text-xs">
                {r.targetType}:{r.targetId.slice(-6)}
              </td>
              <td className="px-4 py-3 text-xs">{r.reasonCategory}</td>
              <td className="px-4 py-3 text-xs">{r.details}</td>
              <td className="px-4 py-3">
                <StatusBadge status={r.status} label={r.status} />
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      adminAction(
                        { action: "update_report", reportId: r.id, status: "resolved", policyCode: "resolved_cleanly" },
                        "Report resolved."
                      )
                    }
                    className="rounded bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white"
                  >
                    Resolve
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      adminAction(
                        { action: "update_report", reportId: r.id, status: "dismissed", policyCode: "no_violation" },
                        "Report dismissed."
                      )
                    }
                    className="rounded border border-slate-300 px-2.5 py-1 text-xs font-semibold dark:border-slate-700"
                  >
                    Dismiss
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </ResponsiveTable>
      )}

      {tab === "support" && (
        <div className="space-y-4">
          {data.tickets.map((t) => (
            <div key={t.id} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-mono text-xs font-bold text-indigo-600">{t.referenceId}</span>
                  <h3 className="font-bold text-slate-900 dark:text-white">{t.subject}</h3>
                  <p className="text-xs text-slate-500">
                    {t.email} · Priority: {t.priority} · SLA Due:{" "}
                    {t.slaDueAt ? new Date(t.slaDueAt).toLocaleString() : "-"}
                  </p>
                </div>
                <StatusBadge status={t.status} label={t.status} />
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  value={replyText[t.id] || ""}
                  onChange={(e) => setReplyText((p) => ({ ...p, [t.id]: e.target.value }))}
                  placeholder="Write support reply..."
                  className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950"
                />
                <button
                  type="button"
                  onClick={() =>
                    adminAction(
                      {
                        action: "reply_ticket",
                        ticketId: t.id,
                        message: replyText[t.id] || "We are investigating your request.",
                        status: "resolved",
                      },
                      `Reply recorded for ${t.referenceId}.`
                    )
                  }
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white"
                >
                  Send & Resolve
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "users" && (
        <ResponsiveTable
          caption="User Account Governance"
          headers={["Name", "Email", "Intent", "Status", "Controls"]}
        >
          {data.users.map((u) => (
            <tr key={u.id}>
              <td className="px-4 py-3 font-semibold">{u.displayName}</td>
              <td className="px-4 py-3 text-xs">{u.primaryEmail || u.primaryPhoneE164}</td>
              <td className="px-4 py-3 text-xs">{u.primaryIntent}</td>
              <td className="px-4 py-3">
                <StatusBadge status={u.status} label={u.status} />
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  {u.status !== "suspended" ? (
                    <button
                      type="button"
                      onClick={() =>
                        adminAction(
                          { action: "update_user_status", userId: u.id, status: "suspended", reason: "trust_safety_hold" },
                          `Suspended ${u.displayName} & revoked active sessions.`
                        )
                      }
                      className="rounded bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white"
                    >
                      Suspend & Revoke Sessions
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        adminAction(
                          { action: "update_user_status", userId: u.id, status: "active", reason: "reinstated" },
                          `Reinstated ${u.displayName}.`
                        )
                      }
                      className="rounded bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white"
                    >
                      Reinstate
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </ResponsiveTable>
      )}

      {tab === "flags" && (
        <div className="space-y-3">
          {data.flags.map((f) => (
            <div key={f.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div>
                <p className="font-mono text-sm font-bold">{f.key}</p>
                <p className="text-xs text-slate-500">{f.description}</p>
              </div>
              <button
                type="button"
                onClick={() =>
                  adminAction(
                    { action: "toggle_flag", key: f.key, enabled: !f.enabled, description: f.description },
                    `Feature flag ${f.key} set to ${!f.enabled}.`
                  )
                }
                className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-semibold text-white ${
                  f.enabled ? "bg-emerald-600" : "bg-slate-500"
                }`}
              >
                <ToggleRight className="h-4 w-4" aria-hidden="true" />
                {f.enabled ? "Enabled (Click to Disable)" : "Disabled (Click to Enable)"}
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === "refunds" && (
        <ResponsiveTable
          caption="Refunds & Dual-Approval Queue"
          headers={["Order #", "Amount", "Reason", "Status", "Actions"]}
        >
          {data.refunds.map((rf) => (
            <tr key={rf.id}>
              <td className="px-4 py-3 font-mono text-xs">{rf.order?.orderNumber}</td>
              <td className="px-4 py-3 text-xs font-bold">
                {rf.order?.currency} {rf.amount}
              </td>
              <td className="px-4 py-3 text-xs">{rf.reason}</td>
              <td className="px-4 py-3">
                <StatusBadge status={rf.status} label={rf.status} />
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleRefundDecision(rf, true)}
                    className="rounded bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white"
                  >
                    Approve Refund
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRefundDecision(rf, false)}
                    className="rounded border border-rose-300 px-2.5 py-1 text-xs font-semibold text-rose-700 dark:border-rose-800 dark:text-rose-300"
                  >
                    Reject
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </ResponsiveTable>
      )}

      {tab === "audit" && (
        <ResponsiveTable
          caption="Immutable Platform Audit Trail"
          headers={["Timestamp", "Actor", "Action", "Resource", "Reason"]}
        >
          {data.auditLogs.map((log) => (
            <tr key={log.id}>
              <td className="px-4 py-3 text-xs text-slate-500">
                {new Date(log.createdAt).toLocaleString()}
              </td>
              <td className="px-4 py-3 text-xs font-medium">
                {log.actorRole} ({log.actorId.slice(-6)})
              </td>
              <td className="px-4 py-3 font-mono text-xs font-semibold">{log.action}</td>
              <td className="px-4 py-3 text-xs">
                {log.resourceType}:{log.resourceId?.slice(-6)}
              </td>
              <td className="px-4 py-3 text-xs text-slate-500">{log.reasonCode || "-"}</td>
            </tr>
          ))}
        </ResponsiveTable>
      )}
    </main>
  )
}
