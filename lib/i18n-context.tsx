"use client"

import React, { createContext, useContext, useState } from "react"
import en from "@/config/i18n/en.json"
import hi from "@/config/i18n/hi.json"

type Locale = "en" | "hi"

const DICTIONARIES: Record<Locale, typeof en> = { en, hi }

interface I18nContextValue {
  locale: Locale
  setLocale: (loc: Locale) => void
  t: (path: string, vars?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextValue>({
  locale: "en",
  setLocale: () => {},
  t: (path) => path,
})

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>("en")

  const t = (path: string, vars?: Record<string, string | number>) => {
    const parts = path.split(".")
    let current: any = DICTIONARIES[locale]
    for (const part of parts) {
      current = current?.[part]
    }
    let text = typeof current === "string" ? current : path
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        text = text.replace(new RegExp(`{{\\s*${k}\\s*}}`, "g"), String(v))
      }
    }
    return text
  }

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  return useContext(I18nContext)
}
