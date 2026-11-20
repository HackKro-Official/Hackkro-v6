import prisma from "@/lib/db"
import { sendEmailAdapter } from "@/backend/adapters/email.adapter"

export interface CreateNotificationInput {
  userId: string
  category: "transactional" | "security" | "marketing"
  title: string
  body: string
  actionUrl?: string
  dedupKey?: string
  sendEmail?: boolean
}

export async function createNotification(input: CreateNotificationInput) {
  if (input.dedupKey) {
    const existing = await prisma.notification.findUnique({
      where: { dedupKey: input.dedupKey },
    })
    if (existing) return existing
  }

  // Respect marketing opt-out; transactional & security notices are essential
  if (input.category === "marketing") {
    const prefs = await prisma.privacySettings.findUnique({
      where: { userId: input.userId },
    })
    if (prefs && !prefs.marketingOptIn) {
      return null
    }
  }

  const notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      category: input.category,
      channel: "in_app",
      title: input.title,
      body: input.body,
      actionUrl: input.actionUrl || "",
      dedupKey: input.dedupKey ?? null,
      deliveryStatus: "sent",
    },
  })

  if (input.sendEmail) {
    const user = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { primaryEmail: true, displayName: true },
    })
    if (user?.primaryEmail) {
      await sendEmailAdapter({
        to: user.primaryEmail,
        subject: `[HackKro] ${input.title}`,
        html: `<p>Hi ${user.displayName},</p><p>${input.body}</p>${
          input.actionUrl ? `<p><a href="${input.actionUrl}">Open in HackKro</a></p>` : ""
        }`,
        text: input.body,
        category: input.category,
      }).catch(() => {})
    }
  }

  return notification
}
