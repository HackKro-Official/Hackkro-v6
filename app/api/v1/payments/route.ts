import crypto from "crypto"
import { NextRequest } from "next/server"
import prisma from "@/lib/db"
import { assertPermission, requireAuth } from "@/backend/utils/rbac-abac"
import {
  createPaymentIntentAdapter,
  signPaymentWebhook,
} from "@/backend/adapters/payment.adapter"
import {
  processPaymentWebhookEvent,
  requestOrApproveRefund,
} from "@/backend/modules/ecosystem-platform.service"
import { apiError, apiSuccess, AppError, ERROR_CODES } from "@/backend/utils/error-codes"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireAuth(req)
    const { searchParams } = new URL(req.url)
    const orgId = searchParams.get("organizationId")

    if (orgId) {
      assertPermission(ctx, "payment:read_org", orgId)
      const orders = await prisma.paymentOrder.findMany({
        where: { organizationId: orgId },
        include: { transactions: true, refunds: true, ledger: true },
        orderBy: { createdAt: "desc" },
      })
      return apiSuccess({ orders })
    }

    const orders = await prisma.paymentOrder.findMany({
      where: { userId: ctx.userId },
      include: {
        opportunity: { select: { id: true, slug: true, title: true } },
        transactions: true,
        refunds: true,
        ledger: true,
      },
      orderBy: { createdAt: "desc" },
    })
    return apiSuccess({ orders })
  } catch (err) {
    return apiError(err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAuth(req)
    const body = await req.json()
    const action = body.action as string

    if (action === "create_order") {
      const idempotencyKey = body.idempotencyKey || `ord-${ctx.userId}-${body.opportunityId}-${Date.now()}`
      const existing = await prisma.paymentOrder.findUnique({
        where: { idempotencyKey },
        include: { transactions: true },
      })
      if (existing) {
        if (existing.userId !== ctx.userId) {
          throw new AppError(ERROR_CODES.FORBIDDEN, "Order belongs to another user.", 403)
        }
        return apiSuccess({ order: existing, deduplicated: true })
      }

      const op = await prisma.opportunity.findUnique({
        where: { id: body.opportunityId },
        include: { ticketTiers: true },
      })
      if (!op) throw new AppError(ERROR_CODES.NOT_FOUND, "Opportunity not found.", 404)

      const tier = body.ticketTierId
        ? op.ticketTiers.find((t) => t.id === body.ticketTierId)
        : op.ticketTiers[0]

      const subtotal = tier ? tier.priceAmount : op.feeAmount
      let discountAmount = 0

      if (body.couponCode) {
        const coupon = await prisma.coupon.findUnique({
          where: {
            opportunityId_code: {
              opportunityId: op.id,
              code: String(body.couponCode).trim().toUpperCase(),
            },
          },
        })
        if (!coupon || coupon.usedCount >= coupon.maxUses || (coupon.expiresAt && coupon.expiresAt < new Date())) {
          throw new AppError(ERROR_CODES.VALIDATION_FAILED, "Coupon code is invalid or expired.", 400)
        }
        discountAmount =
          coupon.discountType === "percent"
            ? Math.round((subtotal * coupon.discountValue) / 100)
            : Math.min(subtotal, coupon.discountValue)
      }

      const netSubtotal = Math.max(0, subtotal - discountAmount)
      const taxAmount = Math.round(netSubtotal * 0.18)
      const totalAmount = netSubtotal + taxAmount

      const created = await prisma.$transaction(async (tx) => {
        if (tier) {
          const claimed = await tx.ticketTier.updateMany({
            where: { id: tier.id, soldCount: { lt: tier.capacity } },
            data: { soldCount: { increment: 1 } },
          })
          if (claimed.count === 0) {
            throw new AppError(ERROR_CODES.CAPACITY_REACHED, "Selected ticket tier is sold out.", 409)
          }
        }
        if (body.couponCode) {
          await tx.coupon.updateMany({
            where: { opportunityId: op.id, code: String(body.couponCode).trim().toUpperCase() },
            data: { usedCount: { increment: 1 } },
          })
        }

        const order = await tx.paymentOrder.create({
          data: {
            orderNumber: `ORD-${crypto.randomBytes(4).toString("hex").toUpperCase()}`,
            userId: ctx.userId,
            organizationId: op.organizationId,
            opportunityId: op.id,
            ticketTierId: tier?.id ?? null,
            idempotencyKey,
            subtotalAmount: subtotal,
            discountAmount,
            taxAmount,
            platformFeeAmount: 0,
            totalAmount,
            currency: op.currency,
            status: "pending",
            refundPolicySnapshot: op.refundPolicy,
          },
        })

        const intent = createPaymentIntentAdapter(order)
        const txRec = await tx.paymentTransaction.create({
          data: {
            orderId: order.id,
            provider: intent.provider,
            providerIntentId: intent.providerIntentId,
            status: "initiated",
          },
        })

        return { order, intent, transaction: txRec }
      })

      return apiSuccess(created, 201)
    }

    // Explicit Sandbox Test Mode trigger: generates a cryptographically signed webhook payload & runs through the real webhook verifier!
    if (action === "sandbox_complete") {
      if (process.env.PAYMENT_PROVIDER && process.env.PAYMENT_PROVIDER !== "sandbox") {
        throw new AppError(ERROR_CODES.FORBIDDEN, "Sandbox completion disabled in live payment mode.", 403)
      }
      const order = await prisma.paymentOrder.findUnique({
        where: { id: body.orderId },
        include: { transactions: { orderBy: { createdAt: "desc" }, take: 1 } },
      })
      if (!order || order.userId !== ctx.userId) {
        throw new AppError(ERROR_CODES.NOT_FOUND, "Order not found.", 404)
      }
      const intentId = order.transactions[0]?.providerIntentId
      if (!intentId) throw new AppError(ERROR_CODES.NOT_FOUND, "Payment intent missing.", 404)

      const payload = JSON.stringify({
        eventId: `sbx_${crypto.randomBytes(8).toString("hex")}`,
        providerIntentId: intentId,
        providerPaymentId: `pay_sbx_${crypto.randomBytes(6).toString("hex")}`,
        status: body.outcome === "failed" ? "failed" : "succeeded",
      })
      const sig = signPaymentWebhook(payload)
      const parsed = JSON.parse(payload)
      const res = await processPaymentWebhookEvent({
        rawBody: payload,
        signature: sig,
        ...parsed,
      })
      return apiSuccess({ ...res, mode: "sandbox_signed_webhook" })
    }

    if (action === "refund") {
      const refund = await requestOrApproveRefund(ctx, {
        ...body,
        action: body.actionType || body.refundAction || "request",
      })
      return apiSuccess({ refund })
    }

    throw new AppError(ERROR_CODES.VALIDATION_FAILED, "Unsupported payment action.", 400)
  } catch (err) {
    return apiError(err)
  }
}
