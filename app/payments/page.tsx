"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { CreditCard, ShieldCheck, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { StatusBadge } from "@/components/domain/StatusBadge"
import { ResponsiveTable } from "@/components/domain/ResponsiveTable"
import { useUserAuth } from "@/lib/user-auth-context"
import { apiFetch } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"

export default function PaymentsPage() {
  const { isLoggedIn } = useUserAuth()
  const { toast } = useToast()
  const [orders, setOrders] = useState<any[]>([])
  const [refundReason, setRefundReason] = useState("")

  const load = async () => {
    const res = await apiFetch("/api/v1/payments")
    if (res.success) setOrders(res.orders || [])
  }

  useEffect(() => {
    if (isLoggedIn) load()
  }, [isLoggedIn])

  const completeSandbox = async (orderId: string) => {
    const res = await apiFetch("/api/v1/payments", {
      method: "POST",
      body: JSON.stringify({ action: "sandbox_complete", orderId, outcome: "succeeded" }),
    })
    if (res.success) {
      toast({ title: "Sandbox payment reconciled via signed webhook!" })
      load()
    }
  }

  const requestRefund = async (orderId: string, amount: number) => {
    const res = await apiFetch("/api/v1/payments", {
      method: "POST",
      body: JSON.stringify({
        action: "refund",
        actionType: "request",
        orderId,
        amount,
        reason: refundReason || "Participant requested cancellation within policy window",
      }),
    })
    if (res.success) {
      toast({ title: "Refund request submitted" })
      setRefundReason("")
      load()
    } else {
      toast({ title: "Refund error", description: res.message, variant: "destructive" })
    }
  }

  if (!isLoggedIn) {
    return (
      <div className="container py-16 text-center space-y-3">
        <h1 className="text-xl font-bold">Sign in to view Payments, Receipts &amp; Ledger</h1>
        <Button asChild className="bg-blue-600 text-white"><Link href="/login?returnTo=/payments">Sign in</Link></Button>
      </div>
    )
  }

  return (
    <div className="container py-8 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-extrabold flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-blue-600" /> Payments, Tickets, Refunds &amp; Financial Ledger
        </h1>
        <p className="text-sm text-muted-foreground">
          All charges are verified server-side via signed webhooks and recorded in an append-only ledger.
        </p>
      </div>

      {orders.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No payment orders on your account yet.</CardContent></Card>
      ) : (
        <div className="space-y-4">
          {orders.map((ord) => (
            <Card key={ord.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-base font-mono">{ord.orderNumber}</CardTitle>
                  <CardDescription>{ord.opportunity?.title || "Platform Order"} • {ord.refundPolicySnapshot}</CardDescription>
                </div>
                <StatusBadge status={ord.status} />
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-lg border bg-muted/30 p-3">
                  <div>Subtotal: <strong>{ord.currency} {(ord.subtotalAmount / 100).toFixed(2)}</strong></div>
                  <div>Discount: <strong>{ord.currency} {(ord.discountAmount / 100).toFixed(2)}</strong></div>
                  <div>Tax (18%): <strong>{ord.currency} {(ord.taxAmount / 100).toFixed(2)}</strong></div>
                  <div>Total: <strong>{ord.currency} {(ord.totalAmount / 100).toFixed(2)}</strong></div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {ord.status === "pending" && (
                    <Button size="sm" onClick={() => completeSandbox(ord.id)} className="bg-emerald-600 text-white">
                      <ShieldCheck className="h-3.5 w-3.5 mr-1.5" /> Complete Sandbox Payment (Signed Webhook)
                    </Button>
                  )}
                  {ord.status === "paid" && ord.refunds.length === 0 && (
                    <div className="flex gap-2 w-full sm:w-auto">
                      <Input
                        placeholder="Refund reason..."
                        value={refundReason}
                        onChange={(e) => setRefundReason(e.target.value)}
                        className="h-8 text-xs"
                      />
                      <Button size="sm" variant="outline" onClick={() => requestRefund(ord.id, ord.totalAmount)}>
                        <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Request Refund
                      </Button>
                    </div>
                  )}
                </div>

                {ord.ledger?.length > 0 && (
                  <ResponsiveTable caption={`Ledger entries for ${ord.orderNumber}`} headers={["Entry Type", "Amount", "Description", "Reference", "Timestamp"]}>
                    {ord.ledger.map((l: any) => (
                      <tr key={l.id}>
                        <td className="px-4 py-2 font-semibold capitalize">{l.entryType}</td>
                        <td className="px-4 py-2 font-mono">{l.currency} {(l.amount / 100).toFixed(2)}</td>
                        <td className="px-4 py-2">{l.description}</td>
                        <td className="px-4 py-2 font-mono">{l.referenceId}</td>
                        <td className="px-4 py-2 text-muted-foreground">{new Date(l.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </ResponsiveTable>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
