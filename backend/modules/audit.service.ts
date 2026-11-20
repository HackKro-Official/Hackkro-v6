import prisma, { toJsonString } from "@/lib/db"
import { generateRequestId } from "@/backend/utils/error-codes"

export interface AuditInput {
  actorId: string
  actorRole: string
  tenantId?: string | null
  action: string
  resourceType: string
  resourceId: string
  requestId?: string
  ipRiskMeta?: Record<string, unknown>
  beforeSummary?: Record<string, unknown>
  afterSummary?: Record<string, unknown>
  reasonCode?: string
  approvalRef?: string
}

export async function recordAuditEvent(input: AuditInput) {
  return prisma.auditEvent.create({
    data: {
      actorId: input.actorId,
      actorRole: input.actorRole,
      tenantId: input.tenantId ?? null,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      requestId: input.requestId || generateRequestId(),
      ipRiskMeta: toJsonString(input.ipRiskMeta || {}),
      beforeSummary: toJsonString(input.beforeSummary || {}),
      afterSummary: toJsonString(input.afterSummary || {}),
      reasonCode: input.reasonCode || "",
      approvalRef: input.approvalRef || "",
    },
  })
}
