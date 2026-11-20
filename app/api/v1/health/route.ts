import prisma from "@/lib/db"
import { getIntegrationHealth } from "@/backend/adapters"
import { apiError, apiSuccess } from "@/backend/utils/error-codes"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`
    const integrations = getIntegrationHealth()
    return apiSuccess({
      status: "ok",
      database: "connected",
      timestamp: new Date().toISOString(),
      integrations,
    })
  } catch (err) {
    return apiError(err, 503)
  }
}
