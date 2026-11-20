"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ShieldCheck, XCircle, Award, Calendar, Building } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/domain/StatusBadge"
import { apiFetch } from "@/lib/api-client"

export default function VerifyCertificatePage() {
  const params = useParams<{ credentialId: string }>()
  const [credential, setCredential] = useState<any>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch(`/api/v1/certificates/verify/${encodeURIComponent(params.credentialId)}`)
      .then((res) => {
        if (res.success && res.credential) {
          setCredential(res.credential)
        } else {
          setErrorMsg(res.message || "Credential ID could not be verified.")
        }
      })
      .finally(() => setLoading(false))
  }, [params.credentialId])

  if (loading) {
    return <div className="container py-16 text-center text-sm text-muted-foreground">Verifying credential...</div>
  }

  return (
    <div className="container py-12 max-w-2xl">
      <Card className="border-border shadow-lg">
        <CardHeader className="text-center space-y-2 border-b">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10 text-blue-600">
            {credential?.status === "valid" ? (
              <ShieldCheck className="h-7 w-7 text-emerald-600" />
            ) : (
              <XCircle className="h-7 w-7 text-rose-600" />
            )}
          </div>
          <CardTitle className="text-2xl font-bold">
            {credential ? "HackKro Credential Verification" : "Credential Not Found"}
          </CardTitle>
          <CardDescription>
            Public verification exposes only intended credential metadata and hides private participant details.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {errorMsg || !credential ? (
            <div className="text-center space-y-4">
              <p className="text-sm text-rose-600">{errorMsg}</p>
              <Button asChild variant="outline"><Link href="/">Return Home</Link></Button>
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border bg-muted/30 p-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold">{credential.credentialId}</span>
                    <StatusBadge status={credential.status} />
                  </div>
                  <h2 className="text-xl font-extrabold">{credential.title}</h2>
                  <p className="text-sm">
                    Awarded to <span className="font-bold text-blue-600">{credential.recipientName}</span>
                  </p>
                </div>
                {credential.qrDataUrl && (
                  <img
                    src={credential.qrDataUrl}
                    alt={`QR verification code for ${credential.credentialId}`}
                    className="h-28 w-28 rounded-lg border bg-white p-1"
                  />
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2 text-xs">
                <div className="rounded-lg border p-3 space-y-1">
                  <span className="text-muted-foreground flex items-center gap-1"><Building className="h-3.5 w-3.5" /> Issuer</span>
                  <p className="font-semibold">
                    {credential.issuerName} {credential.issuerVerified && "(Verified)"}
                  </p>
                </div>
                <div className="rounded-lg border p-3 space-y-1">
                  <span className="text-muted-foreground flex items-center gap-1"><Award className="h-3.5 w-3.5" /> Achievement Type</span>
                  <p className="font-semibold capitalize">{credential.achievementType.replace(/_/g, " ")}</p>
                </div>
                <div className="rounded-lg border p-3 space-y-1">
                  <span className="text-muted-foreground flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Issued Date</span>
                  <p className="font-semibold">{new Date(credential.issuedAt).toLocaleDateString()}</p>
                </div>
                <div className="rounded-lg border p-3 space-y-1">
                  <span className="text-muted-foreground">Criteria</span>
                  <p className="font-medium">{credential.criteriaText}</p>
                </div>
              </div>

              {credential.revocationReason && (
                <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300">
                  <strong>Revocation Reason:</strong> {credential.revocationReason}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
