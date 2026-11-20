"use client"
import { Moon, Sun, Laptop, Check } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export function ModeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="rounded-xl border-slate-200 dark:border-slate-800 h-9 w-9 bg-background hover:bg-muted">
          <Sun className="h-[1.15rem] w-[1.15rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-amber-500" />
          <Moon className="absolute h-[1.15rem] w-[1.15rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-blue-400" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-xl border-slate-200 dark:border-slate-800 p-1.5 shadow-xl w-36">
        <DropdownMenuItem
          onClick={() => setTheme("light")}
          className={`cursor-pointer text-xs font-semibold rounded-lg flex items-center justify-between py-2 ${theme === "light" ? "bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400" : ""}`}
        >
          <div className="flex items-center gap-2">
            <Sun className="h-4 w-4 text-amber-500" />
            <span>Light</span>
          </div>
          {theme === "light" && <Check className="h-3.5 w-3.5" />}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("dark")}
          className={`cursor-pointer text-xs font-semibold rounded-lg flex items-center justify-between py-2 ${theme === "dark" ? "bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400" : ""}`}
        >
          <div className="flex items-center gap-2">
            <Moon className="h-4 w-4 text-blue-400" />
            <span>Dark</span>
          </div>
          {theme === "dark" && <Check className="h-3.5 w-3.5" />}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("system")}
          className={`cursor-pointer text-xs font-medium rounded-lg flex items-center justify-between py-2 ${theme === "system" ? "bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-semibold" : "text-muted-foreground"}`}
        >
          <div className="flex items-center gap-2">
            <Laptop className="h-4 w-4 text-slate-400" />
            <span>System</span>
          </div>
          {theme === "system" && <Check className="h-3.5 w-3.5" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
