import { NextRequest } from "next/server"
import { processPaymentWebhookEvent } from "@/backend/modules/ecosystem-platform.service"
import { apiError, apiSuccess, AppError, ERROR_CODES } from "@/backend/utils/error-codes"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()
    const signature = req.headers.get("x-hackkro-payment-signature") || ""
    let data: any
    try {
      data = JSON.parse(rawBody)
    } catch {
      throw new AppError(ERROR_CODES.VALIDATION_FAILED, "Invalid JSON webhook payload.", 400)
    }

    const result = await processPaymentWebhookEvent({
      rawBody,
      signature,
      eventId: data.eventId,
      providerIntentId: data.providerIntentId,
      providerPaymentId: data.providerPaymentId,
      status: data.status,
    })

    return apiSuccess(result)
  } catch (err) {
    return apiError(err)
  }
}
