"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faXTwitter } from "@fortawesome/free-brands-svg-icons"
import {
  Instagram,
  Linkedin,
  Youtube,
  Menu,
  X,
  ChevronDown,
  User,
  Trophy,
  Award,
  Building,
  LogOut,
  Search,
  Briefcase,
  BookOpen,
  Code2,
  Users,
  Shield,
  Scale,
  GraduationCap,
  Sparkles,
  Settings,
  Compass,
  CreditCard,
} from "lucide-react"

import { ThemeProvider } from "@/components/theme-provider"
import { ModeToggle } from "@/components/mode-toggle"
import { Button } from "@/components/ui/button"
import { SubscribeForm } from "@/components/subscribe-form"
import { UserAuthProvider, useUserAuth } from "@/lib/user-auth-context"
import { I18nProvider, useI18n } from "@/lib/i18n-context"
import { WorkspaceSwitcher } from "@/components/domain/WorkspaceSwitcher"
import { NotificationBell } from "@/components/domain/NotificationBell"
import { Toaster } from "@/components/ui/toaster"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import "./globals.css"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
})

export default function ClientRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <UserAuthProvider>
            <div className="flex min-h-screen flex-col font-sans pb-16 md:pb-0">
              <a href="#main-content" className="skip-link visually-hidden">
                Skip to main content
              </a>
              <Header />
              <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
                {children}
              </main>
              <Footer />
              <MobileBottomBar />
            </div>
            <Toaster />
          </UserAuthProvider>
        </I18nProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}

function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [quickQuery, setQuickQuery] = useState("")
  const pathname = usePathname()
  const router = useRouter()
  const { user, isLoggedIn, logout } = useUserAuth()
  const { locale, setLocale } = useI18n()

  const isActive = (path: string) => {
    if (!pathname) return false
    if (path === "/") return pathname === "/"
    return pathname.startsWith(path)
  }

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const q = quickQuery.trim()
    router.push(q ? `/discover?q=${encodeURIComponent(q)}` : "/discover")
    setIsMenuOpen(false)
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-sm">
      <div className="container flex h-16 items-center justify-between gap-3">
        <div className="flex items-center gap-4 min-w-0">
          <Link href="/" className="flex items-center gap-2 shrink-0" aria-label="HackKro Home">
            <img
              src="https://res.cloudinary.com/payb7fsq/image/upload/v1791981789/Hack_Kro_Logo.png"
              alt="HackKro"
              className="h-9 w-auto"
              onError={(e) => {
                e.currentTarget.src = "/placeholder-logo.png"
              }}
            />
          </Link>

          <search className="hidden lg:block">
            <form onSubmit={handleQuickSearch} className="relative flex items-center">
              <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" aria-hidden="true" />
              <input
                type="search"
                value={quickQuery}
                onChange={(e) => setQuickQuery(e.target.value)}
                placeholder="Search hackathons, jobs, skills..."
                aria-label="Search opportunities"
                className="h-9 w-56 xl:w-64 rounded-full border border-input bg-muted/50 pl-8 pr-3 text-xs focus:bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </form>
          </search>
        </div>

        <nav aria-label="Primary" className="hidden md:flex items-center gap-3 lg:gap-4 text-xs lg:text-sm">
          <Link
            href="/discover"
            className={`transition-colors hover:text-blue-600 whitespace-nowrap ${
              isActive("/discover") ? "font-bold text-blue-600 dark:text-blue-400" : "font-medium text-foreground/80"
            }`}
          >
            Discover
          </Link>
          <Link
            href="/jobs"
            className={`transition-colors hover:text-blue-600 whitespace-nowrap ${
              isActive("/jobs") ? "font-bold text-blue-600 dark:text-blue-400" : "font-medium text-foreground/80"
            }`}
          >
            Jobs
          </Link>
          <Link
            href="/events"
            className={`transition-colors hover:text-blue-600 whitespace-nowrap ${
              isActive("/events") ? "font-bold text-blue-600 dark:text-blue-400" : "font-medium text-foreground/80"
            }`}
          >
            Hackathons
          </Link>
          <Link
            href="/learning"
            className={`transition-colors hover:text-blue-600 whitespace-nowrap ${
              isActive("/learning") ? "font-bold text-blue-600 dark:text-blue-400" : "font-medium text-foreground/80"
            }`}
          >
            Learn
          </Link>
          <Link
            href="/practice"
            className={`transition-colors hover:text-blue-600 whitespace-nowrap ${
              isActive("/practice") ? "font-bold text-blue-600 dark:text-blue-400" : "font-medium text-foreground/80"
            }`}
          >
            Practice
          </Link>
          <Link
            href="/mentorship"
            className={`transition-colors hover:text-blue-600 whitespace-nowrap ${
              isActive("/mentorship") ? "font-bold text-blue-600 dark:text-blue-400" : "font-medium text-foreground/80"
            }`}
          >
            Mentors
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1 font-medium text-foreground/80 hover:text-blue-600 whitespace-nowrap py-1"
              >
                <span>Workspaces</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-60" aria-hidden="true" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-60 p-1.5">
              <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Role Portals
              </DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <Link href="/dashboard" className="cursor-pointer flex items-center gap-2 text-xs">
                  <Trophy className="h-3.5 w-3.5 text-blue-600" /> Participant Dashboard
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/organizer/dashboard" className="cursor-pointer flex items-center gap-2 text-xs">
                  <Building className="h-3.5 w-3.5 text-indigo-600" /> Organizer Workspace
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/recruiter" className="cursor-pointer flex items-center gap-2 text-xs">
                  <Briefcase className="h-3.5 w-3.5 text-emerald-600" /> Recruiter ATS
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/judge" className="cursor-pointer flex items-center gap-2 text-xs">
                  <Scale className="h-3.5 w-3.5 text-amber-600" /> Judge &amp; Evaluator
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/institution" className="cursor-pointer flex items-center gap-2 text-xs">
                  <GraduationCap className="h-3.5 w-3.5 text-purple-600" /> College &amp; Placements
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/campus-ambassador" className="cursor-pointer flex items-center gap-2 text-xs">
                  <Sparkles className="h-3.5 w-3.5 text-pink-600" /> Campus Ambassadors
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/community" className="cursor-pointer flex items-center gap-2 text-xs">
                  <Users className="h-3.5 w-3.5 text-cyan-600" /> Community Guilds
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/admin/dashboard" className="cursor-pointer flex items-center gap-2 text-xs font-semibold">
                  <Shield className="h-3.5 w-3.5 text-rose-600" /> Platform Admin &amp; Trust
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setLocale(locale === "en" ? "hi" : "en")}
            className="h-8 px-2 text-xs font-semibold"
            aria-label={`Switch language (current: ${locale.toUpperCase()})`}
          >
            {locale.toUpperCase()}
          </Button>
          <ModeToggle />

          {isLoggedIn && <NotificationBell />}

          <div className="hidden xl:block">
            <WorkspaceSwitcher />
          </div>

          {!isLoggedIn ? (
            <div className="hidden md:flex items-center gap-2">
              <Button asChild variant="ghost" size="sm" className="h-8 text-xs">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm" className="h-8 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold">
                <Link href="/signup">Create Account</Link>
              </Button>
            </div>
          ) : (
            <div className="hidden md:block">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-2 p-1 pr-2 rounded-full border border-border hover:border-blue-500/60 bg-background transition-colors"
                    aria-label="Account menu"
                  >
                    <div className="h-7 w-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                      {user?.displayName?.charAt(0).toUpperCase() || "U"}
                    </div>
                    <span className="text-xs font-semibold max-w-[90px] truncate">
                      {user?.displayName?.split(" ")[0]}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 opacity-60" aria-hidden="true" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 p-2">
                  <div className="p-2 rounded-lg bg-muted/60 mb-1.5">
                    <p className="text-xs font-bold truncate">{user?.displayName}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{user?.primaryEmail || user?.maskedPhone}</p>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 mt-0.5">
                      {user?.activeRole.replace(/_/g, " ")}
                    </p>
                  </div>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="cursor-pointer text-xs flex items-center gap-2">
                      <Trophy className="h-3.5 w-3.5 text-blue-600" /> Dashboard &amp; Tasks
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="cursor-pointer text-xs flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-indigo-600" /> Profile, Resumes &amp; Portfolio
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/team" className="cursor-pointer text-xs flex items-center gap-2">
                      <Users className="h-3.5 w-3.5 text-purple-600" /> Teams &amp; Collaboration
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/payments" className="cursor-pointer text-xs flex items-center gap-2">
                      <CreditCard className="h-3.5 w-3.5 text-emerald-600" /> Payments &amp; Receipts
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings/security" className="cursor-pointer text-xs flex items-center gap-2">
                      <Settings className="h-3.5 w-3.5 text-slate-600" /> Security &amp; Privacy Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={logout}
                    className="cursor-pointer text-xs text-rose-600 flex items-center gap-2"
                  >
                    <LogOut className="h-3.5 w-3.5" /> Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            size="icon"
            className="md:hidden h-9 w-9"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-expanded={isMenuOpen}
            aria-label="Toggle navigation menu"
          >
            {isMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {isMenuOpen && (
        <div className="container pb-5 pt-3 md:hidden border-t border-border bg-background space-y-3">
          <search>
            <form onSubmit={handleQuickSearch} className="flex gap-2">
              <input
                type="search"
                value={quickQuery}
                onChange={(e) => setQuickQuery(e.target.value)}
                placeholder="Search opportunities..."
                aria-label="Search opportunities"
                className="flex-1 h-10 rounded-lg border border-input bg-muted/50 px-3 text-sm"
              />
              <Button type="submit" size="sm" className="h-10 bg-blue-600 text-white">
                Search
              </Button>
            </form>
          </search>
          <nav aria-label="Mobile" className="grid grid-cols-2 gap-2 text-xs font-semibold">
            {[
              { href: "/discover", label: "Discover" },
              { href: "/jobs", label: "Jobs & Internships" },
              { href: "/events", label: "Hackathons" },
              { href: "/learning", label: "Courses" },
              { href: "/practice", label: "Practice & Mock" },
              { href: "/mentorship", label: "Mentorship" },
              { href: "/organizer/dashboard", label: "Organizer Hub" },
              { href: "/recruiter", label: "Recruiter ATS" },
              { href: "/judge", label: "Judge Workspace" },
              { href: "/institution", label: "College Portal" },
              { href: "/community", label: "Community" },
              { href: "/admin/dashboard", label: "Admin Console" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMenuOpen(false)}
                className="rounded-lg border border-border px-3 py-2.5 hover:bg-muted"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="pt-2 border-t border-border flex items-center justify-between gap-2">
            {!isLoggedIn ? (
              <>
                <Button asChild variant="outline" size="sm" className="flex-1" onClick={() => setIsMenuOpen(false)}>
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button asChild size="sm" className="flex-1 bg-blue-600 text-white" onClick={() => setIsMenuOpen(false)}>
                  <Link href="/signup">Create Account</Link>
                </Button>
              </>
            ) : (
              <>
                <Button asChild size="sm" className="flex-1 bg-blue-600 text-white" onClick={() => setIsMenuOpen(false)}>
                  <Link href="/dashboard">My Dashboard</Link>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsMenuOpen(false)
                    logout()
                  }}
                >
                  Sign Out
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}

function MobileBottomBar() {
  const pathname = usePathname()
  const { isLoggedIn } = useUserAuth()
  const items = [
    { href: "/discover", label: "Discover", icon: Compass },
    { href: "/jobs", label: "Jobs", icon: Briefcase },
    { href: "/learning", label: "Learn", icon: BookOpen },
    { href: "/practice", label: "Practice", icon: Code2 },
    { href: isLoggedIn ? "/dashboard" : "/login", label: isLoggedIn ? "Workspace" : "Sign in", icon: User },
  ]
  return (
    <nav
      aria-label="Mobile quick actions"
      className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur md:hidden"
    >
      <div className="grid grid-cols-5 h-14">
        {items.map((item) => {
          const Icon = item.icon
          const active = pathname?.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium ${
                active ? "text-blue-600 dark:text-blue-400 font-bold" : "text-muted-foreground"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container py-10">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="space-y-3">
            <h2 className="text-lg font-bold">HackKro</h2>
            <p className="text-sm text-muted-foreground">
              The independent ecosystem for opportunities, hackathons, assessments, mentorship, learning, and hiring.
            </p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <Link href="/terms" className="hover:underline">Terms</Link>
              <span>•</span>
              <Link href="/privacy" className="hover:underline">Privacy</Link>
              <span>•</span>
              <Link href="/status" className="hover:underline">System Status</Link>
            </div>
          </div>

          <div className="space-y-2.5">
            <h3 className="text-sm font-bold">Opportunities &amp; Growth</h3>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li><Link href="/discover" className="hover:text-foreground">Discover Marketplace</Link></li>
              <li><Link href="/events" className="hover:text-foreground">Hackathons &amp; Contests</Link></li>
              <li><Link href="/jobs" className="hover:text-foreground">Jobs &amp; Internships</Link></li>
              <li><Link href="/learning" className="hover:text-foreground">Courses &amp; Cohorts</Link></li>
              <li><Link href="/practice" className="hover:text-foreground">Practice &amp; Mock Interviews</Link></li>
              <li><Link href="/mentorship" className="hover:text-foreground">1:1 Mentorship</Link></li>
            </ul>
          </div>

          <div className="space-y-2.5">
            <h3 className="text-sm font-bold">Ecosystem Portals</h3>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li><Link href="/organizer/dashboard" className="hover:text-foreground">Organizer Console</Link></li>
              <li><Link href="/recruiter" className="hover:text-foreground">Recruiter ATS</Link></li>
              <li><Link href="/judge" className="hover:text-foreground">Judge Workspace</Link></li>
              <li><Link href="/institution" className="hover:text-foreground">College Placement Portal</Link></li>
              <li><Link href="/verify/HK-2026-DEMO-VERIFIED" className="hover:text-foreground">Verify Certificate</Link></li>
              <li><Link href="/api/v1/openapi.json" className="hover:text-foreground">OpenAPI Spec</Link></li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold">Connect &amp; Subscribe</h3>
            <div className="flex space-x-4">
              <a href="https://www.instagram.com/hackkro.in" target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground">
                <Instagram className="h-5 w-5" />
                <span className="sr-only">Instagram</span>
              </a>
              <a href="https://www.linkedin.com/company/hackkro/" target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground">
                <Linkedin className="h-5 w-5" />
                <span className="sr-only">LinkedIn</span>
              </a>
              <a href="https://x.com/hackkro_india" target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground">
                <FontAwesomeIcon icon={faXTwitter} className="h-5 w-5" />
                <span className="sr-only">X (Twitter)</span>
              </a>
              <a href="https://www.youtube.com/@hackkro_india" target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground">
                <Youtube className="h-5 w-5" />
                <span className="sr-only">YouTube</span>
              </a>
            </div>
            <p className="text-xs text-muted-foreground">
              Support: <Link href="/contact" className="hover:underline">Submit a ticket</Link>
            </p>
            <SubscribeForm />
          </div>
        </div>
        <div className="mt-8 border-t pt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} HackKro Platform. Independent architecture built for builders, educators, and employers.
        </div>
      </div>
    </footer>
  )
}
