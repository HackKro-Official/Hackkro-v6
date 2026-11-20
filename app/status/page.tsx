"use client"

import { useEffect, useState } from "react"
import { Activity, CheckCircle2, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusBadge } from "@/components/domain/StatusBadge"
import { apiFetch } from "@/lib/api-client"

export default function PlatformStatusPage() {
  const [health, setHealth] = useState<any>(null)

  useEffect(() => {
    apiFetch("/api/v1/health").then(setHealth)
  }, [])

  return (
    <div className="container py-12 max-w-3xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Activity className="h-6 w-6 text-blue-600" /> HackKro System &amp; Adapter Status
        </h1>
        <p className="text-sm text-muted-foreground">
          Live operational readiness for core relational database and configured external integration adapters.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>Core Platform Services</span>
            <StatusBadge status={health?.status === "ok" ? "active" : "pending"} label={health?.status || "checking"} />
          </CardTitle>
          <CardDescription>Database status: {health?.database || "checking..."}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          {health?.integrations &&
            Object.entries(health.integrations).map(([key, info]: [string, any]) => (
              <div key={key} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  {info.configured ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                  )}
                  <span className="font-semibold capitalize">{key}</span>
                </div>
                <span className="font-mono text-muted-foreground">
                  mode: {info.mode} ({info.configured ? "configured" : "dev sandbox"})
                </span>
              </div>
            ))}
        </CardContent>
      </Card>
    </div>
  )
}
