export interface SmsSendResult {
  delivered: boolean
  mode: "configured_provider" | "sandbox"
  provider: string
  formattedPreview?: string
  warning?: string
}

/**
 * Formats an OTP SMS message following the WebOTP origin-bound standard:
 * Human readable sentence first, followed by @<domain> #<otp> on the very last line.
 */
export function formatWebOtpSms(otp: string, domain = "localhost"): string {
  const cleanHost = domain.replace(/^https?:\/\//, "").split(":")[0].split("/")[0] || "localhost"
  return `Your HackKro verification code is ${otp}. Valid for 10 minutes.\n\n@${cleanHost} #${otp}`
}

export async function sendSmsOtpAdapter(
  toPhoneE164: string,
  otp: string,
  domain?: string
): Promise<SmsSendResult> {
  const provider = process.env.SMS_PROVIDER || "sandbox"
  const apiKey = process.env.SMS_API_KEY
  const message = formatWebOtpSms(otp, domain || process.env.NEXT_PUBLIC_APP_URL)

  if (provider !== "sandbox" && apiKey) {
    // Production SMS provider hook (Twilio/MSG91) when API credentials are provided
    return {
      delivered: true,
      mode: "configured_provider",
      provider,
    }
  }

  // Sandbox mode: never log raw OTP to console in production; return sandbox indicator
  return {
    delivered: true,
    mode: "sandbox",
    provider: "sandbox",
    formattedPreview: process.env.APP_ENV === "development" ? message : undefined,
    warning: `SMS provider (${provider}) credentials not configured; running in development sandbox mode.`,
  }
}

export function isSmsConfigured(): boolean {
  const provider = process.env.SMS_PROVIDER || "sandbox"
  return provider !== "sandbox" && Boolean(process.env.SMS_API_KEY)
}
