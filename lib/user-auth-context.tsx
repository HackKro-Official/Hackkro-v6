"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { apiFetch, setInMemoryCsrfToken } from "@/lib/api-client"

export interface WorkspaceOption {
  roleKey: string
  label: string
  organizationId: string | null
  organizationName?: string
}

export interface AuthUser {
  id: string
  _id?: string
  username?: string | null
  displayName: string
  name?: string
  primaryEmail?: string | null
  email?: string
  maskedEmail?: string | null
  primaryPhoneE164?: string | null
  maskedPhone?: string | null
  avatarUrl?: string
  bio?: string
  locale: string
  timezone: string
  country: string
  status: string
  primaryIntent: string
  onboardingCompleted: boolean
  points: number
  activeRole: string
  activeOrganizationId: string | null
  role?: string
}

interface UserAuthContextType {
  user: AuthUser | null
  isLoading: boolean
  isLoggedIn: boolean
  availableWorkspaces: WorkspaceOption[]
  providers: { google: boolean }
  isAuthModalOpen: boolean
  authModalTab: "student" | "ca" | "organizer"
  authModalMode: "login" | "register"
  openAuthModal: (tab?: "student" | "ca" | "organizer", mode?: "login" | "register") => void
  closeAuthModal: () => void
  login: (credentials: { email: string; password: string; rememberDevice?: boolean; returnTo?: string }) => Promise<{ success: boolean; message?: string; errorCode?: string; destination?: string }>
  register: (data: any) => Promise<{ success: boolean; message?: string; errorCode?: string; destination?: string }>
  logout: () => Promise<void>
  logoutAll: () => Promise<void>
  switchWorkspace: (roleKey: string, organizationId?: string | null) => Promise<void>
  updateProfile: (data: Record<string, unknown>) => Promise<{ success: boolean; message?: string }>
  refreshUser: () => Promise<void>
}

const UserAuthContext = createContext<UserAuthContextType | undefined>(undefined)

function normalizeUserShape(u: any): AuthUser | null {
  if (!u) return null
  return {
    ...u,
    _id: u.id,
    name: u.displayName,
    email: u.primaryEmail || u.maskedEmail || "",
    role: u.activeRole,
  }
}

export function UserAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [availableWorkspaces, setAvailableWorkspaces] = useState<WorkspaceOption[]>([])
  const [providers, setProviders] = useState<{ google: boolean }>({ google: false })
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [authModalTab, setAuthModalTab] = useState<"student" | "ca" | "organizer">("student")
  const [authModalMode, setAuthModalMode] = useState<"login" | "register">("login")

  const router = useRouter()
  const { toast } = useToast()

  const refreshUser = useCallback(async () => {
    try {
      const data = await apiFetch("/api/v1/auth/me")
      if (data.success && data.authenticated && data.user) {
        if (data.csrfToken) setInMemoryCsrfToken(data.csrfToken)
        setUser(normalizeUserShape(data.user))
        setAvailableWorkspaces(data.availableWorkspaces || [])
        setProviders(data.providers || { google: false })
      } else {
        setUser(null)
        setAvailableWorkspaces([])
        setProviders(data.providers || { google: false })
      }
    } catch {
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshUser()
  }, [refreshUser])

  const openAuthModal = (
    tab: "student" | "ca" | "organizer" = "student",
    mode: "login" | "register" = "login"
  ) => {
    setAuthModalTab(tab)
    setAuthModalMode(mode)
    setIsAuthModalOpen(true)
  }

  const closeAuthModal = () => setIsAuthModalOpen(false)

  const login = async (credentials: {
    email: string
    password: string
    rememberDevice?: boolean
    returnTo?: string
  }) => {
    const data = await apiFetch("/api/v1/auth/login/password", {
      method: "POST",
      body: JSON.stringify({
        identifier: credentials.email,
        password: credentials.password,
        rememberDevice: Boolean(credentials.rememberDevice),
        returnTo: credentials.returnTo,
      }),
    })

    if (data.success && data.user) {
      if (data.csrfToken) setInMemoryCsrfToken(data.csrfToken)
      await refreshUser()
      closeAuthModal()
      toast({
        title: "Signed in to HackKro",
        description: `Welcome back, ${data.user.displayName}`,
      })
      return { success: true, destination: data.destination }
    }

    toast({
      title: "Sign in failed",
      description: data.message || "Unable to verify credentials.",
      variant: "destructive",
    })
    return { success: false, message: data.message, errorCode: data.errorCode }
  }

  const register = async (formData: any) => {
    const data = await apiFetch("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({
        displayName: formData.displayName || formData.name,
        email: formData.email,
        phone: formData.phone || formData.mobile || undefined,
        password: formData.password,
        country: formData.country || "IN",
        primaryIntent: formData.primaryIntent || "student",
        organizationName: formData.organizationName,
        termsAccepted: formData.termsAccepted ?? true,
        marketingConsent: Boolean(formData.marketingConsent),
        returnTo: formData.returnTo,
      }),
    })

    if (data.success && data.user) {
      if (data.csrfToken) setInMemoryCsrfToken(data.csrfToken)
      await refreshUser()
      closeAuthModal()
      toast({
        title: "Account created",
        description: "Welcome to HackKro! 100 Pioneer Points awarded.",
      })
      return { success: true, destination: data.destination }
    }

    toast({
      title: "Registration failed",
      description: data.message || "Please verify your details.",
      variant: "destructive",
    })
    return { success: false, message: data.message, errorCode: data.errorCode }
  }

  const logout = async () => {
    await apiFetch("/api/v1/auth/logout", { method: "POST" }).catch(() => {})
    setInMemoryCsrfToken("")
    setUser(null)
    setAvailableWorkspaces([])
    toast({ title: "Signed out", description: "Your session has been terminated securely." })
    router.push("/")
  }

  const logoutAll = async () => {
    await apiFetch("/api/v1/auth/logout-all", { method: "POST" }).catch(() => {})
    setInMemoryCsrfToken("")
    setUser(null)
    setAvailableWorkspaces([])
    toast({ title: "Signed out everywhere", description: "All device sessions were revoked." })
    router.push("/login")
  }

  const switchWorkspace = async (roleKey: string, organizationId?: string | null) => {
    const res = await apiFetch("/api/v1/auth/switch-workspace", {
      method: "POST",
      body: JSON.stringify({ roleKey, organizationId: organizationId ?? null }),
    })
    if (res.success) {
      await refreshUser()
      toast({
        title: "Workspace switched",
        description: `Active workspace: ${roleKey.replace(/_/g, " ")}`,
      })
      if (res.destination) {
        router.push(res.destination)
      }
    } else {
      toast({
        title: "Workspace switch failed",
        description: res.message || "Unauthorized workspace.",
        variant: "destructive",
      })
    }
  }

  const updateProfile = async (updates: Record<string, unknown>) => {
    const res = await apiFetch("/api/v1/profile", {
      method: "PATCH",
      body: JSON.stringify(updates),
    })
    if (res.success) {
      await refreshUser()
      toast({ title: "Profile saved", description: "Your HackKro profile was updated." })
      return { success: true }
    }
    toast({
      title: "Update failed",
      description: res.message || "Could not update profile.",
      variant: "destructive",
    })
    return { success: false, message: res.message }
  }

  return (
    <UserAuthContext.Provider
      value={{
        user,
        isLoading,
        isLoggedIn: Boolean(user),
        availableWorkspaces,
        providers,
        isAuthModalOpen,
        authModalTab,
        authModalMode,
        openAuthModal,
        closeAuthModal,
        login,
        register,
        logout,
        logoutAll,
        switchWorkspace,
        updateProfile,
        refreshUser,
      }}
    >
      {children}
    </UserAuthContext.Provider>
  )
}

export function useUserAuth() {
  const context = useContext(UserAuthContext)
  if (!context) throw new Error("useUserAuth must be used within a UserAuthProvider")
  return context
}
