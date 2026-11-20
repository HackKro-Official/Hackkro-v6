import nodemailer from "nodemailer"

export interface EmailSendRequest {
  to: string
  subject: string
  html: string
  text?: string
  category?: "transactional" | "security" | "marketing"
}

export interface EmailSendResult {
  delivered: boolean
  mode: "smtp" | "sandbox_outbox"
  messageId: string
  warning?: string
}

const sandboxOutbox: Array<{
  to: string
  subject: string
  text: string
  html: string
  category: string
  sentAt: string
}> = []

export function getSandboxEmailOutbox() {
  return [...sandboxOutbox]
}

export async function sendEmailAdapter(req: EmailSendRequest): Promise<EmailSendResult> {
  const host = process.env.EMAIL_HOST
  const user = process.env.EMAIL_USER
  const pass = process.env.EMAIL_PASS

  if (host && user && pass) {
    const transporter = nodemailer.createTransport({
      host,
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_PORT === "465",
      auth: { user, pass },
    })

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || user,
      to: req.to,
      subject: req.subject,
      text: req.text || req.subject,
      html: req.html,
    })

    return {
      delivered: true,
      mode: "smtp",
      messageId: info.messageId,
    }
  }

  // Clearly labeled development sandbox outbox mode (never logs OTP secrets)
  const msgId = `sandbox-email-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  sandboxOutbox.unshift({
    to: req.to,
    subject: req.subject,
    text: req.text || "",
    html: req.html,
    category: req.category || "transactional",
    sentAt: new Date().toISOString(),
  })
  if (sandboxOutbox.length > 50) sandboxOutbox.pop()

  return {
    delivered: true,
    mode: "sandbox_outbox",
    messageId: msgId,
    warning: "SMTP credentials not configured; email captured in development sandbox outbox.",
  }
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS)
}
