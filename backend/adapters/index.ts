import { isEmailConfigured } from "./email.adapter"
import { isSmsConfigured } from "./sms.adapter"
import { isGoogleOAuthConfigured } from "./oauth.adapter"
import { getPaymentProviderMode } from "./payment.adapter"

export function getIntegrationHealth() {
  return {
    email: {
      configured: isEmailConfigured(),
      mode: isEmailConfigured() ? "smtp" : "sandbox_outbox",
    },
    sms: {
      configured: isSmsConfigured(),
      mode: isSmsConfigured() ? process.env.SMS_PROVIDER || "configured" : "sandbox",
    },
    oauthGoogle: {
      configured: isGoogleOAuthConfigured(),
      mode: isGoogleOAuthConfigured() ? "oauth_live" : "unconfigured",
    },
    payments: {
      configured: getPaymentProviderMode() !== "sandbox",
      mode: getPaymentProviderMode(),
    },
    storage: {
      configured: true,
      mode: process.env.STORAGE_PROVIDER || "local_private",
    },
    codeSandbox: {
      configured: true,
      mode: process.env.CODE_SANDBOX_MODE || "isolated_vm_sandbox",
    },
  }
}
