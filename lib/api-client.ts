export interface ApiResponse<T = any> {
  success: boolean
  errorCode?: string
  message?: string
  supportReferenceId?: string
  requestId?: string
  details?: Record<string, unknown>
  [key: string]: any
}

function readCookie(name: string): string {
  if (typeof document === "undefined") return ""
  const match = document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`))
  return match ? decodeURIComponent(match.slice(name.length + 1)) : ""
}

let inMemoryCsrfToken = ""

export function setInMemoryCsrfToken(token: string) {
  inMemoryCsrfToken = token || ""
}

export async function apiFetch<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const method = (options.method || "GET").toUpperCase()
  const headers = new Headers(options.headers || {})

  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }

  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const csrf = inMemoryCsrfToken || readCookie("hackkro_csrf")
    if (csrf) {
      headers.set("X-CSRF-Token", csrf)
    }
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  })

  const data = await res.json().catch(() => ({
    success: false,
    message: `Unexpected server response (${res.status})`,
  }))

  if (!res.ok) {
    return {
      success: false,
      ...data,
    }
  }
  return data
}
