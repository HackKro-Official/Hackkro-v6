"use client"

import type React from "react"
import { createContext, useContext } from "react"
import { useUserAuth } from "@/lib/user-auth-context"

interface AdminAuthContextType {
  isAuthenticated: boolean
  isMainAdmin?: boolean
  logout: () => void
}

const AdminAuthContext = createContext<AdminAuthContextType>({
  isAuthenticated: false,
  isMainAdmin: false,
  logout: () => {},
})

const STAFF_ROLES = new Set(["platform_admin", "security_admin", "moderator", "support_agent"])

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const { user, logout } = useUserAuth()
  const isStaff = Boolean(user && STAFF_ROLES.has(user.activeRole))

  return (
    <AdminAuthContext.Provider
      value={{
        isAuthenticated: isStaff,
        isMainAdmin: user?.activeRole === "platform_admin",
        logout: () => {
          void logout()
        },
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  )
}

export const useAdminAuth = () => useContext(AdminAuthContext)
