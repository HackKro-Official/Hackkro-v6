import type React from "react"
import { AdminAuthProvider } from "./auth-provider"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminAuthProvider>{children}</AdminAuthProvider>
}
