/**
 * Strict server-side & universal HTML/URL sanitizer to prevent XSS in microsites,
 * rich descriptions, course lessons, and community posts.
 */

const DANGEROUS_TAG_RE =
  /<\s*(script|iframe|object|embed|form|meta|base|link|style|svg|math)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>|<\s*(script|iframe|object|embed|form|meta|base|link|style)\b[^>]*\/?>/gi
const EVENT_HANDLER_RE = /\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi
const JS_PROTOCOL_RE = /(href|src|action|formaction)\s*=\s*(?:"\s*(?:javascript|vbscript|data:text\/html)[^"]*"|'\s*(?:javascript|vbscript|data:text\/html)[^']*')/gi

export function sanitizeHtmlServer(dirty: string): string {
  if (!dirty) return ""
  return dirty
    .replace(DANGEROUS_TAG_RE, "")
    .replace(EVENT_HANDLER_RE, "")
    .replace(JS_PROTOCOL_RE, '$1="#"')
    .trim()
}

export function sanitizeUrl(raw: string | null | undefined): string {
  if (!raw) return ""
  const trimmed = raw.trim()
  if (!trimmed) return ""
  if (trimmed.startsWith("/")) return trimmed
  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return parsed.toString()
    }
    return ""
  } catch {
    return ""
  }
}

export function sanitizePlainText(input: string | null | undefined, maxLength = 5000): string {
  if (!input) return ""
  return input
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, maxLength)
}
