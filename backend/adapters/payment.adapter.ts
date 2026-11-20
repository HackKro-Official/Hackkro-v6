import crypto from "crypto"
import { constantTimeEqual } from "@/backend/utils/crypto"

export interface PaymentIntentResult {
  provider: "sandbox" | "razorpay" | "stripe"
  providerIntentId: string
  checkoutMode: "sandbox_test" | "live"
  checkoutUrl: string
}

export function getPaymentProviderMode(): "sandbox" | "razorpay" | "stripe" {
  const p = process.env.PAYMENT_PROVIDER || "sandbox"
  if (p === "razorpay" && process.env.PAYMENT_KEY_ID && process.env.PAYMENT_KEY_SECRET) {
    return "razorpay"
  }
  if (p === "stripe" && process.env.PAYMENT_KEY_SECRET) {
    return "stripe"
  }
  return "sandbox"
}

export function createPaymentIntentAdapter(order: {
  id: string
  orderNumber: string
  totalAmount: number
  currency: string
}): PaymentIntentResult {
  const provider = getPaymentProviderMode()
  const intentId = `${provider}_pi_${crypto.randomBytes(10).toString("hex")}`

  return {
    provider,
    providerIntentId: intentId,
    checkoutMode: provider === "sandbox" ? "sandbox_test" : "live",
    checkoutUrl: `/payments?orderId=${order.id}&intent=${intentId}&mode=${provider}`,
  }
}

export function signPaymentWebhook(payload: string): string {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET || "sandbox_webhook_secret_change_in_prod"
  return crypto.createHmac("sha256", secret).update(payload).digest("hex")
}

export function verifyPaymentWebhookSignature(payload: string, signature: string): boolean {
  if (!signature) return false
  const expected = signPaymentWebhook(payload)
  return constantTimeEqual(expected, signature)
}
